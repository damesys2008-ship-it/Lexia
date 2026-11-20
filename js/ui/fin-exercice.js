/**
 * Raccord entre un écran d'exercice et ce qui se passe à la fin : le défi du jour s'y branche
 * par `contexte.defi` ; hors défi (propriété absente), l'écran se comporte comme d'habitude.
 *
 * Contrat de `contexte.defi` :
 *   nombreItems : nombre d'items d'une séance (lu par la séance de 12 familles) ;
 *   resultat    : champs ajoutés au résultat enregistré (`defiEtape`, `defiComplet`) ;
 *   creerFin    : remplace `creerFinSeance` (mêmes options, même rendu).
 */

import { creerFinSeance } from './fin-seance.js';

/**
 * Les champs du défi à ajouter au résultat d'un exercice ; rien hors défi.
 * @param {Object} contexte Contexte de l'application.
 * @returns {Object}
 */
export function resultatDuDefi(contexte) {
  return contexte.defi?.resultat ?? {};
}

/**
 * Crée l'écran de fin d'un exercice : celui du défi s'il y en a un, sinon la fin de séance habituelle.
 * @param {Object} contexte Contexte de l'application.
 * @param {Object} options Options de `creerFinSeance`.
 * @returns {Promise<{racine: HTMLElement, focaliser: function(): void}>}
 */
export function creerFinDeLExercice(contexte, options) {
  return (contexte.defi?.creerFin ?? creerFinSeance)(options);
}
