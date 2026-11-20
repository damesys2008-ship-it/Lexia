/**
 * Le câblage de la sauvegarde en ligne : au démarrage et à la connexion, on compare la progression de cet appareil
 * à celle du compte (`decider`), puis on envoie, on récupère, ou on demande à l'élève de choisir.
 * Ensuite, chaque écriture du stockage déclenche un envoi (regroupé par `synchro.js`).
 *
 * Règles : jamais d'écrasement silencieux (deux progressions différentes = l'élève choisit) ; aucun envoi tant que la
 * comparaison n'a pas réussi (sinon un appareil resté hors ligne pourrait effacer le compte) ; l'ancienne version
 * est gardée en copie locale avant tout remplacement ; la session ne passe jamais dans les données envoyées.
 */

import { ErreurCompte } from './compte.js';
import { DECISIONS, decider, estVide, resumerProgression } from './synchro-conflit.js';
import { ErreurSynchro, TYPES_ERREUR } from './synchro.js';
import { migrerCle } from './migration-cles.js';

/** Où sont gardées les dernières progressions qui ont été remplacées (celle de l'appareil ou celle du compte). */
export const CLE_COPIE_AVANT_REMPLACEMENT = 'lexia:avant-compte';
/** Nom de la clé quand le site s'appelait Plume : déplacée vers `CLE_COPIE_AVANT_REMPLACEMENT`. */
export const ANCIENNE_CLE_COPIE = 'plume:avant-compte';
/** On garde les deux dernières versions utiles : une deuxième chance si l'élève change encore d'avis. */
export const NOMBRE_DE_COPIES_GARDEES = 2;
export const ORIGINES = { APPAREIL: 'appareil', COMPTE: 'compte' };
export const ROUTE_CHOIX = '#/compte/choix';

/** Où en est la comparaison avec le compte. */
const ETATS = {
  /** Personne n'est connecté, ou la comparaison n'a pas encore réussi : aucun envoi automatique. */
  INCONNU: 'inconnu',
  /** Les deux progressions sont d'accord : chaque écriture est envoyée. */
  PRET: 'pret',
  /** Les deux progressions diffèrent : on attend le choix de l'élève. */
  CONFLIT: 'conflit',
};

/**
 * Adapte `compte.jetonValide` à ce que `creerSynchro` attend : une session ou `null`, et des échecs en `ErreurSynchro`
 * (un réseau coupé devient `reseau` : la sauvegarde reprend au retour du réseau).
 * @param {{jetonValide: function(Object=): Promise<Object|null>}} compte
 * @returns {function(Object=): Promise<{jeton: string, idUtilisateur: string}|null>}
 */
export function creerFournisseurDeJeton(compte) {
  return async (options) => {
    try {
      return await compte.jetonValide(options);
    } catch (erreur) {
      if (!(erreur instanceof ErreurCompte)) {
        throw erreur;
      }
      const type = erreur.type === TYPES_ERREUR.RESEAU ? TYPES_ERREUR.RESEAU : TYPES_ERREUR.SERVICE;
      throw new ErreurSynchro(type, { cause: erreur });
    }
  };
}

/** Les copies déjà gardées, de la plus récente à la plus ancienne ; une liste abîmée vaut une liste vide. */
function lireLesCopies(support) {
  try {
    const cleALire = migrerCle(support, ANCIENNE_CLE_COPIE, CLE_COPIE_AVANT_REMPLACEMENT);
    const copies = JSON.parse(support.getItem(cleALire));
    return Array.isArray(copies) ? copies : [];
  } catch {
    return [];
  }
}

/**
 * Garde une progression de côté (hors de la clé `lexia:v1`, jamais exportée) avant qu'elle soit remplacée.
 * Une progression vide n'est pas gardée : elle ne doit jamais pousser dehors une copie utile.
 * @throws {ErreurSynchro} `service` si la copie ne peut pas être écrite : le remplacement n'a alors pas lieu.
 */
function garderUneCopie(contexte, donnees, origine) {
  if (estVide(resumerProgression(donnees))) {
    return;
  }
  const copie = { gardeeLe: contexte.maintenant().toISOString(), origine, donnees };
  const copies = [copie, ...lireLesCopies(contexte.support)].slice(0, NOMBRE_DE_COPIES_GARDEES);
  try {
    contexte.support.setItem(CLE_COPIE_AVANT_REMPLACEMENT, JSON.stringify(copies));
  } catch (erreur) {
    throw new ErreurSynchro(TYPES_ERREUR.SERVICE, { cause: erreur });
  }
}

/** Installe la progression du compte (déjà revalidée par `synchro.js`) à la place de celle de l'appareil. */
function installerLaProgressionDuCompte(contexte, donnees) {
  garderUneCopie(contexte, contexte.stockage.lire(), ORIGINES.APPAREIL);
  contexte.stockage.ecrire(donnees);
  contexte.etat = ETATS.PRET; // après l'écriture : celle-ci ne doit pas repartir vers le compte
  contexte.conflit = null;
  contexte.rechargerAccueil();
}

async function envoyerLaProgressionDeLAppareil(contexte) {
  await contexte.synchro.envoyer(contexte.stockage.lire());
  contexte.etat = ETATS.PRET;
  contexte.conflit = null;
}

/**
 * Une action de la comparaison : ses échecs sont signalés, et un réseau coupé fait réessayer au retour du réseau.
 * Sans compte (la session a disparu), rien n'est signalé : l'élève joue simplement sur cet appareil.
 */
async function signalerLesEchecs(contexte, action) {
  try {
    await action();
  } catch (erreur) {
    const echec = erreur instanceof ErreurSynchro ? erreur : new ErreurSynchro(TYPES_ERREUR.SERVICE, { cause: erreur });
    contexte.aReessayer = echec.type === TYPES_ERREUR.RESEAU;
    if (echec.type !== TYPES_ERREUR.SANS_COMPTE) {
      contexte.signaler(echec);
    }
  }
}

async function appliquer(contexte, verdict, distante) {
  if (verdict.decision === DECISIONS.RIEN) {
    contexte.etat = ETATS.PRET;
  } else if (verdict.decision === DECISIONS.ENVOYER) {
    await envoyerLaProgressionDeLAppareil(contexte);
  } else if (verdict.decision === DECISIONS.RECUPERER) {
    installerLaProgressionDuCompte(contexte, distante.donnees);
  } else {
    contexte.etat = ETATS.CONFLIT;
    contexte.conflit = { local: verdict.local, distant: verdict.distant, donneesDuCompte: distante.donnees };
    contexte.naviguer(ROUTE_CHOIX);
  }
}

/** Compare cet appareil et le compte, puis applique la décision. Sans compte connecté, ne fait rien. */
async function synchroniser(contexte) {
  if (contexte.compte.utilisateur() === null) {
    return;
  }
  contexte.aReessayer = false;
  await signalerLesEchecs(contexte, async () => {
    const distante = await contexte.synchro.lireDistante();
    if (contexte.compte.utilisateur() === null) {
      return; // l'élève s'est déconnecté pendant l'attente : on n'installe ni n'envoie rien
    }
    const verdict = decider({ local: contexte.stockage.lire(), distant: distante?.donnees ?? null });
    await appliquer(contexte, verdict, distante);
  });
}

async function garderCetAppareil(contexte) {
  if (contexte.conflit === null) {
    return;
  }
  garderUneCopie(contexte, contexte.conflit.donneesDuCompte, ORIGINES.COMPTE); // le compte va être remplacé
  await envoyerLaProgressionDeLAppareil(contexte);
}

function prendreLeCompte(contexte) {
  if (contexte.conflit === null) {
    return;
  }
  installerLaProgressionDuCompte(contexte, contexte.conflit.donneesDuCompte);
}

/** Un changement de session : la déconnexion remet tout à zéro, une connexion lance la comparaison. */
function surChangementDeSession(contexte, utilisateur) {
  if (utilisateur === null) {
    contexte.etat = ETATS.INCONNU;
    contexte.conflit = null;
  } else if (contexte.etat === ETATS.INCONNU) {
    synchroniser(contexte);
  }
}

function surEcriture(contexte) {
  if (contexte.etat === ETATS.PRET) {
    contexte.synchro.planifierEnvoi(() => contexte.stockage.lire());
  }
}

/**
 * Crée le câblage de la sauvegarde en ligne ; `demarrer()` le met en route.
 * @param {Object} options
 * @param {{utilisateur: function(): Object|null, ecouter: function(function(Object|null): void): *}} options.compte
 * @param {{lire: function(): Object, ecrire: function(Object): void, ecouterEcriture: function(function(): void): void}} options.stockage
 * @param {{lireDistante: function(): Promise<Object|null>, envoyer: function(Object): Promise<void>,
 *   planifierEnvoi: function(function(): Object): void}} options.synchro Voir `creerSynchro` de `synchro.js`.
 * @param {function(ErreurSynchro): void} options.signaler Reçoit les échecs à montrer (jamais « sans compte »).
 * @param {function(string): void} options.naviguer Va vers une route (`#/compte/choix`).
 * @param {function(): void} options.rechargerAccueil Recharge le site sur l'accueil, après une récupération.
 * @param {function(function(): void): void} options.ecouterRetourReseau Appelle la fonction au retour du réseau.
 * @param {{getItem: Function, setItem: Function}} [options.support] Par défaut `localStorage` : reçoit les copies de secours.
 * @param {function(): Date} [options.maintenant]
 * @returns {{
 *   demarrer: function(): Promise<void>,
 *   conflit: function(): ({local: Object, distant: Object}|null),
 *   garderCetAppareil: function(): Promise<void>,
 *   prendreLeCompte: function(): Promise<void>
 * }}
 *   `conflit()` : les deux résumés à montrer à l'élève quand il doit choisir, sinon `null`.
 *   `garderCetAppareil()` garde la version du compte en copie puis envoie celle de l'appareil ; `prendreLeCompte()`
 *   garde celle de l'appareil en copie, installe celle du compte et recharge l'accueil. Aucune des deux ne part
 *   sans clic de l'élève ; leurs échecs sont signalés. On garde les deux dernières copies utiles.
 */
export function creerSynchroDemarrage({
  compte,
  stockage,
  synchro,
  signaler,
  naviguer,
  rechargerAccueil,
  ecouterRetourReseau,
  support = globalThis.localStorage,
  maintenant = () => new Date(),
}) {
  const contexte = {
    compte, stockage, synchro, signaler, naviguer, rechargerAccueil, support, maintenant,
    etat: ETATS.INCONNU, conflit: null, aReessayer: false,
  };

  return {
    async demarrer() {
      compte.ecouter((utilisateur) => surChangementDeSession(contexte, utilisateur));
      stockage.ecouterEcriture(() => surEcriture(contexte));
      ecouterRetourReseau(() => {
        if (contexte.aReessayer && contexte.etat === ETATS.INCONNU) {
          synchroniser(contexte);
        }
      });
      await synchroniser(contexte);
    },
    conflit: () => (contexte.conflit === null ? null : { local: contexte.conflit.local, distant: contexte.conflit.distant }),
    garderCetAppareil: () => signalerLesEchecs(contexte, () => garderCetAppareil(contexte)),
    prendreLeCompte: () => signalerLesEchecs(contexte, () => prendreLeCompte(contexte)),
  };
}
