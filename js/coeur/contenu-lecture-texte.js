// Règles des items `texte` de `lecture.json` (texte découpé en phrases + 5 à 8 questions).
// Contrat : .equipe/ressources/brief-lot3-2.md §1.1.

import { estListeDeTextes, reglesTextes } from './contenu-outils.js';
import { reglesQuestions } from './contenu-lecture-question.js';

export const GENRES = ['recit', 'documentaire', 'lettre', 'poeme', 'bd'];

const MOTS_MIN_PAR_PHRASE = 3;
// Longueur en « mots utiles » (jetons qui contiennent une lettre ou un chiffre), par niveau.
const LONGUEUR_PAR_NIVEAU = { 1: { min: 150, max: 230 }, 2: { min: 220, max: 320 }, 3: { min: 300, max: 400 } };
const CONTIENT_LETTRE_OU_CHIFFRE = /[\p{L}\p{N}]/u;

/** Nombre de mots utiles d'un texte : les jetons qui contiennent une lettre ou un chiffre (« — » ne compte pas). */
export function compterMotsUtiles(texte) {
  return texte.split(/\s+/).filter((jeton) => CONTIENT_LETTRE_OU_CHIFFRE.test(jeton)).length;
}

/** Nombre de mots utiles de tout un item `texte` valide dans sa forme (paragraphes de phrases). */
export function compterMotsDuTexte(item) {
  return item.paragraphes.flat().reduce((total, phrase) => total + compterMotsUtiles(phrase), 0);
}

function sontDesParagraphesDePhrases(paragraphes) {
  return Array.isArray(paragraphes) && paragraphes.length > 0
    && paragraphes.every((paragraphe) => (
      Array.isArray(paragraphe) && paragraphe.length > 0 && estListeDeTextes(paragraphe)
    ));
}

function reglesPhrases(phrases) {
  return phrases
    .map((phrase, index) => ({ phrase, numero: index + 1 }))
    .filter(({ phrase }) => compterMotsUtiles(phrase) < MOTS_MIN_PAR_PHRASE)
    .map(({ numero }) => `phrase ${numero} : au moins ${MOTS_MIN_PAR_PHRASE} mots (cible tactile trop petite)`);
}

function reglesLongueur(niveau, phrases) {
  const bornes = LONGUEUR_PAR_NIVEAU[niveau];
  if (bornes === undefined) {
    return [];
  }
  const mots = phrases.reduce((total, phrase) => total + compterMotsUtiles(phrase), 0);
  if (mots < bornes.min || mots > bornes.max) {
    return [`texte de ${mots} mots, attendu ${bornes.min} à ${bornes.max}`];
  }
  return [];
}

/**
 * Règles propres à un item de type `texte` (les règles communes sont dans `contenu-lecture.js`).
 * @param {Object} item
 * @returns {string[]}
 */
export function reglesTexte(item) {
  const regles = reglesTextes(item, ['titre']);
  if (!GENRES.includes(item.genre)) {
    regles.push(`genre doit être l'un de : ${GENRES.join(', ')}`);
  }
  if (!sontDesParagraphesDePhrases(item.paragraphes)) {
    return [...regles, 'paragraphes doit être une liste de paragraphes, chacun une liste de phrases non vides'];
  }
  const phrases = item.paragraphes.flat();
  return [
    ...regles,
    ...reglesPhrases(phrases),
    ...reglesLongueur(item.niveau, phrases),
    ...reglesQuestions(item, phrases),
  ];
}
