// Page « Se connecter » (route '#/connexion') : adresse mail et mot de passe.

import { creer } from '../../ui/dom.js';
import {
  aller, brancherEnvoi, chargerStyles, creerCarte, creerChamp, creerChampMotDePasse, creerLien,
  creerZonePresque, ESPACE_INSECABLE, ROUTE_ACCUEIL, ROUTE_APRES_CONNEXION, focaliserApresMontage, verifierChamps,
} from './formulaire.js';
import { verifierAdresse, verifierMotDePasseExistant } from './formulaire-logique.js';

const INTRODUCTION = 'Entre ton adresse mail et ton mot de passe pour retrouver ta progression.';
const TYPE_MAIL_NON_CONFIRME = 'mail-non-confirme';
const LIBELLE_MOT_DE_PASSE_OUBLIE = `Mot de passe oublié${ESPACE_INSECABLE}?`;

/** Un mail pas encore confirmé : on propose d'aller le renvoyer, avec l'adresse déjà écrite. */
function creerAideMailNonConfirme(contexte, adresse) {
  const aide = creer('button', 'bouton bouton--secondaire', 'Renvoyer le mail');
  aide.type = 'button';
  aide.hidden = true;
  aide.addEventListener('click', () => {
    contexte.inscriptionEnCours = { adresse: adresse.champ.value.trim(), dernierEnvoi: null };
    aller('verifie-ta-boite-mail');
  });
  return aide;
}

/** Vérifie les deux champs puis connecte ; ne fait rien si un champ est faux (son message est déjà montré). */
async function connecterSiValide(contexte, adresse, motDePasse) {
  const controles = [
    { element: adresse, message: verifierAdresse(adresse.champ.value) },
    { element: motDePasse, message: verifierMotDePasseExistant(motDePasse.champ.value) },
  ];
  if (!verifierChamps(controles)) {
    return;
  }
  await contexte.compte.connecter(adresse.champ.value.trim(), motDePasse.champ.value);
  motDePasse.champ.value = '';
  aller(ROUTE_APRES_CONNEXION);
}

/** Le formulaire : adresse, mot de passe, message « Presque ! », aide éventuelle et bouton d'envoi. */
function creerFormulaire(contexte) {
  const formulaire = creer('form', 'connexion__formulaire');
  const adresse = creerChamp({ id: 'adresse', etiquette: 'Ton adresse mail', type: 'email', autocomplete: 'email' });
  const motDePasse = creerChampMotDePasse({
    id: 'mot-de-passe', etiquette: 'Ton mot de passe', autocomplete: 'current-password',
  });
  const zonePresque = creerZonePresque();
  const aide = creerAideMailNonConfirme(contexte, adresse);
  const valider = creer('button', 'bouton bouton--principal', 'Se connecter');
  valider.type = 'submit';

  brancherEnvoi({
    formulaire,
    bouton: valider,
    zonePresque,
    signaler: contexte.signaler,
    auEchec: (erreur) => {
      aide.hidden = erreur.type !== TYPE_MAIL_NON_CONFIRME;
    },
    action: async () => {
      aide.hidden = true;
      await connecterSiValide(contexte, adresse, motDePasse);
    },
  });
  formulaire.append(adresse.racine, motDePasse.racine, zonePresque, aide, valider);
  return { formulaire, champAdresse: adresse.champ };
}

/**
 * Monte la page de connexion.
 * @param {HTMLElement} conteneur
 * @param {Object} contexte Contexte de l'application (`compte`, `signaler`).
 * @returns {Promise<void>}
 */
export async function monter(conteneur, contexte) {
  await chargerStyles();
  const { page, carte } = creerCarte('Se connecter', INTRODUCTION);
  const { formulaire, champAdresse } = creerFormulaire(contexte);
  carte.append(
    formulaire,
    creerLien(LIBELLE_MOT_DE_PASSE_OUBLIE, 'mot-de-passe-oublie', 'bouton--discret'),
    creerLien('Créer un compte', 'inscription', 'bouton--secondaire'),
    creerLien('Continuer sans compte', ROUTE_ACCUEIL, 'bouton--discret'),
  );
  conteneur.replaceChildren(page);
  focaliserApresMontage(champAdresse);
}
