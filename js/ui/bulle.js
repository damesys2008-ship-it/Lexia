/**
 * Bulle de parole de la mascotte (fond --nuit, texte blanc : css/composants/bulle.css).
 * Le texte est posé avec `textContent` : le contenu n'est jamais interprété comme du HTML.
 * La région `role="status"` reste dans la page en permanence (vide et invisible tant que
 * la mascotte n'a rien dit), pour que les lecteurs d'écran annoncent chaque nouvelle phrase.
 */

import { chargerFeuille } from '../coeur/styles.js';

const FEUILLE_BULLE = new URL('../../css/composants/bulle.css', import.meta.url);

/**
 * Crée la bulle, vide tant que la mascotte n'a rien dit.
 * @param {Document} [document] Document cible.
 * @returns {Promise<{element: HTMLElement, parler: function(string): void}>}
 */
export async function creerBulle(document = globalThis.document) {
  await chargerFeuille(FEUILLE_BULLE, document);
  const element = document.createElement('div');
  const texte = document.createElement('p');

  element.className = 'bulle bulle--vide';
  element.setAttribute('role', 'status');
  texte.className = 'bulle__texte';
  element.append(texte);

  /**
   * Affiche une phrase dans la bulle ; elle est annoncée par les lecteurs d'écran.
   * @param {string} phrase
   */
  function parler(phrase) {
    texte.textContent = phrase;
    element.classList.remove('bulle--vide');
  }

  return { element, parler };
}
