// Validation des items de `orthographe.json` (cahier §7.3, §8).
// Contrat complet : .equipe/ressources/schemas-orthographe.md

import {
  decrire, estListeDeTextes, estObjet, estTexteNonVide, reglesCommunes, reglesCompetence, reglesIdentifiant,
  reglesTextes, reglesTypographie,
} from './contenu-outils.js';

/** Marqueur du mot à choisir dans la phrase d'un item `homophone`. */
export const MARQUEUR_TROU = '___';

/** Les quatre types d'items mélangés dans `orthographe.json`. */
export const TYPES_ORTHOGRAPHE = ['homophone', 'accord', 'invariable', 'muette'];

const CODE_ID_PAR_TYPE = { homophone: 'homo', accord: 'acc', invariable: 'inv', muette: 'mut' };
const ROLES_ACCORD = ['determinant', 'nom', 'adjectif'];
const CHOIX_MIN = 2;
const CHOIX_MAX = 3;
const CIBLE_MIN = 2;
const FAMILLE_MIN = 1;
const FAMILLE_MAX = 3;
const LETTRES_MAX = 2;

/**
 * @typedef {Object} ItemHomophone  Le pont des homophones : choisir le bon mot.
 * @property {string} id           `orth-homo-n<niveau>-<nnn>`
 * @property {'homophone'} type
 * @property {number} niveau       1, 2 ou 3
 * @property {string} competence   commence par `homophone-`
 * @property {string} phrase       contient `MARQUEUR_TROU` exactement une fois
 * @property {string[]} choix      2 ou 3 mots, tous différents
 * @property {string} reponse      l'un des `choix`
 * @property {string} indice       le piège, sans la réponse
 * @property {string} astuce       la substitution appliquée à cette phrase
 * @property {string} explication  la règle en une ou deux phrases
 * @example
 * { "id": "orth-homo-n1-001", "type": "homophone", "niveau": 1, "competence": "homophone-a-a",
 *   "phrase": "Ma tante ___ rangé son carnet de croquis.", "choix": ["a", "à"], "reponse": "a",
 *   "indice": "Verbe avoir ou petit mot de liaison ?", "astuce": "Remplace par « avait »…",
 *   "explication": "« a » sans accent est le verbe avoir." }
 */

/**
 * @typedef {Object} MotAccord  Un mot du groupe nominal d'arrivée.
 * @property {string} mot
 * @property {'determinant'|'nom'|'adjectif'} role
 * @property {boolean} saisie        true : l'élève l'écrit ; le nom n'est jamais saisi
 * @property {string[]} [variantes]  autres formes acceptées
 */

/**
 * @typedef {Object} ItemAccord  Accords dans le groupe nominal.
 * @property {string} id           `orth-acc-n<niveau>-<nnn>`
 * @property {'accord'} type
 * @property {number} niveau
 * @property {string} competence   commence par `accord-`
 * @property {string} modele       groupe nominal de départ
 * @property {string} consigne     ce qu'on demande
 * @property {MotAccord[]} cible   au moins 2 mots, un seul nom, au moins un mot saisi
 * @property {string} indice
 * @property {string} explication
 * @example
 * { "id": "orth-acc-n1-001", "type": "accord", "niveau": 1, "competence": "accord-genre-nombre",
 *   "modele": "le chat noir", "consigne": "Écris ce groupe au féminin pluriel.",
 *   "cible": [ { "mot": "les", "role": "determinant", "saisie": true },
 *              { "mot": "chattes", "role": "nom", "saisie": false },
 *              { "mot": "noires", "role": "adjectif", "saisie": true } ],
 *   "indice": "Le déterminant et l'adjectif s'accordent avec le nom.", "explication": "…" }
 */

/**
 * @typedef {Object} ItemInvariable  Mot invariable en copie différée.
 * @property {string} id           `orth-inv-n<niveau>-<nnn>`
 * @property {'invariable'} type
 * @property {number} niveau
 * @property {string} competence   commence par `invariable-`
 * @property {string} mot          le mot à mémoriser puis écrire
 * @property {string} phrase       contient `mot` exactement une fois (majuscule initiale tolérée)
 * @property {string} indice       l'endroit délicat du mot, sans l'écrire en entier
 * @property {string} explication  aide de mémorisation vérifiée
 * @example
 * { "id": "orth-inv-n1-001", "type": "invariable", "niveau": 1, "competence": "invariable-temps",
 *   "mot": "souvent", "phrase": "Le dimanche, nous allons souvent au marché.",
 *   "indice": "Attention aux deux lettres avant le t final.", "explication": "…" }
 */

/**
 * @typedef {Object} ItemMuette  Lettres muettes finales et familles de mots.
 * @property {string} id           `orth-mut-n<niveau>-<nnn>`
 * @property {'muette'} type
 * @property {number} niveau
 * @property {string} competence   commence par `muette-`
 * @property {string} mot          le mot complet
 * @property {string} lettres      1 ou 2 lettres finales de `mot`, muettes
 * @property {string} phrase       contient `mot` exactement une fois, comme mot entier
 * @property {string[]} famille    1 à 3 mots où la lettre s'entend, qui commencent comme `mot` sans `lettres`
 * @property {string} indice       sans donner `famille`
 * @property {string} explication
 * @example
 * { "id": "orth-mut-n1-001", "type": "muette", "niveau": 1, "competence": "muette-consonne-finale",
 *   "mot": "grand", "lettres": "d", "phrase": "Mon frère est très grand pour son âge.",
 *   "famille": ["grande", "grandir"], "indice": "Pense au féminin de ce mot.", "explication": "…" }
 */

/** @typedef {ItemHomophone|ItemAccord|ItemInvariable|ItemMuette} ItemOrthographe */

// --- Outils ---

function echapperPourExpression(texte) {
  return texte.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Nombre de fois où `mot` apparaît comme mot entier dans `phrase` (casse ignorée). */
function compterMotEntier(phrase, mot) {
  const expression = new RegExp(`(?<!\\p{L})${echapperPourExpression(mot)}(?!\\p{L})`, 'giu');
  return (phrase.match(expression) ?? []).length;
}

// --- Homophone ---

function reglesChoix(item) {
  const { choix, reponse } = item;
  const nombreValide = Array.isArray(choix) && choix.length >= CHOIX_MIN && choix.length <= CHOIX_MAX;
  if (!nombreValide || !estListeDeTextes(choix)) {
    return [`choix doit contenir ${CHOIX_MIN} ou ${CHOIX_MAX} textes non vides`];
  }
  const regles = [];
  if (new Set(choix).size !== choix.length) {
    regles.push('choix : les mots doivent tous être différents');
  }
  const presences = choix.filter((choisi) => choisi === reponse).length;
  if (presences !== 1) {
    regles.push(`reponse « ${reponse} » doit figurer une seule fois dans choix (présente ${presences} fois)`);
  }
  return regles;
}

function reglesHomophone(item) {
  const regles = reglesTextes(item, ['phrase', 'indice', 'astuce']);
  if (typeof item.phrase === 'string') {
    const trous = item.phrase.split(MARQUEUR_TROU).length - 1;
    if (trous !== 1) {
      regles.push(`phrase doit contenir « ${MARQUEUR_TROU} » exactement une fois (trouvé ${trous} fois)`);
    }
  }
  return [...regles, ...reglesChoix(item)];
}

// --- Accord ---

function reglesMotAccord(motAccord, position) {
  const lieu = `cible[${position}]`;
  if (!estObjet(motAccord)) {
    return [`${lieu} doit être un objet`];
  }
  const regles = reglesTextes(motAccord, ['mot']).map((regle) => `${lieu} : ${regle}`);
  if (!ROLES_ACCORD.includes(motAccord.role)) {
    regles.push(`${lieu} : rôle inconnu « ${motAccord.role} »`);
  }
  if (typeof motAccord.saisie !== 'boolean') {
    regles.push(`${lieu} : saisie doit être true ou false`);
  } else if (motAccord.role === 'nom' && motAccord.saisie) {
    regles.push(`${lieu} : le nom est toujours donné (saisie: false)`);
  }
  if (motAccord.variantes !== undefined && !estListeDeTextes(motAccord.variantes)) {
    regles.push(`${lieu} : variantes doit être une liste de textes non vides`);
  }
  return regles;
}

function reglesCible(item) {
  const { cible } = item;
  if (!Array.isArray(cible) || cible.length < CIBLE_MIN) {
    return [`cible doit contenir au moins ${CIBLE_MIN} mots`];
  }
  const regles = cible.flatMap(reglesMotAccord);
  if (cible.filter((motAccord) => motAccord?.role === 'nom').length !== 1) {
    regles.push('cible doit contenir exactement un nom');
  }
  if (!cible.some((motAccord) => motAccord?.saisie === true)) {
    regles.push('cible doit contenir au moins un mot à saisir');
  }
  return regles;
}

function reglesAccord(item) {
  return [...reglesTextes(item, ['modele', 'consigne', 'indice']), ...reglesCible(item)];
}

// --- Invariable ---

function reglesMotDansPhrase(item) {
  if (!estTexteNonVide(item.mot) || !estTexteNonVide(item.phrase)) {
    return [];
  }
  const occurrences = compterMotEntier(item.phrase, item.mot);
  if (occurrences !== 1) {
    return [`mot « ${item.mot} » doit figurer exactement une fois dans phrase (trouvé ${occurrences} fois)`];
  }
  return [];
}

function reglesInvariable(item) {
  return [...reglesTextes(item, ['mot', 'phrase', 'indice']), ...reglesMotDansPhrase(item)];
}

// --- Muette ---

function reglesLettres(item) {
  const { mot, lettres } = item;
  if (!estTexteNonVide(lettres) || [...lettres].length > LETTRES_MAX) {
    return [`lettres doit contenir 1 ou ${LETTRES_MAX} lettres`];
  }
  if (estTexteNonVide(mot) && (mot === lettres || !mot.endsWith(lettres))) {
    return [`mot « ${mot} » doit se terminer par lettres « ${lettres} » et être plus long`];
  }
  return [];
}

function reglesFamille(item) {
  const { famille, mot, lettres } = item;
  const nombreValide = Array.isArray(famille) && famille.length >= FAMILLE_MIN && famille.length <= FAMILLE_MAX;
  if (!nombreValide || !estListeDeTextes(famille)) {
    return [`famille doit contenir de ${FAMILLE_MIN} à ${FAMILLE_MAX} mots non vides`];
  }
  if (!estTexteNonVide(mot) || reglesLettres(item).length > 0) {
    return [];
  }
  const debut = mot.slice(0, mot.length - lettres.length);
  return famille
    .filter((parent) => !parent.startsWith(debut))
    .map((parent) => `famille : « ${parent} » doit commencer par « ${debut} »`);
}

function reglesMuette(item) {
  return [
    ...reglesTextes(item, ['mot', 'phrase', 'indice']),
    ...reglesLettres(item),
    ...reglesMotDansPhrase(item),
    ...reglesFamille(item),
  ];
}

// --- Point d'entrée ---

const REGLES_PAR_TYPE = {
  homophone: reglesHomophone,
  accord: reglesAccord,
  invariable: reglesInvariable,
  muette: reglesMuette,
};

/**
 * Valide un item de `orthographe.json`.
 * @param {*} item
 * @returns {string[]} règles violées, vide si l'item est valide
 */
export function validerOrthographe(item) {
  if (!estObjet(item)) {
    return ['(sans id) : l\'item doit être un objet'];
  }
  if (!TYPES_ORTHOGRAPHE.includes(item.type)) {
    return decrire(item, [`type inconnu : « ${item.type} »`]);
  }
  const regles = [
    ...reglesCommunes(item),
    ...reglesIdentifiant(item, 'orth', CODE_ID_PAR_TYPE),
    ...reglesCompetence(item),
    ...reglesTextes(item, ['explication']),
    ...REGLES_PAR_TYPE[item.type](item),
    ...reglesTypographie(item),
  ];
  return decrire(item, regles);
}
