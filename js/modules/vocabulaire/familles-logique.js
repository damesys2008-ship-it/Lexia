// Logique pure de l'exercice « Les familles de mots » : la question, les mots à proposer, la bonne réponse.
// Aucun accès au DOM : tout se teste dans Node.

import { appliquerEspacesInsecables } from '../../coeur/texte.js';
import { melanger } from '../orthographe/seance-logique.js';

const ESSAIS_DE_MELANGE_MAX = 50;
const VOYELLES_INITIALES = /^[aeiouyàâéèêëîïôœùû]/i;

/** Les mots de l'item dans l'ordre du fichier : la famille, puis l'intrus. */
function motsDansLOrdreDuFichier(item) {
  return [...item.famille, item.intrus];
}

function memeOrdre(mots, autresMots) {
  return mots.every((mot, rang) => mot === autresMots[rang]);
}

/**
 * La question posée à l'élève, avec la base toujours affichée.
 * @param {{base: string}} item
 * @returns {string} par exemple « Un seul mot n'est pas de la famille de « fleur ». Lequel ? » (espaces insécables)
 */
export function phraseQuestion(item) {
  const de = VOYELLES_INITIALES.test(item.base) ? "d'" : 'de ';
  return appliquerEspacesInsecables(`Un seul mot n'est pas de la famille ${de}« ${item.base} ». Lequel ?`);
}

/**
 * Les mots à proposer : la famille et l'intrus, mélangés, jamais dans l'ordre du fichier.
 * Le texte du mot sert d'identifiant (les mots d'un item sont tous différents).
 * @param {{famille: string[], intrus: string}} item
 * @param {function(): number} [aleatoire] Injectable pour les tests.
 * @returns {{id: string, texte: string}[]}
 */
export function creerOptions(item, aleatoire = Math.random) {
  const ordreDuFichier = motsDansLOrdreDuFichier(item);
  let mots = melanger(ordreDuFichier, aleatoire);
  for (let essai = 1; essai < ESSAIS_DE_MELANGE_MAX && memeOrdre(mots, ordreDuFichier); essai += 1) {
    mots = melanger(ordreDuFichier, aleatoire);
  }
  if (memeOrdre(mots, ordreDuFichier)) {
    // Ordre de secours : un tirage figé ne doit pas laisser l'intrus toujours en dernier.
    mots = [...ordreDuFichier].reverse();
  }
  return mots.map((mot) => ({ id: mot, texte: mot }));
}

/**
 * Dit si le mot choisi est l'intrus.
 * @param {{intrus: string}} item
 * @param {string} mot
 * @returns {boolean}
 */
export function estLIntrus(item, mot) {
  return mot === item.intrus;
}

/**
 * Le texte lu par le bouton « Écouter » : la question, puis les mots proposés.
 * @param {{base: string}} item
 * @param {{texte: string}[]} options
 * @returns {string}
 */
export function texteAEcouter(item, options) {
  return `${phraseQuestion(item)} ${options.map((option) => option.texte).join(', ')}.`;
}
