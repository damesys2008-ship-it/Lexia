/**
 * Chiffres affichés sur les cartes de jeu des hubs : le niveau auquel chaque jeu a été joué
 * en dernier, lu dans l'historique. Fonctions pures : rien n'est écrit.
 */

import { NIVEAU_MAX, NIVEAU_MIN } from './progression.js';

/**
 * Le niveau de la dernière séance jouée à ce jeu.
 * Une ancienne séance sans niveau enregistré compte pour le niveau 1.
 * @param {import('./stockage.js').ResumeSeance[]} historique
 * @param {string} module Par exemple 'dictee'.
 * @param {string} mode Le jeu dans le module, par exemple 'audio'.
 * @returns {number|null} `null` si le jeu n'a jamais été joué.
 */
export function niveauDuJeu(historique, module, mode) {
  const derniere = historique.findLast((seance) => seance.module === module && seance.mode === mode);
  return derniere === undefined ? null : (derniere.niveau ?? NIVEAU_MIN);
}

/**
 * Le texte sous les points d'une carte de jeu.
 * @param {number|null} niveau Résultat de `niveauDuJeu`.
 * @returns {string} « Pas encore joué » ou « Niveau 2 ».
 */
export function libelleDuNiveau(niveau) {
  return niveau === null ? 'Pas encore joué' : `Niveau ${niveau}`;
}

/**
 * Les points de niveau : un par niveau possible, plein jusqu'au niveau atteint.
 * @param {number|null} niveau `null` : aucun point plein.
 * @returns {boolean[]} Par exemple `[true, true, false]` au niveau 2.
 */
export function pointsDeNiveau(niveau) {
  return Array.from({ length: NIVEAU_MAX }, (_, rang) => rang < (niveau ?? 0));
}
