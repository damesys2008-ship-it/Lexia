// Écran « Bientôt disponible » : pour les modules des lots 2 et 3 (cahier §12).
// Route : '#/bientot/<module>', par exemple '#/bientot/grammaire'.

import { chargerFeuille } from '../../coeur/styles.js';
import { creerBulle } from '../../ui/bulle.js';
import { creerMascotte } from '../../ui/mascotte.js';

const FEUILLE_BIENTOT = new URL('../../../css/modules/bientot.css', import.meta.url);

const PHRASE_DE_LA_MASCOTTE = "Pas encore prête. On l'ajoutera bientôt.";
const EXPLICATION = "Cette partie arrive dans une prochaine version. En attendant, il y a déjà de quoi t'entraîner.";

/**
 * Monte l'écran « Bientôt disponible ».
 * @param {HTMLElement} conteneur
 * @param {Object} contexte Contexte de l'application.
 * @returns {Promise<void>}
 */
export async function monter(conteneur, contexte) {
  await chargerFeuille(FEUILLE_BIENTOT);

  const equipes = contexte.stockage.lire().accessoires.equipes;
  const mascotte = await creerMascotte({ accessoiresEquipes: equipes, signaler: contexte.signaler });
  const bulle = await creerBulle();
  const section = document.createElement('section');
  const titre = document.createElement('h1');
  const explication = document.createElement('p');
  const retour = document.createElement('a');

  section.className = 'bientot contenu__centre';
  titre.textContent = 'Bientôt disponible';
  explication.textContent = EXPLICATION;
  retour.href = '#/accueil';
  retour.className = 'bouton bouton--principal';
  retour.textContent = "Retour à l'accueil";
  bulle.parler(PHRASE_DE_LA_MASCOTTE);
  mascotte.definirEtat('encourage');

  const pompon = document.createElement('div');
  pompon.className = 'bientot__pompon';
  pompon.append(mascotte.element);

  section.append(bulle.element, pompon, titre, explication, retour);
  conteneur.replaceChildren(section);
}
