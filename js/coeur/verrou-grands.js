/**
 * Verrou de la section « Pour les grands » : une petite opération à résoudre
 * de tête, simple pour un adulte, hors de portée d'un élève de primaire ou de
 * collège (inconnues, racines carrées, puissances).
 * Module pur : aucun accès au DOM, importable par Node et par les tests.
 */

import { ESPACE_INSECABLE } from './texte.js';

/** Écrit l'énoncé avec des espaces insécables : l'opération ne se coupe jamais en fin de ligne. */
function enonce(texte) {
  return texte.replaceAll(' ', ESPACE_INSECABLE);
}

/**
 * Les 8 opérations. Chacune a UNE seule réponse, entière et positive ou nulle
 * (le clavier numérique d'une tablette n'a pas toujours le signe moins).
 */
export const OPERATIONS = Object.freeze([
  Object.freeze({ enonce: enonce('x − 1 = 0, donc x = ?'), reponse: 1 }),
  Object.freeze({ enonce: enonce('√16 = ?'), reponse: 4 }),
  Object.freeze({ enonce: enonce('2x = 18, donc x = ?'), reponse: 9 }),
  Object.freeze({ enonce: enonce('√144 = ?'), reponse: 12 }),
  Object.freeze({ enonce: enonce('2x + 3 = 11, donc x = ?'), reponse: 4 }),
  Object.freeze({ enonce: enonce('√9 + 2³ = ?'), reponse: 11 }),
  Object.freeze({ enonce: enonce('x ÷ 3 = 5, donc x = ?'), reponse: 15 }),
  Object.freeze({ enonce: enonce('5² − 3² = ?'), reponse: 16 }),
]);

const ENTIER_POSITIF = /^\d+$/;

/**
 * Tire une opération au hasard, différente de `exclue` si elle est fournie.
 *
 * @param {() => number} [hasard] renvoie un nombre dans [0, 1[ (injectable pour les tests)
 * @param {{enonce: string, reponse: number} | null} [exclue] opération à ne pas redonner
 * @returns {{enonce: string, reponse: number}}
 */
export function tirerOperation(hasard = Math.random, exclue = null) {
  const candidates = OPERATIONS.filter((operation) => operation !== exclue);
  const index = Math.min(Math.floor(hasard() * candidates.length), candidates.length - 1);
  return candidates[index];
}

/**
 * Dit si la saisie vaut la réponse. Les espaces autour sont tolérés ;
 * une saisie vide, un texte, un décimal ou « 4abc » sont refusés.
 *
 * @param {{reponse: number}} operation
 * @param {string} saisie
 * @returns {boolean}
 */
export function estBonneReponse(operation, saisie) {
  const texte = saisie.trim();
  return ENTIER_POSITIF.test(texte) && Number(texte) === operation.reponse;
}
