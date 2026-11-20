// Logique d'affichage de la garde-robe : ce que dit chaque carte, selon les étoiles et les achats.
// Fonctions pures : elles lisent les données de Lexia et ne touchent ni au DOM ni au stockage.

import { estPossede, piecesEnsemble, trouverAccessoire } from '../../coeur/accessoires.js';
import { soldeEtoiles } from '../../coeur/progression.js';

/** Valeur du filtre qui montre tous les accessoires. */
export const FILTRE_TOUT = 'tout';

export const NOM_EMPLACEMENT = {
  tete: 'Tête',
  pompons: 'Pompons',
  visage: 'Visage',
  col: 'Col',
  corps: 'Corps',
  dos: 'Dos',
  main: 'Main',
  queue: 'Queue',
  pieds: 'Pieds',
};

export const NOM_RARETE = {
  commun: 'Commun',
  rare: 'Rare',
  epique: 'Épique',
  legendaire: 'Légendaire',
};

/** Ce que la carte d'un accessoire propose à l'élève. */
export const ETAT_CARTE = {
  PORTE: 'porte',
  A_PORTER: 'a-porter',
  ACHETABLE: 'achetable',
  TROP_CHER: 'trop-cher',
};

/**
 * @param {import('../../coeur/stockage.js').DonneesLexia} donnees
 * @param {{id: string, emplacement: string, prix: number}} accessoire
 * @returns {{genre: string, manque: number}} L'état de la carte et, s'il est trop cher, le nombre d'étoiles qui manquent.
 */
export function etatCarte(donnees, accessoire) {
  if (donnees.accessoires.equipes[accessoire.emplacement] === accessoire.id) {
    return { genre: ETAT_CARTE.PORTE, manque: 0 };
  }
  if (estPossede(donnees, accessoire.id)) {
    return { genre: ETAT_CARTE.A_PORTER, manque: 0 };
  }
  const manque = accessoire.prix - soldeEtoiles(donnees);
  if (manque > 0) {
    return { genre: ETAT_CARTE.TROP_CHER, manque };
  }
  return { genre: ETAT_CARTE.ACHETABLE, manque: 0 };
}

/**
 * @param {import('../../coeur/stockage.js').DonneesLexia} donnees
 * @param {string} emplacement
 * @returns {Object|null} L'accessoire porté à cet emplacement, ou `null` s'il est vide.
 */
export function accessoirePorte(donnees, emplacement) {
  const id = donnees.accessoires.equipes[emplacement];
  return id ? trouverAccessoire(id) : null;
}

/**
 * @param {string} filtre `FILTRE_TOUT` ou un emplacement.
 * @param {string} emplacement
 * @returns {boolean} Vrai si une carte de cet emplacement reste visible avec ce filtre.
 */
export function correspondAuFiltre(filtre, emplacement) {
  return filtre === FILTRE_TOUT || filtre === emplacement;
}

/**
 * @param {import('../../coeur/stockage.js').DonneesLexia} donnees
 * @param {string} idEnsemble
 * @returns {{possedees: number, total: number, complet: boolean}} Les pièces achetées d'un ensemble.
 */
export function progressionEnsemble(donnees, idEnsemble) {
  const pieces = piecesEnsemble(idEnsemble);
  const possedees = pieces.filter((piece) => estPossede(donnees, piece.id)).length;
  return { possedees, total: pieces.length, complet: possedees === pieces.length };
}
