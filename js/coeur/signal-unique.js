/**
 * Un échec « réseau » ne doit être montré qu'une fois : tant que le réseau ne revient pas, chaque envoi raté
 * échouerait de la même façon, et l'élève lirait le même message à chaque exercice. Les autres échecs
 * (service en panne, session perdue…) sont toujours montrés.
 * Le silence s'arrête au retour du réseau, ou après `PAUSE_MS` : sans l'événement `online` (panne côté serveur,
 * réseau jamais « coupé » pour le navigateur), l'élève ne reste pas sans nouvelles pour toujours.
 */

import { TYPES_ERREUR } from './synchro.js';

/** Deux minutes : assez pour qu'un réseau coupé ne fasse pas répéter le message, assez court pour reprévenir. */
export const PAUSE_MS = 120_000;

/**
 * @param {Object} options
 * @param {function(Object): void} options.signaler Montre un échec à l'élève (reçoit l'erreur).
 * @param {function(function(): void): void} options.ecouterRetourReseau Appelle la fonction donnée au retour du réseau.
 * @param {function(): number} [options.maintenant] L'horloge, en millisecondes.
 * @returns {function(Object): void} Un `signaler` qui se tait sur les échecs réseau répétés, jusqu'au retour du réseau
 *   ou à la fin de `PAUSE_MS`.
 */
export function creerSignalUnique({ signaler, ecouterRetourReseau, maintenant = Date.now }) {
  let dernierSignalReseau = null;
  ecouterRetourReseau(() => {
    dernierSignalReseau = null;
  });

  return (erreur) => {
    if (erreur.type === TYPES_ERREUR.RESEAU) {
      const instant = maintenant();
      const silenceEnCours = dernierSignalReseau !== null && instant - dernierSignalReseau < PAUSE_MS;
      if (silenceEnCours) {
        return;
      }
      dernierSignalReseau = instant;
    }
    signaler(erreur);
  };
}
