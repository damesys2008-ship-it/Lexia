// Page « Créer un compte » (route '#/inscription') : adresse mail et mot de passe.
// Si le serveur demande de confirmer l'adresse, on passe à la page « Vérifie ta boîte mail ».

import { creer } from '../../ui/dom.js';
import {
  aller, brancherEnvoi, chargerStyles, creerCarte, creerChamp, creerChampMotDePasse, creerLien, creerZonePresque,
  ROUTE_APRES_CONNEXION, focaliserApresMontage, verifierChamps,
} from './formulaire.js';
import { LONGUEUR_MINIMALE_MOT_DE_PASSE, verifierAdresse, verifierMotDePasse } from './formulaire-logique.js';

const INTRODUCTION = 'Avec un compte, ta progression est gardée en ligne, et tu la retrouves sur un autre appareil.';
const MENTION = 'Ton adresse sert seulement à te connecter et à garder ta progression. '
  + 'Elle peut être celle d\'un parent. Tes données sont gardées en Europe.';
const ETAT_CONFIRMATION_REQUISE = 'confirmation-requise';
const TYPE_DEJA_PRIS = 'deja-pris';

/** Un compte existe déjà avec cette adresse : on propose d'aller se connecter. */
function creerAideDejaPris() {
  const aide = creerLien('Se connecter', 'connexion', 'bouton--secondaire');
  aide.hidden = true;
  return aide;
}

/** Les deux champs de la page : l'adresse et le mot de passe. */
function creerChampsInscription() {
  const adresse = creerChamp({ id: 'adresse', etiquette: 'Ton adresse mail', type: 'email', autocomplete: 'email' });
  const motDePasse = creerChampMotDePasse({
    id: 'mot-de-passe',
    etiquette: `Ton mot de passe (${LONGUEUR_MINIMALE_MOT_DE_PASSE} caractères au moins)`,
    autocomplete: 'new-password',
  });
  return { adresse, motDePasse };
}

/** Après l'inscription : vers « Vérifie ta boîte mail » si le serveur demande de confirmer, sinon vers l'accueil. */
function terminerInscription(contexte, adresse, etat) {
  if (etat === ETAT_CONFIRMATION_REQUISE) {
    contexte.inscriptionEnCours = { adresse, dernierEnvoi: Date.now() };
    aller('verifie-ta-boite-mail');
  } else {
    aller(ROUTE_APRES_CONNEXION);
  }
}

/** Le formulaire : adresse, mot de passe, mention, message « Presque ! », aide éventuelle et bouton d'envoi. */
function creerFormulaire(contexte) {
  const formulaire = creer('form', 'connexion__formulaire');
  const { adresse, motDePasse } = creerChampsInscription();
  const zonePresque = creerZonePresque();
  const aide = creerAideDejaPris();
  const valider = creer('button', 'bouton bouton--principal', 'Créer mon compte');
  valider.type = 'submit';

  brancherEnvoi({
    formulaire,
    bouton: valider,
    zonePresque,
    signaler: contexte.signaler,
    auEchec: (erreur) => {
      aide.hidden = erreur.type !== TYPE_DEJA_PRIS;
    },
    action: async () => {
      aide.hidden = true;
      const controles = [
        { element: adresse, message: verifierAdresse(adresse.champ.value) },
        { element: motDePasse, message: verifierMotDePasse(motDePasse.champ.value) },
      ];
      if (!verifierChamps(controles)) {
        return;
      }
      const adresseSaisie = adresse.champ.value.trim();
      const { etat } = await contexte.compte.inscrire(adresseSaisie, motDePasse.champ.value);
      motDePasse.champ.value = '';
      terminerInscription(contexte, adresseSaisie, etat);
    },
  });
  const mention = creer('p', 'connexion__mention', MENTION);
  formulaire.append(adresse.racine, motDePasse.racine, mention, zonePresque, aide, valider);
  return { formulaire, champAdresse: adresse.champ };
}

/**
 * Monte la page d'inscription.
 * @param {HTMLElement} conteneur
 * @param {Object} contexte Contexte de l'application (`compte`, `signaler`).
 * @returns {Promise<void>}
 */
export async function monter(conteneur, contexte) {
  await chargerStyles();
  const { page, carte } = creerCarte('Créer un compte', INTRODUCTION);
  const { formulaire, champAdresse } = creerFormulaire(contexte);
  carte.append(formulaire, creerLien("J'ai déjà un compte", 'connexion', 'bouton--discret'));
  conteneur.replaceChildren(page);
  focaliserApresMontage(champAdresse);
}
