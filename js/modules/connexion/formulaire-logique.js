// Logique pure des formulaires de compte : validation des champs et compte à rebours du « Renvoyer le mail ».
// Aucun accès au DOM ni au réseau : tout se teste sans navigateur.

import { messagePourErreur } from '../../coeur/compte-erreurs.js';
import { ESPACE_INSECABLE } from '../../coeur/texte.js';

export { ESPACE_INSECABLE };

export const LONGUEUR_MINIMALE_MOT_DE_PASSE = 8;
/** Le serveur n'envoie qu'un mail par minute à la même adresse. */
export const DELAI_RENVOI_SECONDES = 60;

const MILLISECONDES_PAR_SECONDE = 1000;
/** Une forme simple : quelque chose, un @, quelque chose, un point, quelque chose. Le serveur vérifie vraiment. */
const ADRESSE_SIMPLE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MESSAGE_ADRESSE_VIDE = 'Écris ton adresse mail pour continuer.';
const MESSAGE_MOT_DE_PASSE_VIDE = 'Écris ton mot de passe pour continuer.';
const LIBELLE_RENVOYER = 'Renvoyer le mail';

/**
 * @param {string} texte Ce qui est écrit dans le champ (les espaces autour ne comptent pas).
 * @returns {string|null} Le message à montrer, ou `null` si l'adresse a une forme correcte.
 */
export function verifierAdresse(texte) {
  const adresse = texte.trim();
  if (adresse === '') {
    return MESSAGE_ADRESSE_VIDE;
  }
  return ADRESSE_SIMPLE.test(adresse) ? null : messagePourErreur('adresse-invalide');
}

/**
 * À la connexion, le mot de passe existe déjà : seule l'absence est refusée (le serveur dit s'il est bon).
 * @param {string} texte
 * @returns {string|null} Le message à montrer, ou `null` si quelque chose est écrit.
 */
export function verifierMotDePasseExistant(texte) {
  return texte === '' ? MESSAGE_MOT_DE_PASSE_VIDE : null;
}

/**
 * Un mot de passe est pris tel quel : les espaces en font partie, on ne les retire jamais.
 * @param {string} texte
 * @returns {string|null} Le message à montrer, ou `null` si le mot de passe est assez long.
 */
export function verifierMotDePasse(texte) {
  if (texte === '') {
    return MESSAGE_MOT_DE_PASSE_VIDE;
  }
  return texte.length >= LONGUEUR_MINIMALE_MOT_DE_PASSE ? null : messagePourErreur('mot-de-passe-faible');
}

/**
 * Combien de secondes attendre avant de pouvoir renvoyer un mail.
 * @param {Object} options
 * @param {number|null} options.dernierEnvoi Instant du dernier mail (millisecondes), `null` s'il n'y en a pas eu.
 * @param {number} options.maintenant Instant présent (millisecondes).
 * @returns {number} Un nombre entier de secondes, 0 si on peut renvoyer tout de suite.
 */
export function secondesAvantRenvoi({ dernierEnvoi, maintenant }) {
  if (dernierEnvoi === null) {
    return 0;
  }
  const ecoule = (maintenant - dernierEnvoi) / MILLISECONDES_PAR_SECONDE;
  return Math.max(0, Math.ceil(DELAI_RENVOI_SECONDES - ecoule));
}

/**
 * @param {number} secondes Attente restante.
 * @returns {string} Le texte du bouton, avec le compte à rebours quand il faut attendre.
 */
export function libelleRenvoi(secondes) {
  return secondes > 0 ? `${LIBELLE_RENVOYER} (dans ${secondes}${ESPACE_INSECABLE}s)` : LIBELLE_RENVOYER;
}
