// Logique pure de l'exercice « La chasse aux fonctions » : légende, sélection de groupes, évaluation.
// Aucun accès au DOM : tout se teste dans Node.

import { motSansPonctuation } from '../../coeur/texte.js';

/** Nom et sigle affichés de chaque fonction (le sigle s'ajoute à la couleur : jamais la couleur seule). */
export const LIBELLES_FONCTIONS = {
  verbe: { libelle: 'verbe', sigle: 'V' },
  sujet: { libelle: 'sujet', sigle: 'S' },
  cod: { libelle: 'COD', sigle: 'COD' },
  coi: { libelle: 'COI', sigle: 'COI' },
  cc: { libelle: 'complément circonstanciel', sigle: 'CC' },
};

/** Ce qui vient de se passer quand l'élève touche un mot ou glisse sur plusieurs mots. */
export const EVENEMENT_FONCTION_MANQUANTE = 'fonction-manquante';
export const EVENEMENT_DEBUT = 'debut';
export const EVENEMENT_GROUPE_AJOUTE = 'groupe-ajoute';
export const EVENEMENT_GROUPE_EFFACE = 'groupe-efface';
export const EVENEMENT_CHEVAUCHEMENT = 'chevauchement';

export const RESULTAT_JUSTE = 'juste';
export const RESULTAT_FAUX = 'faux';

/**
 * @typedef {{debut: number, fin: number, fonction: string}} Groupe  Indices inclus dans `mots`.
 * @typedef {{groupes: Groupe[], fonction: (string|null), debut: (number|null)}} Selection
 *   `fonction` : la fonction choisie dans la légende ; `debut` : le premier mot déjà touché d'un groupe.
 */

/**
 * La légende de l'item : une entrée par fonction demandée, dans l'ordre du contenu.
 * @param {{demandees: string[]}} item
 * @returns {{fonction: string, libelle: string, sigle: string}[]}
 */
export function creerLegende(item) {
  return item.demandees.map((fonction) => ({ fonction, ...LIBELLES_FONCTIONS[fonction] }));
}

/** Les deux bornes d'un groupe dans le bon ordre : on peut toucher le dernier mot avant le premier. */
export function normaliserBornes(premier, dernier) {
  return { debut: Math.min(premier, dernier), fin: Math.max(premier, dernier) };
}

/** Le groupe qui contient le mot, s'il y en a un. */
export function groupeContenant(groupes, indice) {
  return groupes.find((groupe) => groupe.debut <= indice && indice <= groupe.fin);
}

/** Dit si l'intervalle de mots touche un groupe déjà posé. */
export function recouvre(groupes, { debut, fin }) {
  return groupes.some((groupe) => groupe.debut <= fin && debut <= groupe.fin);
}

function trierParPosition(groupes) {
  return [...groupes].sort((groupe, autre) => groupe.debut - autre.debut);
}

/** Une sélection vide : rien n'est choisi, aucun groupe n'est posé. */
export function creerSelection() {
  return { groupes: [], fonction: null, debut: null };
}

/** L'élève choisit une fonction dans la légende ; un groupe commencé est abandonné. */
export function choisirFonction(selection, fonction) {
  return { ...selection, fonction, debut: null };
}

/**
 * Pose un groupe sur tous les mots entre deux mots touchés (ou entre le début et la fin d'un glissement).
 * @param {Selection} selection
 * @param {number} premier Indice du premier mot touché.
 * @param {number} dernier Indice du dernier mot touché (peut être avant le premier).
 * @returns {{selection: Selection, evenement: string}}
 */
export function selectionnerPlage(selection, premier, dernier) {
  if (selection.fonction === null) {
    return { selection, evenement: EVENEMENT_FONCTION_MANQUANTE };
  }
  const bornes = normaliserBornes(premier, dernier);
  if (recouvre(selection.groupes, bornes)) {
    return { selection: { ...selection, debut: null }, evenement: EVENEMENT_CHEVAUCHEMENT };
  }
  const groupe = { ...bornes, fonction: selection.fonction };
  const groupes = trierParPosition([...selection.groupes, groupe]);
  return { selection: { ...selection, groupes, debut: null }, evenement: EVENEMENT_GROUPE_AJOUTE };
}

/**
 * Touche un mot : retoucher un groupe l'efface ; sinon le 1er toucher marque le début d'un groupe
 * et le 2e en marque la fin (le même mot deux fois = un groupe d'un seul mot).
 * @param {Selection} selection
 * @param {number} indice Indice du mot touché.
 * @returns {{selection: Selection, evenement: string}}
 */
export function toucherMot(selection, indice) {
  const groupePose = groupeContenant(selection.groupes, indice);
  if (selection.debut === null && groupePose !== undefined) {
    const groupes = selection.groupes.filter((groupe) => groupe !== groupePose);
    return { selection: { ...selection, groupes }, evenement: EVENEMENT_GROUPE_EFFACE };
  }
  if (selection.fonction === null) {
    return { selection, evenement: EVENEMENT_FONCTION_MANQUANTE };
  }
  if (selection.debut === null) {
    return { selection: { ...selection, debut: indice }, evenement: EVENEMENT_DEBUT };
  }
  return selectionnerPlage(selection, selection.debut, indice);
}

/** Remplace les groupes posés (par exemple par la solution) sans toucher au reste de la sélection. */
export function poserGroupes(selection, groupes) {
  return { ...selection, groupes: trierParPosition(groupes), debut: null };
}

/** Clé qui identifie un groupe : deux groupes de même clé sont le même groupe. */
export function clefDeGroupe({ debut, fin, fonction }) {
  return `${debut}-${fin}-${fonction}`;
}

/**
 * Compare les groupes de l'élève à ceux de l'item : la comparaison est exacte (mêmes mots, même fonction).
 * @param {{groupes: Groupe[]}} item
 * @param {Groupe[]} groupesEleve
 * @returns {{resultats: Map<string, 'juste'|'faux'>, toutEstJuste: boolean}}
 *   `resultats` : une entrée par groupe de l'élève, indexée par `clefDeGroupe`.
 */
export function evaluerGroupes(item, groupesEleve) {
  const attendus = new Set(item.groupes.map(clefDeGroupe));
  const resultats = new Map();
  for (const groupe of groupesEleve) {
    const clef = clefDeGroupe(groupe);
    resultats.set(clef, attendus.has(clef) ? RESULTAT_JUSTE : RESULTAT_FAUX);
  }
  const aucunFaux = [...resultats.values()].every((resultat) => resultat === RESULTAT_JUSTE);
  return { resultats, toutEstJuste: aucunFaux && groupesEleve.length === attendus.size };
}

/** Ne garde que les groupes faux : après la 1re erreur, on les signale sans montrer la correction. */
export function garderLesFaux(resultats) {
  return new Map([...resultats].filter(([, resultat]) => resultat === RESULTAT_FAUX));
}

/** Le texte d'un groupe, sans la ponctuation du bord : « Hier soir » pour « Hier soir, ». */
export function texteDuGroupe(item, groupe) {
  return motSansPonctuation(item.mots.slice(groupe.debut, groupe.fin + 1).join(' '));
}

/**
 * La solution en une phrase, dans l'ordre de la phrase : « Le chat (sujet), dort (verbe) ».
 * @param {{mots: string[], groupes: Groupe[]}} item
 * @returns {string}
 */
export function decrireSolution(item) {
  return item.groupes
    .map((groupe) => `${texteDuGroupe(item, groupe)} (${LIBELLES_FONCTIONS[groupe.fonction].libelle})`)
    .join(', ');
}
