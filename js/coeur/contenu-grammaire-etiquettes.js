// Validation du type `etiquettes` (phrases en étiquettes) de `grammaire.json`.
// Contrat : .equipe/ressources/schemas-grammaire.md §5

import { estListeDeTextes, estTexteNonVide } from './contenu-outils.js';
import { sontMemesTextes } from './contenu-grammaire-outils.js';

const PONCTUATIONS = ['.', '!'];
const GROUPES_PAR_NIVEAU = { 1: [3, 4], 2: [4, 5], 3: [5, 6] };
const SOLUTIONS_MAX_PAR_NIVEAU = { 1: 1, 2: 1, 3: 3 };
const PONCTUATION_FINALE = /[.!?…]$/;

/** Phrase obtenue en plaçant les groupes dans l'ordre d'une solution (majuscule et ponctuation ajoutées). */
export function reconstruirePhrase(groupes, solution, ponctuation) {
  const texte = solution.map((indice) => groupes[indice]).join(' ');
  return `${texte.charAt(0).toUpperCase()}${texte.slice(1)}${ponctuation}`;
}

function estPermutation(solution, taille) {
  return Array.isArray(solution)
    && solution.length === taille
    && new Set(solution).size === taille
    && solution.every((indice) => Number.isInteger(indice) && indice >= 0 && indice < taille);
}

// --- Groupes ---

function reglesNombreDeGroupes(item) {
  const bornes = GROUPES_PAR_NIVEAU[item.niveau];
  if (bornes === undefined) {
    return [];
  }
  const [minimum, maximum] = bornes;
  if (item.groupes.length < minimum || item.groupes.length > maximum) {
    return [`groupes doit contenir de ${minimum} à ${maximum} textes au niveau ${item.niveau}`];
  }
  return [];
}

function reglesTexteDesGroupes(groupes) {
  const regles = [];
  if (new Set(groupes).size !== groupes.length) {
    regles.push('groupes : les textes doivent tous être différents');
  }
  if (groupes.some((groupe) => groupe.includes(','))) {
    regles.push('groupes : pas de virgule dans les étiquettes');
  }
  if (groupes.some((groupe) => PONCTUATION_FINALE.test(groupe.trim()))) {
    regles.push('groupes : pas de ponctuation finale dans les étiquettes');
  }
  return regles;
}

function reglesGroupes(item) {
  if (!estListeDeTextes(item.groupes)) {
    return ['groupes doit être une liste de textes non vides'];
  }
  return [...reglesNombreDeGroupes(item), ...reglesTexteDesGroupes(item.groupes)];
}

// --- Solutions ---

function reglesNombreDeSolutions(item) {
  const maximum = SOLUTIONS_MAX_PAR_NIVEAU[item.niveau];
  if (maximum !== undefined && item.solutions.length > maximum) {
    return [`solutions : au plus ${maximum} au niveau ${item.niveau}`];
  }
  return [];
}

function reglesPermutations(item) {
  const taille = item.groupes.length;
  const regles = item.solutions
    .map((solution, position) => ({ solution, position }))
    .filter(({ solution }) => !estPermutation(solution, taille))
    .map(({ position }) => `solutions[${position}] doit contenir chaque indice de 0 à ${taille - 1} une seule fois`);
  const premiere = item.solutions[0];
  const identite = Array.isArray(premiere) && premiere.every((indice, position) => indice === position);
  if (regles.length === 0 && !identite) {
    regles.push('solutions[0] doit être l\'ordre d\'origine [0, 1, 2…]');
  }
  return regles;
}

function reglesPhrases(item) {
  const phrases = item.solutions.map((solution) => reconstruirePhrase(item.groupes, solution, item.ponctuation));
  const regles = [];
  if (estTexteNonVide(item.phrase) && !sontMemesTextes(phrases[0], item.phrase)) {
    regles.push(`phrase doit être « ${phrases[0]} » (solutions[0] avec majuscule et ponctuation)`);
  }
  if (new Set(phrases).size !== phrases.length) {
    regles.push('solutions : deux solutions donnent la même phrase');
  }
  return regles;
}

function reglesSolutions(item) {
  if (!Array.isArray(item.solutions) || item.solutions.length === 0) {
    return ['solutions doit être une liste non vide'];
  }
  const reglesDeForme = [...reglesNombreDeSolutions(item), ...reglesPermutations(item)];
  return reglesDeForme.length > 0 ? reglesDeForme : reglesPhrases(item);
}

// --- Point d'entrée ---

/**
 * Règles propres au type `etiquettes`.
 * @param {*} item
 * @returns {string[]}
 */
export function reglesEtiquettes(item) {
  const regles = reglesGroupes(item);
  if (!PONCTUATIONS.includes(item.ponctuation)) {
    regles.push('ponctuation doit être « . » ou « ! »');
  }
  if (!estListeDeTextes(item.groupes) || !PONCTUATIONS.includes(item.ponctuation)) {
    return regles;
  }
  return [...regles, ...reglesSolutions(item)];
}
