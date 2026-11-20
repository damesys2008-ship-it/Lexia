// Les actions de la garde-robe : acheter, porter, retirer, tout enfiler.
// Chaque action calcule les nouvelles données (fonctions pures de `coeur/accessoires.js`), les enregistre,
// met la mascotte à jour, puis prévient l'écran avec une phrase à lire.

import {
  EMPLACEMENTS,
  ErreurGardeRobe,
  acheterAccessoire,
  enfilerEnsemble,
  enleverAccessoire,
  porterAccessoire,
  trouverAccessoire,
  trouverEnsemble,
} from '../../coeur/accessoires.js';
import { soldeEtoiles } from '../../coeur/progression.js';
import { EVENEMENT_DONNEES_CHANGEES, libelleEtoiles } from '../../ui/barre-etat.js';

const MESSAGE_REFUS = "Ça n'a pas marché cette fois. Regarde ce que Pompon porte, puis réessaie.";

/** Met la mascotte dans l'état des données : pose ce qui manque, retire ce qui ne doit plus être porté. */
async function synchroniserMascotte(mascotte, equipes) {
  const portes = mascotte.equipes();
  for (const emplacement of EMPLACEMENTS) {
    if (portes[emplacement] === equipes[emplacement]) {
      continue;
    }
    if (equipes[emplacement]) {
      await mascotte.equiper(equipes[emplacement]);
    } else {
      mascotte.retirer(emplacement);
    }
  }
}

/**
 * @param {Object} options
 * @param {Object} options.contexte Contexte de l'application (stockage).
 * @param {Object} options.mascotte La mascotte à tenir à jour.
 * @param {function(Object, string, string=): void} options.apresChangement Reçoit les nouvelles données,
 *   la phrase à lire et l'accessoire dont le bouton doit garder le focus.
 * @returns {{acheter: function(string): Promise<void>, porter: function(string): Promise<void>,
 *   retirer: function(string): Promise<void>, enfiler: function(string): Promise<void>}}
 */
export function creerActions({ contexte, mascotte, apresChangement }) {
  /** Applique un changement `{transformation, message, idFocus}` ; un refus de la garde-robe devient une phrase douce. */
  async function appliquer({ transformation, message, idFocus }) {
    let apres;
    try {
      apres = transformation(contexte.stockage.lire());
    } catch (erreur) {
      if (!(erreur instanceof ErreurGardeRobe)) {
        throw erreur;
      }
      apresChangement(contexte.stockage.lire(), MESSAGE_REFUS);
      return;
    }
    contexte.stockage.ecrire(apres);
    window.dispatchEvent(new Event(EVENEMENT_DONNEES_CHANGEES));
    await synchroniserMascotte(mascotte, apres.accessoires.equipes);
    apresChangement(apres, message(apres), idFocus);
  }

  return {
    acheter: (id) =>
      appliquer({
        transformation: (donnees) => acheterAccessoire(donnees, id),
        message: (apres) => `Bravo ! Pompon porte ${trouverAccessoire(id).nom}. Il te reste ${libelleEtoiles(soldeEtoiles(apres))}.`,
        idFocus: id,
      }),
    porter: (id) =>
      appliquer({
        transformation: (donnees) => porterAccessoire(donnees, id),
        message: () => `Pompon porte ${trouverAccessoire(id).nom}.`,
        idFocus: id,
      }),
    retirer: (emplacement) => {
      const idRetire = contexte.stockage.lire().accessoires.equipes[emplacement];
      return appliquer({
        transformation: (donnees) => enleverAccessoire(donnees, emplacement),
        message: () => `${idRetire ? trouverAccessoire(idRetire).nom : 'Cet emplacement'} : retiré.`,
        idFocus: idRetire,
      });
    },
    enfiler: (idEnsemble) =>
      appliquer({
        transformation: (donnees) => enfilerEnsemble(donnees, idEnsemble),
        message: () => `Pompon porte l'ensemble ${trouverEnsemble(idEnsemble).nom}.`,
      }),
  };
}
