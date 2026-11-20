// Validation des items de `lecture.json` (cahier §7.6, §8) : trois types mélangés, `texte`, `ordre` et `flash`.
// Contrat complet : .equipe/ressources/brief-lot3-2.md §1.1
// Un item se valide seul (`validerItemLecture`) ;
// le volume minimal du fichier se vérifie à part (`verifierVolumeLecture`).

import {
  decrire, estObjet, reglesCommunes, reglesIdentifiant, reglesTypographie,
} from './contenu-outils.js';
import { reglesTextesAffiches } from './contenu-lecture-affichage.js';
import { reglesFlash } from './contenu-lecture-flash.js';
import { reglesOrdre } from './contenu-lecture-ordre.js';
import { reglesTexte } from './contenu-lecture-texte.js';

export { compterMotsDuTexte, compterMotsUtiles, GENRES } from './contenu-lecture-texte.js';
export { reglesTextesAffiches } from './contenu-lecture-affichage.js';
export { TYPES_QUESTION } from './contenu-lecture-question.js';

/** Les trois types d'items mélangés dans `lecture.json`. */
export const TYPES_LECTURE = ['texte', 'ordre', 'flash'];

/** Nombre minimal d'items de chaque type, par niveau. */
export const VOLUME_MINIMUM_PAR_NIVEAU = { texte: 6, ordre: 6, flash: 18 };

const NIVEAUX = [1, 2, 3];
const GENRES_MINIMUM_PAR_NIVEAU = 3;
const CODE_ID_PAR_TYPE = { texte: 'tex', ordre: 'ord', flash: 'fla' };
const NOM_PLURIEL_PAR_TYPE = { texte: 'textes', ordre: 'ordres', flash: 'flash' };

const REGLES_PAR_TYPE = {
  texte: reglesTexte,
  ordre: reglesOrdre,
  flash: reglesFlash,
};

/**
 * Valide un item de `lecture.json`, sans regarder le volume du fichier.
 * @param {*} item
 * @returns {string[]} règles violées, chacune préfixée par l'id de l'item ; vide si l'item est valide
 */
export function validerItemLecture(item) {
  if (!estObjet(item)) {
    return ['(sans id) : l\'item doit être un objet'];
  }
  if (!TYPES_LECTURE.includes(item.type)) {
    return decrire(item, [`type inconnu : « ${item.type} »`]);
  }
  const regles = [
    ...reglesCommunes(item),
    ...reglesIdentifiant(item, 'lec', CODE_ID_PAR_TYPE),
    ...REGLES_PAR_TYPE[item.type](item),
    ...reglesTypographie(item),
    ...reglesTextesAffiches(item),
  ];
  return decrire(item, regles);
}

/**
 * Compte les items par niveau et par type (les items mal formés ne sont pas comptés).
 * @param {Array} items
 * @returns {Record<number, Record<string, number>>} ex. `{ 1: { texte: 6, ordre: 2, flash: 0 }, 2: …, 3: … }`
 */
export function decompterLecture(items) {
  const decompte = Object.fromEntries(NIVEAUX.map((niveau) => [
    niveau,
    Object.fromEntries(TYPES_LECTURE.map((type) => [type, 0])),
  ]));
  items
    .filter((item) => estObjet(item) && decompte[item.niveau]?.[item.type] !== undefined)
    .forEach((item) => { decompte[item.niveau][item.type] += 1; });
  return decompte;
}

function reglesVolumeDuNiveau(niveau, compte, items) {
  const regles = TYPES_LECTURE
    .filter((type) => compte[type] < VOLUME_MINIMUM_PAR_NIVEAU[type])
    .map((type) => {
      const nom = NOM_PLURIEL_PAR_TYPE[type];
      return `niveau ${niveau} : ${compte[type]} ${nom}, au moins ${VOLUME_MINIMUM_PAR_NIVEAU[type]} attendus`;
    });
  const textesDuNiveau = items.filter((item) => estObjet(item) && item.type === 'texte' && item.niveau === niveau);
  const genres = new Set(textesDuNiveau.map((item) => item.genre));
  if (genres.size < GENRES_MINIMUM_PAR_NIVEAU) {
    regles.push(`niveau ${niveau} : ${genres.size} genre(s) de texte, au moins ${GENRES_MINIMUM_PAR_NIVEAU} attendus`);
  }
  return regles;
}

/**
 * Vérifie le volume minimal du fichier : 6 textes, 6 ordres et 18 flash par niveau, 3 genres de texte par niveau.
 * @param {Array} items
 * @returns {string[]} les manques, vide si le volume est atteint
 */
export function verifierVolumeLecture(items) {
  const decompte = decompterLecture(items);
  return NIVEAUX.flatMap((niveau) => reglesVolumeDuNiveau(niveau, decompte[niveau], items));
}
