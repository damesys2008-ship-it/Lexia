// Logique pure de l'écran « compréhension » : une question = la réponse choisie ET, sauf pour une question de
// vocabulaire, la phrase qui la prouve. Aucun accès au DOM.

import { aplatirPhrases } from '../../ui/texte-surlignable-logique.js';

export { aplatirPhrases };

/** Nombre de questions posées dans le défi du jour (au lieu de toutes). */
export const QUESTIONS_DU_DEFI = 4;

export const TYPE_MOT = 'mot';

export const ETAT_JUSTE = 'juste';
export const ETAT_REPONSE_FAUSSE = 'reponse-fausse';
export const ETAT_PREUVE_FAUSSE = 'preuve-fausse';

/** Indice donné quand la réponse est bonne mais que la phrase-preuve ne l'est pas : il ne la révèle pas. */
export const INDICE_PREUVE = 'Ta réponse est bonne. Trouve maintenant la phrase qui le prouve.';

/** Une question de vocabulaire (`mot`) ne demande pas de phrase-preuve. */
export function demandeUnePreuve(question) {
  return question.type !== TYPE_MOT;
}

/**
 * Le bouton « Vérifier » n'a de sens que si tout ce qui est demandé est choisi.
 * @param {{type: string}} question
 * @param {string|null} reponse  texte de la réponse choisie, ou null
 * @param {number|null} phrase  index de la phrase choisie, ou null
 * @returns {boolean}
 */
export function reponseEstComplete(question, reponse, phrase) {
  return reponse !== null && (!demandeUnePreuve(question) || phrase !== null);
}

/**
 * Juge une réponse complète.
 * @param {{type: string, reponse: string, preuve: number}} question
 * @param {string} reponse  texte de la réponse choisie
 * @param {number|null} phrase  index de la phrase choisie (null pour une question `mot`)
 * @returns {'juste'|'reponse-fausse'|'preuve-fausse'}
 */
export function evaluerReponse(question, reponse, phrase) {
  if (reponse !== question.reponse) {
    return ETAT_REPONSE_FAUSSE;
  }
  if (demandeUnePreuve(question) && phrase !== question.preuve) {
    return ETAT_PREUVE_FAUSSE;
  }
  return ETAT_JUSTE;
}

/**
 * Indice affiché après une première erreur.
 * @param {{indice: string}} question
 * @param {'reponse-fausse'|'preuve-fausse'} etat
 * @returns {string}
 */
export function indiceApresErreur(question, etat) {
  return etat === ETAT_PREUVE_FAUSSE ? INDICE_PREUVE : question.indice;
}

/**
 * Choisit les questions du défi : `nombre` questions, au moins une de chaque type quand c'est possible,
 * gardées dans l'ordre du texte. Avec moins de questions que demandé, les garde toutes.
 * @param {Array<{type: string}>} questions
 * @param {function(): number} aleatoire  renvoie un nombre dans [0, 1) ; injectable pour les tests
 * @param {number} [nombre]
 * @returns {Array}
 */
export function choisirQuestionsDuDefi(questions, aleatoire = Math.random, nombre = QUESTIONS_DU_DEFI) {
  if (questions.length <= nombre) {
    return [...questions];
  }
  const retenues = new Set();
  const types = [...new Set(questions.map((question) => question.type))];
  types.slice(0, nombre).forEach((type) => {
    const candidates = questions.filter((question) => question.type === type);
    retenues.add(candidates[Math.floor(aleatoire() * candidates.length)]);
  });
  while (retenues.size < nombre) {
    const restantes = questions.filter((question) => !retenues.has(question));
    retenues.add(restantes[Math.floor(aleatoire() * restantes.length)]);
  }
  return questions.filter((question) => retenues.has(question));
}
