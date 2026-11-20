// Logique pure du test de départ « La grande aventure » (cahier §6.3) : quelle question poser,
// quand un module s'arrête, quel niveau en déduire. Aucun DOM, aucun stockage.
//
// Tout l'état se recalcule depuis `meta.testDepart.reponses` et le contenu du test :
// quitter en cours de route puis reprendre repose la question restée sans réponse.

import { definirNiveau, versJour } from './progression.js';

/** Ordre des étapes du test : un module par étape (décision de Dan). */
export const ORDRE_DES_ETAPES = ['orthographe', 'vocabulaire', 'lecture', 'grammaire', 'conjugaison', 'dictee'];

/** Un module s'arrête après autant d'échecs de suite au même niveau. */
const ECHECS_CONSECUTIFS_POUR_ARRET = 2;
/** Un niveau est acquis quand au moins 2 items sur 3 y sont réussis (arrondi au-dessus). */
const REUSSIS_MINIMUM = 2;
const SUR_POSES = 3;
const NIVEAUX = [1, 2, 3];

/**
 * @typedef {Object} ItemTestDepart
 * @property {string} id
 * @property {string} module  l'un des modules de `ORDRE_DES_ETAPES`
 * @property {number} niveau  1, 2 ou 3 (non décroissant dans un module)
 */

/**
 * Où en est un module : les items déjà posés, la question suivante, et le niveau où il s'est arrêté.
 * @param {ItemTestDepart[]} itemsDuModule  dans l'ordre de jeu
 * @param {Object<string, boolean>} reponses
 * @returns {{poses: ItemTestDepart[], prochaine: ItemTestDepart|null, niveauArret: number|null}}
 */
function etatDuModule(itemsDuModule, reponses) {
  const poses = [];
  let echecsDeSuite = 0;
  let niveauPrecedent = null;
  for (const item of itemsDuModule) {
    if (!Object.hasOwn(reponses, item.id)) {
      return { poses, prochaine: item, niveauArret: null };
    }
    poses.push(item);
    // La série d'échecs repart de 0 sur une réussite ou à l'arrivée d'un nouveau niveau.
    const serieDuNiveau = item.niveau === niveauPrecedent ? echecsDeSuite : 0;
    echecsDeSuite = reponses[item.id] ? 0 : serieDuNiveau + 1;
    niveauPrecedent = item.niveau;
    if (echecsDeSuite >= ECHECS_CONSECUTIFS_POUR_ARRET) {
      return { poses, prochaine: null, niveauArret: item.niveau };
    }
  }
  return { poses, prochaine: null, niveauArret: null };
}

function itemsDuModule(items, module) {
  return items.filter((item) => item.module === module);
}

/**
 * La prochaine question à poser : la première du premier module qui n'est pas fini.
 * @param {ItemTestDepart[]} items  tout le test, dans l'ordre du fichier
 * @param {Object<string, boolean>} reponses  réponses déjà données, par id d'item
 * @returns {ItemTestDepart|null} `null` quand tous les modules sont finis
 */
export function prochaineQuestion(items, reponses) {
  for (const module of ORDRE_DES_ETAPES) {
    const { prochaine } = etatDuModule(itemsDuModule(items, module), reponses);
    if (prochaine !== null) {
      return prochaine;
    }
  }
  return null;
}

function aReussiAssez(itemsDuNiveau, reponses) {
  const reussis = itemsDuNiveau.filter((item) => reponses[item.id]).length;
  return reussis * SUR_POSES >= itemsDuNiveau.length * REUSSIS_MINIMUM;
}

/**
 * Le niveau de départ d'un module : on monte tant que chaque niveau posé est réussi à 2 sur 3 au moins.
 * Un échec trop net arrête le module, donc on ne dépasse jamais le niveau d'arrêt. Prudent : un niveau
 * non réussi ferme la porte aux suivants, même si un item plus difficile a été réussi après.
 * @param {ItemTestDepart[]} itemsDuModule
 * @param {Object<string, boolean>} reponses
 * @returns {1|2|3} au minimum 1
 */
export function niveauInitial(itemsDuModule, reponses) {
  const { poses } = etatDuModule(itemsDuModule, reponses);
  let niveau = 1;
  for (const candidat of NIVEAUX) {
    const duNiveau = poses.filter((item) => item.niveau === candidat);
    if (duNiveau.length === 0 || !aReussiAssez(duNiveau, reponses)) {
      break;
    }
    niveau = candidat;
  }
  return niveau;
}

/**
 * Le niveau de départ de chacun des modules du test, dans l'ordre des étapes.
 * @param {ItemTestDepart[]} items  tout le test
 * @param {Object<string, boolean>} reponses
 * @returns {Object<string, 1|2|3>} niveau par module
 */
export function niveauxDeDepart(items, reponses) {
  return Object.fromEntries(
    ORDRE_DES_ETAPES.map((module) => [module, niveauInitial(itemsDuModule(items, module), reponses)]),
  );
}

/**
 * Note une réponse du test (les autres données sont recopiées telles quelles).
 * @param {Object} donnees  données de Lexia
 * @param {{idItem: string, reussi: boolean}} reponse
 * @param {Date} date
 * @returns {Object} nouvelles données
 */
export function enregistrerReponse(donnees, { idItem, reussi }, date) {
  const precedent = donnees.meta.testDepart;
  const testDepart = {
    jour: versJour(date),
    reponses: { ...precedent?.reponses, [idItem]: reussi },
    termine: precedent?.termine ?? false,
  };
  return { ...donnees, meta: { ...donnees.meta, testDepart } };
}

/**
 * Applique d'un coup les niveaux de départ des modules et marque le test comme terminé.
 * Une seule écriture : quitter le test en cours de route ne change aucun niveau.
 * @param {Object} donnees  données de Lexia
 * @param {Object<string, number>} niveaux  niveau de départ par module
 * @param {Date} date
 * @returns {Object} nouvelles données
 * @throws {RangeError} si un niveau n'est pas 1, 2 ou 3
 */
export function appliquerNiveaux(donnees, niveaux, date) {
  const avecNiveaux = Object.entries(niveaux).reduce(
    (courantes, [module, niveau]) => definirNiveau(courantes, module, niveau),
    donnees,
  );
  const testDepart = { jour: versJour(date), reponses: { ...donnees.meta.testDepart?.reponses }, termine: true };
  return { ...avecNiveaux, meta: { ...avecNiveaux.meta, testDepart } };
}
