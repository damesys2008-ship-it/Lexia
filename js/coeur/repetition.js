/**
 * Répétition espacée : système de Leitner à 5 boîtes, plus une boîte 0 « à confirmer ».
 * Un item réussi du premier coup entre en boîte 0 : il revient une seule fois, puis il est acquis.
 * Fonctions pures : l'état et la date sont fournis, un nouvel état est renvoyé.
 * L'état est `donnees.repetition` (voir `stockage.js`), indexé par id d'item de contenu.
 */

import { ecartEnJours, reculerJour, versJour } from './progression.js';

/** @typedef {import('./stockage.js').BoiteRepetition} BoiteRepetition */

/** Délai en jours avant de revoir un item, pour les boîtes 1 à 5. */
export const INTERVALLES_JOURS = [1, 3, 7, 14, 30];

/** Boîte des items réussis du premier coup, jamais ratés : ils doivent être confirmés une fois. */
export const BOITE_A_CONFIRMER = 0;

/** Délai en jours avant de revoir un item de la boîte 0. */
export const DELAI_CONFIRMATION_JOURS = 7;

const PREMIERE_BOITE = 1;
const DERNIERE_BOITE = INTERVALLES_JOURS.length;

/**
 * Délai en jours avant de revoir un item de la boîte donnée.
 * @param {number} boite De 0 (à confirmer) à 5.
 * @returns {number}
 */
export function delaiDeLaBoite(boite) {
  return boite === BOITE_A_CONFIRMER ? DELAI_CONFIRMATION_JOURS : INTERVALLES_JOURS[boite - 1];
}

/** Vrai si l'item doit être révisé le jour donné. */
function estDu(entree, jour) {
  if (entree.acquis) {
    return false;
  }
  return ecartEnJours(entree.dernierJour, jour) >= delaiDeLaBoite(entree.boite);
}

/**
 * Un item raté (ou revu et raté) retourne en boîte 1.
 * @param {Object<string, BoiteRepetition>} etat
 * @param {string} itemId
 * @param {Date} date Date du jour (injectée).
 * @returns {Object<string, BoiteRepetition>}
 */
export function enregistrerEchec(etat, itemId, date) {
  const entree = { boite: PREMIERE_BOITE, dernierJour: versJour(date), acquis: false };
  return { ...etat, [itemId]: entree };
}

/**
 * Un item jamais vu et réussi entre en boîte 0 (à confirmer). Réussi en révision, un item passe
 * à la boîte suivante ; réussi en boîte 0 ou en boîte 5, il est acquis (forme : boîte 5, acquis).
 * Rien ne change pour un item déjà acquis ou pas encore dû ce jour-là.
 * @param {Object<string, BoiteRepetition>} etat
 * @param {string} itemId
 * @param {Date} date Date du jour (injectée).
 * @returns {Object<string, BoiteRepetition>}
 */
export function enregistrerReussite(etat, itemId, date) {
  const entree = etat[itemId];
  const jour = versJour(date);
  if (!entree) {
    return { ...etat, [itemId]: { boite: BOITE_A_CONFIRMER, dernierJour: jour, acquis: false } };
  }
  if (!estDu(entree, jour)) {
    return etat;
  }
  if (entree.boite === BOITE_A_CONFIRMER || entree.boite === DERNIERE_BOITE) {
    return { ...etat, [itemId]: { boite: DERNIERE_BOITE, dernierJour: jour, acquis: true } };
  }
  return { ...etat, [itemId]: { boite: entree.boite + 1, dernierJour: jour, acquis: false } };
}

/**
 * Recule de `jours` jours le dernier jour de révision de chaque item : les boîtes « avancent » d'autant.
 * Sert à simuler les jours qui passent (réglages pour les grands). Calcul en UTC, comme `ecartEnJours`.
 * @param {Object<string, BoiteRepetition>} etat
 * @param {number} [jours] Nombre de jours à reculer (entier positif).
 * @returns {Object<string, BoiteRepetition>}
 */
export function reculerLesJours(etat, jours = 1) {
  return Object.fromEntries(
    Object.entries(etat).map(([itemId, entree]) => [
      itemId,
      { ...entree, dernierJour: reculerJour(entree.dernierJour, jours) },
    ]),
  );
}

/**
 * Identifiants des items à réviser, les plus en retard d'abord.
 * @param {Object<string, BoiteRepetition>} etat
 * @param {Date} date Date du jour (injectée).
 * @returns {string[]}
 */
export function itemsDus(etat, date) {
  const jour = versJour(date);
  const retard = (entree) => ecartEnJours(entree.dernierJour, jour) - delaiDeLaBoite(entree.boite);
  return Object.entries(etat)
    .filter(([, entree]) => estDu(entree, jour))
    .sort(([idA, a], [idB, b]) => retard(b) - retard(a) || idA.localeCompare(idB))
    .map(([itemId]) => itemId);
}
