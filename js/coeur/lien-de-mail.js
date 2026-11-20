/**
 * Les liens des mails de compte (confirmation, mot de passe oublié) ramènent sur le site avec un fragment :
 * `#access_token=…` ou `#error=…`. Le routeur le prendrait pour une route cassée et perdrait les jetons :
 * ce module le traite AVANT le routeur, puis efface le fragment de l'adresse dans tous les cas.
 *
 * Sécurité : un lien ne connecte JAMAIS tout seul. Quelqu'un qui a son propre compte peut fabriquer un lien avec SES
 * jetons ; si un proche l'ouvrait, son navigateur serait connecté au compte de l'attaquant (et la progression de
 * l'enfant partirait chez lui). Le lien attend donc, en mémoire seulement, que l'élève le confirme sur une page
 * qui lui montre l'adresse du compte. Aucune session, aucun appel réseau, aucune synchro avant ce clic.
 */

import { ErreurCompte } from './compte.js';
import { analyserFragmentDeLien, effacerFragment, estFragmentDeLien, lireEmailDuJeton } from './compte-session.js';

export const ROUTE_LIEN_INVALIDE = '#/lien-invalide';
export const ROUTE_CONFIRMATION_DU_LIEN = '#/lien-de-mail';
export const ROUTE_APRES_CONFIRMATION = '#/compte';
export const ROUTE_NOUVEAU_MOT_DE_PASSE = '#/reinitialiser';
export const ROUTE_ACCUEIL = '#/accueil';

/** Au-delà, on arrête d'attendre le serveur : une erreur plutôt qu'une page qui attend sans fin. */
export const DELAI_MAX_MS = 3000;

/**
 * Le lien qui attend la confirmation de l'élève : `{ nature, session, email, compte }`.
 * Les jetons (`session`) restent ICI : ni dans le stockage, ni dans la page, ni dans l'adresse, ni dans un journal.
 */
let lienEnAttente = null;

/** Où mène un lien confirmé : le nouveau mot de passe pour « recovery », le compte sinon. */
function routeApresConfirmation(nature) {
  return nature === 'recovery' ? ROUTE_NOUVEAU_MOT_DE_PASSE : ROUTE_APRES_CONFIRMATION;
}

/** Rend la promesse, mais la rejette si elle n'a pas abouti au bout de `delai` millisecondes. */
function avecDelaiMax(promesse, delai) {
  let minuteur;
  const delaiDepasse = new Promise((_, rejeter) => {
    minuteur = setTimeout(() => rejeter(new ErreurCompte('reseau')), delai);
  });
  return Promise.race([promesse, delaiDepasse]).finally(() => clearTimeout(minuteur));
}

/** Garde le lien en mémoire s'il est lisible et porte un jeton de compte valable ; sinon n'en garde aucun. */
function garderLeLien(analyse, compte) {
  const email = analyse?.type === 'session' ? lireEmailDuJeton(analyse.session.access_token) : null;
  if (email === null) {
    lienEnAttente = null; // un lien invalide remplace aussi un lien qui attendait : jamais deux à la fois
    return false;
  }
  lienEnAttente = { nature: analyse.nature, session: analyse.session, email, compte };
  return true;
}

/**
 * Traite le fragment de l'adresse s'il vient d'un mail de compte ; sinon ne touche à rien.
 * Synchrone et sans réseau : l'adresse est effacée tout de suite (les jetons ne restent ni dans l'URL ni dans
 * l'historique), puis la page va à la confirmation du lien, ou à « lien invalide » (expiré, mal formé, illisible).
 * @param {Object} options
 * @param {{location: {hash: string, pathname: string, search: string}, history: {replaceState: Function}}} options.fenetre
 * @param {{accepterSessionDeLien: function(Object): Promise<Object>, utilisateur: function(): (Object|null)}} options.compte
 * @returns {string|null} La route vers laquelle l'adresse a été envoyée, ou `null` si ce n'était pas un lien de compte.
 */
export function traiterLienDeMail({ fenetre, compte }) {
  const { hash } = fenetre.location;
  if (!estFragmentDeLien(hash)) {
    return null;
  }
  const route = garderLeLien(analyserFragmentDeLien(hash), compte) ? ROUTE_CONFIRMATION_DU_LIEN : ROUTE_LIEN_INVALIDE;
  effacerFragment(fenetre, route);
  return route;
}

/**
 * Ce que la page de confirmation montre à l'élève. Jamais un jeton.
 * @returns {{nature: string, email: string, emailSessionActuelle: string|null}|null} `null` si aucun lien n'attend.
 *   `emailSessionActuelle` : le compte déjà connecté sur cet appareil, que le lien remplacerait.
 */
export function lireLienEnAttente() {
  if (lienEnAttente === null) {
    return null;
  }
  const { nature, email, compte } = lienEnAttente;
  return { nature, email, emailSessionActuelle: compte.utilisateur()?.email ?? null };
}

/**
 * L'élève confirme : la session du lien est enregistrée (3 s au plus), puis la route de destination est rendue.
 * La mémoire est vidée dès l'appel : un second appel ne rejoue pas le lien.
 * @param {Object} [options]
 * @param {number} [options.delaiMax] Millisecondes d'attente du serveur (`DELAI_MAX_MS` par défaut).
 * @returns {Promise<string>} `#/compte` (confirmation) ou `#/reinitialiser` (mot de passe oublié).
 * @throws {ErreurCompte} Si aucun lien n'attend, si le serveur refuse le lien, ou s'il ne répond pas à temps :
 *   la page mène alors à « lien invalide ».
 */
export async function confirmerLienEnAttente({ delaiMax = DELAI_MAX_MS } = {}) {
  const lien = lienEnAttente;
  lienEnAttente = null;
  if (lien === null) {
    throw new ErreurCompte('lien-expire');
  }
  await avecDelaiMax(lien.compte.accepterSessionDeLien(lien.session), delaiMax);
  return routeApresConfirmation(lien.nature);
}

/**
 * L'élève refuse : les jetons sont effacés de la mémoire, aucune session n'est créée.
 * @returns {string} La route d'accueil.
 */
export function refuserLienEnAttente() {
  lienEnAttente = null;
  return ROUTE_ACCUEIL;
}
