// Logique pure du composant « texte surlignable » (js/ui/texte-surlignable.js) : le numéro et le libellé de
// chaque phrase, quelle phrase est choisie, lesquelles sont jugées. Aucun accès au DOM.

export const RESULTAT_JUSTE = 'juste';
export const RESULTAT_FAUX = 'faux';

/**
 * @typedef {Object} EtatTexte
 * @property {number|null} selection  index (à plat) de la phrase choisie, ou null
 * @property {Record<number, 'juste'|'faux'>} resultats  jugement des phrases déjà marquées
 */

/**
 * Met à plat les phrases d'un texte découpé en paragraphes : l'index d'une phrase est sa place dans la suite
 * de toutes les phrases (0, 1, 2…), comme le champ `preuve` des questions.
 * @param {string[][]} paragraphes
 * @returns {string[]}
 */
export function aplatirPhrases(paragraphes) {
  return paragraphes.flat();
}

/**
 * Libellé lu par les lecteurs d'écran : « Phrase 3 sur 12 : … ».
 * @param {number} index  index (à partir de 0) de la phrase
 * @param {number} total  nombre de phrases du texte
 * @param {string} texte
 * @returns {string}
 */
export function libellePhrase(index, total, texte) {
  return `Phrase ${index + 1} sur ${total} : ${texte}`;
}

/** @returns {EtatTexte} un état sans choix ni jugement */
export function creerEtat() {
  return { selection: null, resultats: {} };
}

/** Une phrase déjà jugée (juste ou faux) ne se choisit plus. */
export function estChoisissable(etat, index) {
  return !Object.hasOwn(etat.resultats, index);
}

/**
 * Choisit une phrase. Une seule à la fois : la nouvelle remplace l'ancienne.
 * Une phrase déjà jugée laisse l'état inchangé.
 * @param {EtatTexte} etat
 * @param {number} index
 * @returns {EtatTexte}
 */
export function choisir(etat, index) {
  return estChoisissable(etat, index) ? { ...etat, selection: index } : etat;
}

/**
 * Juge une phrase. Une phrase fausse n'est plus le choix courant.
 * @param {EtatTexte} etat
 * @param {number} index
 * @param {'juste'|'faux'} resultat
 * @returns {EtatTexte}
 * @throws {Error} si le résultat n'est ni `juste` ni `faux`
 */
export function marquer(etat, index, resultat) {
  if (resultat !== RESULTAT_JUSTE && resultat !== RESULTAT_FAUX) {
    throw new Error(`marquer : résultat inconnu « ${resultat} »`);
  }
  const selection = resultat === RESULTAT_FAUX && etat.selection === index ? null : etat.selection;
  return { selection, resultats: { ...etat.resultats, [index]: resultat } };
}
