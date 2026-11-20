// Logique pure du « Détective des fautes » (cahier §7.1) : aucun accès au DOM.
//
// Vocabulaire : le texte correct est découpé en mots par `tokeniser` (la ponctuation est
// collée au mot précédent). Une faute couvre une plage de mots du texte correct : elle
// commence à `position` et compte autant de mots que `correct` (`largeurDeLaFaute`).
// L'élève travaille sur le texte fautif ; on compare ensuite son texte au texte correct.

import { largeurDeLaFaute } from '../../coeur/contenu.js';
import { aligner, motSansPonctuation, tokeniser } from '../../coeur/texte.js';

/**
 * États d'un mot dans la correction.
 *   neutre       mot juste, jamais touché
 *   corrige      mot qui portait une faute et que l'élève a corrigé
 *   faux         faute restante (rouge)
 *   fauxPositif  mot juste que l'élève a modifié à tort (orange)
 *   enTrop       mot ajouté par l'élève
 *   manquant     mot qui manque à cet endroit
 */

/**
 * @typedef {Object} MotEvalue
 * @property {string} texte Mot de l'élève (vide pour un mot manquant).
 * @property {'neutre'|'corrige'|'faux'|'fauxPositif'|'enTrop'|'manquant'} etat
 * @property {Object} [faute] La faute concernée (états `faux` et `manquant` d'une faute).
 * @property {string} [attendu] Le mot attendu (états `fauxPositif` et `manquant`).
 */

/**
 * @typedef {Object} Evaluation
 * @property {Array<{faute: Object, corrigee: boolean}>} fautes Dans l'ordre de l'item.
 * @property {number} restantes Nombre de fautes pas encore corrigées.
 * @property {number} fauxPositifs Mots justes modifiés à tort, mots en trop ou manquants hors faute.
 * @property {MotEvalue[]} mots Le texte de l'élève, mot à mot, avec l'état de chacun.
 */

/** Remplace la plage d'une faute par sa forme fautive, en gardant la ponctuation du texte correct. */
function formeFautive(mots, faute) {
  const premier = mots[faute.position];
  const dernier = mots[faute.position + largeurDeLaFaute(faute) - 1];
  const debut = premier.slice(0, premier.indexOf(motSansPonctuation(premier)));
  const fin = dernier.slice(dernier.indexOf(motSansPonctuation(dernier)) + motSansPonctuation(dernier).length);
  return `${debut}${faute.fautif}${fin}`;
}

/**
 * Le texte que l'élève doit relire : le texte correct où chaque faute est remise à sa forme fautive.
 * @param {{texteCorrect: string, fautes: Object[]}} item
 * @returns {string}
 */
export function construireTexteFautif(item) {
  const mots = tokeniser(item.texteCorrect);
  const parPosition = new Map(item.fautes.map((faute) => [faute.position, faute]));
  const morceaux = [];
  let indice = 0;
  while (indice < mots.length) {
    const faute = parPosition.get(indice);
    if (faute) {
      morceaux.push(formeFautive(mots, faute));
      indice += largeurDeLaFaute(faute);
    } else {
      morceaux.push(mots[indice]);
      indice += 1;
    }
  }
  return morceaux.join(' ');
}

/** Pour chaque mot attendu qui fait partie d'une faute, l'indice de cette faute dans `item.fautes`. */
function indexerFautesParMot(fautes) {
  const parMot = new Map();
  fautes.forEach((faute, indiceFaute) => {
    for (let k = 0; k < largeurDeLaFaute(faute); k++) {
      parMot.set(faute.position + k, indiceFaute);
    }
  });
  return parMot;
}

/**
 * Un mot en trop collé à un mot faux d'une faute fait partie de cette faute : « peut être »
 * écrit à la place de « peut-être » compte pour une seule faute, pas pour un faux positif.
 * @returns {number|undefined} L'indice de la faute voisine, s'il y en a une.
 */
function fauteVoisine(operations, position, fautesParMot) {
  const voisines = [operations[position - 1], operations[position + 1]];
  for (const voisine of voisines) {
    const estFauxOuManquant = voisine && (voisine.type === 'faux' || voisine.type === 'manquant');
    if (estFauxOuManquant && fautesParMot.has(voisine.indiceAttendu)) {
      return fautesParMot.get(voisine.indiceAttendu);
    }
  }
  return undefined;
}

// Un classeur reçoit une opération d'alignement et l'indice de la faute à laquelle elle appartient
// (undefined hors faute). Il renvoie le mot à afficher, la faute qui reste à corriger et le faux positif éventuel.

function classerJuste(operation, indiceFaute) {
  const etat = indiceFaute === undefined ? 'neutre' : 'corrige';
  return { mot: { texte: operation.saisi, etat } };
}

/** Un mot faux, ou un mot en trop collé à une faute : c'est la faute qui reste, ou un mot juste touché à tort. */
function classerMotErrone(operation, indiceFaute, fautes) {
  if (indiceFaute !== undefined) {
    return { mot: { texte: operation.saisi, etat: 'faux', faute: fautes[indiceFaute] }, fauteRestante: indiceFaute };
  }
  const mot = operation.type === 'faux'
    ? { texte: operation.saisi, etat: 'fauxPositif', attendu: operation.attendu }
    : { texte: operation.saisi, etat: 'enTrop' };
  return { mot, fauxPositif: true };
}

function classerManquant(operation, indiceFaute, fautes) {
  if (indiceFaute !== undefined) {
    const mot = { texte: '', etat: 'manquant', faute: fautes[indiceFaute], attendu: operation.attendu };
    return { mot, fauteRestante: indiceFaute };
  }
  return { mot: { texte: '', etat: 'manquant', attendu: operation.attendu }, fauxPositif: true };
}

const CLASSEURS = {
  juste: classerJuste,
  faux: classerMotErrone,
  enTrop: classerMotErrone,
  manquant: classerManquant,
};

/** Évalue les opérations d'alignement : états des mots, fautes corrigées, faux positifs. */
function lireOperations(operations, fautes) {
  const fautesParMot = indexerFautesParMot(fautes);
  const avecMotFaux = new Set(
    operations
      .filter((operation) => operation.type === 'faux' && fautesParMot.has(operation.indiceAttendu))
      .map((operation) => fautesParMot.get(operation.indiceAttendu)),
  );
  const corrigees = fautes.map(() => true);
  const manquantsAffiches = new Set();
  const mots = [];
  let fauxPositifs = 0;

  operations.forEach((operation, position) => {
    const indiceFaute = operation.type === 'enTrop'
      ? fauteVoisine(operations, position, fautesParMot)
      : fautesParMot.get(operation.indiceAttendu);
    const { mot, fauteRestante, fauxPositif } = CLASSEURS[operation.type](operation, indiceFaute, fautes);
    if (fauteRestante !== undefined) {
      corrigees[fauteRestante] = false;
    }
    if (fauxPositif) {
      fauxPositifs += 1;
    }
    // Un seul marqueur « manquant » par faute, et aucun si un mot faux la représente déjà.
    const marqueurInutile = mot.etat === 'manquant' && fauteRestante !== undefined
      && (avecMotFaux.has(fauteRestante) || manquantsAffiches.has(fauteRestante));
    if (mot.etat === 'manquant' && fauteRestante !== undefined) {
      manquantsAffiches.add(fauteRestante);
    }
    if (!marqueurInutile) {
      mots.push(mot);
    }
  });
  return { corrigees, fauxPositifs, mots };
}

/**
 * Compare le texte de l'élève au texte correct.
 * Les majuscules, les accents et la ponctuation comptent ; apostrophes et espaces sont normalisés.
 *
 * @param {{texteCorrect: string, fautes: Object[]}} item
 * @param {string} texteEleve Le texte tel que l'élève l'a laissé.
 * @returns {Evaluation}
 */
export function evaluer(item, texteEleve) {
  const operations = aligner(item.texteCorrect, texteEleve);
  const { corrigees, fauxPositifs, mots } = lireOperations(operations, item.fautes);
  return {
    fautes: item.fautes.map((faute, indice) => ({ faute, corrigee: corrigees[indice] })),
    restantes: corrigees.filter((corrigee) => !corrigee).length,
    fauxPositifs,
    mots,
  };
}

/**
 * Vrai si le texte est parfait (aucune faute restante, aucun mot juste modifié).
 * @param {Evaluation} evaluation
 * @returns {boolean}
 */
export function estParfait(evaluation) {
  return evaluation.restantes === 0 && evaluation.fauxPositifs === 0;
}

/**
 * Les réussites d'une vérification : fautes corrigées sur fautes à corriger, mots justes modifiés à tort en plus.
 * L'exercice compte celles de la première vérification : une erreur corrigée ensuite reste une erreur.
 * @param {{fautes: Object[]}} item
 * @param {Evaluation} evaluation
 * @returns {{reussis: number, total: number}}
 */
export function compterLesReussites(item, evaluation) {
  const reussis = evaluation.fautes.filter((entree) => entree.corrigee).length;
  return { reussis, total: item.fautes.length + evaluation.fauxPositifs };
}

/**
 * « Réussi » pour la répétition espacée : parfait dès la première vérification, sans le compte d'indice.
 * @param {Evaluation} evaluation
 * @param {number} verificationsRatees Vérifications déjà ratées avant celle-ci.
 * @returns {boolean}
 */
export function estReussiDuPremierCoup(evaluation, verificationsRatees) {
  return verificationsRatees === 0 && estParfait(evaluation);
}

/**
 * Le message de la première vérification : le compte, sans dire où sont les fautes.
 * @param {number} restantes Fautes pas encore corrigées.
 * @param {number} fauxPositifs Mots justes modifiés à tort.
 * @returns {string}
 */
export function messageDuCompte(restantes, fauxPositifs) {
  if (restantes === 0 && fauxPositifs > 0) {
    return 'Plus de faute cachée, mais tu as changé un mot qui était juste. Relis encore.';
  }
  if (restantes === 0) {
    return 'Plus aucune faute.';
  }
  return restantes === 1 ? 'Encore 1 faute.' : `Encore ${restantes} fautes.`;
}

/**
 * « 1 faute cachée », « 3 fautes cachées » : le nombre de fautes affiché à l'élève.
 * @param {number} nombre
 * @returns {string}
 */
export function texteNombreDeFautes(nombre) {
  return nombre === 1 ? '1 faute cachée' : `${nombre} fautes cachées`;
}

/**
 * Le texte entièrement correct, mot à mot, avec les mots qui portaient une faute repérés
 * (ils sont surlignés en menthe à l'affichage : la bonne forme a le dernier mot).
 * @param {{texteCorrect: string, fautes: Object[]}} item
 * @returns {Array<{texte: string, corrige: boolean}>}
 */
export function motsDuTexteCorrige(item) {
  const fautesParMot = indexerFautesParMot(item.fautes);
  return tokeniser(item.texteCorrect).map((texte, indice) => ({ texte, corrige: fautesParMot.has(indice) }));
}
