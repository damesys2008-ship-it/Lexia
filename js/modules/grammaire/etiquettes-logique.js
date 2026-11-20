// Logique pure de l'exercice « Les phrases en étiquettes » : mélange, phrase de l'élève, solutions, évaluation.
// Aucun accès au DOM : tout se teste dans Node.

import { reconstruirePhrase } from '../../coeur/contenu-grammaire-etiquettes.js';
import { appliquerEspacesInsecables } from '../../coeur/texte.js';
import { melanger } from '../orthographe/seance-logique.js';

/** Id de l'unique zone de l'exercice : la phrase que l'élève reconstruit. */
export const ZONE_PHRASE = 'phrase';

const ESSAIS_DE_MELANGE_MAX = 50;

/**
 * Dit si l'ordre des groupes est l'une des solutions de l'item.
 * @param {{solutions: number[][]}} item
 * @param {number[]} ordre indices des groupes, dans l'ordre choisi par l'élève
 * @returns {boolean}
 */
export function estUneSolution(item, ordre) {
  return item.solutions.some((solution) => solution.length === ordre.length && solution.every((indice, rang) => indice === ordre[rang]));
}

/**
 * Les étiquettes de l'item, dans un ordre mélangé qui n'est jamais une solution.
 * L'id d'une étiquette est l'indice de son groupe dans `item.groupes`.
 * @param {{groupes: string[], solutions: number[][]}} item
 * @param {function(): number} [aleatoire] Injectable pour les tests.
 * @returns {{id: string, texte: string}[]}
 */
export function creerEtiquettes(item, aleatoire = Math.random) {
  const indices = Array.from(item.groupes.keys());
  let ordre = melanger(indices, aleatoire);
  for (let essai = 1; essai < ESSAIS_DE_MELANGE_MAX && estUneSolution(item, ordre); essai += 1) {
    ordre = melanger(indices, aleatoire);
  }
  if (estUneSolution(item, ordre)) {
    // Ordre de secours : un tirage figé ne doit pas laisser la phrase déjà reconstruite.
    ordre = [...indices].reverse();
  }
  return ordre.map((indice) => ({ id: String(indice), texte: item.groupes[indice] }));
}

/**
 * La zone où l'élève range les groupes : une seule, ordonnée, qui peut tous les contenir.
 * @param {{groupes: string[]}} item
 * @returns {{id: string, titre: string, ordonnee: boolean, capacite: number}[]}
 */
export function creerZones(item) {
  return [{ id: ZONE_PHRASE, titre: 'Ta phrase', ordonnee: true, capacite: item.groupes.length }];
}

/**
 * Les indices des groupes dans l'ordre choisi par l'élève.
 * @param {Record<string, string[]>} placements Placements du composant « déposer ».
 * @returns {number[]}
 */
export function lireOrdre(placements) {
  return (placements[ZONE_PHRASE] ?? []).map(Number);
}

/**
 * La phrase formée par ces groupes : majuscule au premier, ponctuation à la fin, espaces insécables.
 * @param {{groupes: string[], ponctuation: string}} item
 * @param {number[]} ordre
 * @returns {string} chaîne vide si l'ordre est vide
 */
export function construirePhrase(item, ordre) {
  if (ordre.length === 0) {
    return '';
  }
  return appliquerEspacesInsecables(reconstruirePhrase(item.groupes, ordre, item.ponctuation));
}

/**
 * Toutes les phrases acceptées, la solution principale en premier.
 * @param {{groupes: string[], ponctuation: string, solutions: number[][]}} item
 * @returns {string[]}
 */
export function phrasesAcceptees(item) {
  return item.solutions.map((solution) => construirePhrase(item, solution));
}

function nombreDeBonnesPlaces(solution, ordre) {
  return ordre.filter((indice, rang) => solution[rang] === indice).length;
}

/**
 * Compare l'ordre de l'élève à la solution la plus proche : un résultat par groupe.
 * Un groupe est juste s'il est à la place que lui donne cette solution.
 * @param {{solutions: number[][]}} item
 * @param {number[]} ordre
 * @returns {Map<string, 'juste'|'faux'>} clés : les id des étiquettes
 */
export function evaluerOrdre(item, ordre) {
  const proche = item.solutions.reduce((meilleure, solution) => (
    nombreDeBonnesPlaces(solution, ordre) > nombreDeBonnesPlaces(meilleure, ordre) ? solution : meilleure
  ));
  return new Map(ordre.map((indice, rang) => [String(indice), proche[rang] === indice ? 'juste' : 'faux']));
}
