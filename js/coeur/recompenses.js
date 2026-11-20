/**
 * Clôture d'un exercice : le seul endroit où les étoiles gagnées et l'historique sont
 * mis à jour (cahier §6.4 et §6.5). Les modules appellent `cloturerExercice` au lieu de refaire
 * ce calcul chacun de leur côté.
 * Aucune étoile n'est jamais retirée et aucune série n'est remise à zéro.
 */

import {
  ETOILES_DEFI_COMPLET,
  ETOILES_EXERCICE_TERMINE,
  ajouterEtoiles,
  enregistrerSeance,
  etoilesExercice,
  niveauModule,
  soldeEtoiles,
  versJour,
} from './progression.js';
import { CATALOGUE, estPossede } from './accessoires.js';
import { NOMBRE_EXERCICES_DEFI } from './familles.js';
import { enregistrerEchec, enregistrerReussite } from './repetition.js';
import { attribuerBadges } from './badges.js';

const TAILLE_MAX_ID_ITEM = 200;

/** @typedef {import('./stockage.js').DonneesLexia} DonneesLexia */

/**
 * @typedef {Object} ContexteRecompenses
 * @property {{lire: function(): DonneesLexia, ecrire: function(DonneesLexia): void}} stockage
 *   Le stockage de `stockage.js` (en mode session seulement, il garde les données en mémoire).
 * @property {Date} date Date du jour (injectée).
 */

/**
 * @typedef {Object} ResultatExercice
 * @property {string} module Ex. `dictee`, `conjugaison`.
 * @property {string} mode Ex. `audio`, `detective`.
 * @property {string} itemId Identifiant de l'item de contenu.
 * @property {number} reussis Nombre de réussites.
 * @property {number} total Nombre d'éléments proposés (au moins 1).
 * @property {string[]} competencesRatees Compétences des erreurs commises.
 * @property {boolean} [defiComplet] Vrai pour le dernier exercice d'un défi du jour terminé.
 * @property {number} [defiEtape] Numéro (1 à 5) de l'exercice du défi qui vient d'être terminé.
 * @property {ItemJoue[]} [items] Items de contenu joués, pour les boîtes de répétition.
 *   Absent : la répétition espacée n'est pas touchée.
 */

/**
 * @typedef {Object} ItemJoue
 * @property {string} id Identifiant de l'item de contenu (200 caractères au plus).
 * @property {boolean} reussi Vrai si l'élève a eu juste du premier coup, sans indice ni correction.
 */

/**
 * @typedef {Object} Bilan
 * @property {number} etoilesGagnees Total gagné, bonus du défi compris.
 * @property {number} bonusDefi Étoiles du bonus du défi du jour (0 ou 2), déjà comprises dans `etoilesGagnees`.
 * @property {number} totalEtoiles Total d'étoiles gagnées depuis le début.
 * @property {number} soldeEtoiles Étoiles à dépenser dans la garde-robe après ce gain.
 * @property {number} etoilesSansErreur Part de `etoilesGagnees` due à l'exercice sans erreur (0 ou `ETOILES_SANS_ERREUR`).
 * @property {{nom: string, prix: number}|null} prochainAchat L'accessoire le moins cher que l'élève n'a pas encore ;
 *   `null` quand il les a tous.
 * @property {import('./badges.js').Badge[]} badgesGagnes Les badges gagnés à cet exercice, jamais annoncés avant.
 */

/** Vrai si l'élément est de la forme `{ id, reussi }` attendue pour la répétition espacée. */
function estItemJoue(item) {
  return (
    typeof item === 'object' &&
    item !== null &&
    typeof item.id === 'string' &&
    item.id.length > 0 &&
    item.id.length <= TAILLE_MAX_ID_ITEM &&
    typeof item.reussi === 'boolean'
  );
}

/**
 * Met à jour les boîtes de Leitner avec les items joués pendant l'exercice.
 * @param {DonneesLexia} donnees
 * @param {ItemJoue[]|undefined} items Absent : les boîtes ne bougent pas.
 * @param {Date} date
 * @returns {DonneesLexia}
 * @throws {RangeError} Si `items` n'est pas une liste de `{ id, reussi }` valides.
 */
function appliquerRepetition(donnees, items, date) {
  if (items === undefined) return donnees;
  if (!Array.isArray(items) || !items.every(estItemJoue)) {
    throw new RangeError('Les items joués doivent être une liste de { id, reussi }.');
  }
  const repetition = items.reduce(
    (etat, { id, reussi }) => (reussi ? enregistrerReussite(etat, id, date) : enregistrerEchec(etat, id, date)),
    donnees.repetition,
  );
  return { ...donnees, repetition };
}

/**
 * @param {number|undefined} etape Numéro de l'exercice du défi ; absent hors défi.
 * @throws {RangeError} Si le numéro n'est pas un entier de 1 au nombre d'exercices du défi.
 */
function verifierEtapeDefi(etape) {
  if (etape === undefined) return;
  if (!Number.isInteger(etape) || etape < 1 || etape > NOMBRE_EXERCICES_DEFI) {
    throw new RangeError(`L'étape du défi doit être un entier de 1 à ${NOMBRE_EXERCICES_DEFI}.`);
  }
}

/**
 * L'accessoire le moins cher que l'élève ne possède pas encore.
 * @param {DonneesLexia} donnees
 * @returns {{nom: string, prix: number}|null}
 */
function accessoireLeMoinsCher(donnees) {
  const restants = CATALOGUE.filter((accessoire) => !estPossede(donnees, accessoire.id));
  if (restants.length === 0) {
    return null;
  }
  const { nom, prix } = restants.reduce((moinsCher, courant) => (courant.prix < moinsCher.prix ? courant : moinsCher));
  return { nom, prix };
}

/**
 * Fait avancer le défi du jour et décide du bonus (une seule fois par jour).
 * Hors défi (`defiEtape` absent), `defiComplet` donne le bonus tant que le défi du jour n'est pas déjà fait.
 * Si le jour du défi n'est plus celui de la date (minuit passé), le défi n'avance pas et il n'y a pas de bonus.
 * @param {import('./stockage.js').DefiDuJour|null} defi
 * @param {ResultatExercice} resultat
 * @param {Date} date
 * @returns {{defi: import('./stockage.js').DefiDuJour|null, bonusDefi: number}}
 */
function avancerDefi(defi, resultat, date) {
  const estDuJour = defi !== null && defi.jour === versJour(date);
  const dejaFait = estDuJour && defi.faits >= NOMBRE_EXERCICES_DEFI;
  const suitLeDefi = resultat.defiEtape !== undefined;
  if (suitLeDefi && !estDuJour) {
    return { defi, bonusDefi: 0 };
  }
  const bonusDefi = resultat.defiComplet && !dejaFait ? ETOILES_DEFI_COMPLET : 0;
  if (!suitLeDefi) {
    return { defi, bonusDefi };
  }
  return { defi: { ...defi, faits: Math.max(defi.faits, resultat.defiEtape) }, bonusDefi };
}

/**
 * Termine un exercice : calcule les étoiles gagnées,
 * enregistre la séance, les jours d'entraînement et les boîtes de répétition, puis sauvegarde.
 * À appeler une seule fois par exercice terminé : un second appel compterait les étoiles deux fois.
 * @param {ContexteRecompenses} contexte
 * @param {ResultatExercice} resultat
 * @returns {Bilan}
 * @throws {RangeError} Si le résultat est impossible (rien n'est alors enregistré).
 */
export function cloturerExercice(contexte, resultat) {
  const { stockage, date } = contexte;
  verifierEtapeDefi(resultat.defiEtape);

  const donnees = stockage.lire();
  const { defi, bonusDefi } = avancerDefi(donnees.meta.defi, resultat, date);
  const etoilesDeLExercice = etoilesExercice(resultat.total - resultat.reussis);
  const etoilesGagnees = etoilesDeLExercice + bonusDefi;
  const niveau = niveauModule(donnees, resultat.module);
  const avecSeance = enregistrerSeance(donnees, { ...resultat, niveau, date });
  const avecRepetition = appliquerRepetition(avecSeance, resultat.items, date);
  const avecDefi = { ...avecRepetition, meta: { ...avecRepetition.meta, defi } };
  const avecEtoiles = ajouterEtoiles(avecDefi, etoilesGagnees);
  const { donnees: final, nouveaux: badgesGagnes } = attribuerBadges(avecEtoiles, date);

  stockage.ecrire(final);
  return {
    etoilesGagnees,
    bonusDefi,
    totalEtoiles: final.etoiles,
    soldeEtoiles: soldeEtoiles(final),
    etoilesSansErreur: etoilesDeLExercice - ETOILES_EXERCICE_TERMINE,
    prochainAchat: accessoireLeMoinsCher(final),
    badgesGagnes,
  };
}

/**
 * Un « gros succès » : un exercice sans erreur, un défi complet ou un badge gagné.
 * Un bilan sans `badgesGagnes` (écrit à la main) compte comme sans badge.
 * @param {Bilan} bilan
 * @returns {boolean}
 */
export function estGrosSucces(bilan) {
  const aGagneUnBadge = (bilan.badgesGagnes ?? []).length > 0;
  return bilan.etoilesGagnees > ETOILES_EXERCICE_TERMINE || aGagneUnBadge;
}
