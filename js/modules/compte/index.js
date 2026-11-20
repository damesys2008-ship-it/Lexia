// Page « Mon compte » (route '#/compte') : l'adresse du compte, l'état de la sauvegarde en ligne,
// « Me déconnecter » et « Supprimer mon compte » (en deux étapes).
// L'adresse s'écrit avec `textContent`. Se déconnecter ou supprimer le compte ne touche jamais à la progression
// de cet appareil.

import { ErreurCompte } from '../../coeur/compte.js';
import { messagePourErreur } from '../../coeur/compte-erreurs.js';
import { supprimerLeCompte } from '../../coeur/compte-suppression.js';
import { ROUTE_APRES_CONFIRMATION } from '../../coeur/lien-de-mail.js';
import { ROUTE_PREMIER_LANCEMENT } from '../../coeur/routes.js';
import { TYPES_ERREUR } from '../../coeur/synchro.js';
import { chargerFeuille } from '../../coeur/styles.js';
import { creer, creerBouton } from '../../ui/dom.js';
import { ouvrirModale } from '../../ui/modale.js';
import { afficherToast } from '../../ui/toast.js';
import {
  aller, cacherPresque, chargerStyles, creerCarte, creerLien, creerZonePresque, ESPACE_INSECABLE, montrerPresque,
} from '../connexion/formulaire.js';
import { ETATS_SAUVEGARDE, decrireEtatSauvegarde, trouverEtatSauvegarde } from './compte-logique.js';

const FEUILLE_COMPTE = new URL('../../../css/modules/compte.css', import.meta.url);
/** Le style de l'adresse du compte, le même que sur la page de confirmation d'un lien de mail. */
const FEUILLE_ADRESSE = new URL('../../../css/modules/connexion-lien.css', import.meta.url);
const MESSAGE_DEPART = 'Je regarde ta sauvegarde…';
const MESSAGE_COMPTE_SUPPRIME = 'Ton compte est supprimé. Ta progression reste sur cet appareil.';

/** Vrai si la sauvegarde du compte contient un prénom : le compte ramène alors un profil sur un appareil neuf. */
function sauvegardeContientUnProfil(distante) {
  const prenom = distante?.donnees?.profil?.prenom;
  return typeof prenom === 'string' && prenom.trim() !== '';
}

/**
 * Où en est la sauvegarde : l'appareil et le compte sont comparés, sans rien modifier.
 * `compteSansProfil` n'est vrai que si le compte a été lu et ne contient aucun prénom.
 */
async function chercherEtatSauvegarde(contexte) {
  if (!navigator.onLine) {
    return { etat: ETATS_SAUVEGARDE.HORS_LIGNE, misAJour: null, compteSansProfil: false };
  }
  try {
    const distante = await contexte.synchro.lireDistante();
    const etat = trouverEtatSauvegarde({ local: contexte.stockage.lire(), distant: distante?.donnees ?? null });
    return { etat, misAJour: distante?.misAJour ?? null, compteSansProfil: !sauvegardeContientUnProfil(distante) };
  } catch (erreur) {
    if (erreur.type === TYPES_ERREUR.RESEAU) {
      return { etat: ETATS_SAUVEGARDE.HORS_LIGNE, misAJour: null, compteSansProfil: false };
    }
    contexte.signaler('Lecture de la sauvegarde en ligne impossible', erreur);
    return { etat: ETATS_SAUVEGARDE.INDISPONIBLE, misAJour: null, compteSansProfil: false };
  }
}

/** La zone qui dit où en est la sauvegarde, annoncée aux lecteurs d'écran quand elle change. */
function creerZoneEtat() {
  const zone = creer('div', 'compte__etat');
  zone.setAttribute('role', 'status');
  zone.setAttribute('aria-busy', 'true');
  zone.append(creer('span', 'compte__etat-titre', MESSAGE_DEPART), creer('span', 'compte__etat-detail'));
  return zone;
}

function montrerEtat(zone, { etat, misAJour }) {
  const { titre, detail } = decrireEtatSauvegarde(etat, misAJour);
  const bonEtat = etat === ETATS_SAUVEGARDE.A_JOUR || etat === ETATS_SAUVEGARDE.EN_ATTENTE;
  zone.classList.toggle('compte__etat--attention', !bonEtat);
  zone.replaceChildren(creer('span', 'compte__etat-titre', titre), creer('span', 'compte__etat-detail', detail));
  zone.removeAttribute('aria-busy');
}

/** Une question à deux boutons : vrai seulement si l'élève clique sur celui qui va de l'avant (« oui »). */
async function demanderConfirmation({ titre, texte, libelleOui, libelleNon }) {
  const choix = await ouvrirModale({
    titre,
    contenu: creer('p', 'compte__confirmation', texte),
    // Le bouton sûr est le premier : c'est lui qui a le focus, donc « Entrée » ne supprime jamais rien.
    boutons: [
      { id: 'non', libelle: libelleNon, variante: 'principal' },
      { id: 'oui', libelle: libelleOui, variante: 'secondaire' },
    ],
  });
  return choix === 'oui';
}

async function confirmerLaSuppression() {
  const premiere = await demanderConfirmation({
    titre: `Supprimer ton compte${ESPACE_INSECABLE}?`,
    texte: 'Ton compte et ta sauvegarde en ligne seront effacés. Ta progression restera sur cet appareil.',
    libelleOui: 'Continuer',
    libelleNon: 'Garder mon compte',
  });
  if (!premiere) {
    return false;
  }
  return demanderConfirmation({
    titre: `Vraiment tout supprimer${ESPACE_INSECABLE}?`,
    texte: 'Après, tu ne pourras plus retrouver ta progression depuis un autre appareil.',
    libelleOui: 'Oui, supprimer mon compte',
    libelleNon: 'Non, je le garde',
  });
}

/**
 * Lance une action de compte pendant laquelle les boutons sont bloqués ; un échec devient un « Presque ! ».
 * @returns {Promise<boolean>} Vrai si l'action a réussi.
 */
async function essayer({ contexte, zonePresque, boutons, action }) {
  cacherPresque(zonePresque);
  boutons.forEach((bouton) => { bouton.disabled = true; });
  try {
    await action();
    return true;
  } catch (erreur) {
    if (!(erreur instanceof ErreurCompte)) {
      contexte.signaler('Action de compte impossible', erreur);
    }
    montrerPresque(zonePresque, erreur instanceof ErreurCompte ? erreur.message : messagePourErreur('inconnue'));
    return false;
  } finally {
    boutons.forEach((bouton) => { bouton.disabled = false; });
  }
}

async function seDeconnecter(contexte, lancer) {
  if (await lancer(() => contexte.compte.deconnecter())) {
    aller('accueil');
  }
}

async function supprimer(contexte, lancer) {
  if (!(await confirmerLaSuppression())) {
    return;
  }
  if (await lancer(() => supprimerLeCompte({ compte: contexte.compte }))) {
    afficherToast(MESSAGE_COMPTE_SUPPRIME).catch((erreur) => contexte.signaler(MESSAGE_COMPTE_SUPPRIME, erreur));
    aller('accueil');
  }
}

/** Les deux boutons du compte ; ils se bloquent ensemble pendant une action. */
function creerActions(contexte, zonePresque) {
  const boutons = [];
  const lancer = (action) => essayer({ contexte, zonePresque, boutons, action });
  boutons.push(
    creerBouton('Me déconnecter', 'bouton--secondaire', () => seDeconnecter(contexte, lancer)),
    creerBouton('Supprimer mon compte', 'bouton--discret', () => supprimer(contexte, lancer)),
  );
  const actions = creer('div', 'compte__actions');
  actions.append(...boutons);
  return actions;
}

/**
 * Un compte tout neuf sur un appareil sans profil : l'élève n'a pas encore donné son prénom, le premier lancement
 * reprend à cette étape (il n'y revoit pas l'écran de bienvenue, il a déjà un compte).
 */
function menerAuPrenomSiBesoin(contexte, { compteSansProfil }) {
  const estToujoursSurLaPage = window.location.hash === ROUTE_APRES_CONFIRMATION;
  if (compteSansProfil && !contexte.profilCree() && estToujoursSurLaPage) {
    aller(ROUTE_PREMIER_LANCEMENT);
  }
}

/**
 * Monte la page « Mon compte ». Sans compte connecté, elle mène à la connexion.
 * @param {HTMLElement} conteneur
 * @param {Object} contexte Contexte de l'application (`compte`, `synchro`, `stockage`, `signaler`).
 * @returns {Promise<void>}
 */
export async function monter(conteneur, contexte) {
  const utilisateur = contexte.compte.utilisateur();
  if (utilisateur === null) {
    window.location.replace('#/connexion');
    return;
  }
  await Promise.all([chargerStyles(), chargerFeuille(FEUILLE_ADRESSE), chargerFeuille(FEUILLE_COMPTE)]);

  const { page, carte } = creerCarte('Mon compte', `Tu es connecté avec${ESPACE_INSECABLE}:`);
  const zoneEtat = creerZoneEtat();
  const zonePresque = creerZonePresque();
  carte.append(
    creer('p', 'connexion__adresse', utilisateur.email),
    zoneEtat,
    zonePresque,
    creerActions(contexte, zonePresque),
    creerLien("Retour à l'accueil", 'accueil', 'bouton--discret'),
  );
  conteneur.replaceChildren(page);
  chercherEtatSauvegarde(contexte).then((etat) => {
    montrerEtat(zoneEtat, etat);
    menerAuPrenomSiBesoin(contexte, etat);
  });
}
