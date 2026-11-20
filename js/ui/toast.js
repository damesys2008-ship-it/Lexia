// Toast : un court message qui apparaît dans #zone-toasts (région aria-live) puis disparaît seul.

import { chargerFeuille } from '../coeur/styles.js';

const FEUILLE_TOAST = new URL('../../css/composants/toast.css', import.meta.url);

/** Assez long pour être lu par une élève de CM2 sans se presser. */
export const DUREE_TOAST_MS = 6000;

/**
 * Affiche un message dans la zone des toasts.
 * @param {string} message Texte court.
 * @returns {Promise<HTMLElement>} L'élément du toast (retiré tout seul après `DUREE_TOAST_MS`).
 */
export async function afficherToast(message) {
  await chargerFeuille(FEUILLE_TOAST);
  const zone = document.getElementById('zone-toasts');
  if (!zone) {
    throw new Error('afficherToast : la zone #zone-toasts est absente de la page.');
  }
  const toast = document.createElement('p');
  toast.className = 'toast';
  toast.textContent = message;
  zone.append(toast);
  setTimeout(() => toast.remove(), DUREE_TOAST_MS);
  return toast;
}
