/**
 * Progression : étoiles, niveaux, historique et jours d'entraînement.
 * Toutes les fonctions sont pures : elles renvoient de nouvelles données
 * et ne modifient jamais celles qu'on leur donne.
 *
 * Échelle des étoiles (la monnaie de la garde-robe, dont les prix vont de 10 à 100) :
 * 15 étoiles pour un exercice terminé, 15 de plus s'il est sans erreur, 30 de plus pour un défi du jour complet.
 * C'est l'ancienne échelle (1, 1 et 2) multipliée par ETOILES_PAR_ANCIENNE_ETOILE : une ancienne sauvegarde
 * est convertie avec ce même facteur (migration de stockage.js), elle garde donc la même valeur.
 * Pour changer l'échelle, il suffit de changer les trois constantes ci-dessous.
 */

/** @typedef {import('./stockage.js').DonneesLexia} DonneesLexia */
/** @typedef {import('./stockage.js').ResumeSeance} ResumeSeance */

/** Facteur entre l'échelle d'avant la garde-robe à l'achat (1 étoile par exercice) et l'échelle actuelle. */
export const ETOILES_PAR_ANCIENNE_ETOILE = 15;

export const ETOILES_EXERCICE_TERMINE = ETOILES_PAR_ANCIENNE_ETOILE;
export const ETOILES_SANS_ERREUR = ETOILES_PAR_ANCIENNE_ETOILE;
export const ETOILES_DEFI_COMPLET = 2 * ETOILES_PAR_ANCIENNE_ETOILE;

export const NIVEAU_MIN = 1;
export const NIVEAU_MAX = 3;

/** Séances à jouer dans un module avant de lui reproposer un changement de niveau, après un refus. */
export const SEANCES_APRES_REFUS = 3;

/** Nombre de séances gardées : au-delà, les plus anciennes sont oubliées pour ménager le stockage. */
export const TAILLE_MAX_HISTORIQUE = 200;

const MS_PAR_JOUR = 24 * 60 * 60 * 1000;
const JOURS_PAR_SEMAINE = 7;
/** Longueur du début « AAAA-MM » d'un jour AAAA-MM-JJ. */
const LONGUEUR_ANNEE_MOIS = 7;

/**
 * Formate une date en jour local AAAA-MM-JJ.
 * @param {Date} date
 * @returns {string}
 */
export function versJour(date) {
  const mois = String(date.getMonth() + 1).padStart(2, '0');
  const jour = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${mois}-${jour}`;
}

/**
 * Nombre de jours entre deux jours AAAA-MM-JJ (négatif si `jourFin` précède `jourDebut`).
 * @param {string} jourDebut
 * @param {string} jourFin
 * @returns {number}
 */
export function ecartEnJours(jourDebut, jourFin) {
  const enMillisecondes = (jour) => {
    const [annee, mois, numero] = jour.split('-').map(Number);
    return Date.UTC(annee, mois - 1, numero);
  };
  return Math.round((enMillisecondes(jourFin) - enMillisecondes(jourDebut)) / MS_PAR_JOUR);
}

/**
 * Le jour AAAA-MM-JJ situé `jours` jours avant le jour donné. Calcul en UTC, comme `ecartEnJours`.
 * @param {string} jour
 * @param {number} jours Nombre de jours à reculer (entier positif).
 * @returns {string}
 */
export function reculerJour(jour, jours) {
  const [annee, mois, numero] = jour.split('-').map(Number);
  return new Date(Date.UTC(annee, mois - 1, numero - jours)).toISOString().slice(0, 10);
}

/**
 * Étoiles gagnées pour un exercice : 1 pour l'avoir terminé, +1 s'il est sans erreur.
 * Le bonus du défi du jour (`ETOILES_DEFI_COMPLET`) est ajouté une seule fois à la fin du défi.
 * @param {number} nbErreurs Nombre d'erreurs commises (0 ou plus).
 * @returns {number}
 * @throws {RangeError} Si `nbErreurs` n'est pas un entier positif ou nul.
 */
export function etoilesExercice(nbErreurs) {
  if (!Number.isInteger(nbErreurs) || nbErreurs < 0) {
    throw new RangeError(`Nombre d'erreurs invalide : ${nbErreurs}`);
  }
  return ETOILES_EXERCICE_TERMINE + (nbErreurs === 0 ? ETOILES_SANS_ERREUR : 0);
}

/**
 * Étoiles à dépenser dans la garde-robe : gagnées moins dépensées.
 * @param {DonneesLexia} donnees
 * @returns {number}
 */
export function soldeEtoiles(donnees) {
  return donnees.etoiles - donnees.etoilesDepensees;
}

/**
 * Ajoute des étoiles gagnées. Le total gagné ne diminue jamais : les achats se comptent à part (`etoilesDepensees`).
 * @param {DonneesLexia} donnees
 * @param {number} nombre Entier positif ou nul.
 * @returns {DonneesLexia}
 * @throws {RangeError} Si `nombre` est négatif ou non entier.
 */
export function ajouterEtoiles(donnees, nombre) {
  if (!Number.isInteger(nombre) || nombre < 0) {
    throw new RangeError(`Nombre d'étoiles invalide : ${nombre}`);
  }
  return { ...donnees, etoiles: donnees.etoiles + nombre };
}

/**
 * Niveau d'un module (1 par défaut).
 * @param {DonneesLexia} donnees
 * @param {string} module
 * @returns {number}
 */
export function niveauModule(donnees, module) {
  return donnees.niveaux[module] ?? NIVEAU_MIN;
}

/**
 * Fixe le niveau d'un module.
 * @param {DonneesLexia} donnees
 * @param {string} module
 * @param {number} niveau Entier de 1 à 3.
 * @returns {DonneesLexia}
 * @throws {RangeError} Si le niveau est hors de 1 à 3.
 */
export function definirNiveau(donnees, module, niveau) {
  if (!Number.isInteger(niveau) || niveau < NIVEAU_MIN || niveau > NIVEAU_MAX) {
    throw new RangeError(`Niveau invalide : ${niveau}`);
  }
  return { ...donnees, niveaux: { ...donnees.niveaux, [module]: niveau } };
}

/** Ajoute un échec à chaque compétence ratée, sans modifier le carnet reçu. */
function compterCompetencesRatees(competencesRatees, nouvelles) {
  const resultat = { ...competencesRatees };
  for (const competence of nouvelles) {
    resultat[competence] = (resultat[competence] ?? 0) + 1;
  }
  return resultat;
}

function estResultatValide(reussis, total) {
  return Number.isInteger(total) && total >= 1 && Number.isInteger(reussis) && reussis >= 0 && reussis <= total;
}

/** Une séance de plus jouée dans le module : le compte à rebours du refus baisse, la clé disparaît à 0. */
function decompterRefus(refus, module) {
  if (!Object.hasOwn(refus, module)) {
    return refus;
  }
  const { [module]: restant, ...autres } = refus;
  return restant > 1 ? { ...autres, [module]: restant - 1 } : autres;
}

/** Le résumé gardé dans l'historique ; `niveau` n'y figure que s'il est fourni (jamais `niveau: undefined`). */
function creerResume(seance, jour) {
  const { module, mode, itemId, reussis, total, competencesRatees, niveau } = seance;
  return {
    module,
    mode,
    itemId,
    reussis,
    total,
    competencesRatees: [...competencesRatees],
    ...(niveau === undefined ? {} : { niveau }),
    date: jour,
  };
}

/**
 * Enregistre le résumé d'une séance : historique, carnet, jours d'entraînement
 * et compte à rebours du refus de changement de niveau.
 * @param {DonneesLexia} donnees
 * @param {Object} seance
 * @param {string} seance.module
 * @param {string} seance.mode
 * @param {string} seance.itemId
 * @param {number} seance.reussis
 * @param {number} seance.total
 * @param {string[]} seance.competencesRatees
 * @param {number} [seance.niveau] Niveau (1 à 3) auquel la séance a été jouée.
 * @param {Date} seance.date Date de la séance (injectée).
 * @returns {DonneesLexia}
 * @throws {RangeError} Si `reussis` n'est pas compris entre 0 et `total`, ou si `total` est nul.
 */
export function enregistrerSeance(donnees, seance) {
  const { module, reussis, total, competencesRatees, date } = seance;
  if (!estResultatValide(reussis, total)) {
    throw new RangeError(`Résultat invalide : ${reussis} réussis sur ${total}`);
  }
  const jour = versJour(date);
  const resume = creerResume(seance, jour);
  const jours = donnees.meta.joursEntrainement;
  return {
    ...donnees,
    historique: [...donnees.historique, resume].slice(-TAILLE_MAX_HISTORIQUE),
    carnet: {
      ...donnees.carnet,
      competencesRatees: compterCompetencesRatees(donnees.carnet.competencesRatees, competencesRatees),
    },
    meta: {
      ...donnees.meta,
      joursEntrainement: jours.includes(jour) ? jours : [...jours, jour],
      derniereSeance: jour,
      refus: decompterRefus(donnees.meta.refus, module),
    },
  };
}

/** Les jours d'entraînement sans doublon : un import peut en contenir. */
function joursDistincts(donnees) {
  return [...new Set(donnees.meta.joursEntrainement)];
}

/**
 * Jours d'entraînement de la semaine (du lundi au dimanche) qui contient `date`.
 * @param {DonneesLexia} donnees
 * @param {Date} date Date du jour (injectée).
 * @returns {string[]} Jours AAAA-MM-JJ.
 */
export function joursEntrainementSemaine(donnees, date) {
  const joursDepuisLundi = (date.getDay() + JOURS_PAR_SEMAINE - 1) % JOURS_PAR_SEMAINE;
  const lundi = new Date(date.getFullYear(), date.getMonth(), date.getDate() - joursDepuisLundi);
  const dimanche = new Date(lundi.getFullYear(), lundi.getMonth(), lundi.getDate() + JOURS_PAR_SEMAINE - 1);
  const premier = versJour(lundi);
  const dernier = versJour(dimanche);
  return joursDistincts(donnees).filter((jour) => jour >= premier && jour <= dernier);
}

/**
 * Jours d'entraînement du mois qui contient `date`.
 * @param {DonneesLexia} donnees
 * @param {Date} date Date du jour (injectée).
 * @returns {string[]} Jours AAAA-MM-JJ.
 */
export function joursEntrainementMois(donnees, date) {
  const prefixe = versJour(date).slice(0, LONGUEUR_ANNEE_MOIS);
  return joursDistincts(donnees).filter((jour) => jour.startsWith(prefixe));
}
