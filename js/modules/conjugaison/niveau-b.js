// Niveau B : le radical est donné, l'élève tape la terminaison (cahier §7.2).
// Quand le radical change (être, avoir, aller…), le radical donné est vide : il écrit la forme entière.

import { monterConjugaison } from './ecran.js';
import { completerAvecRadicaux, indiceDeLaTerminaison } from './logique.js';
import { jouerSaisie } from './saisie-tableau.js';

const INSTRUCTION = 'Complète chaque forme : le début est donné, écris la fin.';

/**
 * Monte l'écran du niveau B.
 * @param {HTMLElement} conteneur
 * @param {Object} contexte Contexte de l'application.
 * @returns {Promise<void>}
 */
export function monter(conteneur, contexte) {
  return monterConjugaison(conteneur, contexte, {
    mode: 'b',
    instruction: INSTRUCTION,
    jouer: (exercice) => jouerSaisie(exercice, {
      etiquette: 'Terminaison',
      radicalAffiche: (item, personne) => item.radicaux[personne],
      versFormesEntieres: completerAvecRadicaux,
      indice: indiceDeLaTerminaison,
    }),
  });
}
