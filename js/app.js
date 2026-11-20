// Point d'entrée : crée le contexte, applique les réglages, démarre le routeur et la PWA.

import { creerCompte } from './coeur/compte.js';
import { CONFIG_COMPTE } from './coeur/config-compte.js';
import { creerContexte } from './coeur/contexte.js';
import { traiterLienDeMail } from './coeur/lien-de-mail.js';
import { soldeEtoiles } from './coeur/progression.js';
import { demarrerPwa } from './coeur/pwa.js';
import { creerRouteur } from './coeur/routeur.js';
import { ROUTES } from './coeur/routes.js';
import { creerSignalUnique } from './coeur/signal-unique.js';
import { creerSynchro } from './coeur/synchro.js';
import { creerFournisseurDeJeton, creerSynchroDemarrage } from './coeur/synchro-demarrage.js';
import { brancherBarreEtat } from './ui/barre-etat.js';
import { afficherToast } from './ui/toast.js';

/** Un échec de la sauvegarde en ligne : l'élève lit le message déjà écrit en français, le détail va dans la console. */
function montrerUnEchecDeSauvegarde(erreur) {
  console.warn('Sauvegarde en ligne', erreur);
  afficherToast(erreur.message).catch((echecToast) => console.error(erreur.message, echecToast));
}

/** Branche la sauvegarde en ligne : `contexte.synchro` (lue par « Mon compte ») et `contexte.synchroDemarrage` (le choix). */
function brancherLaSauvegarde(contexte) {
  const ecouterRetourReseau = (fonction) => window.addEventListener('online', fonction);
  // Réseau coupé : un seul message, pas un à chaque envoi raté.
  const signaler = creerSignalUnique({ signaler: montrerUnEchecDeSauvegarde, ecouterRetourReseau });
  contexte.synchro = creerSynchro({
    fetch: globalThis.fetch.bind(globalThis),
    config: CONFIG_COMPTE,
    fournisseurDeJeton: creerFournisseurDeJeton(contexte.compte),
    signaler,
  });
  contexte.synchroDemarrage = creerSynchroDemarrage({
    compte: contexte.compte,
    stockage: contexte.stockage,
    synchro: contexte.synchro,
    signaler,
    naviguer: (route) => { window.location.hash = route; },
    rechargerAccueil: () => {
      window.location.hash = '#/accueil';
      window.location.reload();
    },
    ecouterRetourReseau,
  });
}

async function demarrer() {
  const contexte = creerContexte();
  contexte.compte = creerCompte({ urlDeRetour: `${window.location.origin}${window.location.pathname}` });
  // Un lien de mail ramène un fragment que le routeur ne comprendrait pas : il est mis de côté et effacé de
  // l'adresse avant le routeur. Aucun réseau, aucune connexion : l'élève doit d'abord confirmer le lien.
  traiterLienDeMail({ fenetre: window, compte: contexte.compte });
  brancherLaSauvegarde(contexte);
  contexte.appliquerReglages();
  brancherBarreEtat({
    conteneur: document.getElementById('barre-etat'),
    lireEtoiles: () => soldeEtoiles(contexte.stockage.lire()),
  });

  const routeur = creerRouteur({
    routes: ROUTES,
    conteneur: document.getElementById('contenu'),
    contexte,
  });
  await routeur.demarrer();
  // Une seule fois : compare cet appareil et le compte si quelqu'un est déjà connecté.
  contexte.synchroDemarrage.demarrer().catch((erreur) => console.error('Démarrage de la sauvegarde en ligne', erreur));
  await demarrerPwa();
}

/** Dernier recours : jamais de page blanche si le démarrage lui-même échoue. */
function afficherEchecDeDemarrage(erreur) {
  console.error('Échec du démarrage de Lexia', erreur);
  const conteneur = document.getElementById('contenu');
  const message = document.createElement('p');
  message.textContent = "Lexia n'a pas pu démarrer. Recharge la page ; si ça recommence, ferme puis rouvre le navigateur.";
  conteneur.replaceChildren(message);
}

demarrer().catch(afficherEchecDeDemarrage);
