// Validation des items de dictée : `dictee-audio.json` et `dictee-detective.json` (cahier §7.1, §8).

import { motSansPonctuation, normaliserPourComparaison, tokeniser } from './texte.js';
import { decrire, estObjet, estTexteNonVide, reglesCommunes, reglesTextes } from './contenu-outils.js';

const PHRASES_MIN = 3;
const PHRASES_MAX = 6;

// Un mot qui se termine par . ! ? ou … (suivi éventuellement de » ou ") termine une phrase.
const FIN_DE_PHRASE = /[.!?…][»")]*$/;

/** Nombre maximal de fautes dans une même phrase, selon le niveau. */
const FAUTES_MAX_PAR_PHRASE = { 1: 1, 2: 2, 3: 3 };

/**
 * @typedef {Object} PiegeDictee
 * @property {string} mot          mot piège, tel qu'il est écrit dans la phrase
 * @property {string} competence   étiquette utilisée par le carnet et la répétition
 * @property {string} indice       type d'erreur, montré au premier toucher
 * @property {string} explication  règle en une phrase, niveau CM2
 */

/**
 * @typedef {Object} ItemDicteeAudio
 * @property {string} id
 * @property {number} niveau  1, 2 ou 3
 * @property {string} theme
 * @property {{ texte: string, pieges: PiegeDictee[] }[]} phrases  de 3 à 6 phrases
 */

/**
 * @typedef {Object} FauteDetective
 * @property {number} position  index du premier mot concerné dans `tokeniser(texteCorrect)`
 * @property {string} fautif    forme erronée affichée à l'élève
 * @property {string} correct   mot(s) du texte correct à partir de `position`,
 *   sans la ponctuation finale. Il peut compter plusieurs mots (« quelle que »),
 *   la plage commence alors à `position` et couvre autant de mots que `correct`.
 * @property {string} competence
 * @property {string} indice
 * @property {string} explication
 */

/**
 * @typedef {Object} ItemDicteeDetective
 * @property {string} id
 * @property {number} niveau
 * @property {string} titre
 * @property {string} texteCorrect
 * @property {FauteDetective[]} fautes  non vide ; au plus 1, 2 ou 3 par phrase selon le niveau
 */

// --- Dictée audio ---

/** Mots d'un piège, sans ponctuation ni variante d'apostrophe (un piège peut compter plusieurs mots). */
function motsDuPiege(mot) {
  return tokeniser(mot).map(motSansPonctuation);
}

/** Vrai si `suite` apparaît telle quelle, mot après mot, dans `mots`. */
function contientLaSuite(mots, suite) {
  for (let debut = 0; debut + suite.length <= mots.length; debut++) {
    if (suite.every((mot, decalage) => mots[debut + decalage] === mot)) {
      return true;
    }
  }
  return false;
}

function reglesPiege(piege, numeroPhrase, motsDeLaPhrase) {
  const lieu = `phrase ${numeroPhrase}`;
  if (!estObjet(piege)) {
    return [`${lieu} : un piège doit être un objet`];
  }
  const regles = reglesTextes(piege, ['mot', 'competence', 'indice', 'explication'])
    .map((regle) => `${lieu} : piège ${regle}`);
  if (estTexteNonVide(piege.mot) && !contientLaSuite(motsDeLaPhrase, motsDuPiege(piege.mot))) {
    regles.push(`${lieu} : le piège « ${piege.mot} » ne figure pas dans la phrase`);
  }
  return regles;
}

function reglesPhraseDictee(phrase, numero) {
  if (!estObjet(phrase) || !estTexteNonVide(phrase.texte)) {
    return [`phrase ${numero} : texte manquant ou vide`];
  }
  if (!Array.isArray(phrase.pieges)) {
    return [`phrase ${numero} : pieges doit être une liste`];
  }
  const motsDeLaPhrase = tokeniser(phrase.texte).map(motSansPonctuation);
  return phrase.pieges.flatMap((piege) => reglesPiege(piege, numero, motsDeLaPhrase));
}

/**
 * Valide un item de `dictee-audio.json`.
 * @param {*} item
 * @returns {string[]} règles violées, vide si l'item est valide
 */
export function validerDicteeAudio(item) {
  if (!estObjet(item)) {
    return ['(sans id) : l\'item doit être un objet'];
  }
  const regles = [...reglesCommunes(item), ...reglesTextes(item, ['theme'])];
  const phrases = item.phrases;
  if (!Array.isArray(phrases) || phrases.length < PHRASES_MIN || phrases.length > PHRASES_MAX) {
    regles.push(`phrases : de ${PHRASES_MIN} à ${PHRASES_MAX} phrases attendues`);
  } else {
    phrases.forEach((phrase, indice) => regles.push(...reglesPhraseDictee(phrase, indice + 1)));
  }
  return decrire(item, regles);
}

// --- Dictée détective ---

/** Pour chaque mot, le numéro de la phrase à laquelle il appartient. */
function numerosDePhrase(mots) {
  let numero = 0;
  return mots.map((mot) => {
    const numeroDuMot = numero;
    if (FIN_DE_PHRASE.test(mot)) {
      numero += 1;
    }
    return numeroDuMot;
  });
}

/**
 * Nombre de mots du texte correct couverts par une faute : la plage commence
 * à `position` et compte autant de mots que `correct` (1 pour « mangent »,
 * 2 pour « quelle que »).
 * @param {FauteDetective} faute
 * @returns {number}
 */
export function largeurDeLaFaute(faute) {
  return estTexteNonVide(faute.correct) ? tokeniser(faute.correct).length : 1;
}

function estPositionDansLeTexte(position, mots) {
  return Number.isInteger(position) && position >= 0 && position < mots.length;
}

/** Règles d'une seule faute : champs, position, correspondance avec le texte correct. */
function reglesFaute(faute, numero, mots) {
  const lieu = `faute ${numero}`;
  if (!estObjet(faute)) {
    return [`${lieu} : doit être un objet`];
  }
  const regles = reglesTextes(faute, ['fautif', 'correct', 'competence', 'indice', 'explication'])
    .map((regle) => `${lieu} : ${regle}`);
  if (!estPositionDansLeTexte(faute.position, mots)) {
    regles.push(`${lieu} : position hors du texte (0 à ${mots.length - 1})`);
    return regles;
  }
  if (estTexteNonVide(faute.correct)) {
    const motsDuTexte = mots.slice(faute.position, faute.position + largeurDeLaFaute(faute)).join(' ');
    if (motSansPonctuation(motsDuTexte) !== normaliserPourComparaison(faute.correct)) {
      regles.push(`${lieu} : « ${faute.correct} » ne correspond pas au texte à la position ${faute.position}`);
    }
  }
  if (faute.fautif === faute.correct) {
    regles.push(`${lieu} : fautif identique à correct`);
  }
  return regles;
}

/** Règles de plages : deux fautes ne peuvent pas couvrir le même mot. */
function reglesPlagesDisjointes(fautes, mots) {
  const regles = [];
  const positionsPrises = new Set();
  for (const faute of fautes) {
    if (!estObjet(faute) || !estPositionDansLeTexte(faute.position, mots)) {
      continue;
    }
    for (let i = faute.position; i < faute.position + largeurDeLaFaute(faute); i++) {
      if (positionsPrises.has(i)) {
        regles.push(`la position ${i} est utilisée par deux fautes`);
      }
      positionsPrises.add(i);
    }
  }
  return regles;
}

/** Nombre de fautes dans chaque phrase : Map numéro de phrase (0, 1…) vers nombre. */
function compterFautesParPhrase(fautes, mots) {
  const numeros = numerosDePhrase(mots);
  const fautesParPhrase = new Map();
  for (const faute of fautes) {
    if (estObjet(faute) && estPositionDansLeTexte(faute.position, mots)) {
      const phrase = numeros[faute.position];
      fautesParPhrase.set(phrase, (fautesParPhrase.get(phrase) ?? 0) + 1);
    }
  }
  return fautesParPhrase;
}

/** Règles sur l'ensemble des fautes : plages disjointes, nombre par phrase selon le niveau. */
function reglesRepartitionDesFautes(fautes, mots, niveau) {
  const regles = reglesPlagesDisjointes(fautes, mots);
  const maximum = FAUTES_MAX_PAR_PHRASE[niveau];
  for (const [phrase, nombre] of compterFautesParPhrase(fautes, mots)) {
    if (maximum !== undefined && nombre > maximum) {
      regles.push(`${nombre} fautes dans la phrase ${phrase + 1} (maximum ${maximum} au niveau ${niveau})`);
    }
  }
  return regles;
}

/**
 * Valide un item de `dictee-detective.json`.
 * @param {*} item
 * @returns {string[]} règles violées, vide si l'item est valide
 */
export function validerDicteeDetective(item) {
  if (!estObjet(item)) {
    return ['(sans id) : l\'item doit être un objet'];
  }
  const regles = [...reglesCommunes(item), ...reglesTextes(item, ['titre', 'texteCorrect'])];
  if (!Array.isArray(item.fautes) || item.fautes.length === 0) {
    regles.push('fautes doit être une liste non vide');
  } else if (estTexteNonVide(item.texteCorrect)) {
    const mots = tokeniser(item.texteCorrect);
    item.fautes.forEach((faute, indice) => regles.push(...reglesFaute(faute, indice + 1, mots)));
    regles.push(...reglesRepartitionDesFautes(item.fautes, mots, item.niveau));
  }
  return decrire(item, regles);
}
