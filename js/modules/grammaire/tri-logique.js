// Logique pure de l'exercice « Le tri des mots » : étiquettes, boîtes, évaluation, bonne réponse.
// Aucun accès au DOM : tout se teste dans Node.

import { motSansPonctuation } from '../../coeur/texte.js';
import { melanger } from '../orthographe/seance-logique.js';

/** Nom affiché de chaque boîte (les natures du contenu sont écrites sans accent). */
export const LIBELLES_NATURES = {
  nom: 'nom',
  verbe: 'verbe',
  adjectif: 'adjectif',
  determinant: 'déterminant',
  pronom: 'pronom',
  adverbe: 'adverbe',
  preposition: 'préposition',
  conjonction: 'conjonction',
};

/**
 * Les étiquettes de l'item, dans un ordre mélangé. L'id d'une étiquette est l'indice du mot dans la phrase :
 * deux mots identiques (« le », « le ») restent donc deux étiquettes distinctes.
 * @param {{mots: {texte: string}[]}} item
 * @param {function(): number} [aleatoire] Injectable pour les tests.
 * @returns {{id: string, texte: string}[]}
 */
export function creerEtiquettes(item, aleatoire = Math.random) {
  const etiquettes = item.mots.map((mot, indice) => ({ id: String(indice), texte: motSansPonctuation(mot.texte) }));
  return melanger(etiquettes, aleatoire);
}

/**
 * Les boîtes de l'item, dans l'ordre du contenu.
 * @param {{boites: string[]}} item
 * @returns {{id: string, titre: string}[]}
 */
export function creerBoites(item) {
  return item.boites.map((nature) => ({ id: nature, titre: LIBELLES_NATURES[nature] }));
}

/**
 * Compare le tri de l'élève à la solution : un résultat par étiquette.
 * Un mot resté dans la réserve est faux.
 * @param {{mots: {nature: string}[]}} item
 * @param {Record<string, string[]>} placements Pour chaque boîte, les id des étiquettes qu'elle contient.
 * @returns {Map<string, 'juste'|'faux'>}
 */
export function evaluerTri(item, placements) {
  const resultats = new Map();
  item.mots.forEach((mot, indice) => {
    const id = String(indice);
    resultats.set(id, placements[mot.nature]?.includes(id) ? 'juste' : 'faux');
  });
  return resultats;
}

/**
 * Dit si tous les mots sont dans la bonne boîte.
 * @param {Map<string, 'juste'|'faux'>} resultats
 * @returns {boolean}
 */
export function toutEstJuste(resultats) {
  return [...resultats.values()].every((resultat) => resultat === 'juste');
}

/**
 * La solution, mot par mot, dans l'ordre de la phrase : « Le (déterminant), petit (adjectif), … ».
 * @param {{mots: {texte: string, nature: string}[]}} item
 * @returns {string}
 */
export function decrireSolution(item) {
  return item.mots
    .map((mot) => `${motSansPonctuation(mot.texte)} (${LIBELLES_NATURES[mot.nature]})`)
    .join(', ');
}

/**
 * La solution rangée par boîte : seules les boîtes qui contiennent des mots, dans l'ordre du contenu.
 * @param {{boites: string[], mots: {texte: string, nature: string}[]}} item
 * @returns {{titre: string, mots: string[]}[]}
 */
export function grouperSolution(item) {
  return item.boites
    .map((nature) => ({
      titre: LIBELLES_NATURES[nature],
      mots: item.mots.filter((mot) => mot.nature === nature).map((mot) => motSansPonctuation(mot.texte)),
    }))
    .filter((groupe) => groupe.mots.length > 0);
}
