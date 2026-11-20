/**
 * Sauvegarde en ligne : envoie la progression au compte et la relit, avec `fetch` seul (sans bibliothèque).
 * Pas d'écran ici : la session vient d'un fournisseur de jeton injecté, le réseau aussi.
 *
 * Règles de sécurité :
 * - ce qui revient du serveur est revalidé comme un fichier importé (`importerFichier`), jamais installé tel quel ;
 * - la session et les jetons ne sont jamais dans le corps envoyé ;
 * - les messages montrés viennent du code (`compte-erreurs.js`, `MESSAGES_PROPRES`),
 *   jamais du texte renvoyé par le serveur.
 */

import { messagePourErreur } from './compte-erreurs.js';
import { ErreurImport, importerFichier, TAILLE_MAX_JSON } from './transfert.js';

const CHEMIN_SAUVEGARDES = '/rest/v1/plume_sauvegardes';
const CHAMPS_LUS = 'donnees,version_schema,mis_a_jour';
const DELAI_ENVOI_MS = 3000;
/** Même limite que la base (1 100 000 octets de JSON, espaces comprises), plus la place de l'enveloppe. */
const TAILLE_MAX_REPONSE = 1110000;
const CODE_HTTP_NON_AUTORISE = 401;
const CODE_HTTP_TROP_GROS = 413;
/** Code PostgreSQL d'une contrainte « check » violée : ici, la taille de la sauvegarde. */
const CODE_POSTGRES_CONTRAINTE = '23514';

/**
 * Les sortes d'échec, pour que l'écran choisisse quoi dire.
 * `reseau`, `service` et `session-perdue` sont ceux de `compte-erreurs.js`.
 */
export const TYPES_ERREUR = {
  RESEAU: 'reseau',
  SESSION: 'session-perdue',
  SERVICE: 'service',
  SANS_COMPTE: 'sans-compte',
  TROP_GROS: 'trop-gros',
  CONTENU: 'contenu',
};

/** Les messages propres à la sauvegarde ; les autres viennent de `messagePourErreur`. */
const MESSAGES_PROPRES = {
  [TYPES_ERREUR.SANS_COMPTE]: "Tu n'es pas connecté à un compte.",
  [TYPES_ERREUR.TROP_GROS]: 'Ta sauvegarde est trop grosse pour être envoyée.',
  [TYPES_ERREUR.CONTENU]: "La sauvegarde en ligne est abîmée : elle n'a pas été utilisée.",
};

/** Échec de la sauvegarde en ligne : `type` est une valeur de `TYPES_ERREUR`, `message` est affichable. */
export class ErreurSynchro extends Error {
  /**
   * @param {string} type Une valeur de `TYPES_ERREUR`.
   * @param {Object} [options] `{ cause }` : l'erreur d'origine, pour les développeurs.
   */
  constructor(type, options) {
    super(MESSAGES_PROPRES[type] ?? messagePourErreur(type), options);
    this.type = type;
  }
}

/**
 * @typedef {Object} Session
 * @property {string} jeton Jeton d'accès du compte.
 * @property {string} idUtilisateur Identifiant du compte (`user_id`).
 */

/**
 * @param {Response} reponse Réponse d'erreur de PostgREST.
 * @returns {Promise<string>} Le type d'échec correspondant.
 */
async function typeDepuisReponse(reponse) {
  // Un corps qui n'est pas du JSON (page d'erreur d'un relais) ne dit rien de plus que le code HTTP.
  const corps = await reponse.json().catch(() => ({}));
  if (reponse.status === CODE_HTTP_TROP_GROS || corps?.code === CODE_POSTGRES_CONTRAINTE) {
    return TYPES_ERREUR.TROP_GROS;
  }
  return TYPES_ERREUR.SERVICE;
}

/**
 * Le client REST : une requête avec le jeton du compte, et une seule nouvelle tentative si le jeton est refusé.
 * @param {Object} options Les mêmes `fetch`, `config` et `fournisseurDeJeton` que `creerSynchro`.
 * @returns {function(string, string, function(Session): (string|undefined)=): Promise<Response>}
 *   `appeler(methode, chemin, creerCorps)` ; `creerCorps` reçoit la session et renvoie le corps (ou rien).
 */
function creerClientRest({ fetch: appelerReseau, config, fournisseurDeJeton }) {
  async function envoyerRequete(methode, chemin, corps, session) {
    const entetes = {
      apikey: config.clePublique,
      Authorization: `Bearer ${session.jeton}`,
      'Content-Type': 'application/json',
    };
    if (methode === 'POST') {
      entetes.Prefer = 'resolution=merge-duplicates,return=minimal';
    }
    try {
      return await appelerReseau(`${config.urlProjet}${chemin}`, { method: methode, headers: entetes, body: corps });
    } catch {
      throw new ErreurSynchro(TYPES_ERREUR.RESEAU);
    }
  }

  return async function appeler(methode, chemin, creerCorps = () => undefined) {
    for (const options of [{}, { renouveler: true }]) {
      const session = await fournisseurDeJeton(options);
      if (session === null) {
        // Sans session dès le premier essai : pas de compte. Après un renouvellement : la session est perdue.
        throw new ErreurSynchro(options.renouveler ? TYPES_ERREUR.SESSION : TYPES_ERREUR.SANS_COMPTE);
      }
      const reponse = await envoyerRequete(methode, chemin, creerCorps(session), session);
      if (reponse.status !== CODE_HTTP_NON_AUTORISE) {
        return reponse;
      }
    }
    throw new ErreurSynchro(TYPES_ERREUR.SESSION);
  };
}

/**
 * @param {string} texte Corps de la réponse de lecture.
 * @returns {Object[]} Les lignes reçues.
 * @throws {ErreurSynchro} Si le corps est trop gros ou n'est pas une liste JSON.
 */
function lireLignes(texte) {
  if (texte.length > TAILLE_MAX_REPONSE) {
    throw new ErreurSynchro(TYPES_ERREUR.CONTENU);
  }
  let lignes;
  try {
    lignes = JSON.parse(texte);
  } catch {
    throw new ErreurSynchro(TYPES_ERREUR.CONTENU);
  }
  if (!Array.isArray(lignes)) {
    throw new ErreurSynchro(TYPES_ERREUR.CONTENU);
  }
  return lignes;
}

/**
 * Revalide une ligne reçue du serveur : le contenu passe par le validateur d'import.
 * @param {*} ligne
 * @returns {{donnees: Object, versionSchema: number, misAJour: string}}
 * @throws {ErreurSynchro} Si la ligne est mal formée ou si les données sont refusées.
 */
function validerLigne(ligne) {
  if (ligne === null || typeof ligne !== 'object' || typeof ligne.mis_a_jour !== 'string') {
    throw new ErreurSynchro(TYPES_ERREUR.CONTENU);
  }
  try {
    const donnees = importerFichier(JSON.stringify(ligne.donnees));
    return { donnees, versionSchema: donnees.version, misAJour: ligne.mis_a_jour };
  } catch (erreur) {
    if (erreur instanceof ErreurImport) {
      throw new ErreurSynchro(TYPES_ERREUR.CONTENU);
    }
    throw erreur;
  }
}

/**
 * Lit la sauvegarde du compte.
 * @param {function} appeler Le client REST.
 * @returns {Promise<{donnees: Object, versionSchema: number, misAJour: string}|null>} `null` si le compte
 *   n'a rien envoyé. Les données sont validées et migrées comme un import.
 * @throws {ErreurSynchro}
 */
async function lireDistante(appeler) {
  const reponse = await appeler('GET', `${CHEMIN_SAUVEGARDES}?select=${CHAMPS_LUS}`);
  if (!reponse.ok) {
    throw new ErreurSynchro(await typeDepuisReponse(reponse));
  }
  const lignes = lireLignes(await reponse.text());
  return lignes.length === 0 ? null : validerLigne(lignes[0]);
}

/**
 * Envoie la progression au compte (une ligne par compte, remplacée à chaque envoi).
 * @param {function} appeler Le client REST.
 * @param {Object} donnees Données de Lexia, sans rien de la session.
 * @throws {ErreurSynchro}
 */
async function envoyer(appeler, donnees) {
  if (JSON.stringify(donnees).length > TAILLE_MAX_JSON) {
    throw new ErreurSynchro(TYPES_ERREUR.TROP_GROS);
  }
  const creerCorps = (session) => JSON.stringify({
    user_id: session.idUtilisateur,
    donnees,
    version_schema: donnees.version,
  });
  const reponse = await appeler('POST', `${CHEMIN_SAUVEGARDES}?on_conflict=user_id`, creerCorps);
  if (!reponse.ok) {
    throw new ErreurSynchro(await typeDepuisReponse(reponse));
  }
}

/**
 * Les envois en arrière-plan : regroupés, et repris au retour du réseau.
 * @param {Object} options
 * @param {function(Object): Promise<void>} options.envoyer Envoie les données données.
 * @param {function(ErreurSynchro): void} options.signaler
 * @param {function(function(): void, number): *} options.programmer
 * @param {function(function(): void): void} options.ecouterRetourReseau
 * @returns {function(function(): Object): void} `planifierEnvoi(lireLocal)`.
 */
function creerPlanificateur({ envoyer: envoyerDonnees, signaler, programmer, ecouterRetourReseau }) {
  let envoiProgramme = false;
  let envoiEnAttenteDuReseau = null;
  // Les envois se suivent : un envoi lent ne peut pas être dépassé par un plus récent, qui écraserait le compte
  // avec une progression plus ancienne.
  let envoiPrecedent = Promise.resolve();

  /** Envoie la progression lue à cet instant ; ne rejette jamais : un échec est signalé, pas relancé. */
  async function envoyerMaintenant(lireLocal) {
    try {
      await envoyerDonnees(lireLocal());
      envoiEnAttenteDuReseau = null;
    } catch (erreur) {
      const erreurSynchro = erreur instanceof ErreurSynchro
        ? erreur
        : new ErreurSynchro(TYPES_ERREUR.SERVICE, { cause: erreur });
      envoiEnAttenteDuReseau = erreurSynchro.type === TYPES_ERREUR.RESEAU ? lireLocal : null;
      prevenir(erreurSynchro);
    }
  }

  /** Signale un échec à l'écran, sauf sans compte : l'élève joue simplement sur cet appareil. */
  function prevenir(erreurSynchro) {
    if (erreurSynchro.type === TYPES_ERREUR.SANS_COMPTE) {
      return;
    }
    try {
      signaler(erreurSynchro);
    } catch {
      // Un écran qui plante ne doit pas arrêter la sauvegarde : les envois suivants doivent partir.
    }
  }

  function planifierEnvoi(lireLocal) {
    if (envoiProgramme) {
      return;
    }
    envoiProgramme = true;
    programmer(() => {
      envoiProgramme = false;
      envoiPrecedent = envoiPrecedent.then(() => envoyerMaintenant(lireLocal));
    }, DELAI_ENVOI_MS);
  }

  ecouterRetourReseau(() => {
    if (envoiEnAttenteDuReseau !== null) {
      planifierEnvoi(envoiEnAttenteDuReseau);
    }
  });
  return planifierEnvoi;
}

/**
 * Crée la sauvegarde en ligne.
 * @param {Object} options
 * @param {function(string, Object): Promise<Response>} options.fetch Le `fetch` du navigateur (injectable).
 * @param {{urlProjet: string, clePublique: string}} options.config Adresse du projet et clé publique.
 * @param {function(Object=): Promise<Session|null>} options.fournisseurDeJeton Renvoie la session, ou `null`
 *   sans session. Appelé avec `{ renouveler: true }` après un refus 401 : il doit alors rafraîchir le jeton.
 * @param {function(ErreurSynchro): void} [options.signaler] Reçoit les échecs des envois en arrière-plan.
 * @param {function(function(): void, number): *} [options.programmer] Comme `setTimeout` (injectable).
 * @param {function(function(): void): void} [options.ecouterRetourReseau] Appelle la fonction donnée à
 *   chaque retour du réseau (par défaut, l'événement `online`).
 * @returns {{lireDistante: function(): Promise<Object|null>, envoyer: function(Object): Promise<void>,
 *   planifierEnvoi: function(function(): Object): void}}
 *   `planifierEnvoi(lireLocal)` demande un envoi bientôt : plusieurs demandes rapprochées donnent un seul
 *   envoi, qui lit la progression au dernier moment. Sans réseau, l'envoi reprend quand il revient.
 */
export function creerSynchro({
  fetch: appelerReseau,
  config,
  fournisseurDeJeton,
  signaler = () => {},
  programmer = (fonction, delai) => setTimeout(fonction, delai),
  ecouterRetourReseau = (fonction) => globalThis.addEventListener?.('online', fonction),
}) {
  const appeler = creerClientRest({ fetch: appelerReseau, config, fournisseurDeJeton });
  const envoyerDonnees = (donnees) => envoyer(appeler, donnees);
  const planifierEnvoi = creerPlanificateur({ envoyer: envoyerDonnees, signaler, programmer, ecouterRetourReseau });
  return { lireDistante: () => lireDistante(appeler), envoyer: envoyerDonnees, planifierEnvoi };
}
