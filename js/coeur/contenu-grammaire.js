// Validation des items de `grammaire.json` (cahier §7.4, §8).
// Contrat complet : .equipe/ressources/schemas-grammaire.md
// Le type `tri` est ici ; les trois autres ont leur fichier `contenu-grammaire-<type>.js`.

import {
  decrire, estObjet, reglesCommunes, reglesCompetence, reglesIdentifiant, reglesTextes, reglesTypographie,
} from './contenu-outils.js';
import { reglesMotsEgalPhrase } from './contenu-grammaire-outils.js';
import { reglesEtiquettes } from './contenu-grammaire-etiquettes.js';
import { FONCTIONS, reglesFonctions } from './contenu-grammaire-fonctions.js';
import { TRANSFORMATIONS, reglesTransformation } from './contenu-grammaire-transformation.js';

export { FONCTIONS, TRANSFORMATIONS };

/** Les quatre types d'items mélangés dans `grammaire.json`. */
export const TYPES_GRAMMAIRE = ['tri', 'fonctions', 'etiquettes', 'transformation'];

/** Natures proposées au tri, par niveau, dans l'ordre d'affichage des boîtes. */
export const BOITES_PAR_NIVEAU = {
  1: ['nom', 'verbe', 'adjectif', 'determinant'],
  2: ['nom', 'verbe', 'adjectif', 'determinant', 'pronom', 'adverbe'],
  3: ['nom', 'verbe', 'adjectif', 'determinant', 'pronom', 'adverbe', 'preposition', 'conjonction'],
};

const CODE_ID_PAR_TYPE = { tri: 'tri', fonctions: 'fon', etiquettes: 'eti', transformation: 'tra' };
const MOTS_MIN = 4;
const MOTS_MAX = 9;
const NATURES_DIFFERENTES_MIN = 3;
const NATURES_DU_NIVEAU_2 = ['pronom', 'adverbe'];
const NATURES_DU_NIVEAU_3 = ['preposition', 'conjonction'];

/**
 * @typedef {Object} ItemTri  Tri des mots d'une phrase par nature.
 * @property {string} id           `gram-tri-n<niveau>-<nnn>`
 * @property {'tri'} type
 * @property {number} niveau       1, 2 ou 3
 * @property {string} competence   commence par `tri-`
 * @property {string} phrase       la phrase complète
 * @property {string[]} boites     les natures du niveau (`BOITES_PAR_NIVEAU`)
 * @property {{texte: string, nature: string}[]} mots  4 à 9 mots, dans l'ordre de la phrase
 * @property {string} indice       la méthode, sans la réponse
 * @property {string} explication
 * @example
 * { "id": "gram-tri-n1-001", "type": "tri", "niveau": 1, "competence": "tri-nature-groupe-nominal",
 *   "phrase": "Le petit chat dort.", "boites": ["nom", "verbe", "adjectif", "determinant"],
 *   "mots": [ {"texte":"Le","nature":"determinant"}, {"texte":"petit","nature":"adjectif"},
 *             {"texte":"chat","nature":"nom"}, {"texte":"dort.","nature":"verbe"} ],
 *   "indice": "…", "explication": "…" }
 */

/**
 * @typedef {Object} ItemFonctions  Chasse aux fonctions : colorier les groupes de la phrase.
 * @property {string} id           `gram-fon-n<niveau>-<nnn>`
 * @property {'fonctions'} type
 * @property {number} niveau
 * @property {string} competence   commence par `fonctions-`
 * @property {string} phrase
 * @property {string[]} mots       la phrase découpée en mots d'affichage
 * @property {string[]} demandees  sous-ensemble ordonné de `FONCTIONS` : la légende de l'item
 * @property {{debut: number, fin: number, fonction: string}[]} groupes  indices inclus dans `mots`
 * @property {string} indice
 * @property {string} explication
 * @example
 * { "id": "gram-fon-n1-001", "type": "fonctions", "niveau": 1, "competence": "fonctions-verbe-sujet",
 *   "phrase": "Le chat dort.", "mots": ["Le", "chat", "dort."], "demandees": ["verbe", "sujet"],
 *   "groupes": [ {"debut":0,"fin":1,"fonction":"sujet"}, {"debut":2,"fin":2,"fonction":"verbe"} ],
 *   "indice": "…", "explication": "…" }
 */

/**
 * @typedef {Object} ItemEtiquettes  Phrase à reconstruire avec des étiquettes.
 * @property {string} id           `gram-eti-n<niveau>-<nnn>`
 * @property {'etiquettes'} type
 * @property {number} niveau
 * @property {string} competence   commence par `etiquettes-`
 * @property {string} phrase       reconstruction de `solutions[0]`
 * @property {string[]} groupes    3 à 6 groupes de mots, dans l'ordre de la solution principale
 * @property {number[][]} solutions  permutations acceptées ; `solutions[0]` = l'ordre d'origine
 * @property {'.'|'!'} ponctuation
 * @property {string} indice
 * @property {string} explication
 * @example
 * { "id": "gram-eti-n3-001", "type": "etiquettes", "niveau": 3, "competence": "etiquettes-complement-deplacable",
 *   "phrase": "Le club organise une course le samedi matin.",
 *   "groupes": ["le club", "organise", "une course", "le samedi matin"],
 *   "solutions": [[0,1,2,3],[3,0,1,2]], "ponctuation": ".", "indice": "…", "explication": "…" }
 */

/**
 * @typedef {Object} ItemTransformation  Récrire une phrase selon une consigne.
 * @property {string} id           `gram-tra-n<niveau>-<nnn>`
 * @property {'transformation'} type
 * @property {number} niveau
 * @property {string} competence   commence par `transformation-`
 * @property {'negation'|'interrogation'|'pluriel'|'passe-compose'} transformation
 * @property {string} consigne
 * @property {string} source       la phrase de départ, identique à `phrase`
 * @property {string} phrase
 * @property {string[]} reponses   1 à 4 phrases entières acceptées ; la 1re est montrée en correction
 * @property {string} indice
 * @property {string} explication
 * @example
 * { "id": "gram-tra-n1-001", "type": "transformation", "niveau": 1, "competence": "transformation-negation",
 *   "transformation": "negation", "consigne": "Écris cette phrase à la forme négative, avec « ne… pas ».",
 *   "source": "Le chat dort.", "phrase": "Le chat dort.", "reponses": ["Le chat ne dort pas."],
 *   "indice": "…", "explication": "…" }
 */

/** @typedef {ItemTri|ItemFonctions|ItemEtiquettes|ItemTransformation} ItemGrammaire */

// --- Tri ---

function reglesBoites(item) {
  const attendues = BOITES_PAR_NIVEAU[item.niveau];
  if (attendues === undefined || (Array.isArray(item.boites) && item.boites.join() === attendues.join())) {
    return [];
  }
  return [`boites doit être exactement ${attendues.join(', ')} au niveau ${item.niveau}`];
}

function estMotTrie(mot) {
  return estObjet(mot) && typeof mot.texte === 'string' && mot.texte.trim() !== '' && typeof mot.nature === 'string';
}

function reglesNaturesDuNiveau(natures, niveau) {
  const regles = [];
  if (new Set(natures).size < NATURES_DIFFERENTES_MIN) {
    regles.push(`mots doit contenir au moins ${NATURES_DIFFERENTES_MIN} natures différentes`);
  }
  if (niveau === 2 && !natures.some((nature) => NATURES_DU_NIVEAU_2.includes(nature))) {
    regles.push(`mots au niveau 2 doit contenir un ${NATURES_DU_NIVEAU_2.join(' ou un ')}`);
  }
  if (niveau === 3 && !natures.some((nature) => NATURES_DU_NIVEAU_3.includes(nature))) {
    regles.push(`mots au niveau 3 doit contenir une ${NATURES_DU_NIVEAU_3.join(' ou une ')}`);
  }
  return regles;
}

function reglesMotsDuTri(item) {
  const { mots } = item;
  const nombreValide = Array.isArray(mots) && mots.length >= MOTS_MIN && mots.length <= MOTS_MAX;
  if (!nombreValide || !mots.every(estMotTrie)) {
    return [`mots doit contenir de ${MOTS_MIN} à ${MOTS_MAX} objets { texte, nature }`];
  }
  const regles = reglesMotsEgalPhrase(item, mots.map((mot) => mot.texte));
  const naturesPermises = BOITES_PAR_NIVEAU[item.niveau] ?? [];
  mots
    .filter((mot) => naturesPermises.length > 0 && !naturesPermises.includes(mot.nature))
    .forEach((mot) => regles.push(`mots : la nature « ${mot.nature} » de « ${mot.texte} » n'est pas dans les boîtes du niveau`));
  return [...regles, ...reglesNaturesDuNiveau(mots.map((mot) => mot.nature), item.niveau)];
}

function reglesTri(item) {
  return [...reglesBoites(item), ...reglesMotsDuTri(item)];
}

// --- Point d'entrée ---

const REGLES_PAR_TYPE = {
  tri: reglesTri,
  fonctions: reglesFonctions,
  etiquettes: reglesEtiquettes,
  transformation: reglesTransformation,
};

/**
 * Valide un item de `grammaire.json`.
 * @param {*} item
 * @returns {string[]} règles violées, vide si l'item est valide
 */
export function validerGrammaire(item) {
  if (!estObjet(item)) {
    return ['(sans id) : l\'item doit être un objet'];
  }
  if (!TYPES_GRAMMAIRE.includes(item.type)) {
    return decrire(item, [`type inconnu : « ${item.type} »`]);
  }
  const regles = [
    ...reglesCommunes(item),
    ...reglesIdentifiant(item, 'gram', CODE_ID_PAR_TYPE),
    ...reglesCompetence(item),
    ...reglesTextes(item, ['phrase', 'indice', 'explication']),
    ...REGLES_PAR_TYPE[item.type](item),
    ...reglesTypographie(item),
  ];
  return decrire(item, regles);
}
