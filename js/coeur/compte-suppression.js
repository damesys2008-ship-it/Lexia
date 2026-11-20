// « Supprimer mon compte » : le compte et sa sauvegarde en ligne sont effacés (fonction `supprimer_mon_compte`
// de la base, qui n'efface que le compte de la personne connectée). La progression de cet appareil reste.
// `fetch` est appelé seul (pas comme méthode d'un objet) : le navigateur refuse sinon (« Illegal invocation »).

import { ErreurCompte } from './compte.js';
import { typeDErreur } from './compte-erreurs.js';
import { CONFIG_COMPTE } from './config-compte.js';

const CHEMIN_SUPPRESSION = '/rest/v1/rpc/supprimer_mon_compte';

/** Envoie la demande d'effacement ; une réponse refusée ou un réseau coupé deviennent une `ErreurCompte`. */
async function demanderLEffacement({ jeton, config, fetch }) {
  let reponse;
  try {
    reponse = await fetch(`${config.urlProjet}${CHEMIN_SUPPRESSION}`, {
      method: 'POST',
      headers: {
        apikey: config.clePublique,
        Authorization: `Bearer ${jeton}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
    });
  } catch (erreur) {
    throw new ErreurCompte(typeDErreur({ reseau: true }), { cause: erreur });
  }
  if (!reponse.ok) {
    throw new ErreurCompte(typeDErreur({ statut: reponse.status }), { statut: reponse.status });
  }
}

/**
 * Supprime le compte connecté, puis ferme la session de cet appareil.
 * @param {Object} options
 * @param {{jetonValide: function(): Promise<{jeton: string}|null>, deconnecter: function(): Promise<Object>}} options.compte
 * @param {{urlProjet: string, clePublique: string}} [options.config]
 * @param {function} [options.fetch]
 * @returns {Promise<void>}
 * @throws {ErreurCompte} Si personne n'est connecté, si le réseau est coupé ou si le service refuse : le compte reste alors tel quel.
 */
export async function supprimerLeCompte({ compte, config = CONFIG_COMPTE, fetch = globalThis.fetch }) {
  const session = await compte.jetonValide();
  if (session === null) {
    throw new ErreurCompte('session-perdue');
  }
  await demanderLEffacement({ jeton: session.jeton, config, fetch });
  await compte.deconnecter();
}
