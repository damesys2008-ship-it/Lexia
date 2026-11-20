// Logique pure de l'écran « remets dans l'ordre » : mélange, déplacement d'un paragraphe, comparaison.
// L'ordre affiché est une liste d'index : `ordre[i]` est la place, dans le bon ordre, du paragraphe affiché en
// position i. Le bon ordre est donc [0, 1, 2…]. Aucun accès au DOM.

import { melanger } from '../orthographe/seance-logique.js';

export const SENS_MONTER = -1;
export const SENS_DESCENDRE = 1;

function ordreExact(nombre) {
  return Array.from({ length: nombre }, (_, index) => index);
}

function estOrdreExact(ordre) {
  return ordre.every((valeur, position) => valeur === position);
}

/**
 * Mélange les paragraphes sans jamais retomber sur le bon ordre.
 * @param {number} nombre  nombre de paragraphes (au moins 2)
 * @param {function(): number} aleatoire  renvoie un nombre dans [0, 1) ; injectable pour les tests
 * @returns {number[]} les index mélangés
 */
export function melangerOrdre(nombre, aleatoire = Math.random) {
  if (nombre < 2) {
    throw new Error('melangerOrdre : il faut au moins 2 paragraphes.');
  }
  const ordre = melanger(ordreExact(nombre), aleatoire);
  return estOrdreExact(ordre) ? [...ordre.slice(1), ordre[0]] : ordre;
}

/**
 * Déplace le paragraphe d'une position vers le haut ou le bas, en l'échangeant avec son voisin.
 * Un déplacement impossible (premier vers le haut, dernier vers le bas) renvoie l'ordre inchangé.
 * @param {number[]} ordre
 * @param {number} position  position (à partir de 0) du paragraphe à déplacer
 * @param {-1|1} sens  SENS_MONTER ou SENS_DESCENDRE
 * @returns {number[]} un nouvel ordre
 */
export function deplacer(ordre, position, sens) {
  const arrivee = position + sens;
  if (arrivee < 0 || arrivee >= ordre.length) {
    return [...ordre];
  }
  const copie = [...ordre];
  [copie[position], copie[arrivee]] = [copie[arrivee], copie[position]];
  return copie;
}

/**
 * Compare l'ordre de l'élève au bon ordre.
 * @param {number[]} ordre
 * @returns {{juste: boolean, bienPlaces: boolean[]}} `bienPlaces[i]` : le paragraphe en position i est à sa place
 */
export function comparerOrdre(ordre) {
  const bienPlaces = ordre.map((valeur, position) => valeur === position);
  return { juste: bienPlaces.every(Boolean), bienPlaces };
}

/**
 * Phrase lue par le lecteur d'écran après un déplacement (positions comptées à partir de 1).
 * @param {number} depart  position avant le déplacement (à partir de 0)
 * @param {number} arrivee  position après le déplacement (à partir de 0)
 * @returns {string}
 */
export function decrireDeplacement(depart, arrivee) {
  const verbe = arrivee < depart ? 'monté' : 'descendu';
  return `Paragraphe ${depart + 1} ${verbe} en position ${arrivee + 1}.`;
}
