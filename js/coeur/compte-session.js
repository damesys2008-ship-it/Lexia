/**
 * La session du compte : où elle est gardée, quand la rafraîchir, et comment lire le fragment d'un lien de mail.
 * Le support de stockage et la fenêtre sont injectés : `localStorage` n'apparaît que comme valeur par défaut.
 * La session n'entre JAMAIS dans la sauvegarde ni dans l'export (`transfert.js`) et n'est jamais journalisée.
 */

import { ANCIENNE_CLE_SESSION, CLE_SESSION } from './config-compte.js';
import { migrerCle } from './migration-cles.js';

/** On rafraîchit le jeton quand il lui reste moins de temps que cela. */
export const MARGE_RAFRAICHISSEMENT_SECONDES = 60;

const MILLISECONDES_PAR_SECONDE = 1000;
const LONGUEUR_MAX_JETON = 4096;
const LONGUEUR_MAX_TEXTE = 320;
const FORME_DE_JETON = /^[\w.-]+$/;
const FORME_DE_CODE = /^[a-z0-9_]{1,64}$/;
const FORME_DE_DATE = /^\d{1,12}$/;
const NATURES_DE_LIEN = ['signup', 'recovery'];
const DEBUTS_DE_FRAGMENT = ['#access_token=', '#error='];

function estJetonValide(valeur) {
  return typeof valeur === 'string' && valeur.length <= LONGUEUR_MAX_JETON && FORME_DE_JETON.test(valeur);
}

function estTexteValide(valeur) {
  return typeof valeur === 'string' && valeur.length > 0 && valeur.length <= LONGUEUR_MAX_TEXTE;
}

function estDateValide(valeur) {
  return Number.isInteger(valeur) && valeur > 0;
}

function sontJetonsValides({ access_token: acces, refresh_token: rafraichissement, expires_at: expiration }) {
  return estJetonValide(acces) && estJetonValide(rafraichissement) && estDateValide(expiration);
}

/**
 * Vrai si la valeur a la forme d'une session complète :
 * `{access_token, refresh_token, expires_at, utilisateur: {id, email}}`.
 * @param {unknown} session
 * @returns {boolean}
 */
export function estSessionValide(session) {
  if (session === null || typeof session !== 'object') {
    return false;
  }
  const { utilisateur } = session;
  return sontJetonsValides(session)
    && utilisateur !== null && typeof utilisateur === 'object'
    && estTexteValide(utilisateur.id) && estTexteValide(utilisateur.email);
}

/** Garde seulement les quatre champs de la session : rien d'autre ne reste dans le stockage. */
function resumerSession({ access_token: acces, refresh_token: rafraichissement, expires_at: expiration, utilisateur }) {
  return {
    access_token: acces,
    refresh_token: rafraichissement,
    expires_at: expiration,
    utilisateur: { id: utilisateur.id, email: utilisateur.email },
  };
}

function lireDepuisSupport(support) {
  try {
    const cleALire = migrerCle(support, ANCIENNE_CLE_SESSION, CLE_SESSION);
    const brut = support.getItem(cleALire);
    const session = brut === null ? null : JSON.parse(brut);
    return estSessionValide(session) ? session : null;
  } catch {
    return null; // support en panne ou JSON abîmé : comme si personne n'était connecté
  }
}

/**
 * Crée l'accès à la session, gardée sous la clé `lexia:session`
 * (une ancienne clé `plume:session` y est déplacée une fois, voir `migrerCle`).
 * @param {Object} [options]
 * @param {{getItem: Function, setItem: Function, removeItem: Function}} [options.support] Par défaut `localStorage`.
 * @returns {{
 *   lire: function(): (Object|null),
 *   ecrire: function(Object): void,
 *   effacer: function(): void
 * }}
 */
export function creerStockageSession({ support = globalThis.localStorage } = {}) {
  /** @returns {Object|null} La session enregistrée, ou `null` s'il n'y en a pas (ou si elle est abîmée). */
  function lire() {
    return lireDepuisSupport(support);
  }

  /**
   * @param {Object} session
   * @throws {RangeError} Si la session n'a pas la bonne forme (rien n'est enregistré).
   */
  function ecrire(session) {
    if (!estSessionValide(session)) {
      throw new RangeError("La session n'a pas la forme attendue.");
    }
    support.setItem(CLE_SESSION, JSON.stringify(resumerSession(session)));
  }

  function effacer() {
    support.removeItem(CLE_SESSION);
    support.removeItem(ANCIENNE_CLE_SESSION); // sinon une session pas encore migrée reviendrait à la lecture suivante
  }

  return { lire, ecrire, effacer };
}

/**
 * Vrai quand le jeton d'accès expire dans moins d'une minute (ou est déjà expiré) : il faut le rafraîchir.
 * @param {{expires_at: number}} session `expires_at` en secondes (date Unix).
 * @param {Date} maintenant
 * @returns {boolean}
 */
export function sessionExpireBientot(session, maintenant) {
  const secondesRestantes = session.expires_at - maintenant.getTime() / MILLISECONDES_PAR_SECONDE;
  return secondesRestantes < MARGE_RAFRAICHISSEMENT_SECONDES;
}

function analyserErreurDeLien(parametres) {
  const code = parametres.get('error_code') ?? parametres.get('error');
  return { type: 'erreur', code: FORME_DE_CODE.test(code ?? '') ? code : 'inconnue' };
}

function analyserSessionDeLien(parametres) {
  const nature = parametres.get('type');
  const session = {
    access_token: parametres.get('access_token'),
    refresh_token: parametres.get('refresh_token'),
    expires_at: FORME_DE_DATE.test(parametres.get('expires_at') ?? '') ? Number(parametres.get('expires_at')) : null,
  };
  if (!NATURES_DE_LIEN.includes(nature) || !sontJetonsValides(session)) {
    return null;
  }
  return { type: 'session', session, nature };
}

const ROLE_ATTENDU = 'authenticated';

/** La charge utile (deuxième morceau, en base64url) d'un jeton JWT, ou `null` si elle est illisible. */
function lireChargeUtile(jeton) {
  const morceaux = jeton.split('.');
  if (morceaux.length !== 3) {
    return null;
  }
  try {
    const base64 = morceaux[1].replaceAll('-', '+').replaceAll('_', '/');
    const octets = Uint8Array.from(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')), (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(octets));
  } catch {
    return null; // pas du base64, pas du JSON : ce n'est pas un jeton de compte
  }
}

/**
 * L'adresse mail écrite dans un jeton d'accès, pour la montrer à l'élève avant qu'il confirme un lien de mail.
 * Ce n'est PAS une vérification de signature (impossible côté site) : c'est de l'affichage honnête.
 * Le serveur rejettera tout faux jeton à la première requête.
 * @param {string} jeton Jeton d'accès (JWT).
 * @param {Date} [maintenant]
 * @returns {string|null} L'adresse, ou `null` si le jeton est mal formé, expiré, ou n'est pas celui d'un compte connecté.
 */
export function lireEmailDuJeton(jeton, maintenant = new Date()) {
  const charge = estJetonValide(jeton) ? lireChargeUtile(jeton) : null;
  if (charge === null || typeof charge !== 'object') {
    return null;
  }
  const { email, exp, role } = charge;
  const secondes = maintenant.getTime() / MILLISECONDES_PAR_SECONDE;
  const estCompteConnecte = role === ROLE_ATTENDU && typeof exp === 'number' && exp > secondes;
  return estCompteConnecte && estTexteValide(email) ? email : null;
}

/**
 * Vrai pour tout fragment qui ressemble à un lien de compte (`#access_token=…` ou `#error=…`), même mal formé :
 * l'appelant sait ainsi qu'il doit l'effacer de l'adresse.
 * @param {string} hash
 * @returns {boolean}
 */
export function estFragmentDeLien(hash) {
  return typeof hash === 'string' && DEBUTS_DE_FRAGMENT.some((debut) => hash.startsWith(debut));
}

/**
 * Lit le fragment (`location.hash`) d'un lien de mail de confirmation ou de réinitialisation.
 * La session rendue ne contient que les jetons : l'utilisateur s'obtient ensuite avec `GET /auth/v1/user`.
 * @param {string} hash Par exemple `#access_token=…&type=recovery`.
 * @returns {{type: 'session', session: {access_token: string, refresh_token: string, expires_at: number}, nature: string}
 *   |{type: 'erreur', code: string}|null} `null` si ce n'est pas un lien de compte, ou s'il est mal formé.
 */
export function analyserFragmentDeLien(hash) {
  if (!estFragmentDeLien(hash)) {
    return null;
  }
  const parametres = new URLSearchParams(hash.slice(1));
  return parametres.has('access_token') ? analyserSessionDeLien(parametres) : analyserErreurDeLien(parametres);
}

/**
 * Remplace le fragment de l'adresse par une route du site : les jetons ne restent ni dans l'URL ni dans l'historique.
 * @param {{location: {pathname: string, search: string}, history: {replaceState: Function}}} fenetre
 * @param {string} route Une route du site, par exemple `#/reinitialiser`.
 * @throws {RangeError} Si `route` ne commence pas par `#/`.
 */
export function effacerFragment(fenetre, route) {
  if (typeof route !== 'string' || !route.startsWith('#/')) {
    throw new RangeError('La route doit commencer par #/.');
  }
  const { pathname, search } = fenetre.location;
  fenetre.history.replaceState(null, '', `${pathname}${search}${route}`);
}
