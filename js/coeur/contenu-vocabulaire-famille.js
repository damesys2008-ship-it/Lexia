// Type `famille` de `vocabulaire.json` : trouver l'intrus d'une famille de mots (contrat : schemas-vocabulaire.md §4).

import { estTexteNonVide, reglesTextes } from './contenu-outils.js';
import { sontTousDifferents } from './contenu-vocabulaire-outils.js';

/** Nombre de mots de `famille` (sans l'intrus), par niveau. */
export const MOTS_DE_FAMILLE_PAR_NIVEAU = { 1: 3, 2: 4, 3: 5 };

const UN_SEUL_MOT_EN_MINUSCULES = /^\p{Ll}+$/u;

function reglesMotsDeFamille(item) {
  const attendu = MOTS_DE_FAMILLE_PAR_NIVEAU[item.niveau];
  const { famille } = item;
  const nombreValide = attendu === undefined || famille?.length === attendu;
  if (Array.isArray(famille) && famille.every(estTexteNonVide) && nombreValide) {
    return [];
  }
  const nombre = attendu === undefined ? 'des' : `${attendu}`;
  return [`famille doit contenir ${nombre} mots non vides (niveau ${item.niveau})`];
}

function reglesFormeDesMots(mots) {
  return mots
    .filter((mot) => !UN_SEUL_MOT_EN_MINUSCULES.test(mot))
    .map((mot) => `« ${mot} » doit être un seul mot en minuscules, sans espace ni trait d'union`);
}

/** Règles propres à `famille`. */
export function reglesFamille(item) {
  const regles = [...reglesTextes(item, ['base', 'intrus']), ...reglesMotsDeFamille(item)];
  if (regles.length > 0) {
    return regles;
  }
  const mots = [item.base, ...item.famille, item.intrus];
  if (!sontTousDifferents(mots)) {
    regles.push('base, famille et intrus doivent être des mots tous différents');
  }
  return [...regles, ...reglesFormeDesMots(mots)];
}
