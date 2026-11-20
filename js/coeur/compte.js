/**
 * Le client du compte : il parle à l'authentification de Supabase avec `fetch` seul, sans bibliothèque.
 * Tout ce dont il a besoin est injecté (`fetch`, stockage de la session, horloge) : les tests n'ont pas de réseau.
 *
 * Règles : un mot de passe n'est jamais gardé après l'appel ; rien n'est journalisé ; une erreur est une
 * `ErreurCompte` dont le message français vient de `compte-erreurs.js` (jamais du serveur) ; une coupure réseau
 * ne déconnecte jamais (seule une session que le serveur refuse est vidée).
 */

import { CLE_PUBLIQUE, URL_PROJET } from './config-compte.js';
import { messagePourErreur, typeDErreur } from './compte-erreurs.js';
import { creerStockageSession, estSessionValide, sessionExpireBientot } from './compte-session.js';

const RACINE_AUTH = '/auth/v1';
const STATUT_NON_AUTORISE = 401;

/** Une erreur de compte : `type` (voir `compte-erreurs.js`), `message` français, `statut` HTTP s'il y en a un. */
export class ErreurCompte extends Error {
  /**
   * @param {string} type Un des `TYPES_D_ERREUR`.
   * @param {{statut?: number, cause?: Error}} [details]
   */
  constructor(type, { statut, cause } = {}) {
    super(messagePourErreur(type), { cause });
    this.name = 'ErreurCompte';
    this.type = type;
    this.statut = statut;
  }
}

// --- Les requêtes ---

function construireUrl(chemin, parametres) {
  const url = new URL(`${URL_PROJET}${RACINE_AUTH}${chemin}`);
  for (const [nom, valeur] of Object.entries(parametres)) {
    url.searchParams.set(nom, valeur);
  }
  return url;
}

/** `apikey` toujours ; `Authorization: Bearer` seulement avec un jeton d'utilisateur (la clé publique n'est pas un jeton). */
function construireEntetes(corps, jeton) {
  const entetes = { apikey: CLE_PUBLIQUE };
  if (corps !== undefined) {
    entetes['Content-Type'] = 'application/json';
  }
  if (jeton !== undefined) {
    entetes.Authorization = `Bearer ${jeton}`;
  }
  return entetes;
}

/** Le JSON d'une réponse ; `null` quand elle est vide (204) ou n'est pas du JSON. */
async function lireCorps(reponse) {
  const texte = await reponse.text();
  try {
    return texte === '' ? null : JSON.parse(texte);
  } catch {
    return null;
  }
}

/**
 * Envoie une requête à l'authentification et rend le JSON de la réponse.
 * @throws {ErreurCompte} `reseau` si la requête n'a pas pu aboutir, sinon le type donné par le code d'erreur du serveur.
 */
async function appeler(contexte, chemin, { methode = 'GET', corps, jeton, parametres = {} } = {}) {
  // `fetch` doit être appelé seul : appelé comme méthode de `contexte`, le navigateur refuse (« Illegal invocation »).
  const { fetch: appelerReseau } = contexte;
  let reponse;
  let contenu;
  try {
    reponse = await appelerReseau(construireUrl(chemin, parametres), {
      method: methode,
      headers: construireEntetes(corps, jeton),
      body: corps === undefined ? undefined : JSON.stringify(corps),
    });
    contenu = await lireCorps(reponse);
  } catch (erreur) {
    throw new ErreurCompte('reseau', { cause: erreur });
  }
  if (!reponse.ok) {
    const code = contenu?.error_code ?? contenu?.error;
    throw new ErreurCompte(typeDErreur({ code, statut: reponse.status }), { statut: reponse.status });
  }
  return contenu;
}

/** Le paramètre `redirect_to` des mails : l'adresse de base du site, donnée par l'appelant. */
function parametresDeRetour(contexte) {
  return contexte.urlDeRetour === undefined ? {} : { redirect_to: contexte.urlDeRetour };
}

// --- La session ---

function utilisateurDe(session) {
  return session === null ? null : { ...session.utilisateur };
}

function prevenir(contexte) {
  const utilisateur = utilisateurDe(contexte.stockage.lire());
  for (const ecouteur of contexte.ecouteurs) {
    ecouteur(utilisateur);
  }
}

function enregistrerSession(contexte, session) {
  contexte.stockage.ecrire(session);
  prevenir(contexte);
}

function effacerSession(contexte) {
  contexte.stockage.effacer();
  prevenir(contexte);
}

/** Fabrique la session à garder d'après la réponse du serveur (connexion, rafraîchissement, inscription directe). */
function creerSessionDepuisReponse(contenu) {
  const session = {
    access_token: contenu?.access_token,
    refresh_token: contenu?.refresh_token,
    expires_at: contenu?.expires_at,
    utilisateur: { id: contenu?.user?.id, email: contenu?.user?.email },
  };
  if (!estSessionValide(session)) {
    throw new ErreurCompte('inconnue');
  }
  return session;
}

async function executerRafraichissement(contexte) {
  const session = contexte.stockage.lire();
  if (session === null) {
    return null;
  }
  try {
    const contenu = await appeler(contexte, '/token', {
      methode: 'POST',
      parametres: { grant_type: 'refresh_token' },
      corps: { refresh_token: session.refresh_token },
    });
    const nouvelle = creerSessionDepuisReponse(contenu);
    enregistrerSession(contexte, nouvelle); // écrite AVANT de relancer la requête qui attendait
    return nouvelle;
  } catch (erreur) {
    if (erreur.type !== 'session-perdue') {
      throw erreur; // réseau coupé, service en panne… : la session est gardée
    }
    effacerSession(contexte);
    return null;
  }
}

/** Une seule demande de rafraîchissement à la fois : un second appel reçoit la même promesse. */
function rafraichir(contexte) {
  contexte.rafraichissement ??= executerRafraichissement(contexte).finally(() => {
    contexte.rafraichissement = null;
  });
  return contexte.rafraichissement;
}

async function jetonValide(contexte, renouveler) {
  let session = contexte.stockage.lire();
  if (session === null) {
    return null;
  }
  if (renouveler || sessionExpireBientot(session, contexte.maintenant())) {
    session = await rafraichir(contexte);
  }
  return session === null ? null : { jeton: session.access_token, idUtilisateur: session.utilisateur.id };
}

/** Un appel de l'utilisateur connecté ; sur un 401, un seul nouvel essai après rafraîchissement. */
async function appelerAvecSession(contexte, chemin, options) {
  const acces = await jetonValide(contexte);
  if (acces === null) {
    throw new ErreurCompte('session-perdue');
  }
  try {
    return await appeler(contexte, chemin, { ...options, jeton: acces.jeton });
  } catch (erreur) {
    if (erreur.statut !== STATUT_NON_AUTORISE) {
      throw erreur;
    }
    const nouvelAcces = await jetonValide(contexte, true);
    if (nouvelAcces === null) {
      throw new ErreurCompte('session-perdue');
    }
    return appeler(contexte, chemin, { ...options, jeton: nouvelAcces.jeton });
  }
}

// --- Ce que le compte sait faire ---

async function inscrire(contexte, email, motDePasse) {
  const contenu = await appeler(contexte, '/signup', {
    methode: 'POST',
    parametres: parametresDeRetour(contexte),
    corps: { email, password: motDePasse },
  });
  if (typeof contenu?.access_token === 'string') {
    enregistrerSession(contexte, creerSessionDepuisReponse(contenu));
    return { etat: 'connecte' };
  }
  // Adresse nouvelle ou déjà prise (`identities` vide) : la même réponse, pour ne rien révéler.
  return { etat: 'confirmation-requise' };
}

async function connecter(contexte, email, motDePasse) {
  const contenu = await appeler(contexte, '/token', {
    methode: 'POST',
    parametres: { grant_type: 'password' },
    corps: { email, password: motDePasse },
  });
  enregistrerSession(contexte, creerSessionDepuisReponse(contenu));
  return { etat: 'connecte' };
}

/** La session locale est vidée d'abord, quoi qu'il arrive ; le serveur est prévenu si c'est possible. */
async function deconnecter(contexte) {
  const session = contexte.stockage.lire();
  effacerSession(contexte);
  if (session === null) {
    return { etat: 'deconnecte', serveurPrevenu: true };
  }
  try {
    await appeler(contexte, '/logout', { methode: 'POST', parametres: { scope: 'local' }, jeton: session.access_token });
    return { etat: 'deconnecte', serveurPrevenu: true };
  } catch (erreur) {
    return { etat: 'deconnecte', serveurPrevenu: false, type: erreur.type };
  }
}

async function envoyerUnMail(contexte, chemin, corps) {
  await appeler(contexte, chemin, { methode: 'POST', parametres: parametresDeRetour(contexte), corps });
  return { etat: 'mail-envoye' };
}

async function changerMotDePasse(contexte, nouveau) {
  await appelerAvecSession(contexte, '/user', { methode: 'PUT', corps: { password: nouveau } });
  return { etat: 'mot-de-passe-change' };
}

/** La session d'un lien de mail ne contient que les jetons : l'utilisateur vient du serveur. */
async function accepterSessionDeLien(contexte, sessionDeLien) {
  const utilisateur = await appeler(contexte, '/user', { jeton: sessionDeLien.access_token });
  enregistrerSession(contexte, creerSessionDepuisReponse({ ...sessionDeLien, user: utilisateur }));
  return { etat: 'connecte' };
}

/**
 * Crée le client du compte.
 * @param {Object} [options]
 * @param {function} [options.fetch] Par défaut le `fetch` du navigateur.
 * @param {{lire: Function, ecrire: Function, effacer: Function}} [options.stockage] Voir `creerStockageSession`.
 * @param {function(): Date} [options.maintenant] L'horloge.
 * @param {string} [options.urlDeRetour] Adresse de base du site (`origin + pathname`, `/` final, sans hash),
 *   où mènent les liens des mails.
 * @returns {{
 *   inscrire: function(string, string): Promise<{etat: 'connecte'|'confirmation-requise'}>,
 *   connecter: function(string, string): Promise<{etat: 'connecte'}>,
 *   deconnecter: function(): Promise<{etat: 'deconnecte', serveurPrevenu: boolean}>,
 *   motDePasseOublie: function(string): Promise<{etat: 'mail-envoye'}>,
 *   renvoyerConfirmation: function(string): Promise<{etat: 'mail-envoye'}>,
 *   changerMotDePasse: function(string): Promise<{etat: 'mot-de-passe-change'}>,
 *   accepterSessionDeLien: function(Object): Promise<{etat: 'connecte'}>,
 *   utilisateur: function(): ({id: string, email: string}|null),
 *   jetonValide: function({renouveler?: boolean}=): Promise<{jeton: string, idUtilisateur: string}|null>,
 *   ecouter: function(function(Object|null): void): function(): void
 * }}
 *   Toutes les opérations réseau peuvent rejeter une `ErreurCompte`. `jetonValide({ renouveler: true })` : à appeler
 *   quand le serveur vient de refuser le jeton (401) ; il est rafraîchi même s'il n'a pas expiré.
 *   `null` si personne n'est connecté.
 */
export function creerCompte({
  fetch = globalThis.fetch,
  stockage = creerStockageSession(),
  maintenant = () => new Date(),
  urlDeRetour,
} = {}) {
  const contexte = { fetch, stockage, maintenant, urlDeRetour, ecouteurs: new Set(), rafraichissement: null };

  return {
    inscrire: (email, motDePasse) => inscrire(contexte, email, motDePasse),
    connecter: (email, motDePasse) => connecter(contexte, email, motDePasse),
    deconnecter: () => deconnecter(contexte),
    motDePasseOublie: (email) => envoyerUnMail(contexte, '/recover', { email }),
    renvoyerConfirmation: (email) => envoyerUnMail(contexte, '/resend', { type: 'signup', email }),
    changerMotDePasse: (nouveau) => changerMotDePasse(contexte, nouveau),
    accepterSessionDeLien: (session) => accepterSessionDeLien(contexte, session),
    utilisateur: () => utilisateurDe(stockage.lire()),
    jetonValide: ({ renouveler = false } = {}) => jetonValide(contexte, renouveler),
    /**
     * Appelle `fonction` avec l'utilisateur (ou `null`) à chaque changement ; renvoie de quoi arrêter d'écouter.
     * Une fonction qui écoute ne doit pas lever d'exception.
     */
    ecouter(fonction) {
      contexte.ecouteurs.add(fonction);
      return () => contexte.ecouteurs.delete(fonction);
    },
  };
}
