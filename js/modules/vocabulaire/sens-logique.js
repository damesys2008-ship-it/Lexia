// Logique pure de l'exercice « Un mot, plusieurs sens » : la phrase coupée autour du mot, les définitions, la réponse.
// Aucun accès au DOM : tout se teste dans Node.

import { melanger } from '../orthographe/seance-logique.js';

function echapperPourExpression(texte) {
  return texte.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Coupe la phrase autour du mot, qui est cherché comme mot entier sans tenir compte de la casse.
 * L'apostrophe sépare les mots : « l'ordre » contient « ordre ». Le mot rendu garde la casse de la phrase.
 * @param {{phrase: string, mot: string}} item  `mot` figure une seule fois dans `phrase` (vérifié au chargement)
 * @returns {{avant: string, mot: string, apres: string}}
 * @throws {Error} si le mot est absent de la phrase
 */
export function decouperPhrase(item) {
  const motEntier = new RegExp(`(?<!\\p{L})${echapperPourExpression(item.mot)}(?!\\p{L})`, 'iu');
  const trouve = motEntier.exec(item.phrase);
  if (trouve === null) {
    throw new Error(`decouperPhrase : « ${item.mot} » est absent de la phrase « ${item.phrase} »`);
  }
  const fin = trouve.index + trouve[0].length;
  return { avant: item.phrase.slice(0, trouve.index), mot: trouve[0], apres: item.phrase.slice(fin) };
}

/**
 * Les définitions à proposer, mélangées. Le texte de la définition sert d'identifiant.
 * @param {{choix: string[]}} item
 * @param {function(): number} [aleatoire] Injectable pour les tests.
 * @returns {{id: string, texte: string}[]}
 */
export function creerOptions(item, aleatoire = Math.random) {
  return melanger(item.choix, aleatoire).map((definition) => ({ id: definition, texte: definition }));
}

/**
 * Dit si la définition choisie est la bonne.
 * @param {{reponse: string}} item
 * @param {string} definition
 * @returns {boolean}
 */
export function estLaBonneDefinition(item, definition) {
  return definition === item.reponse;
}
