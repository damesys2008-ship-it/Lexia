// Logique pure de l'exercice « Lettres muettes » : la découpe de la phrase autour du mot,
// la comparaison des lettres écrites et la mise en évidence de la lettre dans la famille de mots.
// Rien ici ne touche au DOM.

import { normaliserPourComparaison } from '../../coeur/texte.js';

/** Échappe un texte pour l'utiliser dans une expression régulière. */
function echapperPourExpression(texte) {
  return texte.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Coupe la phrase autour du mot (mot entier, la majuscule initiale est tolérée).
 * @param {{mot: string, phrase: string}} item
 * @returns {{avant: string, mot: string, apres: string}} `mot` est écrit comme dans la phrase.
 */
export function decouperPhrase(item) {
  const expression = new RegExp(`(?<!\\p{L})${echapperPourExpression(item.mot)}(?!\\p{L})`, 'iu');
  const trouve = expression.exec(item.phrase);
  if (trouve === null) {
    throw new Error(`Le mot «\u00a0${item.mot}\u00a0» est introuvable dans la phrase`);
  }
  const debut = trouve.index;
  const fin = debut + trouve[0].length;
  return { avant: item.phrase.slice(0, debut), mot: trouve[0], apres: item.phrase.slice(fin) };
}

/**
 * Le mot privé de ses lettres muettes finales.
 * @param {{lettres: string}} item
 * @param {string} motEcrit Le mot tel qu'il est écrit dans la phrase.
 * @returns {string}
 */
export function motSansLettres(item, motEcrit) {
  return motEcrit.slice(0, motEcrit.length - item.lettres.length);
}

/**
 * Dit combien de lettres l'élève doit trouver.
 * @param {{lettres: string}} item
 * @returns {string}
 */
export function annoncerNombreDeLettres(item) {
  return item.lettres.length === 1 ? '1 lettre muette à trouver' : `${item.lettres.length} lettres muettes à trouver`;
}

/**
 * Compare les lettres écrites aux lettres muettes attendues (la casse et les espaces sont ignorés).
 * @param {{lettres: string}} item
 * @param {string} saisie
 * @returns {boolean}
 */
export function estBonneSaisie(item, saisie) {
  const forme = (texte) => normaliserPourComparaison(texte).replace(/\s/g, '').toLowerCase();
  return forme(saisie) === forme(item.lettres);
}

/**
 * Montre où se trouve la lettre muette dans un mot de la famille, là où elle s'entend.
 * Si le mot ne la contient pas juste après le début commun, il est rendu sans mise en évidence.
 * @param {{mot: string, lettres: string}} item
 * @param {string} motDeFamille
 * @returns {{debut: string, lettres: string, fin: string}}
 */
export function mettreEnEvidence(item, motDeFamille) {
  const tailleDebut = item.mot.length - item.lettres.length;
  const apresDebut = motDeFamille.slice(tailleDebut, tailleDebut + item.lettres.length);
  if (apresDebut.toLowerCase() !== item.lettres.toLowerCase()) {
    return { debut: motDeFamille, lettres: '', fin: '' };
  }
  return {
    debut: motDeFamille.slice(0, tailleDebut),
    lettres: apresDebut,
    fin: motDeFamille.slice(tailleDebut + item.lettres.length),
  };
}

/**
 * Phrase qui dit quelle lettre on entend dans les mots de la famille.
 * @param {{lettres: string}} item
 * @returns {string}
 */
export function direCeQuOnEntend(item) {
  return item.lettres.length === 1 ? `on entend le ${item.lettres}` : `on entend les lettres ${item.lettres}`;
}
