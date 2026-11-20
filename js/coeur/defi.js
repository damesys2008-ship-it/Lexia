/**
 * Défi du jour : choisir les exercices du jour et suivre l'avancement.
 * Fonctions pures : les données et la date sont fournies, de nouvelles données sont renvoyées.
 * Le plan ne garde que les familles : chaque écran choisit ses items au lancement (les dus d'abord).
 */

import { FAMILLES, NOMBRE_EXERCICES_DEFI } from './familles.js';
import { classerModulesParFaiblesse } from './modules-faibles.js';
import { reculerJour, versJour } from './progression.js';
import { BOITE_A_CONFIRMER } from './repetition.js';
import { itemsARevoir, situationDe } from './revisions.js';

/** @typedef {import('./stockage.js').ExerciceDuDefi} ExerciceDuDefi */

const ORIGINE_REVISION = 'revision';
const ORIGINE_FAIBLE = 'faible';

/**
 * Les items de chaque famille, à partir des fichiers de contenu déjà chargés.
 * @param {Object<string, Object[]>} fichiers Items valides par nom de contenu (voir `chargerContenu`).
 * @returns {Object<string, Object[]>} Items par clé de famille.
 */
export function contenusParFamille(fichiers) {
  const itemsDeLaFamille = ({ contenu, type }) => {
    const items = fichiers[contenu] ?? [];
    return type === null ? items : items.filter((item) => item.type === type);
  };
  return Object.fromEntries(FAMILLES.map((famille) => [famille.cle, itemsDeLaFamille(famille)]));
}

/** Combien d'items de la famille sont dus, dont combien ont été ratés (boîtes 1 à 5). */
function compterLesDus(famille, contenus, donnees, date) {
  const dus = itemsARevoir(contenus[famille.cle] ?? [], situationDe(donnees, famille.module, date));
  const rates = dus.filter((item) => donnees.repetition[item.id].boite !== BOITE_A_CONFIRMER);
  return { famille, dus: dus.length, rates: rates.length };
}

/** Les familles qui ont des items dus : celles qui ont le plus de ratés d'abord, puis le plus d'items dus. */
function planDesRevisions(contenus, donnees, date) {
  return FAMILLES
    .map((famille) => compterLesDus(famille, contenus, donnees, date))
    .filter((comptes) => comptes.dus > 0)
    .sort((a, b) => b.rates - a.rates || b.dus - a.dus)
    .slice(0, NOMBRE_EXERCICES_DEFI)
    .map((comptes) => ({ famille: comptes.famille.cle, origine: ORIGINE_REVISION }));
}

function rangDeLaDerniereSeance(historique, famille) {
  return historique.findLastIndex((seance) => seance.module === famille.module && seance.mode === famille.mode);
}

/** La famille du module jouée le moins récemment (jamais jouée : d'abord), absente du plan et avec du contenu. */
function familleLaMoinsRecente(module, plan, contenus, historique) {
  const disponibles = FAMILLES.filter(
    (famille) =>
      famille.module === module &&
      (contenus[famille.cle]?.length ?? 0) > 0 &&
      !plan.some((exercice) => exercice.famille === famille.cle),
  );
  const rang = (famille) => rangDeLaDerniereSeance(historique, famille);
  return disponibles.reduce((choisie, famille) => (rang(famille) < rang(choisie) ? famille : choisie), disponibles[0]);
}

/** Un tour : une famille de plus pour chaque module, du plus faible au plus fort, jusqu'à 5 exercices. */
function ajouterUnTour(plan, contenus, historique) {
  const nouveauPlan = [...plan];
  for (const module of classerModulesParFaiblesse(historique)) {
    if (nouveauPlan.length === NOMBRE_EXERCICES_DEFI) {
      break;
    }
    const famille = familleLaMoinsRecente(module, nouveauPlan, contenus, historique);
    if (famille) {
      nouveauPlan.push({ famille: famille.cle, origine: ORIGINE_FAIBLE });
    }
  }
  return nouveauPlan;
}

function completerParLesFaibles(plan, contenus, historique) {
  let courant = plan;
  while (courant.length < NOMBRE_EXERCICES_DEFI) {
    const suivant = ajouterUnTour(courant, contenus, historique);
    if (suivant.length === courant.length) {
      return suivant;
    }
    courant = suivant;
  }
  return courant;
}

/**
 * Compose les exercices du défi : d'abord les familles qui ont des items à revoir, puis, par tours,
 * une famille de chaque module en commençant par le plus faible. Une famille n'y est jamais deux fois,
 * une famille sans contenu y est ignorée. Aucun hasard : mêmes données, même plan.
 * @param {Object<string, Object[]>} contenus Items par clé de famille (voir `contenusParFamille`).
 * @param {import('./stockage.js').DonneesLexia} donnees
 * @param {Date} date Date du jour (injectée).
 * @returns {ExerciceDuDefi[]} Au plus `NOMBRE_EXERCICES_DEFI` exercices.
 */
export function composerDefi(contenus, donnees, date) {
  const revisions = planDesRevisions(contenus, donnees, date);
  return completerParLesFaibles(revisions, contenus, donnees.historique);
}

/**
 * Où en est le défi le jour donné.
 * @param {import('./stockage.js').DefiDuJour|null} defi `meta.defi`.
 * @param {string} jour Jour courant, AAAA-MM-JJ.
 * @returns {'neuf'|'en-cours'|'fait'} `neuf` : aucun défi aujourd'hui.
 */
export function etatDuDefi(defi, jour) {
  if (!defi || defi.jour !== jour) {
    return 'neuf';
  }
  return defi.faits === NOMBRE_EXERCICES_DEFI ? 'fait' : 'en-cours';
}

/**
 * Pose le défi du jour : aucun exercice fait, plan figé.
 * @param {import('./stockage.js').DonneesLexia} donnees
 * @param {ExerciceDuDefi[]} plan
 * @param {Date} date Date du jour (injectée).
 * @returns {import('./stockage.js').DonneesLexia}
 */
export function demarrerDefi(donnees, plan, date) {
  return { ...donnees, meta: { ...donnees.meta, defi: { jour: versJour(date), faits: 0, plan } } };
}

/**
 * Recule la date du défi de `jours` jours (réglages pour les grands : simuler les jours qui passent).
 * @param {import('./stockage.js').DefiDuJour|null} defi
 * @param {number} jours Nombre de jours à reculer (entier positif).
 * @returns {import('./stockage.js').DefiDuJour|null}
 */
export function reculerLeDefi(defi, jours) {
  return defi === null ? null : { ...defi, jour: reculerJour(defi.jour, jours) };
}
