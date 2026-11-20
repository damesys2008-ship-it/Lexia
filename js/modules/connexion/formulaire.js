// Les morceaux communs aux pages de compte : la carte, les champs, le message « Presque ! »
// et l'envoi d'un formulaire.
// Tout texte venu du réseau passe par `textContent` ; un mot de passe n'est jamais gardé après l'envoi.

import { ErreurCompte } from '../../coeur/compte.js';
import { messagePourErreur } from '../../coeur/compte-erreurs.js';
import { chargerFeuille } from '../../coeur/styles.js';
import { creer } from '../../ui/dom.js';

const FEUILLE_CONNEXION = new URL('../../../css/modules/connexion.css', import.meta.url);

export { ESPACE_INSECABLE } from './formulaire-logique.js';
/** La route où mène une connexion ou une inscription réussie : la page « Mon compte ». */
export const ROUTE_APRES_CONNEXION = 'compte';
export const ROUTE_ACCUEIL = 'accueil';

/** Charge la feuille de style des pages de compte. */
export function chargerStyles() {
  return chargerFeuille(FEUILLE_CONNEXION);
}

/**
 * Place le focus sur un champ une fois la page montée : le routeur met d'abord le focus sur la page entière,
 * et le champ ne le garderait pas sans cette attente.
 */
export function focaliserApresMontage(champ) {
  setTimeout(() => champ.focus(), 0);
}

/** Change de page, comme un clic sur un lien. */
export function aller(route) {
  window.location.hash = `#/${route}`;
}

/** Un lien qui a l'allure d'un bouton. */
export function creerLien(texte, route, variante) {
  const lien = creer('a', `bouton ${variante}`, texte);
  lien.href = `#/${route}`;
  return lien;
}

/**
 * La page et sa carte : un titre, une phrase d'introduction, puis ce que la page y ajoute.
 * @param {string} titre
 * @param {string} [introduction]
 * @returns {{page: HTMLElement, carte: HTMLElement}}
 */
export function creerCarte(titre, introduction = '') {
  const page = creer('section', 'connexion contenu__centre');
  const carte = creer('div', 'connexion__carte');
  carte.append(creer('h1', 'connexion__titre', titre));
  if (introduction !== '') {
    carte.append(creer('p', 'connexion__intro', introduction));
  }
  page.append(carte);
  return { page, carte };
}

/**
 * Un champ avec son étiquette et sa place pour un message d'erreur lié au champ.
 * @param {Object} options
 * @param {string} options.id Identifiant du champ (le message s'appelle `<id>-erreur`).
 * @param {string} options.etiquette
 * @param {string} options.type `email` ou `password`.
 * @param {string} options.autocomplete `email`, `current-password` ou `new-password`.
 * @returns {{racine: HTMLElement, champ: HTMLInputElement, erreur: HTMLElement, rangee: HTMLElement}}
 *   `rangee` contient le champ : on peut y ajouter un bouton à côté.
 */
export function creerChamp({ id, etiquette, type, autocomplete }) {
  const racine = creer('div', 'connexion__champ');
  const libelle = creer('label', 'connexion__etiquette', etiquette);
  const champ = creer('input', 'connexion__saisie');
  const erreur = creer('p', 'connexion__erreur');
  const rangee = creer('div', 'connexion__rangee');

  libelle.htmlFor = id;
  champ.id = id;
  champ.type = type;
  champ.setAttribute('autocomplete', autocomplete);
  champ.setAttribute('autocapitalize', 'off');
  champ.setAttribute('spellcheck', 'false');
  erreur.id = `${id}-erreur`;
  erreur.setAttribute('role', 'alert');
  rangee.append(champ);
  racine.append(libelle, rangee, erreur);
  return { racine, champ, erreur, rangee };
}

/** Un champ de mot de passe avec son bouton « Voir » : il change le type du champ, rien d'autre. */
export function creerChampMotDePasse({ id, etiquette, autocomplete }) {
  const element = creerChamp({ id, etiquette, type: 'password', autocomplete });
  const voir = creer('button', 'bouton bouton--secondaire connexion__voir', 'Voir');
  voir.type = 'button';
  voir.setAttribute('aria-label', 'Voir le mot de passe');
  voir.addEventListener('click', () => {
    const visible = element.champ.type === 'password';
    element.champ.type = visible ? 'text' : 'password';
    voir.textContent = visible ? 'Cacher' : 'Voir';
    voir.setAttribute('aria-label', visible ? 'Cacher le mot de passe' : 'Voir le mot de passe');
  });
  element.rangee.append(voir);
  return element;
}

/** Montre le message d'un champ, le lie au champ et y place le focus. */
export function signalerErreurDuChamp({ champ, erreur }, message) {
  erreur.textContent = message;
  champ.setAttribute('aria-invalid', 'true');
  champ.setAttribute('aria-describedby', erreur.id);
  champ.focus();
}

/** Efface le message d'un champ. */
export function effacerErreurDuChamp({ champ, erreur }) {
  erreur.textContent = '';
  champ.removeAttribute('aria-invalid');
  champ.removeAttribute('aria-describedby');
}

/** La zone « Presque ! » : cachée tant qu'il n'y a rien à dire, annoncée par les lecteurs d'écran sinon. */
export function creerZonePresque() {
  const zone = creer('p', 'presque connexion__presque');
  zone.setAttribute('role', 'alert');
  zone.hidden = true;
  return zone;
}

export function montrerPresque(zone, message) {
  zone.textContent = message;
  zone.hidden = false;
}

export function cacherPresque(zone) {
  zone.textContent = '';
  zone.hidden = true;
}

/**
 * Branche l'envoi d'un formulaire : le bouton se bloque pendant l'appel, une `ErreurCompte` devient
 * un « Presque ! » avec le message écrit dans le code, jamais celui du serveur.
 * @param {Object} options
 * @param {HTMLFormElement} options.formulaire
 * @param {HTMLButtonElement} options.bouton Le bouton d'envoi.
 * @param {HTMLElement} options.zonePresque
 * @param {function(): Promise<void>} options.action Ce que fait le formulaire une fois rempli.
 * @param {function(ErreurCompte): void} [options.auEchec] Appelée après une `ErreurCompte` (pour proposer une issue).
 * @param {function(): void} [options.apresEnvoi] Appelée une fois le bouton débloqué (pour le rebloquer si besoin).
 * @param {function(string, Error): void} options.signaler Le journal du contexte, pour les erreurs imprévues.
 */
export function brancherEnvoi({
  formulaire, bouton, zonePresque, action, auEchec = () => {}, apresEnvoi = () => {}, signaler,
}) {
  formulaire.noValidate = true;
  formulaire.addEventListener('submit', async (evenement) => {
    evenement.preventDefault();
    cacherPresque(zonePresque);
    bouton.disabled = true;
    bouton.setAttribute('aria-busy', 'true');
    try {
      await action();
    } catch (erreur) {
      if (erreur instanceof ErreurCompte) {
        montrerPresque(zonePresque, erreur.message);
        auEchec(erreur);
      } else {
        signaler('Envoi du formulaire de compte impossible', erreur);
        montrerPresque(zonePresque, messagePourErreur('inconnue'));
      }
    } finally {
      bouton.disabled = false;
      bouton.removeAttribute('aria-busy');
      apresEnvoi();
    }
  });
}

/**
 * Vérifie les champs d'un formulaire : montre le message de chacun de ceux qui sont faux,
 * et place le focus sur le premier.
 * @param {Array<{element: Object, message: string|null}>} controles Dans l'ordre de la page ;
 *   `message` vaut `null` si le champ est bon.
 * @returns {boolean} Vrai si tous les champs sont bons.
 */
export function verifierChamps(controles) {
  controles.forEach(({ element }) => effacerErreurDuChamp(element));
  const fautifs = controles.filter(({ message }) => message !== null);
  // Du dernier au premier : le focus finit sur le premier champ faux.
  [...fautifs].reverse().forEach(({ element, message }) => signalerErreurDuChamp(element, message));
  return fautifs.length === 0;
}
