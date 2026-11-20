/**
 * Les erreurs du compte, racontées à un enfant : le serveur donne un `error_code`, on en tire un type d'erreur,
 * puis un message français écrit ici. Le texte envoyé par le serveur n'est jamais affiché.
 * Espaces insécables (U+00A0) avant `?`, `!`, `:`, `;` et dans les « ».
 */

/** Le code d'erreur du serveur (`error_code`) et le type d'erreur qui lui correspond. */
const TYPE_PAR_CODE = Object.freeze({
  invalid_credentials: 'identifiants',
  email_not_confirmed: 'mail-non-confirme',
  user_already_exists: 'deja-pris',
  email_exists: 'deja-pris',
  weak_password: 'mot-de-passe-faible',
  same_password: 'meme-mot-de-passe',
  validation_failed: 'adresse-invalide',
  email_address_invalid: 'adresse-invalide',
  over_request_rate_limit: 'trop-de-requetes',
  over_email_send_rate_limit: 'trop-de-mails',
  email_address_not_authorized: 'adresse-non-autorisee',
  email_provider_disabled: 'inscriptions-fermees',
  signup_disabled: 'inscriptions-fermees',
  invalid_grant: 'session-perdue',
  refresh_token_not_found: 'session-perdue',
  refresh_token_already_used: 'session-perdue',
  session_not_found: 'session-perdue',
  bad_jwt: 'session-perdue',
  otp_expired: 'lien-expire',
  conflict: 'service',
  unexpected_failure: 'service',
  request_timeout: 'service',
});

/** À partir de ce statut HTTP, c'est le service qui est en panne, quel que soit le code. */
const STATUT_PANNE_DU_SERVICE = 500;

const MESSAGES = Object.freeze({
  identifiants: 'Cette adresse et ce mot de passe ne vont pas ensemble. Essaie encore.',
  'mail-non-confirme': "Ton adresse n'est pas encore confirmée. Ouvre le mail que nous t'avons envoyé.",
  'deja-pris': 'Un compte existe déjà avec cette adresse.',
  'mot-de-passe-faible': 'Choisis un mot de passe plus long (8 caractères au moins).',
  'meme-mot-de-passe': "Choisis un mot de passe différent de l'ancien.",
  'adresse-invalide': "Cette adresse mail n'a pas l'air correcte.",
  'trop-de-requetes': "Trop d'essais. Attends quelques minutes.",
  'trop-de-mails': 'Trop de mails ont été envoyés. Réessaie dans une heure.',
  'session-perdue': "Reconnecte-toi, s'il te plaît. Ta progression reste sur cet appareil.",
  reseau: 'Pas de connexion. Ta progression reste sur cet appareil.',
  service: 'Le service ne répond pas. Réessaie plus tard.',
  'adresse-non-autorisee': 'Ce service ne peut pas encore écrire à cette adresse. Demande à un adulte.',
  'inscriptions-fermees': 'Les inscriptions sont fermées pour le moment.',
  'lien-expire': 'Ce lien a expiré. Demande-en un nouveau.',
  inconnue: "Quelque chose s'est mal passé. Essaie encore dans un instant.",
});

/** Tous les types d'erreur possibles. */
export const TYPES_D_ERREUR = Object.freeze(Object.keys(MESSAGES));

/**
 * Le type d'une erreur de compte.
 * @param {Object} erreur
 * @param {string} [erreur.code] `error_code` renvoyé par le serveur.
 * @param {number} [erreur.statut] Statut HTTP de la réponse.
 * @param {boolean} [erreur.reseau] Vrai quand la requête n'a pas pu partir (hors ligne, `fetch` rejeté).
 * @returns {string} Un des `TYPES_D_ERREUR`.
 */
export function typeDErreur({ code, statut, reseau } = {}) {
  if (reseau) {
    return 'reseau';
  }
  if (Object.hasOwn(TYPE_PAR_CODE, code)) {
    return TYPE_PAR_CODE[code];
  }
  return statut >= STATUT_PANNE_DU_SERVICE ? 'service' : 'inconnue';
}

/**
 * Le message français d'un type d'erreur. Un type inconnu donne le message de l'erreur « inconnue ».
 * @param {string} type
 * @returns {string}
 */
export function messagePourErreur(type) {
  return Object.hasOwn(MESSAGES, type) ? MESSAGES[type] : MESSAGES.inconnue;
}
