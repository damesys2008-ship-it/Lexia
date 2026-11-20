// Validation de `test-depart.json` (cahier §6.3) : une question à choix par item, six modules.
// Contrat complet : .equipe/ressources/brief-lot3-2.md §3.2
// Un item se valide seul (`validerItemTestDepart`) ; la forme du fichier se vérifie à part (`verifierTestDepart`).

import {
  decrire, estObjet, estTexteNonVide, reglesCommunes, reglesTextes, reglesTypographie,
} from './contenu-outils.js';
import { reglesTextesAffiches } from './contenu-lecture-affichage.js';
import { compterMotsUtiles } from './contenu-lecture-texte.js';

/** Code d'identifiant de chaque module : `dep-<code>-n<niveau>-<nnn>`. */
export const CODE_ID_PAR_MODULE = {
  orthographe: 'orth',
  vocabulaire: 'voc',
  lecture: 'lec',
  grammaire: 'gram',
  conjugaison: 'conj',
  dictee: 'dic',
};

export const MODULES_TEST_DEPART = Object.keys(CODE_ID_PAR_MODULE);

/** Nombre d'items par module : de 4 à 6 (cible 5). */
export const ITEMS_MIN_PAR_MODULE = 4;
export const ITEMS_MAX_PAR_MODULE = 6;

const CHOIX_MIN = 3;
const CHOIX_MAX = 4;
const PART_MAX_REPONSE_EN_TETE = 0.6;
const MOTS_MIN_TEXTE = 40;
const MOTS_MAX_TEXTE = 90;
const FORMAT_COMPETENCE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Champ propre à chaque module : le mot ou le verbe qui sert à vérifier que l'item n'est pas déjà ailleurs. */
const CHAMPS_CLES_PAR_MODULE = {
  orthographe: ['motCle'],
  vocabulaire: ['motCle'],
  conjugaison: ['verbe', 'temps'],
};

function reglesIdentifiant(item) {
  const trouve = typeof item.id === 'string' ? /^dep-([a-z]+)-n(\d)-\d{3}$/.exec(item.id) : null;
  if (trouve === null) {
    return ['id doit avoir la forme dep-<code>-n<niveau>-<nnn> (ex. dep-orth-n1-001)'];
  }
  const [, code, niveau] = trouve;
  const regles = [];
  if (code !== CODE_ID_PAR_MODULE[item.module]) {
    regles.push(`id : le code « ${code} » ne correspond pas au module « ${item.module} »`);
  }
  if (Number(niveau) !== item.niveau) {
    regles.push(`id : le niveau n${niveau} ne correspond pas au niveau ${item.niveau}`);
  }
  return regles;
}

function reglesCompetence(item) {
  return typeof item.competence === 'string' && FORMAT_COMPETENCE.test(item.competence)
    ? []
    : ['competence doit être un slug en minuscules et tirets'];
}

function reglesChoix(item) {
  const { choix, reponse } = item;
  if (!Array.isArray(choix) || choix.length < CHOIX_MIN || choix.length > CHOIX_MAX || !choix.every(estTexteNonVide)) {
    return [`choix doit être une liste de ${CHOIX_MIN} à ${CHOIX_MAX} textes non vides`];
  }
  const regles = [];
  if (new Set(choix).size !== choix.length) {
    regles.push('choix : deux choix identiques');
  }
  if (choix.filter((proposition) => proposition === reponse).length !== 1) {
    regles.push('reponse doit figurer une seule fois dans choix');
  }
  return regles;
}

function reglesTexte(item) {
  if (item.module !== 'lecture') {
    return item.texte === undefined ? [] : ['texte : réservé aux items de lecture'];
  }
  if (!estTexteNonVide(item.texte)) {
    return ['texte manquant ou vide (obligatoire en lecture)'];
  }
  const mots = compterMotsUtiles(item.texte);
  if (mots < MOTS_MIN_TEXTE || mots > MOTS_MAX_TEXTE) {
    return [`texte de ${mots} mots, attendu ${MOTS_MIN_TEXTE} à ${MOTS_MAX_TEXTE}`];
  }
  return [];
}

function reglesChampsCles(item) {
  const champsAttendus = CHAMPS_CLES_PAR_MODULE[item.module] ?? [];
  const champsInterdits = Object.values(CHAMPS_CLES_PAR_MODULE).flat().filter((champ) => !champsAttendus.includes(champ));
  const absents = reglesTextes(item, champsAttendus);
  const enTrop = champsInterdits.filter((champ) => item[champ] !== undefined).map((champ) => `${champ} : inutile pour ce module`);
  return [...absents, ...enTrop, ...reglesMotCleVisible(item)];
}

/** Le mot clé doit figurer dans l'énoncé ou dans un choix : sinon la vérification de doublons ne prouve rien. */
function reglesMotCleVisible(item) {
  if (!estTexteNonVide(item.motCle) || !Array.isArray(item.choix)) {
    return [];
  }
  const visible = [item.enonce, ...item.choix].filter(estTexteNonVide).some((texte) => texte.includes(item.motCle));
  return visible ? [] : ['motCle : ce mot ne figure ni dans l\'énoncé ni dans les choix'];
}

/**
 * Valide un item de `test-depart.json`, sans regarder le fichier entier.
 * @param {*} item
 * @returns {string[]} règles violées, chacune préfixée par l'id de l'item ; vide si l'item est valide
 */
export function validerItemTestDepart(item) {
  if (!estObjet(item)) {
    return ['(sans id) : l\'item doit être un objet'];
  }
  if (!MODULES_TEST_DEPART.includes(item.module)) {
    return decrire(item, [`module inconnu : « ${item.module} »`]);
  }
  const regles = [
    ...reglesCommunes(item),
    ...reglesIdentifiant(item),
    ...reglesCompetence(item),
    ...reglesTextes(item, ['enonce', 'explication']),
    ...reglesChoix(item),
    ...reglesTexte(item),
    ...reglesChampsCles(item),
    ...reglesTypographie(item),
    ...reglesTextesAffiches(item),
  ];
  return decrire(item, regles);
}

function reglesIdsUniques(items) {
  const ids = items.map((item) => item.id);
  const doublons = ids.filter((id, index) => ids.indexOf(id) !== index);
  return [...new Set(doublons)].map((id) => `${id} : identifiant en double`);
}

function reglesDuModule(module, items) {
  const duModule = items.filter((item) => item.module === module);
  const regles = [];
  if (duModule.length < ITEMS_MIN_PAR_MODULE || duModule.length > ITEMS_MAX_PAR_MODULE) {
    regles.push(`module ${module} : ${duModule.length} items, attendu ${ITEMS_MIN_PAR_MODULE} à ${ITEMS_MAX_PAR_MODULE}`);
  }
  const ordreCroissant = duModule.every((item, index) => index === 0 || item.niveau >= duModule[index - 1].niveau);
  if (!ordreCroissant) {
    regles.push(`module ${module} : le niveau ne doit jamais baisser dans l'ordre du fichier`);
  }
  return regles;
}

function reglesPlaceDeLaReponse(items) {
  const avecChoix = items.filter((item) => Array.isArray(item.choix) && item.choix.length > 0);
  const enTete = avecChoix.filter((item) => item.choix[0] === item.reponse).length;
  if (enTete > avecChoix.length * PART_MAX_REPONSE_EN_TETE) {
    return [`la bonne réponse est en première position dans ${enTete} items sur ${avecChoix.length} (60 % au plus)`];
  }
  return [];
}

/**
 * Vérifie la forme du fichier : ids uniques, 4 à 6 items par module, niveaux non décroissants dans un module,
 * bonne réponse en première position dans 60 % des items au plus.
 * Les items mal formés ne sont pas comptés ici : `validerItemTestDepart` les signale.
 * @param {Array} items  dans l'ordre du fichier (= ordre de jeu)
 * @returns {string[]} règles violées, vide si le fichier est correct
 */
export function verifierTestDepart(items) {
  const objets = items.filter(estObjet);
  return [
    ...reglesIdsUniques(objets),
    ...MODULES_TEST_DEPART.flatMap((module) => reglesDuModule(module, objets)),
    ...reglesPlaceDeLaReponse(objets),
  ];
}
