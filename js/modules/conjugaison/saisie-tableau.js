// Grille de saisie des niveaux B et C : un champ par personne, vérification en deux temps.
//
// 1re vérification : les formes justes sont validées (✓), les autres reçoivent un indice (✗).
// 2e vérification : les formes encore fausses reçoivent leur correction. Puis le tableau correct
// et la règle sont affichés par `terminerExercice` (principe 3 : indice avant réponse).

import { creerChampTexte } from '../../ui/champ-texte.js';
import { creer, creerBouton, jouerSon, terminerExercice } from './ecran.js';
import { evaluerTableau, personnesDuTemps, pronomAffiche, pronomPourLecteur } from './logique.js';

const VERIFICATIONS_AVANT_CORRECTION = 2;

async function creerLigne(item, personne, options) {
  const ligne = creer('div', 'conjugaison__ligne');
  const pronom = creer('span', 'conjugaison__pronom', pronomAffiche(item, personne));
  const radical = creer('span', 'conjugaison__radical', options.radicalAffiche(item, personne));
  const { racine, champ } = await creerChampTexte({
    etiquette: `${options.etiquette} pour ${pronomPourLecteur(personne)}`,
  });
  const marque = creer('span', 'conjugaison__marque');
  marque.setAttribute('aria-live', 'polite');
  ligne.append(pronom, radical, racine, marque);
  return { ligne, champ, marque };
}

/** Marque une cellule juste : validée, non modifiable, avec ✓ en plus de la couleur. */
function marquerJuste(cellule) {
  cellule.champ.readOnly = true;
  cellule.ligne.classList.add('conjugaison__ligne--juste');
  cellule.marque.textContent = '✓ Juste';
}

/** Marque une cellule fausse : « Presque ! », ✗ en plus de la couleur, avec l'indice ou la correction. */
function marquerFausse(cellule, message) {
  cellule.ligne.classList.add('conjugaison__ligne--fausse');
  cellule.marque.textContent = `✗ Presque ! ${message}`;
}

/** Affiche le résultat de chaque cellule ; `messagePour(personne)` donne l'indice ou la correction des fausses. */
function afficherEvaluation(cellules, evaluation, messagePour) {
  for (const { personne, juste } of evaluation.cellules) {
    const cellule = cellules.get(personne);
    cellule.ligne.classList.remove('conjugaison__ligne--fausse');
    if (juste) {
      marquerJuste(cellule);
    } else {
      marquerFausse(cellule, messagePour(personne));
    }
  }
}

/** Plus rien ne se modifie une fois la correction affichée : la recopier ne doit pas rapporter d'étoile. */
function figerLesChamps(cellules) {
  for (const { champ } of cellules.values()) {
    champ.readOnly = true;
  }
}

/**
 * `premiere` : la toute première vérification. Elle seule décide des étoiles et de « réussi » : une erreur corrigée
 * ensuite reste une erreur. `evaluation` (la dernière) dit quelle compétence reste à revoir.
 */
export function resultatDeLExercice(item, evaluation, premiere) {
  return {
    reussis: premiere.nombreJustes,
    total: premiere.cellules.length,
    competencesRatees: evaluation.nombreFausses > 0 ? [item.competence] : [],
    reussi: premiere.nombreFausses === 0,
  };
}

async function creerGrille(item, options, surEntree) {
  const cellules = new Map();
  const grille = creer('div', 'conjugaison__grille');
  for (const personne of personnesDuTemps(item)) {
    const cellule = await creerLigne(item, personne, options);
    cellule.champ.addEventListener('keydown', (evenement) => {
      if (evenement.key === 'Enter') {
        evenement.preventDefault();
        surEntree();
      }
    });
    cellules.set(personne, cellule);
    grille.append(cellule.ligne);
  }
  grille.addEventListener('focusin', (evenement) => {
    const ligneActive = evenement.target.closest('.conjugaison__ligne');
    for (const { ligne } of cellules.values()) {
      ligne.classList.toggle('conjugaison__ligne--active', ligne === ligneActive);
    }
  });
  return { grille, cellules };
}

function lireSaisies(cellules) {
  const saisies = {};
  cellules.forEach((cellule, personne) => {
    saisies[personne] = cellule.champ.value;
  });
  return saisies;
}

/**
 * Joue un tableau à saisir.
 * @param {Object} exercice Fourni par `monterConjugaison`.
 * @param {Object} options
 * @param {string} options.etiquette Début du nom du champ pour les lecteurs d'écran (« Terminaison », « Forme »).
 * @param {function(Object, string): string} options.radicalAffiche Texte donné avant le champ pour une personne.
 * @param {function(Object, Object<string, string>): Object<string, string>} options.versFormesEntieres
 *   Transforme ce qui est tapé en formes entières à comparer.
 * @param {function(Object, string): string} options.indice Indice d'une personne, sans la réponse.
 * @returns {Promise<void>}
 */
export async function jouerSaisie(exercice, options) {
  const { item, carte, contexte } = exercice;
  let verifications = 0;
  let premiereEvaluation = null;
  let termine = false;

  function verifier() {
    if (termine) {
      return;
    }
    verifications += 1;
    const formes = options.versFormesEntieres(item, lireSaisies(cellules));
    const evaluation = evaluerTableau(item, formes);
    premiereEvaluation ??= evaluation;
    termine = evaluation.nombreFausses === 0 || verifications >= VERIFICATIONS_AVANT_CORRECTION;
    const messagePour = termine
      ? (personne) => `La bonne forme : ${item.formes[personne]}.`
      : (personne) => options.indice(item, personne);
    afficherEvaluation(cellules, evaluation, messagePour);
    jouerSon(exercice, evaluation.nombreFausses === 0 ? 'juste' : 'faux');
    if (!termine) {
      carte.zoneRetour.textContent = 'Corrige les formes marquées, puis vérifie de nouveau.';
      return;
    }
    figerLesChamps(cellules);
    carte.zoneActions.replaceChildren(creerBouton('Voir le tableau', 'bouton--principal', () => {
      terminerExercice(exercice, resultatDeLExercice(item, evaluation, premiereEvaluation))
        .catch((erreur) => contexte.signaler('Fin de séance impossible', erreur));
    }));
  }

  const { grille, cellules } = await creerGrille(item, options, verifier);
  carte.zoneExercice.append(grille);
  carte.zoneActions.append(creerBouton('Vérifier', 'bouton--principal', verifier));
  cellules.values().next().value.champ.focus();
}
