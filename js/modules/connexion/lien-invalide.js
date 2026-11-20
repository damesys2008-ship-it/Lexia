// Page « Lien invalide » (route '#/lien-invalide') : le lien d'un mail a déjà servi ou a expiré.

import { chargerStyles, creerCarte, creerLien } from './formulaire.js';

const EXPLICATION = 'Les liens des mails ne marchent qu\'une fois, et pas très longtemps. '
  + 'Tu peux en demander un nouveau.';

/**
 * Monte la page « Lien invalide ».
 * @param {HTMLElement} conteneur
 * @returns {Promise<void>}
 */
export async function monter(conteneur) {
  await chargerStyles();
  const { page, carte } = creerCarte('Ce lien ne marche plus', EXPLICATION);
  carte.append(
    creerLien('Demander un nouveau lien', 'mot-de-passe-oublie', 'bouton--principal'),
    creerLien('Se connecter', 'connexion', 'bouton--secondaire'),
  );
  conteneur.replaceChildren(page);
}
