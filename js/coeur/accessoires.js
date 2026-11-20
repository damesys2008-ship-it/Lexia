/**
 * Garde-robe de Pompon : achat à l'unité avec les étoiles, accessoires portés, ensembles.
 * Le catalogue (données) est dans `catalogue-garde-robe.js`.
 * Toutes les fonctions qui prennent des `donnees` sont pures : elles renvoient de nouvelles
 * données et ne modifient jamais celles qu'on leur donne.
 */

import { ACCESSOIRES, ENSEMBLES, EMPLACEMENTS } from './catalogue-garde-robe.js';
import { soldeEtoiles } from './progression.js';

/** @typedef {import('./catalogue-garde-robe.js').Accessoire} Accessoire */
/** @typedef {import('./catalogue-garde-robe.js').Ensemble} Ensemble */
/** @typedef {import('./stockage.js').DonneesLexia} DonneesLexia */

export { EMPLACEMENTS, ENSEMBLES };

/** Les accessoires du catalogue : le nom historique, utilisé par la mascotte. */
export const CATALOGUE = ACCESSOIRES;

/** Erreur levée quand une action de la garde-robe est refusée (déjà acheté, solde insuffisant, ensemble incomplet…). */
export class ErreurGardeRobe extends Error {}

/**
 * @param {string} id
 * @returns {Accessoire}
 * @throws {RangeError} Si l'identifiant n'est pas dans le catalogue.
 */
export function trouverAccessoire(id) {
  const accessoire = CATALOGUE.find((candidat) => candidat.id === id);
  if (!accessoire) {
    throw new RangeError(`Accessoire inconnu : ${id}`);
  }
  return accessoire;
}

/**
 * @param {string} id
 * @returns {Ensemble}
 * @throws {RangeError} Si l'identifiant n'est pas celui d'un ensemble.
 */
export function trouverEnsemble(id) {
  const ensemble = ENSEMBLES.find((candidat) => candidat.id === id);
  if (!ensemble) {
    throw new RangeError(`Ensemble inconnu : ${id}`);
  }
  return ensemble;
}

/**
 * Équipe un accessoire : il remplace celui qui occupe déjà son emplacement.
 * @param {Object<string, string>} equipes Identifiant équipé par emplacement.
 * @param {string} id
 * @returns {Object<string, string>} Nouvelle table, l'ancienne n'est pas modifiée.
 * @throws {RangeError} Si l'identifiant est inconnu.
 */
export function equiperAccessoire(equipes, id) {
  const accessoire = trouverAccessoire(id);
  return { ...equipes, [accessoire.emplacement]: id };
}

/**
 * Retire l'accessoire d'un emplacement (sans effet si l'emplacement est vide).
 * @param {Object<string, string>} equipes
 * @param {string} emplacement
 * @returns {Object<string, string>} Nouvelle table, l'ancienne n'est pas modifiée.
 * @throws {RangeError} Si l'emplacement est inconnu.
 */
export function retirerAccessoire(equipes, emplacement) {
  if (!EMPLACEMENTS.includes(emplacement)) {
    throw new RangeError(`Emplacement inconnu : ${emplacement}`);
  }
  const reste = { ...equipes };
  delete reste[emplacement];
  return reste;
}

/**
 * @param {DonneesLexia} donnees
 * @param {string} id
 * @returns {boolean} Vrai si l'accessoire a déjà été acheté.
 */
export function estPossede(donnees, id) {
  return donnees.accessoires.possedes.includes(id);
}

/**
 * Les accessoires que le solde permet d'acheter maintenant (pas encore possédés), dans l'ordre du catalogue.
 * @param {DonneesLexia} donnees
 * @returns {Accessoire[]}
 */
export function accessoiresAchetables(donnees) {
  const solde = soldeEtoiles(donnees);
  return CATALOGUE.filter((accessoire) => !estPossede(donnees, accessoire.id) && accessoire.prix <= solde);
}

function remplacerEquipes(donnees, equipes) {
  return { ...donnees, accessoires: { ...donnees.accessoires, equipes } };
}

/**
 * Porte un accessoire déjà acheté, à la place de celui qui occupe son emplacement.
 * @param {DonneesLexia} donnees
 * @param {string} id
 * @returns {DonneesLexia}
 * @throws {RangeError} Si l'identifiant est inconnu.
 * @throws {ErreurGardeRobe} Si l'accessoire n'est pas encore acheté.
 */
export function porterAccessoire(donnees, id) {
  trouverAccessoire(id);
  if (!estPossede(donnees, id)) {
    throw new ErreurGardeRobe(`Accessoire pas encore acheté : ${id}`);
  }
  return remplacerEquipes(donnees, equiperAccessoire(donnees.accessoires.equipes, id));
}

/**
 * Ne porte plus rien sur un emplacement (sans effet s'il est déjà vide).
 * @param {DonneesLexia} donnees
 * @param {string} emplacement
 * @returns {DonneesLexia}
 * @throws {RangeError} Si l'emplacement est inconnu.
 */
export function enleverAccessoire(donnees, emplacement) {
  return remplacerEquipes(donnees, retirerAccessoire(donnees.accessoires.equipes, emplacement));
}

/**
 * Achète un accessoire avec des étoiles et le porte tout de suite, sans attendre l'ensemble complet.
 * @param {DonneesLexia} donnees
 * @param {string} id
 * @returns {DonneesLexia}
 * @throws {RangeError} Si l'identifiant est inconnu.
 * @throws {ErreurGardeRobe} Si l'accessoire est déjà acheté ou si le solde ne suffit pas.
 */
export function acheterAccessoire(donnees, id) {
  const accessoire = trouverAccessoire(id);
  if (estPossede(donnees, id)) {
    throw new ErreurGardeRobe(`Accessoire déjà acheté : ${id}`);
  }
  if (soldeEtoiles(donnees) < accessoire.prix) {
    throw new ErreurGardeRobe(`Solde insuffisant pour ${id} : ${accessoire.prix} étoiles demandées`);
  }
  const achete = {
    ...donnees,
    etoilesDepensees: donnees.etoilesDepensees + accessoire.prix,
    accessoires: { ...donnees.accessoires, possedes: [...donnees.accessoires.possedes, id] },
  };
  return porterAccessoire(achete, id);
}

/**
 * Les accessoires d'un ensemble.
 * @param {string} idEnsemble
 * @returns {Accessoire[]}
 * @throws {RangeError} Si l'ensemble est inconnu.
 */
export function piecesEnsemble(idEnsemble) {
  trouverEnsemble(idEnsemble);
  return CATALOGUE.filter((accessoire) => accessoire.ensemble === idEnsemble);
}

/**
 * Un ensemble se débloque tout seul quand toutes ses pièces sont achetées.
 * @param {DonneesLexia} donnees
 * @param {string} idEnsemble
 * @returns {boolean}
 * @throws {RangeError} Si l'ensemble est inconnu.
 */
export function estEnsembleDebloque(donnees, idEnsemble) {
  return piecesEnsemble(idEnsemble).every((piece) => estPossede(donnees, piece.id));
}

/**
 * Les ensembles complets, dans l'ordre du catalogue.
 * @param {DonneesLexia} donnees
 * @returns {Ensemble[]}
 */
export function ensemblesDebloques(donnees) {
  return ENSEMBLES.filter((ensemble) => estEnsembleDebloque(donnees, ensemble.id));
}

/**
 * Enfile toutes les pièces d'un ensemble débloqué : chacune remplace ce qui occupe son emplacement.
 * Les emplacements que l'ensemble n'utilise pas ne changent pas.
 * @param {DonneesLexia} donnees
 * @param {string} idEnsemble
 * @returns {DonneesLexia}
 * @throws {RangeError} Si l'ensemble est inconnu.
 * @throws {ErreurGardeRobe} Si une pièce de l'ensemble n'est pas encore achetée.
 */
export function enfilerEnsemble(donnees, idEnsemble) {
  if (!estEnsembleDebloque(donnees, idEnsemble)) {
    throw new ErreurGardeRobe(`Ensemble pas encore complet : ${idEnsemble}`);
  }
  return piecesEnsemble(idEnsemble).reduce((courantes, piece) => porterAccessoire(courantes, piece.id), donnees);
}
