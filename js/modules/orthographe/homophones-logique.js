// Logique pure de l'exercice « Le pont des homophones » : la phrase à trou, les choix, la réponse.

import { MARQUEUR_TROU } from '../../coeur/contenu-orthographe.js';
import { melanger } from './seance-logique.js';

/**
 * Coupe la phrase autour du trou `___`.
 * @param {string} phrase Phrase d'un item `homophone` (un seul trou, déjà vérifié au chargement).
 * @returns {{avant: string, apres: string}}
 */
export function decouperPhrase(phrase) {
  const [avant, apres] = phrase.split(MARQUEUR_TROU);
  return { avant, apres };
}

/**
 * Mélange les choix de l'item sans modifier l'item.
 * @param {{choix: string[]}} item
 * @param {function(): number} [aleatoire] Injectable pour les tests.
 * @returns {string[]}
 */
export function melangerChoix(item, aleatoire = Math.random) {
  return melanger(item.choix, aleatoire);
}

/**
 * Dit si le choix de l'élève est la bonne forme.
 * @param {{reponse: string}} item
 * @param {string} choix
 * @returns {boolean}
 */
export function estBonChoix(item, choix) {
  return choix === item.reponse;
}

/**
 * La phrase complète et correcte, le trou rempli par la bonne forme.
 * @param {{phrase: string, reponse: string}} item
 * @returns {string}
 */
export function phraseComplete(item) {
  const { avant, apres } = decouperPhrase(item.phrase);
  return `${avant}${item.reponse}${apres}`;
}
