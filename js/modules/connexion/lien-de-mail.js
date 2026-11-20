// Page « Confirmer un lien de mail » (route '#/lien-de-mail') : le lien d'un mail attend ici que l'élève dise
// « oui, c'est mon compte ». Tant qu'il n'a pas cliqué, il n'y a ni session, ni appel réseau, ni synchro.
// L'adresse du compte s'écrit avec `textContent` ; les jetons ne passent jamais par cette page.

import { ErreurCompte } from '../../coeur/compte.js';
import {
  confirmerLienEnAttente, lireLienEnAttente, refuserLienEnAttente, ROUTE_LIEN_INVALIDE,
} from '../../coeur/lien-de-mail.js';
import { chargerFeuille } from '../../coeur/styles.js';
import { creer, creerBouton } from '../../ui/dom.js';
import { chargerStyles, creerCarte, focaliserApresMontage } from './formulaire.js';
import { decrireLien } from './lien-de-mail-logique.js';

const INTRODUCTION_ID = 'lien-de-mail-introduction';
const FEUILLE_LIEN = new URL('../../../css/modules/connexion-lien.css', import.meta.url);

/**
 * Construit la page pour un lien en attente.
 * @param {{nature: string, email: string, emailSessionActuelle: string|null}} lien
 * @param {{confirmer: function(): void, refuser: function(): void}} actions Ce que font les deux boutons.
 * @returns {{page: HTMLElement, boutonConfirmer: HTMLButtonElement, boutonRefuser: HTMLButtonElement}}
 */
export function construirePage(lien, { confirmer, refuser }) {
  const { titre, introduction, avertissement } = decrireLien(lien);
  const { page, carte } = creerCarte(titre, introduction);
  carte.querySelector('.connexion__intro').id = INTRODUCTION_ID;
  const boutonConfirmer = creerBouton('Oui, c\'est mon compte', 'bouton--principal', confirmer);
  const boutonRefuser = creerBouton('Ce n\'est pas moi', 'bouton--secondaire', refuser);

  const adresse = creer('p', 'connexion__adresse', lien.email);
  adresse.id = 'lien-de-mail-adresse';
  carte.append(adresse);
  if (avertissement !== null) {
    carte.append(creer('p', 'connexion__remplacement', avertissement));
  }
  carte.append(boutonConfirmer, boutonRefuser);
  // Un lecteur d'écran lit le compte visé en même temps que le bouton : il sait ce qu'il confirme.
  boutonConfirmer.setAttribute('aria-describedby', `${INTRODUCTION_ID} ${adresse.id}`);
  return { page, boutonConfirmer, boutonRefuser };
}

/** Change de page (`route` commence par « #/ ») en remplaçant celle-ci dans l'historique : « retour » ne la rejoue pas. */
function remplacerPageParRoute(route) {
  window.location.replace(route);
}

/**
 * Monte la page de confirmation.
 * @param {HTMLElement} conteneur
 * @param {Object} contexte Contexte de l'application (`signaler`).
 * @returns {Promise<void>}
 */
export async function monter(conteneur, contexte) {
  const lien = lireLienEnAttente();
  if (lien === null) {
    remplacerPageParRoute(ROUTE_LIEN_INVALIDE);
    return;
  }
  await Promise.all([chargerStyles(), chargerFeuille(FEUILLE_LIEN)]);

  const { page, boutonConfirmer, boutonRefuser } = construirePage(lien, {
    confirmer: () => confirmer(contexte, { boutonConfirmer, boutonRefuser }),
    refuser: () => remplacerPageParRoute(refuserLienEnAttente()),
  });
  conteneur.replaceChildren(page);
  focaliserApresMontage(boutonConfirmer);
}

/** L'élève confirme : les boutons se bloquent pendant l'attente, puis la page va à sa destination. */
async function confirmer(contexte, { boutonConfirmer, boutonRefuser }) {
  boutonConfirmer.disabled = true;
  boutonRefuser.disabled = true;
  boutonConfirmer.setAttribute('aria-busy', 'true');
  try {
    remplacerPageParRoute(await confirmerLienEnAttente());
  } catch (erreur) {
    if (!(erreur instanceof ErreurCompte)) {
      contexte.signaler('Confirmation du lien de mail impossible', erreur);
    }
    remplacerPageParRoute(ROUTE_LIEN_INVALIDE);
  }
}
