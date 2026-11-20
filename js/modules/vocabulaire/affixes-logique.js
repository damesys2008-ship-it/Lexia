// Logique pure de l'exercice « Préfixes et suffixes » (aucun accès au DOM).
//
// Un item `affixe` se joue en deux temps : construire le mot avec ses pièces, puis choisir son sens.
// L'id d'une pièce est son rang dans `item.pieces` ; l'id d'une définition est son rang dans `item.choix`.

import { melanger } from '../orthographe/seance-logique.js';

/** Id de l'unique zone de l'exercice : le mot que l'élève construit. */
export const ZONE_MOT = 'mot';

const ESSAIS_DE_MELANGE_MAX = 50;
const ESPACE_INSECABLE = ' ';

function rangs(liste) {
  return Array.from(liste.keys());
}

function ordreJuste(item) {
  return rangs(item.pieces);
}

function sontDansLeMemeOrdre(ordre, autre) {
  return ordre.length === autre.length && ordre.every((rang, position) => rang === autre[position]);
}

/**
 * Les pièces à ranger, dans un ordre mélangé qui n'est jamais l'ordre juste.
 * @param {{pieces: Array<{texte: string}>}} item
 * @param {function(): number} [aleatoire] Injectable pour les tests.
 * @returns {{id: string, texte: string}[]}
 */
export function creerPieces(item, aleatoire = Math.random) {
  let ordre = melanger(rangs(item.pieces), aleatoire);
  for (let essai = 1; essai < ESSAIS_DE_MELANGE_MAX && sontDansLeMemeOrdre(ordre, ordreJuste(item)); essai += 1) {
    ordre = melanger(rangs(item.pieces), aleatoire);
  }
  if (sontDansLeMemeOrdre(ordre, ordreJuste(item))) {
    // Ordre de secours : un tirage figé ne doit pas laisser le mot déjà construit.
    ordre = [...ordre].reverse();
  }
  return ordre.map((rang) => ({ id: String(rang), texte: item.pieces[rang].texte }));
}

/**
 * La zone où l'élève range les pièces : une seule, ordonnée, qui peut toutes les contenir.
 * @param {{pieces: Array<Object>}} item
 * @returns {{id: string, titre: string, ordonnee: boolean, capacite: number}[]}
 */
export function creerZoneMot(item) {
  return [{ id: ZONE_MOT, titre: 'Ton mot', ordonnee: true, capacite: item.pieces.length }];
}

/**
 * Les rangs des pièces dans l'ordre choisi par l'élève.
 * @param {Record<string, string[]>} placements Placements du composant « déposer ».
 * @returns {number[]}
 */
export function lireOrdre(placements) {
  return (placements[ZONE_MOT] ?? []).map(Number);
}

/** Le mot formé par ces pièces, collées les unes aux autres. */
export function construireMot(item, ordre) {
  return ordre.map((rang) => item.pieces[rang].texte).join('');
}

/** Dit si les pièces, dans cet ordre, forment le mot de l'item. */
export function estLeBonMot(item, ordre) {
  return construireMot(item, ordre) === item.mot;
}

/**
 * Un résultat par pièce : juste si elle est à la place qu'elle a dans le mot.
 * @returns {Map<string, 'juste'|'faux'>} clés : les id des pièces
 */
export function evaluerPieces(ordre) {
  return new Map(ordre.map((rang, position) => [String(rang), rang === position ? 'juste' : 'faux']));
}

/**
 * Les définitions proposées, dans un ordre mélangé.
 * @param {{choix: string[]}} item
 * @param {function(): number} [aleatoire] Injectable pour les tests.
 * @returns {{id: string, texte: string}[]}
 */
export function creerDefinitions(item, aleatoire = Math.random) {
  return melanger(rangs(item.choix), aleatoire).map((rang) => ({ id: String(rang), texte: item.choix[rang] }));
}

/** L'id de la bonne définition. */
export function idDeLaBonneDefinition(item) {
  return String(item.choix.indexOf(item.reponse));
}

/** Dit si l'id choisi est celui de la bonne définition. */
export function estLaBonneDefinition(item, id) {
  return id === idDeLaBonneDefinition(item);
}

/** La question du second temps, avec les espaces insécables des guillemets et du point d'interrogation. */
export function poserLaQuestion(item) {
  return `Que veut dire${ESPACE_INSECABLE}«${ESPACE_INSECABLE}${item.mot}${ESPACE_INSECABLE}»${ESPACE_INSECABLE}?`;
}

/** La bonne réponse en une phrase, pour la correction de la séance et de l'écran. */
export function decrireCorrection(item) {
  return `${item.mot} (${item.reponse})`;
}
