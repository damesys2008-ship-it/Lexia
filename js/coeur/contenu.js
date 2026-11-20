// Chargement des fichiers de contenu `data/*.json` (cahier §8).
//
// Un fichier a la forme { "version": 1, "items": [ ... ] }. Chaque item est
// validé au chargement : en mode strict (développement) un item invalide
// provoque une erreur ; sinon il est ignoré et signalé au journal.
//
// Les validateurs sont purs, un fichier par famille de contenu :
//   contenu-dictee.js        dictée audio et détective
//   contenu-conjugaison.js   tableaux de conjugaison
//   contenu-orthographe.js   exercices d'orthographe (4 types d'items ; types JSDoc `ItemOrthographe`…)
//   contenu-grammaire.js     exercices de grammaire (4 types d'items ; types JSDoc `ItemGrammaire`…)
//   contenu-vocabulaire.js   exercices de vocabulaire (4 types d'items ; types JSDoc `ItemVocabulaire`…)
//   contenu-lecture.js       exercices de lecture (texte, ordre, flash ; types JSDoc `ItemTexte`…)
//   contenu-test-depart.js   items du test de départ « La grande aventure »
// Ce module les ré-exporte : on importe tout le contenu depuis `contenu.js`.

import { estObjet, estTexteNonVide } from './contenu-outils.js';
import { validerConjugaison } from './contenu-conjugaison.js';
import { validerDicteeAudio, validerDicteeDetective } from './contenu-dictee.js';
import { validerGrammaire } from './contenu-grammaire.js';
import { validerItemLecture } from './contenu-lecture.js';
import { validerOrthographe } from './contenu-orthographe.js';
import { validerItemTestDepart } from './contenu-test-depart.js';
import { validerVocabulaire } from './contenu-vocabulaire.js';

export { PERSONNES_PAR_TEMPS, validerConjugaison } from './contenu-conjugaison.js';
export { largeurDeLaFaute, validerDicteeAudio, validerDicteeDetective } from './contenu-dictee.js';
export {
  BOITES_PAR_NIVEAU, FONCTIONS, TRANSFORMATIONS, TYPES_GRAMMAIRE, validerGrammaire,
} from './contenu-grammaire.js';
export { TYPES_LECTURE, validerItemLecture } from './contenu-lecture.js';
export { MARQUEUR_TROU, TYPES_ORTHOGRAPHE, validerOrthographe } from './contenu-orthographe.js';
export { validerItemTestDepart } from './contenu-test-depart.js';
export { PAIRES_PAR_NIVEAU, TYPES_VOCABULAIRE, validerVocabulaire } from './contenu-vocabulaire.js';

const VERSION_FORMAT = 1;

const VALIDATEURS = {
  'dictee-audio': validerDicteeAudio,
  'dictee-detective': validerDicteeDetective,
  conjugaison: validerConjugaison,
  orthographe: validerOrthographe,
  grammaire: validerGrammaire,
  vocabulaire: validerVocabulaire,
  lecture: validerItemLecture,
  'test-depart': validerItemTestDepart,
};

/** Erreur levée en mode strict ; `erreurs` liste chaque règle violée avec l'id de l'item. */
export class ErreurContenu extends Error {
  /** @param {string[]} erreurs */
  constructor(erreurs) {
    super(`Contenu invalide :\n- ${erreurs.join('\n- ')}`);
    this.name = 'ErreurContenu';
    this.erreurs = erreurs;
  }
}

/**
 * Chargeur par défaut : lit `data/<nom>.json` à côté du site (chemin relatif au module).
 * @param {string} nom
 * @returns {Promise<{version: number, items: Array}>}
 */
async function chargerDepuisLeSite(nom) {
  const reponse = await fetch(new URL(`../../data/${nom}.json`, import.meta.url));
  if (!reponse.ok) {
    throw new Error(`Impossible de charger le contenu « ${nom} » (HTTP ${reponse.status})`);
  }
  return reponse.json();
}

// Journal par défaut : c'est le journal de production demandé par le cahier §8, pas du débogage.
function journaliserDansLaConsole(message) {
  console.warn(message);
}

function verifierFormeDuFichier(nom, fichier) {
  if (!estObjet(fichier) || fichier.version !== VERSION_FORMAT || !Array.isArray(fichier.items)) {
    throw new Error(`Le fichier « ${nom} » doit avoir la forme { "version": ${VERSION_FORMAT}, "items": [...] }`);
  }
}

/**
 * Charge un fichier de contenu et ne garde que les items valides.
 * Un id déjà rencontré dans le fichier rend l'item suivant invalide.
 *
 * @param {'dictee-audio'|'dictee-detective'|'conjugaison'|'orthographe'|'grammaire'|'vocabulaire'|'lecture'
 *   |'test-depart'} nom
 * @param {Object} [options]
 * @param {function(string): Promise<{version: number, items: Array}>} [options.charger]
 *   lit le fichier de contenu (défaut : `fetch` du fichier `data/<nom>.json`)
 * @param {boolean} [options.strict=false] true : lève `ErreurContenu` s'il y a un item invalide
 * @param {function(string): void} [options.journal] reçoit un message par item ignoré (défaut : console.warn)
 * @returns {Promise<Array>} les items valides
 * @throws {Error} nom inconnu, chargement impossible ou fichier mal formé
 * @throws {ErreurContenu} en mode strict, si un item est invalide
 */
export async function chargerContenu(nom, options = {}) {
  const { charger = chargerDepuisLeSite, strict = false, journal = journaliserDansLaConsole } = options;
  if (!Object.hasOwn(VALIDATEURS, nom)) {
    throw new Error(`Contenu inconnu : « ${nom} »`);
  }
  const valider = VALIDATEURS[nom];
  const fichier = await charger(nom);
  verifierFormeDuFichier(nom, fichier);

  const idsVus = new Set();
  const itemsValides = [];
  const erreurs = [];
  for (const item of fichier.items) {
    const erreursDeLItem = valider(item);
    if (estObjet(item) && estTexteNonVide(item.id)) {
      if (idsVus.has(item.id)) {
        erreursDeLItem.push(`${item.id} : id dupliqué dans le fichier`);
      }
      idsVus.add(item.id);
    }
    if (erreursDeLItem.length === 0) {
      itemsValides.push(item);
    }
    erreurs.push(...erreursDeLItem);
  }

  if (strict && erreurs.length > 0) {
    throw new ErreurContenu(erreurs);
  }
  erreurs.forEach((erreur) => journal(`[${nom}] item ignoré : ${erreur}`));
  return itemsValides;
}
