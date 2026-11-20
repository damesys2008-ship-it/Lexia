// Logique pure de la dictée audio (cahier §7.1, mode « Dictée ») : aucun accès au DOM ni à la voix.
//
// Un micro-texte (3 à 6 phrases) est lu phrase par phrase ; l'élève écrit tout le texte dans un
// seul champ. La correction aligne mot à mot sa saisie sur le texte attendu (`aligner`).
// Les majuscules, les accents et la ponctuation comptent ; les apostrophes et les espaces non.

import { aligner, motSansPonctuation, normaliserPourComparaison, tokeniser } from '../../coeur/texte.js';

const NIVEAU_PONCTUATION_DICTEE = 1;
const ACCENTS = /[̀-ͯ]/g;

/** Comment la ponctuation se dicte à voix haute. */
export const MOTS_DE_PONCTUATION = {
  ',': 'virgule',
  '.': 'point',
  ';': 'point-virgule',
  ':': 'deux-points',
  '!': "point d'exclamation",
  '?': "point d'interrogation",
  '…': 'points de suspension',
  '«': 'ouvrez les guillemets',
  '»': 'fermez les guillemets',
};

/**
 * @typedef {Object} MotCorrige
 * @property {string} texte Mot de l'élève (vide pour un mot manquant).
 * @property {'neutre'|'faux'|'enTrop'|'manquant'} etat
 * @property {string} [indice] Premier message, avant la correction.
 * @property {string} [correction] Mot attendu (états `faux` et `manquant`).
 * @property {string} [explication] Règle en une phrase, quand le mot est un piège annoté.
 */

/**
 * @typedef {Object} Rapport
 * @property {MotCorrige[]} mots Le texte de l'élève, mot à mot, avec l'état de chacun.
 * @property {number} reussis Mots justes.
 * @property {number} total Mots justes, faux, manquants ou en trop.
 * @property {string[]} competencesRatees Compétences des pièges ratés.
 * @property {boolean} parfait Vrai si la saisie est exactement le texte attendu.
 */

/**
 * La ponctuation est dictée par défaut au niveau 1 : on aide l'élève qui débute.
 * @param {number} niveau
 * @returns {boolean}
 */
export function ponctuationDicteeParDefaut(niveau) {
  return niveau === NIVEAU_PONCTUATION_DICTEE;
}

/** Remplace la ponctuation d'un mot par les mots qui la disent. */
function dicterUnMot(mot) {
  const coeur = motSansPonctuation(mot);
  const debut = mot.slice(0, mot.indexOf(coeur));
  const fin = mot.slice(debut.length + coeur.length);
  const dits = [...debut, coeur, ...fin].map((signe) => MOTS_DE_PONCTUATION[signe] ?? signe);
  return dits.filter((morceau) => morceau !== '').join(' ');
}

/**
 * Le texte que la synthèse vocale lit.
 * @param {string} phrase Phrase attendue, avec sa ponctuation.
 * @param {boolean} ponctuationDictee Vrai pour dire « virgule », « point »…
 * @returns {string}
 */
export function texteADicter(phrase, ponctuationDictee) {
  if (!ponctuationDictee) {
    return phrase;
  }
  return tokeniser(phrase).map(dicterUnMot).join(' ');
}

/**
 * Les phrases du micro-texte, dans l'ordre de lecture.
 * @param {{phrases: Array<{texte: string}>}} item
 * @returns {string[]}
 */
export function phrasesDuTexte(item) {
  return item.phrases.map((phrase) => phrase.texte);
}

/**
 * Le texte complet attendu.
 * @param {{phrases: Array<{texte: string}>}} item
 * @returns {string}
 */
export function texteAttendu(item) {
  return phrasesDuTexte(item).join(' ');
}

/** Pour chaque mot du texte attendu, le piège annoté qui le concerne (s'il y en a un). */
function indexerPieges(item) {
  const parMot = new Map();
  let decalage = 0;
  for (const phrase of item.phrases) {
    const mots = tokeniser(phrase.texte).map(motSansPonctuation);
    for (const piege of phrase.pieges) {
      const motsDuPiege = tokeniser(piege.mot).map(motSansPonctuation);
      const debut = trouverSuite(mots, motsDuPiege);
      for (let k = 0; debut >= 0 && k < motsDuPiege.length; k++) {
        parMot.set(decalage + debut + k, piege);
      }
    }
    decalage += mots.length;
  }
  return parMot;
}

/** Indice de la première occurrence de `suite` dans `mots`, ou -1. */
function trouverSuite(mots, suite) {
  for (let debut = 0; debut + suite.length <= mots.length; debut++) {
    if (suite.every((mot, decalage) => mots[debut + decalage] === mot)) {
      return debut;
    }
  }
  return -1;
}

function sansAccents(texte) {
  return texte.normalize('NFD').replace(ACCENTS, '');
}

/**
 * Premier message quand un mot est faux et qu'aucun piège n'est annoté : de quel genre est l'écart ?
 * @param {string} saisi Mot de l'élève.
 * @param {string} attendu Mot attendu.
 * @returns {string}
 */
export function indiceGeneral(saisi, attendu) {
  const nu = (mot) => normaliserPourComparaison(motSansPonctuation(mot));
  if (nu(saisi) === nu(attendu)) {
    return 'Regarde la ponctuation de ce mot.';
  }
  if (nu(saisi).toLowerCase() === nu(attendu).toLowerCase()) {
    return 'Regarde la majuscule de ce mot.';
  }
  if (sansAccents(nu(saisi)) === sansAccents(nu(attendu))) {
    return 'Regarde les accents de ce mot.';
  }
  return 'Il y a une faute dans ce mot.';
}

/** Le mot de la correction pour une opération d'alignement. */
function motCorrige(operation, piege) {
  const explication = piege?.explication;
  if (operation.type === 'juste') {
    return { texte: operation.saisi, etat: 'neutre' };
  }
  if (operation.type === 'enTrop') {
    return { texte: operation.saisi, etat: 'enTrop' };
  }
  if (operation.type === 'manquant') {
    return {
      texte: '',
      etat: 'manquant',
      indice: piege?.indice ?? 'Il manque un mot ici.',
      correction: operation.attendu,
      explication,
    };
  }
  return {
    texte: operation.saisi,
    etat: 'faux',
    indice: piege?.indice ?? indiceGeneral(operation.saisi, operation.attendu),
    correction: operation.attendu,
    explication,
  };
}

/**
 * Corrige la saisie de l'élève.
 * @param {{phrases: Array<{texte: string, pieges: Object[]}>}} item
 * @param {string} saisie Ce que l'élève a écrit.
 * @returns {Rapport}
 */
export function construireRapport(item, saisie) {
  const pieges = indexerPieges(item);
  const operations = aligner(texteAttendu(item), saisie);
  const mots = [];
  const competencesRatees = [];
  for (const operation of operations) {
    const piege = pieges.get(operation.indiceAttendu);
    mots.push(motCorrige(operation, piege));
    if (operation.type !== 'juste' && piege) {
      competencesRatees.push(piege.competence);
    }
  }
  const reussis = operations.filter((operation) => operation.type === 'juste').length;
  return {
    mots,
    reussis,
    total: operations.length,
    competencesRatees: [...new Set(competencesRatees)],
    parfait: operations.length > 0 && reussis === operations.length,
  };
}
