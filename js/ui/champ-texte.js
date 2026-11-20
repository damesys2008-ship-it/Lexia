// Champ de saisie pour les exercices : correction automatique coupée, barre d'accents dessous.

import { creerBarreAccents } from './barre-accents.js';

/**
 * Crée un champ de texte avec sa barre d'accents.
 * La correction automatique est désactivée : sur tablette, elle corrigerait à la place de l'élève (cahier §4.5).
 * @param {{ etiquette: string, multiligne?: boolean }} options `etiquette` est lue par les lecteurs d'écran.
 * @returns {Promise<{ racine: HTMLElement, champ: HTMLInputElement|HTMLTextAreaElement }>}
 *   `racine` contient le champ et la barre ; `champ` sert à lire ou écrire la valeur.
 */
export async function creerChampTexte({ etiquette, multiligne = false }) {
  if (!etiquette) {
    throw new Error("creerChampTexte : l'option « etiquette » est obligatoire.");
  }
  const champ = document.createElement(multiligne ? 'textarea' : 'input');
  champ.className = 'champ-texte__saisie';
  champ.setAttribute('aria-label', etiquette);
  champ.setAttribute('autocorrect', 'off');
  champ.setAttribute('autocapitalize', 'off');
  champ.setAttribute('spellcheck', 'false');
  champ.setAttribute('autocomplete', 'off');
  champ.setAttribute('lang', 'fr');
  if (multiligne) {
    champ.rows = 5;
  } else {
    champ.type = 'text';
    champ.setAttribute('inputmode', 'text');
  }
  const racine = document.createElement('div');
  racine.className = 'champ-texte';
  racine.append(champ, await creerBarreAccents(champ));
  return { racine, champ };
}
