// Page « Nouveau mot de passe » (route '#/reinitialiser') : on y arrive depuis le lien d'un mail, qui ouvre
// une session. Sans session, le lien n'a pas marché : on envoie vers « Lien invalide ».

import { creer } from '../../ui/dom.js';
import {
  aller, brancherEnvoi, chargerStyles, creerCarte, creerChampMotDePasse, creerLien, creerZonePresque,
  ESPACE_INSECABLE, ROUTE_ACCUEIL, focaliserApresMontage, verifierChamps,
} from './formulaire.js';
import { LONGUEUR_MINIMALE_MOT_DE_PASSE, verifierMotDePasse } from './formulaire-logique.js';

const INTRODUCTION = 'Choisis un nouveau mot de passe, et note-le bien.';

/** La page de fin : le mot de passe est changé. */
function afficherReussite(conteneur) {
  const { page, carte } = creerCarte(`C'est fait${ESPACE_INSECABLE}!`, 'Ton mot de passe est changé.');
  const titre = carte.querySelector('h1');
  titre.tabIndex = -1;
  carte.append(creerLien("Aller à l'accueil", ROUTE_ACCUEIL, 'bouton--principal'));
  conteneur.replaceChildren(page);
  // Le champ qui avait le focus a disparu : le titre le reprend, pour que « C'est fait ! » soit annoncé.
  titre.focus();
}

/**
 * Monte la page « Nouveau mot de passe ».
 * @param {HTMLElement} conteneur
 * @param {Object} contexte Contexte de l'application (`compte`, `signaler`).
 * @returns {Promise<void>}
 */
export async function monter(conteneur, contexte) {
  if (contexte.compte.utilisateur() === null) {
    aller('lien-invalide');
    return;
  }
  await chargerStyles();
  const { page, carte } = creerCarte('Nouveau mot de passe', INTRODUCTION);
  const formulaire = creer('form', 'connexion__formulaire');
  const motDePasse = creerChampMotDePasse({
    id: 'mot-de-passe',
    etiquette: `Ton nouveau mot de passe (${LONGUEUR_MINIMALE_MOT_DE_PASSE} caractères au moins)`,
    autocomplete: 'new-password',
  });
  const zonePresque = creerZonePresque();
  const valider = creer('button', 'bouton bouton--principal', 'Changer mon mot de passe');
  valider.type = 'submit';

  brancherEnvoi({
    formulaire,
    bouton: valider,
    zonePresque,
    signaler: contexte.signaler,
    action: async () => {
      if (!verifierChamps([{ element: motDePasse, message: verifierMotDePasse(motDePasse.champ.value) }])) {
        return;
      }
      await contexte.compte.changerMotDePasse(motDePasse.champ.value);
      motDePasse.champ.value = '';
      afficherReussite(conteneur);
    },
  });
  formulaire.append(motDePasse.racine, zonePresque, valider);
  carte.append(formulaire);
  conteneur.replaceChildren(page);
  focaliserApresMontage(motDePasse.champ);
}
