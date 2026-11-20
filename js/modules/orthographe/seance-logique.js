// Logique pure d'une séance d'exercices (orthographe, grammaire) : choix des items et suivi des réponses.
// Rien ici ne touche au DOM ni au stockage : tout se teste sans navigateur.

import { idsDejaFaits } from '../../coeur/selection.js';

export const MODULE = 'orthographe';
export const NOMBRE_ITEMS_PAR_SEANCE = 8;

export const VERDICT_JUSTE = 'juste';
export const VERDICT_INDICE = 'indice';
export const VERDICT_CORRECTION = 'correction';
export const VERDICT_TERMINE = 'termine';

const NOMBRE_SEANCES_RECENTES_EVITEES = 2;
const SEPARATEUR_IDS = ',';

/**
 * Copie d'une liste dans un ordre aléatoire (Fisher-Yates).
 * @param {Array} liste
 * @param {function(): number} aleatoire Renvoie un nombre dans [0, 1) ; injectable pour les tests.
 * @returns {Array}
 */
export function melanger(liste, aleatoire = Math.random) {
  const copie = [...liste];
  for (let position = copie.length - 1; position > 0; position -= 1) {
    const autre = Math.floor(aleatoire() * (position + 1));
    [copie[position], copie[autre]] = [copie[autre], copie[position]];
  }
  return copie;
}

// Un item du bon niveau, même récent, passe avant un item d'un autre niveau.
const POIDS_ECART_DE_NIVEAU = 2;

/** Plus le rang est petit, plus l'item est choisi tôt : niveau de l'élève d'abord, items récents en dernier. */
function rangDeChoix(item, niveau, idsRecents) {
  const ecartDeNiveau = Math.abs(item.niveau - niveau);
  return ecartDeNiveau * POIDS_ECART_DE_NIVEAU + (idsRecents.has(item.id) ? 1 : 0);
}

/**
 * Choisit les items d'une séance : du bon type, au niveau de l'élève, en évitant les items récents.
 * S'il manque d'items, complète avec les items récents du même niveau, puis avec les niveaux voisins.
 * @param {Object} options
 * @param {Array<{id: string, type: string, niveau: number}>} options.items Items valides du contenu.
 * @param {string} options.type Type d'item voulu (`homophone`, `accord`, `invariable`, `muette`).
 * @param {number} options.niveau Niveau de l'élève (1 à 3).
 * @param {string[]} [options.idsRecents] Identifiants des items vus récemment.
 * @param {number} [options.nombre] Nombre d'items voulus.
 * @param {function(): number} [options.aleatoire] Injectable pour les tests.
 * @returns {Object[]} Au plus `nombre` items, sans doublon (liste plus courte si le contenu est mince).
 */
export function choisirItemsSeance({
  items,
  type,
  niveau,
  idsRecents = [],
  nombre = NOMBRE_ITEMS_PAR_SEANCE,
  aleatoire = Math.random,
}) {
  const recents = new Set(idsRecents);
  const groupes = new Map();
  for (const item of items.filter((candidat) => candidat.type === type)) {
    const rang = rangDeChoix(item, niveau, recents);
    groupes.set(rang, [...(groupes.get(rang) ?? []), item]);
  }
  const rangsCroissants = [...groupes.keys()].sort((a, b) => a - b);
  return rangsCroissants.flatMap((rang) => melanger(groupes.get(rang), aleatoire)).slice(0, nombre);
}

/**
 * Identifiant enregistré dans l'historique pour une séance : les ids de ses items, séparés par des virgules.
 * @param {Array<{id: string}>} items
 * @returns {string}
 */
export function identifiantSeance(items) {
  return items.map((item) => item.id).join(SEPARATEUR_IDS);
}

/**
 * Identifiants des items vus lors des dernières séances d'un exercice.
 * @param {Array<{module: string, mode: string, itemId: string}>} historique
 * @param {string} mode Nom de l'exercice (`homophones`, `accords`, `invariables`, `muettes`,
 *   `tri`, `fonctions`, `etiquettes`, `transformations`).
 * @param {string} [module] Module de l'exercice (l'orthographe par défaut).
 * @returns {string[]}
 */
export function idsRecentsDesSeances(historique, mode, module = MODULE) {
  return idsDejaFaits(historique, module, mode)
    .slice(-NOMBRE_SEANCES_RECENTES_EVITEES)
    .flatMap((identifiant) => identifiant.split(SEPARATEUR_IDS));
}

/** Bonne réponse : juste. Première erreur : indice. Erreur suivante : correction. */
function verdictDeLaReponse(estJuste, erreursDejaFaites) {
  if (estJuste) {
    return VERDICT_JUSTE;
  }
  return erreursDejaFaites === 0 ? VERDICT_INDICE : VERDICT_CORRECTION;
}

/**
 * Suit une séance item par item : 1re erreur = indice et nouvel essai, 2e erreur = correction.
 * Seul un item juste du premier coup compte comme réussi : un item corrigé, ou réussi au 2e essai (après l'indice),
 * compte comme une erreur (c'est ce qui décide du bonus « Aucune erreur »).
 * @param {Object[]} items Les items de la séance (au moins un, chacun avec une `competence`).
 * @returns {{
 *   total: number,
 *   position: function(): number,
 *   itemCourant: function(): Object,
 *   repondre: function(boolean): string,
 *   passerALaSuite: function(): boolean,
 *   bilan: function(): {reussis: number, total: number, competencesRatees: string[]},
 *   resultatsParItem: function(): {id: string, reussi: boolean}[]
 * }}
 */
export function creerSuiviSeance(items) {
  let position = 0;
  let erreursSurLItem = 0;
  let itemTermine = false;
  let reussis = 0;
  const competencesRatees = [];
  const resultatsParItem = [];

  return {
    total: items.length,
    position: () => position,
    itemCourant: () => items[position],

    /** Enregistre une réponse. Renvoie `juste`, `indice` (réessayer), `correction` ou `termine` (déjà fini). */
    repondre(estJuste) {
      if (itemTermine) {
        return VERDICT_TERMINE;
      }
      const verdict = verdictDeLaReponse(estJuste, erreursSurLItem);
      const reussiDuPremierCoup = verdict === VERDICT_JUSTE && erreursSurLItem === 0;
      if (verdict !== VERDICT_INDICE) {
        resultatsParItem.push({ id: items[position].id, reussi: reussiDuPremierCoup });
      }
      erreursSurLItem += estJuste ? 0 : 1;
      itemTermine = verdict !== VERDICT_INDICE;
      reussis += reussiDuPremierCoup ? 1 : 0;
      if (verdict === VERDICT_CORRECTION) {
        competencesRatees.push(items[position].competence);
      }
      return verdict;
    },

    /** Passe à l'item suivant. Renvoie faux quand la séance est finie. */
    passerALaSuite() {
      position += 1;
      erreursSurLItem = 0;
      itemTermine = false;
      return position < items.length;
    },

    bilan: () => ({ reussis, total: items.length, competencesRatees: [...competencesRatees] }),

    /** Pour la répétition espacée : un item est réussi seulement s'il est juste du premier coup. */
    resultatsParItem: () => resultatsParItem.map((resultat) => ({ ...resultat })),
  };
}
