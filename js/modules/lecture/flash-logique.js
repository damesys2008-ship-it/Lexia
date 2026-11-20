// Logique pure de l'écran « lecture flash » : combien de temps la cible reste visible, et les quatre choix
// proposés ensuite. Aucun accès au DOM.

import { melanger } from '../orthographe/seance-logique.js';

/** Durée d'affichage de la cible, en millisecondes, selon le niveau. */
export const DUREE_FLASH_PAR_NIVEAU = { 1: 600, 2: 400, 3: 250 };

/** Après une erreur, la cible revient un peu plus longtemps. */
export const RALLONGE_APRES_ERREUR_MS = 200;

/**
 * Durée d'affichage de la cible.
 * @param {number} niveau  1, 2 ou 3
 * @param {number} erreurs  nombre d'erreurs déjà faites sur cet item
 * @returns {number} millisecondes
 * @throws {Error} si le niveau est inconnu
 */
export function dureeDuFlash(niveau, erreurs = 0) {
  if (!Object.hasOwn(DUREE_FLASH_PAR_NIVEAU, niveau)) {
    throw new Error(`dureeDuFlash : niveau inconnu « ${niveau} »`);
  }
  return DUREE_FLASH_PAR_NIVEAU[niveau] + (erreurs > 0 ? RALLONGE_APRES_ERREUR_MS : 0);
}

/**
 * Les quatre choix (la cible et ses trois leurres), mélangés.
 * @param {{cible: string, leurres: string[]}} item
 * @param {function(): number} aleatoire  renvoie un nombre dans [0, 1) ; injectable pour les tests
 * @returns {{options: {id: string, texte: string}[], idJuste: string}}
 */
export function proposerChoix(item, aleatoire = Math.random) {
  const textes = melanger([item.cible, ...item.leurres], aleatoire);
  const options = textes.map((texte, position) => ({ id: `choix-${position + 1}`, texte }));
  const idJuste = options.find((option) => option.texte === item.cible).id;
  return { options, idJuste };
}
