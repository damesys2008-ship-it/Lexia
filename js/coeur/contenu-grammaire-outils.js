// Outils communs aux validateurs de `grammaire.json` (un fichier par type d'item).

import { normaliserPourComparaison } from './texte.js';
import { estTexteNonVide } from './contenu-outils.js';

/** Vrai si les deux textes sont égaux une fois normalisés (espaces, apostrophes). */
export function sontMemesTextes(texte, autreTexte) {
  return normaliserPourComparaison(texte) === normaliserPourComparaison(autreTexte);
}

/**
 * Règle : les mots d'affichage, mis bout à bout, redonnent la phrase.
 * @param {*} item
 * @param {string[]} mots  les textes des mots, déjà vérifiés
 * @returns {string[]}
 */
export function reglesMotsEgalPhrase(item, mots) {
  if (!estTexteNonVide(item.phrase) || sontMemesTextes(mots.join(' '), item.phrase)) {
    return [];
  }
  return ['mots, mis bout à bout, doivent redonner la phrase'];
}
