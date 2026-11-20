// Routeur par hash : '#/dictee/audio' monte l'écran « dictée audio » dans <main>.
//
// CONTRAT D'UN ÉCRAN (module ES chargé par la table `routes.js`) :
//
//   export function monter(conteneur, contexte, navigation) { ... }
//
//   conteneur   l'élément <main> : l'écran y construit son contenu (createElement et
//               textContent, jamais innerHTML avec des données) ;
//   contexte    l'objet unique créé par `contexte.js` (stockage, sons, voix, config…) ;
//   navigation  { chemin, parametres } : le chemin de la route et les segments en plus
//               (pour '#/bientot/lecture' : parametres = ['lecture']) ; optionnel à lire.
//
//   `monter` peut être `async`. Elle peut renvoyer une fonction `demonter()` : le routeur
//   l'appelle avant de quitter l'écran, pour arrêter minuteurs, écouteurs globaux, voix…
//
// Le routeur change le titre de la page et place le focus sur <main> après chaque montage.

import { NOM_SITE } from '../config.js';
import { ROUTE_ACCUEIL, ROUTE_PREMIER_LANCEMENT } from './routes.js';

const SEGMENT_VALIDE = /^[a-z0-9-]{1,40}$/;
const SEGMENTS_MAX = 4;

/**
 * Découpe un hash en segments de route.
 * Tout ce qui sort de l'ordinaire (caractère étranger, encodage cassé, trop de
 * segments) donne une liste vide, c'est-à-dire « pas de route » : on ne plante jamais.
 *
 * @param {string} hash Ex. '#/dictee/audio', '', '#', '#/Dictee/'.
 * @returns {string[]} Ex. ['dictee', 'audio'] ; [] si le hash est vide ou invalide.
 */
export function analyserHash(hash) {
  const sansDiese = hash.startsWith('#') ? hash.slice(1) : hash;
  const sansRequete = sansDiese.split('?')[0];
  const bruts = sansRequete.split('/').filter((segment) => segment !== '');
  let segments;
  try {
    segments = bruts.map((segment) => decodeURIComponent(segment).toLowerCase());
  } catch {
    return [];
  }
  const estValide = segments.length <= SEGMENTS_MAX && segments.every((s) => SEGMENT_VALIDE.test(s));
  return estValide ? segments : [];
}

/**
 * Cherche la route d'une liste de segments : d'abord le chemin exact, puis une
 * route qui accepte des paramètres et dont le premier segment correspond.
 *
 * @param {string[]} segments
 * @param {Array<{chemin: string, parametres?: boolean}>} routes
 * @returns {{route: Object, parametres: string[]}|null} null si aucune route ne correspond.
 */
export function trouverRoute(segments, routes) {
  const exacte = routes.find((route) => route.chemin === segments.join('/'));
  if (exacte) {
    return { route: exacte, parametres: [] };
  }
  const avecParametres = routes.find((route) => route.parametres && route.chemin === segments[0]);
  if (avecParametres) {
    return { route: avecParametres, parametres: segments.slice(1) };
  }
  return null;
}

/**
 * Décide quoi faire d'un hash. Fonction pure, testée sans navigateur.
 *
 * @param {Object} options
 * @param {string} options.hash
 * @param {Array<Object>} options.routes Une route marquée `sansProfil: true` s'ouvre même avant le premier lancement
 *   (les pages de compte : on peut retrouver son compte sur un nouvel appareil).
 * @param {boolean} options.profilCree Vrai quand le premier lancement est fait.
 * @returns {{action: 'rediriger', vers: string}|{action: 'monter', route: Object, parametres: string[]}}
 */
export function decider({ hash, routes, profilCree }) {
  const trouvee = trouverRoute(analyserHash(hash), routes);
  if (trouvee === null) {
    return { action: 'rediriger', vers: `#/${ROUTE_ACCUEIL}` };
  }
  const estOuverteSansProfil = trouvee.route.chemin === ROUTE_PREMIER_LANCEMENT || trouvee.route.sansProfil === true;
  if (!profilCree && !estOuverteSansProfil) {
    return { action: 'rediriger', vers: `#/${ROUTE_PREMIER_LANCEMENT}` };
  }
  return { action: 'monter', route: trouvee.route, parametres: trouvee.parametres };
}

/** Écran affiché quand un écran ne se charge pas : jamais de page blanche. */
function creerEcranErreur(document) {
  const section = document.createElement('section');
  const titre = document.createElement('h1');
  const explication = document.createElement('p');
  const retour = document.createElement('a');

  titre.textContent = "Cet écran n'est pas disponible";
  explication.textContent = "Quelque chose s'est mal passé en l'ouvrant. Tu peux revenir à l'accueil.";
  retour.href = `#/${ROUTE_ACCUEIL}`;
  retour.className = 'bouton bouton--principal';
  retour.textContent = "Retour à l'accueil";
  section.append(titre, explication, retour);
  return section;
}

function journaliserErreur(message, erreur) {
  console.error(message, erreur);
}

// L'état d'un routeur : numéro de la dernière navigation (pour ignorer une réponse tardive)
// et fonction de démontage de l'écran affiché. Tout passe par un seul objet `routeur`.

/** Démonte l'écran affiché. Un démontage qui échoue est journalisé : la navigation continue. */
function quitterEcran(routeur) {
  try {
    routeur.demonter?.();
  } catch (erreur) {
    routeur.journal("Impossible de quitter l'écran précédent", erreur);
  }
  routeur.demonter = null;
}

function afficherPage(routeur, titre) {
  routeur.document.title = `${titre} · ${NOM_SITE}`;
  routeur.conteneur.focus();
}

function afficherEchec(routeur, route, erreur) {
  routeur.journal(`Impossible d'afficher « ${route.chemin} »`, erreur);
  routeur.conteneur.replaceChildren(creerEcranErreur(routeur.document));
  afficherPage(routeur, 'Écran indisponible');
}

/** Charge et monte l'écran d'une route ; ignore le résultat si une autre navigation a commencé. */
async function monterEcran(routeur, { route, parametres }) {
  routeur.numero += 1;
  const numero = routeur.numero;
  quitterEcran(routeur);
  routeur.conteneur.replaceChildren();
  try {
    const ecran = await route.charger();
    if (numero !== routeur.numero) {
      return;
    }
    const navigation = { chemin: route.chemin, parametres };
    const demonter = await ecran.monter(routeur.conteneur, routeur.contexte, navigation);
    if (numero !== routeur.numero) {
      demonter?.();
      return;
    }
    routeur.demonter = typeof demonter === 'function' ? demonter : null;
    afficherPage(routeur, route.titre);
  } catch (erreur) {
    if (numero === routeur.numero) {
      afficherEchec(routeur, route, erreur);
    }
  }
}

/**
 * Crée le routeur.
 *
 * @param {Object} options
 * @param {Array<Object>} options.routes Table de `routes.js`.
 * @param {HTMLElement} options.conteneur L'élément <main>.
 * @param {Object} options.contexte Contexte de `contexte.js` (doit offrir `profilCree()`).
 * @param {Window} [options.fenetre]
 * @param {function(string, Error): void} [options.journal] Reçoit les échecs de chargement d'un écran.
 * @returns {{demarrer: function(): Promise<void>, arreter: function(): void}}
 */
export function creerRouteur({
  routes,
  conteneur,
  contexte,
  fenetre = globalThis.window,
  journal = journaliserErreur,
}) {
  const routeur = { conteneur, contexte, journal, document: fenetre.document, numero: 0, demonter: null };

  async function naviguer() {
    const decision = decider({ hash: fenetre.location.hash, routes, profilCree: contexte.profilCree() });
    if (decision.action === 'rediriger') {
      // replace : la page redirigée ne reste pas dans l'historique (le bouton « retour » ne boucle pas).
      fenetre.location.replace(decision.vers);
      return;
    }
    await monterEcran(routeur, decision);
  }

  return {
    demarrer() {
      fenetre.addEventListener('hashchange', naviguer);
      return naviguer();
    },
    arreter() {
      fenetre.removeEventListener('hashchange', naviguer);
      quitterEcran(routeur);
    },
  };
}
