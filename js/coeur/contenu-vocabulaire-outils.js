// Outils communs aux validateurs de `vocabulaire.json` (un fichier par type d'item).

import { normaliserPourComparaison } from './texte.js';
import { estTexteNonVide } from './contenu-outils.js';

const MOTS_MAX_D_UNE_DEFINITION = 8;

/** Forme sous laquelle on compare deux textes : normalisée et sans différence de casse. */
export function formeComparable(texte) {
  return normaliserPourComparaison(texte).toLowerCase();
}

/** Vrai si les textes sont tous différents une fois comparés. */
export function sontTousDifferents(textes) {
  return new Set(textes.map(formeComparable)).size === textes.length;
}

function echapperPourExpression(texte) {
  return texte.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Nombre de fois où `mot` apparaît dans `texte` comme mot entier (l'apostrophe sépare les mots). */
export function compterMotEntier(texte, mot) {
  const motEntier = new RegExp(`(?<!\\p{L})${echapperPourExpression(mot)}(?!\\p{L})`, 'giu');
  return (texte.match(motEntier) ?? []).length;
}

/** Nombre de mots d'un texte (coupé aux espaces). */
export function compterMots(texte) {
  return texte.trim().split(/\s+/).length;
}

function decrireNombre({ min, max }) {
  return min === max ? `${min}` : `${min} à ${max}`;
}

function reglesDefinitions(item) {
  const regles = [];
  if (!sontTousDifferents(item.choix)) {
    regles.push('choix : les définitions doivent toutes être différentes');
  }
  item.choix
    .filter((definition) => estTexteNonVide(item.mot) && compterMotEntier(definition, item.mot) > 0)
    .forEach((definition) => regles.push(`choix : la définition « ${definition} » contient le mot « ${item.mot} »`));
  return regles;
}

function estUneDesDefinitions(choix, reponse) {
  return estTexteNonVide(reponse)
    && choix.some((definition) => formeComparable(definition) === formeComparable(reponse));
}

/**
 * Règles de `choix` (définitions) et de `reponse` (l'une d'elles) pour `affixe` et `sens`.
 * @param {Object} item
 * @param {{min: number, max: number}} nombre  nombre de définitions permis
 * @returns {string[]}
 */
export function reglesChoixEtReponse(item, nombre) {
  const { choix, reponse } = item;
  const formeValide = Array.isArray(choix) && choix.every(estTexteNonVide)
    && choix.length >= nombre.min && choix.length <= nombre.max;
  if (!formeValide) {
    return [`choix doit contenir ${decrireNombre(nombre)} définitions non vides`];
  }
  const regles = reglesDefinitions(item);
  if (!estUneDesDefinitions(choix, reponse)) {
    regles.push('reponse doit être l\'une des définitions de choix');
  }
  return regles;
}

/** Règle : aucune définition ne dépasse `MOTS_MAX_D_UNE_DEFINITION` mots (à appeler sur des choix valides). */
export function reglesDefinitionsCourtes(choix) {
  return choix
    .filter((definition) => compterMots(definition) > MOTS_MAX_D_UNE_DEFINITION)
    .map((definition) => `choix : « ${definition} » dépasse ${MOTS_MAX_D_UNE_DEFINITION} mots`);
}
