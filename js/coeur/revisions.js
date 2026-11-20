/**
 * Révisions : choisir, parmi les items d'une famille, ceux que la répétition espacée fait revenir.
 * Fonctions pures : l'état des boîtes, la date et le niveau sont fournis, rien n'est modifié.
 */

import { niveauModule } from './progression.js';
import { BOITE_A_CONFIRMER, itemsDus } from './repetition.js';

/**
 * Ce qu'il faut savoir de l'élève pour décider des révisions ; à construire une fois au démarrage d'un exercice.
 * @typedef {Object} SituationEleve
 * @property {Object<string, import('./stockage.js').BoiteRepetition>} repetition Les boîtes (`donnees.repetition`).
 * @property {Date} date Date du jour (injectée).
 * @property {number} niveau Niveau de l'élève dans ce module.
 */

/** Nombre maximal d'items à revoir dans une séance, pour ne pas la transformer en pure révision. */
export const PLAFOND_REVISIONS = 4;

/**
 * Les items de `candidats` à revoir le jour donné.
 * Ordre : d'abord les items ratés (boîtes 1 à 5), puis ceux « à confirmer » (boîte 0) ;
 * dans chaque groupe, les plus en retard d'abord.
 * Sont ignorés : les items acquis ou pas encore dus, ceux d'un niveau supérieur au niveau de l'élève,
 * et les identifiants absents de `candidats` (autre famille, ou item retiré du contenu).
 * @param {Object[]} candidats Items de contenu de la famille (chacun avec `id` et `niveau`).
 * @param {SituationEleve} situation
 * @returns {Object[]}
 */
export function itemsARevoir(candidats, { repetition, date, niveau }) {
  const parId = new Map(candidats.map((candidat) => [candidat.id, candidat]));
  const dus = itemsDus(repetition, date)
    .filter((id) => parId.has(id) && parId.get(id).niveau <= niveau);
  const estRate = (id) => repetition[id].boite !== BOITE_A_CONFIRMER;
  const ordonnes = [
    ...dus.filter(estRate),
    ...dus.filter((id) => !estRate(id)),
  ];
  return ordonnes.map((id) => parId.get(id));
}

/**
 * La situation de l'élève dans un module, à construire une fois au démarrage d'un exercice.
 * @param {import('./stockage.js').DonneesLexia} donnees
 * @param {string} module
 * @param {Date} date Date du jour (injectée : le cœur ne lit pas l'horloge).
 * @returns {SituationEleve}
 */
export function situationDe(donnees, module, date) {
  return { repetition: donnees.repetition, date, niveau: niveauModule(donnees, module) };
}

/**
 * Le premier item à revoir ; sinon celui que `tirer` choisit.
 * `tirer` n'est appelé que s'il n'y a rien à revoir : le hasard n'est pas consommé pour rien.
 * @param {Object[]} candidats Items de contenu de la famille (voir `itemsARevoir`).
 * @param {SituationEleve} situation
 * @param {function(): (Object|null)} tirer Tirage de repli.
 * @returns {Object|null}
 */
export function choisirAvecRevision(candidats, situation, tirer) {
  return itemsARevoir(candidats, situation)[0] ?? tirer();
}

/**
 * Place en tête des items choisis au plus `PLAFOND_REVISIONS` items à revoir, sans doublon.
 * Le résultat n'est jamais plus long que `choisis`. Rien à revoir : `choisis` est rendu tel quel.
 * @param {Object[]} choisis Les items tirés pour la séance.
 * @param {Object[]} candidats Items de contenu de la famille (voir `itemsARevoir`).
 * @param {SituationEleve} situation
 * @returns {Object[]}
 */
export function inclureRevisions(choisis, candidats, situation) {
  const aRevoir = itemsARevoir(candidats, situation).slice(0, PLAFOND_REVISIONS);
  if (aRevoir.length === 0) {
    return choisis;
  }
  const idsPlaces = new Set(aRevoir.map((item) => item.id));
  const autres = choisis.filter((item) => !idsPlaces.has(item.id));
  return [...aRevoir, ...autres].slice(0, choisis.length);
}
