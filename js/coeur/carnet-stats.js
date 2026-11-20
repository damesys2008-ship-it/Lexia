// Les chiffres que le Carnet tire de l'historique des séances : séances de la semaine et du mois, étoiles de la semaine.
// Fonctions pures : elles lisent l'historique et la date injectée, sans rien écrire.

import { ETOILES_EXERCICE_TERMINE, ETOILES_SANS_ERREUR, versJour } from './progression.js';

const JOURS_PAR_SEMAINE = 7;
const LONGUEUR_ANNEE_MOIS = 7; // « AAAA-MM »

/**
 * Le lundi et le dimanche de la semaine qui contient `date`.
 * @param {Date} date
 * @returns {{premier: string, dernier: string}} Jours AAAA-MM-JJ.
 */
function bornesDeLaSemaine(date) {
  const joursDepuisLundi = (date.getDay() + JOURS_PAR_SEMAINE - 1) % JOURS_PAR_SEMAINE;
  const lundi = new Date(date.getFullYear(), date.getMonth(), date.getDate() - joursDepuisLundi);
  const dimanche = new Date(lundi.getFullYear(), lundi.getMonth(), lundi.getDate() + JOURS_PAR_SEMAINE - 1);
  return { premier: versJour(lundi), dernier: versJour(dimanche) };
}

/**
 * Les étoiles d'une séance : celles de l'exercice terminé, plus celles du « sans aucune erreur ».
 * Le bonus du défi du jour n'est pas gardé dans l'historique : il n'est pas compté ici.
 * @param {{reussis: number, total: number}} seance
 * @returns {number}
 */
export function etoilesDeLaSeance({ reussis, total }) {
  return ETOILES_EXERCICE_TERMINE + (reussis === total ? ETOILES_SANS_ERREUR : 0);
}

/**
 * Séances de la semaine (du lundi au dimanche) qui contient `date`.
 * @param {import('./stockage.js').ResumeSeance[]} historique
 * @param {Date} date
 * @returns {import('./stockage.js').ResumeSeance[]}
 */
export function seancesDeLaSemaine(historique, date) {
  const { premier, dernier } = bornesDeLaSemaine(date);
  return historique.filter((seance) => seance.date >= premier && seance.date <= dernier);
}

/**
 * Séances du mois qui contient `date`.
 * @param {import('./stockage.js').ResumeSeance[]} historique
 * @param {Date} date
 * @returns {import('./stockage.js').ResumeSeance[]}
 */
export function seancesDuMois(historique, date) {
  const prefixe = versJour(date).slice(0, LONGUEUR_ANNEE_MOIS);
  return historique.filter((seance) => seance.date.startsWith(prefixe));
}

/**
 * Les trois chiffres du Carnet.
 * @param {import('./stockage.js').ResumeSeance[]} historique
 * @param {Date} date
 * @returns {{seancesSemaine: number, seancesMois: number, etoilesSemaine: number}}
 */
export function statistiquesDuCarnet(historique, date) {
  const deLaSemaine = seancesDeLaSemaine(historique, date);
  return {
    seancesSemaine: deLaSemaine.length,
    seancesMois: seancesDuMois(historique, date).length,
    etoilesSemaine: deLaSemaine.reduce((total, seance) => total + etoilesDeLaSeance(seance), 0),
  };
}
