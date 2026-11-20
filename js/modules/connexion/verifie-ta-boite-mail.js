// Page « Vérifie ta boîte mail » (route '#/verifie-ta-boite-mail') : après une inscription, on attend que
// l'élève ouvre le mail de confirmation. Le bouton « Renvoyer le mail » ne marche qu'une fois par minute.
//
// L'adresse et l'heure du dernier mail viennent de `contexte.inscriptionEnCours` ({ adresse, dernierEnvoi }),
// posé par la page d'inscription ou de connexion ; sans lui (page rechargée), l'élève réécrit son adresse.

import { creer } from '../../ui/dom.js';
import {
  brancherEnvoi, chargerStyles, creerCarte, creerChamp, creerLien, creerZonePresque, ESPACE_INSECABLE, verifierChamps,
} from './formulaire.js';
import { libelleRenvoi, secondesAvantRenvoi, verifierAdresse } from './formulaire-logique.js';

const INTRODUCTION = 'Nous t\'avons écrit. Ouvre le mail, puis clique sur le lien pour confirmer ton adresse.';
const PAS_DE_MAIL = `Pas de mail${ESPACE_INSECABLE}? Regarde dans les courriers indésirables. `
  + 'Tu as peut-être aussi déjà un compte avec cette adresse.';
const MESSAGE_RENVOYE = 'C\'est reparti, un nouveau mail est en route.';
const PAUSE_DU_COMPTE_A_REBOURS_MS = 1000;

/** Le bouton « Renvoyer le mail » : il affiche l'attente restante et se bloque tant qu'elle dure. */
function creerCompteARebours(attente) {
  const bouton = creer('button', 'bouton bouton--secondaire', libelleRenvoi(0));
  bouton.type = 'submit';
  const mettreAJour = () => {
    const secondes = secondesAvantRenvoi({ dernierEnvoi: attente.dernierEnvoi, maintenant: Date.now() });
    bouton.disabled = secondes > 0;
    bouton.textContent = libelleRenvoi(secondes);
  };
  mettreAJour();
  const minuteur = setInterval(mettreAJour, PAUSE_DU_COMPTE_A_REBOURS_MS);
  return { bouton, mettreAJour, arreter: () => clearInterval(minuteur) };
}

/** Vérifie l'adresse, renvoie le mail, puis note l'adresse et l'heure pour le compte à rebours. */
async function renvoyerLeMail({ contexte, attente, adresse, confirmation }) {
  confirmation.textContent = '';
  if (!verifierChamps([{ element: adresse, message: verifierAdresse(adresse.champ.value) }])) {
    return;
  }
  await contexte.compte.renvoyerConfirmation(adresse.champ.value.trim());
  attente.adresse = adresse.champ.value.trim();
  attente.dernierEnvoi = Date.now();
  contexte.inscriptionEnCours = attente;
  confirmation.textContent = MESSAGE_RENVOYE;
}

/**
 * Monte la page « Vérifie ta boîte mail ».
 * @param {HTMLElement} conteneur
 * @param {Object} contexte Contexte de l'application (`compte`, `signaler`, `inscriptionEnCours`).
 * @returns {Promise<function(): void>} La fonction qui arrête le compte à rebours quand on quitte la page.
 */
export async function monter(conteneur, contexte) {
  await chargerStyles();
  const attente = contexte.inscriptionEnCours ?? { adresse: '', dernierEnvoi: null };
  const { page, carte } = creerCarte('Vérifie ta boîte mail', INTRODUCTION);
  const formulaire = creer('form', 'connexion__formulaire');
  const adresse = creerChamp({ id: 'adresse', etiquette: 'Ton adresse mail', type: 'email', autocomplete: 'email' });
  const zonePresque = creerZonePresque();
  const confirmation = creer('p', 'connexion__confirmation');
  const renvoi = creerCompteARebours(attente);

  confirmation.setAttribute('role', 'status');
  adresse.champ.value = attente.adresse;
  brancherEnvoi({
    formulaire,
    bouton: renvoi.bouton,
    zonePresque,
    signaler: contexte.signaler,
    apresEnvoi: renvoi.mettreAJour,
    action: () => renvoyerLeMail({ contexte, attente, adresse, confirmation }),
  });
  formulaire.append(adresse.racine, zonePresque, confirmation, renvoi.bouton);
  carte.append(
    formulaire,
    creer('p', 'connexion__mention', PAS_DE_MAIL),
    creerLien('Se connecter', 'connexion', 'bouton--secondaire'),
    creerLien("Changer d'adresse", 'inscription', 'bouton--discret'),
  );
  conteneur.replaceChildren(page);
  return renvoi.arreter;
}
