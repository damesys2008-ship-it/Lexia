/**
 * Niveaux adaptatifs : décider s'il faut proposer à l'élève de monter ou de descendre d'un niveau.
 * Fonctions pures : les données sont lues, jamais modifiées ; chaque fonction rend de nouvelles données.
 */

import { NIVEAU_MAX, NIVEAU_MIN, SEANCES_APRES_REFUS, definirNiveau, niveauModule } from './progression.js';

export { SEANCES_APRES_REFUS };

/** Taux de réussite à partir duquel (inclus) une séance compte comme « bien réussie ». */
export const SEUIL_MONTEE = 0.8;
/** Taux de réussite en dessous duquel (strictement) une séance compte comme « difficile ». */
export const SEUIL_DESCENTE = 0.4;
/** Nombre de séances récentes du module, au niveau actuel, qui doivent toutes franchir le seuil. */
export const SEANCES_ANALYSEES = 3;

/**
 * @typedef {Object} Proposition
 * @property {'monter'|'descendre'} sens
 * @property {number} niveau Le niveau proposé.
 */

/** Les dernières séances du module jouées au niveau donné, de la plus ancienne à la plus récente. */
function dernieresSeances(donnees, module, niveau) {
  return donnees.historique
    .filter((seance) => seance.module === module && seance.niveau === niveau)
    .slice(-SEANCES_ANALYSEES);
}

function tauxDeReussite(seance) {
  return seance.reussis / seance.total;
}

/**
 * Propose un changement de niveau pour un module, ou rien.
 * Il faut que les `SEANCES_ANALYSEES` dernières séances du module jouées au niveau actuel franchissent
 * toutes le seuil. Les séances sans niveau enregistré sont ignorées, et rien n'est proposé
 * tant qu'un refus récent n'est pas « épuisé ».
 * @param {import('./stockage.js').DonneesLexia} donnees
 * @param {string} module
 * @returns {Proposition|null}
 */
export function proposerChangementDeNiveau(donnees, module) {
  if ((donnees.meta.refus?.[module] ?? 0) > 0) {
    return null;
  }
  const niveau = niveauModule(donnees, module);
  const seances = dernieresSeances(donnees, module, niveau);
  if (seances.length < SEANCES_ANALYSEES) {
    return null;
  }
  const taux = seances.map(tauxDeReussite);
  if (niveau < NIVEAU_MAX && taux.every((valeur) => valeur >= SEUIL_MONTEE)) {
    return { sens: 'monter', niveau: niveau + 1 };
  }
  if (niveau > NIVEAU_MIN && taux.every((valeur) => valeur < SEUIL_DESCENTE)) {
    return { sens: 'descendre', niveau: niveau - 1 };
  }
  return null;
}

/**
 * Applique une proposition acceptée : le module passe au niveau proposé et le refus est oublié.
 * @param {import('./stockage.js').DonneesLexia} donnees
 * @param {string} module
 * @param {Proposition} proposition
 * @returns {import('./stockage.js').DonneesLexia}
 * @throws {RangeError} Si le niveau proposé est hors de 1 à 3.
 */
export function accepterProposition(donnees, module, proposition) {
  const avecNiveau = definirNiveau(donnees, module, proposition.niveau);
  const refus = { ...donnees.meta.refus };
  delete refus[module];
  return { ...avecNiveau, meta: { ...avecNiveau.meta, refus } };
}

/**
 * Retient un refus : le module ne reçoit plus de proposition avant `SEANCES_APRES_REFUS` séances.
 * @param {import('./stockage.js').DonneesLexia} donnees
 * @param {string} module
 * @returns {import('./stockage.js').DonneesLexia}
 */
export function refuserProposition(donnees, module) {
  const refus = { ...donnees.meta.refus, [module]: SEANCES_APRES_REFUS };
  return { ...donnees, meta: { ...donnees.meta, refus } };
}
