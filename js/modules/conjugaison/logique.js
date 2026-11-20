// Logique pure de la conjugaison (cahier §7.2) : aucun accès au DOM.
//
// Un item est un tableau complet d'un verbe à un temps (voir `ItemConjugaison` dans
// contenu-conjugaison.js). Les niveaux B et C comparent la saisie de l'élève à la forme
// stockée de chaque personne, ou à l'une de ses variantes (participe au féminin, par exemple).

import { PERSONNES_PAR_TEMPS } from '../../coeur/contenu.js';
import { commenceParVoyelleOuHMuet, normaliserPourComparaison } from '../../coeur/texte.js';
import { choisirTexte } from '../../coeur/selection.js';

const PRONOMS_AFFICHES = {
  je: 'je',
  tu: 'tu',
  il: 'il / elle / on',
  nous: 'nous',
  vous: 'vous',
  ils: 'ils / elles',
};

const TEMPS_SANS_PRONOM = 'imperatif-present';

// À l'impératif il n'y a pas de pronom : on désigne la personne par son rang.
const PERSONNES_DE_L_IMPERATIF = {
  tu: '2e personne du singulier',
  nous: '1re personne du pluriel',
  vous: '2e personne du pluriel',
};

/**
 * Les personnes d'un tableau, dans l'ordre d'affichage.
 * @param {{temps: string}} item
 * @returns {string[]} Ex. `['je', 'tu', 'il', 'nous', 'vous', 'ils']`, ou 3 personnes à l'impératif.
 */
export function personnesDuTemps(item) {
  return PERSONNES_PAR_TEMPS[item.temps];
}

/**
 * Le pronom écrit devant une forme, avec l'élision de « je ».
 * @param {{temps: string, formes: Object<string, string>}} item
 * @param {string} personne Ex. `je`, `il`.
 * @returns {string} « j' », « je », « il / elle / on »… ; vide à l'impératif (pas de pronom).
 */
export function pronomAffiche(item, personne) {
  if (item.temps === TEMPS_SANS_PRONOM) {
    return '';
  }
  if (personne === 'je' && commenceParVoyelleOuHMuet(item.formes.je)) {
    return "j'";
  }
  return PRONOMS_AFFICHES[personne];
}

/**
 * Ce qu'on affiche à gauche d'une forme à relier : le pronom, ou le rang de la personne à l'impératif.
 * @param {Object} item
 * @param {string} personne
 * @returns {string}
 */
export function etiquetteDePersonne(item, personne) {
  if (item.temps === TEMPS_SANS_PRONOM) {
    return PERSONNES_DE_L_IMPERATIF[personne];
  }
  return pronomAffiche(item, personne);
}

/**
 * Une ligne du tableau, pronom et forme assemblés : « j'aime », « il / elle / on mange », « chante ».
 * @param {Object} item
 * @param {string} personne
 * @returns {string}
 */
export function ligneDuTableau(item, personne) {
  const pronom = pronomAffiche(item, personne);
  const forme = item.formes[personne];
  if (pronom === '') {
    return forme;
  }
  return pronom.endsWith("'") ? `${pronom}${forme}` : `${pronom} ${forme}`;
}

/**
 * Le pronom d'une personne, pour les lecteurs d'écran (même à l'impératif).
 * @param {string} personne
 * @returns {string}
 */
export function pronomPourLecteur(personne) {
  return PRONOMS_AFFICHES[personne];
}

/**
 * Choisit le tableau de l'exercice : du niveau demandé, du temps demandé s'il y en a un,
 * en évitant les derniers déjà faits.
 * @param {Array<Object>} items Tableaux valides du contenu.
 * @param {{niveau: number, temps?: string, idsRecents: string[]}} demande
 * @param {function(): number} [aleatoire] Renvoie un nombre dans [0, 1) ; injectable pour les tests.
 * @returns {Object|null} Le tableau choisi, ou null s'il n'y en a aucun.
 */
export function choisirTableau(items, demande, aleatoire = Math.random) {
  const { niveau, temps, idsRecents } = demande;
  const duTemps = temps === undefined ? items : items.filter((item) => item.temps === temps);
  return choisirTexte(duTemps.length > 0 ? duTemps : items, niveau, idsRecents, aleatoire);
}

/**
 * Toutes les écritures acceptées pour une personne : la forme stockée, puis ses variantes.
 * @param {{formes: Object<string, string>, variantes: Object<string, string[]>}} item
 * @param {string} personne
 * @returns {string[]}
 */
export function formesAcceptees(item, personne) {
  return [item.formes[personne], ...(item.variantes[personne] ?? [])];
}

function pourComparer(texte) {
  return normaliserPourComparaison(texte).toLowerCase();
}

/**
 * Compare la forme écrite par l'élève à celles qu'on accepte pour cette personne.
 * Les espaces en trop, les majuscules et les apostrophes typographiques sont tolérés ; les accents ne le sont pas.
 * @param {Object} item
 * @param {string} personne
 * @param {string} saisie
 * @returns {boolean}
 */
export function formeEstJuste(item, personne, saisie) {
  const proposee = pourComparer(saisie);
  if (proposee === '') {
    return false;
  }
  return formesAcceptees(item, personne).some((forme) => pourComparer(forme) === proposee);
}

/**
 * Niveau B : ajoute à chaque terminaison tapée le radical donné dans l'énoncé.
 * @param {{radicaux: Object<string, string>}} item
 * @param {Object<string, string>} terminaisons Ce que l'élève a tapé, par personne.
 * @returns {Object<string, string>} Les formes entières, par personne.
 */
export function completerAvecRadicaux(item, terminaisons) {
  return Object.fromEntries(
    Object.entries(terminaisons).map(([personne, terminaison]) => [
      personne,
      terminaison.trim() === '' ? '' : `${item.radicaux[personne]}${terminaison.trim()}`,
    ]),
  );
}

/**
 * @typedef {Object} CelluleEvaluee
 * @property {string} personne
 * @property {string} saisie
 * @property {boolean} juste
 */

/**
 * @typedef {Object} EvaluationTableau
 * @property {CelluleEvaluee[]} cellules Une cellule par personne, dans l'ordre du temps.
 * @property {number} nombreJustes
 * @property {number} nombreFausses
 */

/**
 * Évalue un tableau complet de formes entières.
 * @param {Object} item
 * @param {Object<string, string>} saisies Forme entière écrite par l'élève, par personne.
 * @returns {EvaluationTableau}
 */
export function evaluerTableau(item, saisies) {
  const cellules = personnesDuTemps(item).map((personne) => {
    const saisie = saisies[personne] ?? '';
    return { personne, saisie, juste: formeEstJuste(item, personne, saisie) };
  });
  const nombreJustes = cellules.filter((cellule) => cellule.juste).length;
  return { cellules, nombreJustes, nombreFausses: cellules.length - nombreJustes };
}

/**
 * Niveau A : les deux colonnes à relier. Chaque forme est une carte distincte, même quand deux
 * personnes ont la même forme (« je mange », « il mange ») ; chaque carte liste toutes les
 * personnes pour lesquelles elle est juste (`correspond`).
 * @param {Object} item
 * @returns {{gauche: Array<{id: string, texte: string}>,
 *   droite: Array<{id: string, texte: string, correspond: string[]}>}}
 */
export function construireColonnesARelier(item) {
  const personnes = personnesDuTemps(item);
  return {
    gauche: personnes.map((personne) => ({ id: personne, texte: etiquetteDePersonne(item, personne) })),
    droite: personnes.map((personne) => ({
      id: `forme-${personne}`,
      texte: item.formes[personne],
      correspond: personnes.filter((autre) => formeEstJuste(item, autre, item.formes[personne])),
    })),
  };
}

/**
 * Niveau A : juge chaque trait. Un trait est juste si la forme reliée est une réponse acceptée
 * pour cette personne (deux personnes de même forme acceptent chacune les deux cartes).
 * @param {Array<{gaucheId: string, droiteId: string}>} traits
 * @param {Array<{id: string, correspond: string[]}>} cartes La colonne de droite.
 * @returns {Object<string, 'juste'|'faux'>} Le résultat de chaque personne reliée.
 */
export function resultatsDesTraits(traits, cartes) {
  const resultats = {};
  for (const { gaucheId, droiteId } of traits) {
    const carte = cartes.find((candidate) => candidate.id === droiteId);
    resultats[gaucheId] = carte.correspond.includes(gaucheId) ? 'juste' : 'faux';
  }
  return resultats;
}

/**
 * Niveau B : un indice sur la terminaison que l'élève doit taper, sans la donner.
 * Quand le radical change (radical vide), c'est la forme entière qu'on écrit : indice sur la forme.
 * @param {{formes: Object<string, string>, radicaux: Object<string, string>}} item
 * @param {string} personne
 * @returns {string}
 */
export function indiceDeLaTerminaison(item, personne) {
  const radical = item.radicaux[personne];
  if (radical === '') {
    return indiceDeLaForme(item.formes[personne]);
  }
  const terminaison = item.formes[personne].slice(radical.length);
  return `La terminaison compte ${terminaison.length} ${terminaison.length > 1 ? 'lettres' : 'lettre'}.`;
}

/**
 * Un indice qui ne donne pas la réponse : la première lettre et la taille de la forme.
 * @param {string} forme La forme attendue.
 * @returns {string}
 */
export function indiceDeLaForme(forme) {
  const mots = forme.split(' ');
  const taille = mots.length > 1 ? `${mots.length} mots` : `${forme.length} lettres`;
  return `La forme compte ${taille} et commence par « ${forme[0]} ».`;
}
