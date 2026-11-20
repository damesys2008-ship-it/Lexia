// Choix du texte d'un exercice de dictée (audio ou détective) : même règle pour les deux modes.

const NOMBRE_DE_TEXTES_RECENTS_EVITES = 5;

/**
 * Choisit le texte de l'exercice : du niveau demandé, en évitant les derniers déjà faits.
 * @param {Array<{id: string, niveau: number}>} items Textes valides du contenu.
 * @param {number} niveau Niveau du module (1 à 3).
 * @param {string[]} idsRecents Identifiants des derniers textes faits (le plus récent en dernier).
 * @param {function(): number} [aleatoire] Renvoie un nombre dans [0, 1) ; injectable pour les tests.
 * @returns {Object|null} Le texte choisi, ou null s'il n'y a aucun texte.
 */
export function choisirTexte(items, niveau, idsRecents, aleatoire = Math.random) {
  const duNiveau = items.filter((item) => item.niveau === niveau);
  const candidats = duNiveau.length > 0 ? duNiveau : items;
  if (candidats.length === 0) {
    return null;
  }
  const recents = idsRecents.slice(-NOMBRE_DE_TEXTES_RECENTS_EVITES);
  const nouveaux = candidats.filter((item) => !recents.includes(item.id));
  const parmi = nouveaux.length > 0 ? nouveaux : candidats;
  return parmi[Math.floor(aleatoire() * parmi.length)];
}

/**
 * Identifiants des textes déjà faits dans un mode, du plus ancien au plus récent.
 * @param {Array<{module: string, mode: string, itemId: string}>} historique Séances enregistrées.
 * @param {string} module Ex. `dictee`.
 * @param {string} mode Ex. `audio`, `detective`.
 * @returns {string[]}
 */
export function idsDejaFaits(historique, module, mode) {
  return historique
    .filter((seance) => seance.module === module && seance.mode === mode)
    .map((seance) => seance.itemId);
}
