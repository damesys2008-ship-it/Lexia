// Logique pure du composant « choix » (js/ui/choix.js) : quelle option est choisie, lesquelles sont
// jugées, et quelle option reçoit le focus quand on utilise les flèches. Aucun accès au DOM.

export const RESULTAT_JUSTE = 'juste';
export const RESULTAT_FAUX = 'faux';

/**
 * @typedef {Object} EtatChoix
 * @property {string|null} selection  id de l'option choisie, ou null
 * @property {Record<string, 'juste'|'faux'>} resultats  jugement des options déjà marquées
 */

/** @returns {EtatChoix} un état sans choix ni jugement */
export function creerEtat() {
  return { selection: null, resultats: {} };
}

/** Une option déjà jugée (juste ou faux) ne se choisit plus. */
export function estChoisissable(etat, id) {
  return !Object.hasOwn(etat.resultats, id);
}

/**
 * Choisit une option. Un seul choix à la fois : le nouveau remplace l'ancien.
 * Une option déjà jugée, ou inconnue, laisse l'état inchangé.
 * @param {EtatChoix} etat
 * @param {string} id
 * @returns {EtatChoix}
 */
export function choisir(etat, id) {
  return estChoisissable(etat, id) ? { ...etat, selection: id } : etat;
}

/**
 * Juge une option. Une option fausse n'est plus le choix courant.
 * @param {EtatChoix} etat
 * @param {string} id
 * @param {'juste'|'faux'} resultat
 * @returns {EtatChoix}
 * @throws {Error} si le résultat n'est ni `juste` ni `faux`
 */
export function marquer(etat, id, resultat) {
  if (resultat !== RESULTAT_JUSTE && resultat !== RESULTAT_FAUX) {
    throw new Error(`marquer : résultat inconnu « ${resultat} » (attendu « juste » ou « faux »)`);
  }
  const selection = resultat === RESULTAT_FAUX && etat.selection === id ? null : etat.selection;
  return { selection, resultats: { ...etat.resultats, [id]: resultat } };
}

/**
 * Position de la prochaine option qu'on peut encore choisir, en tournant dans le sens demandé.
 * @param {string[]} ids  les id des options, dans l'ordre d'affichage
 * @param {EtatChoix} etat
 * @param {{depart: number, sens: 1|-1}} deplacement  position de l'option qui a le focus, et sens du déplacement
 * @returns {number} la position trouvée, ou -1 si plus aucune option n'est choisissable
 */
export function positionSuivante(ids, etat, { depart, sens }) {
  const nombre = ids.length;
  for (let pas = 1; pas <= nombre; pas += 1) {
    // Le « + nombre » évite un reste négatif quand on recule depuis la première option.
    const position = (depart + sens * pas + nombre) % nombre;
    if (estChoisissable(etat, ids[position])) {
      return position;
    }
  }
  return -1;
}
