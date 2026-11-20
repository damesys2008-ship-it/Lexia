/**
 * Modules les plus faibles : classer les modules d'après les dernières séances de l'élève.
 * Fonctions pures : l'historique est lu, jamais modifié.
 */

import { MODULES } from './familles.js';

/** Nombre de séances récentes d'un module prises en compte pour son score. */
export const SEANCES_ANALYSEES_FAIBLESSE = 5;
/** Score d'un module jamais joué : plus bas que tout taux de réussite, il passe donc en premier. */
const SCORE_JAMAIS_JOUE = -1;

function tauxDeReussite(seance) {
  return seance.reussis / seance.total;
}

/**
 * Score d'un module : moyenne des taux de réussite de ses dernières séances (tous modes et tous niveaux).
 * @param {Array<{module: string, reussis: number, total: number}>} historique De la plus ancienne à la plus récente.
 * @param {string} module
 * @returns {number|null} Un nombre entre 0 et 1, ou `null` si le module n'a jamais été joué.
 */
export function scoreDuModule(historique, module) {
  const taux = historique
    .filter((seance) => seance.module === module)
    .slice(-SEANCES_ANALYSEES_FAIBLESSE)
    .map(tauxDeReussite);
  if (taux.length === 0) {
    return null;
  }
  return taux.reduce((somme, valeur) => somme + valeur, 0) / taux.length;
}

/**
 * Classe les modules du plus faible au plus fort. Un module jamais joué passe avant les autres ;
 * à score égal, l'ordre de `modules` est conservé.
 * @param {Array<{module: string, reussis: number, total: number}>} historique
 * @param {string[]} [modules]
 * @returns {string[]}
 */
export function classerModulesParFaiblesse(historique, modules = MODULES) {
  const scores = new Map(modules.map((module) => [module, scoreDuModule(historique, module) ?? SCORE_JAMAIS_JOUE]));
  return [...modules].sort((a, b) => scores.get(a) - scores.get(b));
}
