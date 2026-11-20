// Service worker et bannière « Nouvelle version disponible ».
//
// Protocole avec `sw.js` : le nouveau worker reste « en attente » ; quand l'élève clique
// sur « Recharger », la page lui envoie MESSAGE_ACTIVATION, il prend la main, puis la
// page se recharge sur `controllerchange`. Rien ne change sous les pieds de l'élève
// pendant une séance.

export const MESSAGE_ACTIVATION = { type: 'ACTIVER_NOUVELLE_VERSION' };

const ADRESSE_SERVICE_WORKER = './sw.js';
const ID_BANNIERE = 'banniere-mise-a-jour';
const TEXTE_BANNIERE = 'Nouvelle version disponible : recharger la page pour en profiter.';

function journaliserParDefaut(message, erreur) {
  console.warn(message, erreur);
}

/** Construit la bannière avec des nœuds DOM (aucune donnée n'y est injectée). */
function creerBanniere(document, surClic) {
  const banniere = document.createElement('div');
  const texte = document.createElement('p');
  const bouton = document.createElement('button');

  banniere.className = 'carte carte--rose';
  banniere.setAttribute('role', 'status');
  texte.textContent = TEXTE_BANNIERE;
  bouton.type = 'button';
  bouton.className = 'bouton bouton--principal';
  bouton.textContent = 'Recharger';
  bouton.addEventListener('click', surClic);
  banniere.append(texte, bouton);
  return banniere;
}

/** Ajoute la bannière de mise à jour, une seule fois même si plusieurs nouvelles versions se suivent. */
function proposerMiseAJour(document, workerEnAttente, surClic) {
  const zone = document.getElementById('zone-bannieres');
  if (!zone || document.getElementById(ID_BANNIERE)) {
    return;
  }
  const banniere = creerBanniere(document, () => {
    surClic();
    workerEnAttente.postMessage(MESSAGE_ACTIVATION);
  });
  banniere.id = ID_BANNIERE;
  zone.append(banniere);
}

/** Quand un nouveau worker finit de s'installer alors qu'un ancien tient la page, il est « en attente ». */
function surveillerInstallation(registration, conteneur, proposer) {
  registration.addEventListener('updatefound', () => {
    const nouveau = registration.installing;
    nouveau.addEventListener('statechange', () => {
      // Sans contrôleur, c'est la toute première installation : il n'y a rien à mettre à jour.
      if (nouveau.state === 'installed' && conteneur.controller) {
        proposer(nouveau);
      }
    });
  });
}

/**
 * Enregistre le service worker et propose la mise à jour quand une nouvelle version attend.
 * Un échec d'enregistrement est journalisé : le site fonctionne très bien sans service worker.
 *
 * @param {Object} options
 * @param {{serviceWorker?: ServiceWorkerContainer}} [options.navigateur] Par défaut `navigator`.
 * @param {Document} [options.document]
 * @param {function(): void} [options.recharger] Par défaut `location.reload()`.
 * @param {function(string, Error): void} [options.journal]
 * @returns {Promise<void>}
 */
export async function demarrerPwa({
  navigateur = globalThis.navigator,
  document = globalThis.document,
  recharger = () => globalThis.location.reload(),
  journal = journaliserParDefaut,
} = {}) {
  const conteneur = navigateur.serviceWorker;
  if (!conteneur) {
    return;
  }
  let rechargementDemande = false;
  const proposer = (worker) => proposerMiseAJour(document, worker, () => {
    rechargementDemande = true;
  });

  // Le worker prend la main seulement quand l'élève l'a demandé (pas à la première installation).
  conteneur.addEventListener('controllerchange', () => {
    if (rechargementDemande) {
      recharger();
    }
  });

  try {
    const registration = await conteneur.register(ADRESSE_SERVICE_WORKER);
    if (registration.waiting && conteneur.controller) {
      proposer(registration.waiting);
    }
    surveillerInstallation(registration, conteneur, proposer);
  } catch (erreur) {
    journal("Le service worker n'a pas pu être enregistré : le site reste utilisable en ligne.", erreur);
  }
}
