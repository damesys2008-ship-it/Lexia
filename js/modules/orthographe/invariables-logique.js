// Logique pure de l'exercice « Mots à retenir » : le minuteur de 3 secondes, le trou dans la phrase
// et la comparaison de ce que l'élève a écrit. Rien ici ne touche au DOM.

import { normaliserPourComparaison } from '../../coeur/texte.js';

export const DUREE_AFFICHAGE_MS = 3000;
const PAS_MS = 1000;

/**
 * Minuteur d'affichage du mot : prévient chaque seconde (3, 2, 1) puis à la fin.
 * L'horloge est injectable : les tests passent un faux `planifier` qui garde les fonctions à appeler.
 * @param {Object} [options]
 * @param {number} [options.dureeMs] Durée d'affichage.
 * @param {function(function(): void, number): *} [options.planifier] Comme `setTimeout`.
 * @returns {{demarrer: function(function(number): void, function(): void): void}}
 */
export function creerMinuteur({
  dureeMs = DUREE_AFFICHAGE_MS,
  planifier = (suite, attenteMs) => setTimeout(suite, attenteMs),
} = {}) {
  return {
    /** Appelle `surSeconde(secondesRestantes)` à chaque seconde, puis `surFin()`. */
    demarrer(surSeconde, surFin) {
      let resteMs = dureeMs;
      const avancer = () => {
        if (resteMs <= 0) {
          surFin();
          return;
        }
        surSeconde(Math.ceil(resteMs / PAS_MS));
        const pauseMs = Math.min(PAS_MS, resteMs);
        resteMs -= pauseMs;
        planifier(avancer, pauseMs);
      };
      avancer();
    },
  };
}

/**
 * Coupe la phrase autour du mot à retenir (la majuscule initiale est tolérée).
 * @param {{mot: string, phrase: string}} item
 * @returns {{avant: string, mot: string, apres: string}} `mot` est écrit comme dans la phrase.
 */
export function decouperPhrase(item) {
  const debut = item.phrase.toLowerCase().indexOf(item.mot.toLowerCase());
  const fin = debut + item.mot.length;
  return { avant: item.phrase.slice(0, debut), mot: item.phrase.slice(debut, fin), apres: item.phrase.slice(fin) };
}

/**
 * Compare ce que l'élève a écrit au mot attendu.
 * Les accents, le trait d'union et l'apostrophe comptent ; la casse, les espaces en trop
 * et l'apostrophe courbe d'une tablette sont tolérés (voir `normaliserPourComparaison`).
 * @param {{mot: string}} item
 * @param {string} saisie
 * @returns {boolean}
 */
export function estBonneSaisie(item, saisie) {
  const forme = (texte) => normaliserPourComparaison(texte).toLowerCase();
  return forme(saisie) === forme(item.mot);
}
