// Logique pure de l'exercice « Les accords dans le groupe nominal » : les mots à écrire,
// la comparaison avec ce que l'élève a saisi et le groupe correct. Rien ici ne touche au DOM.

import { normaliserPourComparaison } from '../../coeur/texte.js';

/** Les mots que l'élève écrit (déterminants et adjectifs), dans l'ordre du groupe d'arrivée. */
export function motsASaisir(item) {
  return item.cible.filter((motAccorde) => motAccorde.saisie);
}

/** Le groupe nominal correct en entier : « les chattes noires ». */
export function groupeCorrect(item) {
  return item.cible.map((motAccorde) => motAccorde.mot).join(' ');
}

function forme(texte) {
  return normaliserPourComparaison(texte).toLowerCase();
}

/**
 * Compare un mot saisi au mot attendu et à ses variantes.
 * Les accents comptent ; la casse et les espaces autour sont ignorés ; un champ vide est faux.
 * @param {{mot: string, variantes?: string[]}} motAccorde
 * @param {string} saisie
 * @returns {boolean}
 */
export function estMotJuste(motAccorde, saisie) {
  const formesAcceptees = [motAccorde.mot, ...(motAccorde.variantes ?? [])].map(forme);
  return forme(saisie) !== '' && formesAcceptees.includes(forme(saisie));
}

/**
 * Le rapport de la vérification, un élément par mot à écrire.
 * @param {Object} item Un item `accord`.
 * @param {string[]} saisies Ce que l'élève a écrit, dans l'ordre de `motsASaisir(item)`.
 * @returns {{mot: string, saisie: string, juste: boolean}[]}
 */
export function rapportParMot(item, saisies) {
  return motsASaisir(item).map((motAccorde, rang) => ({
    mot: motAccorde.mot,
    saisie: saisies[rang],
    juste: estMotJuste(motAccorde, saisies[rang]),
  }));
}

/** Le groupe est juste quand chaque mot à écrire l'est. */
export function estGroupeJuste(rapport) {
  return rapport.every((ligne) => ligne.juste);
}

/** Le rang du premier champ vide, ou -1 s'ils sont tous remplis. */
export function rangDuPremierVide(saisies) {
  return saisies.findIndex((saisie) => saisie.trim() === '');
}
