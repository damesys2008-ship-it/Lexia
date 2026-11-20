// Logique pure du composant « déposer » : où est chaque étiquette. Aucun accès au DOM.
//
// Vocabulaire : une « zone » reçoit des étiquettes dans l'ordre (`{ id, ordonnee, capacite? }`).
// Une étiquette qui n'est dans aucune zone est « dans la réserve ».
// L'état est `{ contenus: Map<zoneId, etiquetteId[]>, capacites: Map<zoneId, number> }`.
// Les fonctions ne modifient jamais l'état reçu : elles en renvoient un nouveau, ou le même
// objet quand rien ne change (on peut donc tester `suivant === etat`).

/**
 * Crée l'état de départ : toutes les zones sont vides.
 * @param {{ id: string, capacite?: number }[]} zones
 * @returns {{ contenus: Map<string, string[]>, capacites: Map<string, number> }}
 */
export function creerEtat(zones) {
  const contenus = new Map(zones.map((zone) => [zone.id, []]));
  const capacites = new Map(zones.filter((zone) => zone.capacite !== undefined).map((zone) => [zone.id, zone.capacite]));
  return { contenus, capacites };
}

/**
 * Zone qui contient l'étiquette.
 * @param {{ contenus: Map<string, string[]> }} etat
 * @param {string} etiquetteId
 * @returns {string|null} `null` si l'étiquette est dans la réserve
 */
export function zoneDe(etat, etiquetteId) {
  for (const [zoneId, etiquettes] of etat.contenus) {
    if (etiquettes.includes(etiquetteId)) {
      return zoneId;
    }
  }
  return null;
}

function sansEtiquette(contenus, etiquetteId) {
  return new Map([...contenus].map(([zoneId, etiquettes]) => [zoneId, etiquettes.filter((id) => id !== etiquetteId)]));
}

/** Vrai si la zone ne peut plus accueillir l'étiquette (hors le cas où elle y est déjà). */
export function zoneEstPleine(etat, zoneId, etiquetteId) {
  const capacite = etat.capacites.get(zoneId);
  const presentes = etat.contenus.get(zoneId);
  return capacite !== undefined && !presentes.includes(etiquetteId) && presentes.length >= capacite;
}

/**
 * Place une étiquette dans une zone, à une position (à la fin par défaut). Une étiquette déjà placée
 * ailleurs, ou plus loin dans la même zone, est déplacée.
 * @param {{ contenus: Map<string, string[]>, capacites: Map<string, number> }} etat
 * @param {string} etiquetteId
 * @param {string} zoneId
 * @param {number} [position] indice d'insertion parmi les étiquettes de la zone (sans compter celle qu'on déplace)
 * @returns l'état suivant, ou `etat` si la zone est pleine ou inconnue
 */
export function placer(etat, etiquetteId, zoneId, position) {
  if (!etat.contenus.has(zoneId) || zoneEstPleine(etat, zoneId, etiquetteId)) {
    return etat;
  }
  const contenus = sansEtiquette(etat.contenus, etiquetteId);
  const cible = contenus.get(zoneId);
  const indice = position === undefined ? cible.length : Math.max(0, Math.min(position, cible.length));
  contenus.set(zoneId, [...cible.slice(0, indice), etiquetteId, ...cible.slice(indice)]);
  return { ...etat, contenus };
}

/**
 * Remet une étiquette dans la réserve.
 * @returns l'état suivant, ou `etat` si l'étiquette y était déjà
 */
export function retirer(etat, etiquetteId) {
  if (zoneDe(etat, etiquetteId) === null) {
    return etat;
  }
  return { ...etat, contenus: sansEtiquette(etat.contenus, etiquetteId) };
}

/**
 * Indique si toutes les étiquettes sont dans une zone.
 * @param {{ contenus: Map<string, string[]> }} etat
 * @param {{ id: string }[]} etiquettes
 * @returns {boolean} `false` s'il n'y a aucune étiquette : il n'y a rien à vérifier
 */
export function toutEstPlace(etat, etiquettes) {
  return etiquettes.length > 0 && etiquettes.every((etiquette) => zoneDe(etat, etiquette.id) !== null);
}

/**
 * Copie lisible de l'état : pour chaque zone, les id des étiquettes dans l'ordre.
 * @returns {Record<string, string[]>}
 */
export function lirePlacementsDe(etat) {
  return Object.fromEntries([...etat.contenus].map(([zoneId, etiquettes]) => [zoneId, [...etiquettes]]));
}

/**
 * Position d'insertion d'un point parmi les étiquettes d'une zone, lues ligne par ligne.
 * Une étiquette est « avant » le point si elle est sur une ligne plus haute, ou sur la même ligne et plus à gauche.
 * @param {{ left: number, right: number, top: number, bottom: number }[]} boites boîtes des étiquettes, dans l'ordre
 * @param {{ x: number, y: number }} point
 * @returns {number} nombre d'étiquettes à garder avant le point
 */
export function positionDInsertion(boites, point) {
  return boites.filter((boite) => {
    if (point.y >= boite.bottom) {
      return true;
    }
    const surLaMemeLigne = point.y >= boite.top;
    return surLaMemeLigne && (boite.left + boite.right) / 2 < point.x;
  }).length;
}

/**
 * Place une étiquette juste avant une autre, dans la zone de celle-ci.
 * @param {{ contenus: Map<string, string[]>, capacites: Map<string, number> }} etat
 * @param {string} etiquetteId étiquette à déplacer
 * @param {string} cibleId étiquette déjà placée, devant laquelle on insère
 * @returns l'état suivant, ou `etat` si la cible est dans la réserve, est l'étiquette elle-même, ou si la zone est pleine
 */
export function placerAvant(etat, etiquetteId, cibleId) {
  const zoneId = zoneDe(etat, cibleId);
  if (zoneId === null || etiquetteId === cibleId) {
    return etat;
  }
  const voisines = etat.contenus.get(zoneId).filter((id) => id !== etiquetteId);
  return placer(etat, etiquetteId, zoneId, voisines.indexOf(cibleId));
}
