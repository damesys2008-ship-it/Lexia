// Type `sens` de `vocabulaire.json` : choisir le sens d'un mot dans une phrase (contrat : schemas-vocabulaire.md §6).

import { reglesTextes } from './contenu-outils.js';
import { compterMotEntier, compterMots, reglesChoixEtReponse } from './contenu-vocabulaire-outils.js';

/** Nombre de définitions proposées (`choix`), par niveau. */
export const DEFINITIONS_PAR_NIVEAU = { 1: { min: 2, max: 2 }, 2: { min: 3, max: 3 }, 3: { min: 3, max: 4 } };

const MOTS_MIN_DE_LA_PHRASE = 6;
const MOTS_MAX_DE_LA_PHRASE = 14;
const PONCTUATION_FINALE = /[.!?…]$/;

function reglesPhrase(item) {
  const { phrase, mot } = item;
  const regles = [];
  const nombreDeMots = compterMots(phrase);
  if (nombreDeMots < MOTS_MIN_DE_LA_PHRASE || nombreDeMots > MOTS_MAX_DE_LA_PHRASE) {
    regles.push(`phrase doit avoir de ${MOTS_MIN_DE_LA_PHRASE} à ${MOTS_MAX_DE_LA_PHRASE} mots`);
  }
  if (!PONCTUATION_FINALE.test(phrase.trim())) {
    regles.push('phrase doit se terminer par une ponctuation');
  }
  if (compterMotEntier(phrase, mot) !== 1) {
    regles.push(`phrase doit contenir « ${mot} » une seule fois, comme mot entier`);
  }
  return regles;
}

/** Règles propres à `sens`. */
export function reglesSens(item) {
  const regles = reglesTextes(item, ['mot', 'phrase']);
  const nombre = DEFINITIONS_PAR_NIVEAU[item.niveau] ?? DEFINITIONS_PAR_NIVEAU[3];
  const reglesDuChoix = reglesChoixEtReponse(item, nombre);
  return regles.length > 0 ? [...regles, ...reglesDuChoix] : [...reglesPhrase(item), ...reglesDuChoix];
}
