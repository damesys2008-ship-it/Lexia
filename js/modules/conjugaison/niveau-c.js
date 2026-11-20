// Niveau C : les pronoms sont donnés, l'élève écrit toutes les formes du tableau (cahier §7.2).

import { monterConjugaison } from './ecran.js';
import { indiceDeLaForme } from './logique.js';
import { jouerSaisie } from './saisie-tableau.js';

const INSTRUCTION = 'Écris toutes les formes du tableau.';

/**
 * Monte l'écran du niveau C.
 * @param {HTMLElement} conteneur
 * @param {Object} contexte Contexte de l'application.
 * @returns {Promise<void>}
 */
export function monter(conteneur, contexte) {
  return monterConjugaison(conteneur, contexte, {
    mode: 'c',
    instruction: INSTRUCTION,
    jouer: (exercice) => jouerSaisie(exercice, {
      etiquette: 'Forme',
      radicalAffiche: () => '',
      versFormesEntieres: (item, saisies) => saisies,
      indice: (item, personne) => indiceDeLaForme(item.formes[personne]),
    }),
  });
}
