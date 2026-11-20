// Page « Mot de passe oublié » (route '#/mot-de-passe-oublie') : on donne son adresse, un mail part.
// La réponse est toujours la même, que l'adresse ait un compte ou non : on ne révèle jamais qui a un compte.

import { creer } from '../../ui/dom.js';
import {
  brancherEnvoi, chargerStyles, creerCarte, creerChamp, creerLien, creerZonePresque, focaliserApresMontage,
  verifierChamps,
} from './formulaire.js';
import { verifierAdresse } from './formulaire-logique.js';

const INTRODUCTION = 'Écris ton adresse mail. Si elle a un compte, '
  + 'nous t\'envoyons un lien pour choisir un nouveau mot de passe.';
const MESSAGE_NEUTRE = 'Si cette adresse existe, un mail part. Ouvre-le et clique sur le lien.';

/**
 * Monte la page « Mot de passe oublié ».
 * @param {HTMLElement} conteneur
 * @param {Object} contexte Contexte de l'application (`compte`, `signaler`).
 * @returns {Promise<void>}
 */
export async function monter(conteneur, contexte) {
  await chargerStyles();
  const { page, carte } = creerCarte('Mot de passe oublié', INTRODUCTION);
  const formulaire = creer('form', 'connexion__formulaire');
  const adresse = creerChamp({ id: 'adresse', etiquette: 'Ton adresse mail', type: 'email', autocomplete: 'email' });
  const zonePresque = creerZonePresque();
  const confirmation = creer('p', 'connexion__confirmation');
  const valider = creer('button', 'bouton bouton--principal', 'Envoyer le mail');
  valider.type = 'submit';

  confirmation.setAttribute('role', 'status');
  brancherEnvoi({
    formulaire,
    bouton: valider,
    zonePresque,
    signaler: contexte.signaler,
    action: async () => {
      confirmation.textContent = '';
      if (!verifierChamps([{ element: adresse, message: verifierAdresse(adresse.champ.value) }])) {
        return;
      }
      await contexte.compte.motDePasseOublie(adresse.champ.value.trim());
      confirmation.textContent = MESSAGE_NEUTRE;
    },
  });
  formulaire.append(adresse.racine, zonePresque, confirmation, valider);
  carte.append(formulaire, creerLien('Retour à la connexion', 'connexion', 'bouton--discret'));
  conteneur.replaceChildren(page);
  focaliserApresMontage(adresse.champ);
}
