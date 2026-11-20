// Règles des questions d'un item `texte` (5 à 8 questions de type ecrit, deviner et mot).
// Contrat : .equipe/ressources/brief-lot3-2.md §1.1.

import {
  estListeDeTextes, estObjet, estTexteNonVide, reglesCompetence, reglesTextes,
} from './contenu-outils.js';
import { compterMotEntier, formeComparable, sontTousDifferents } from './contenu-vocabulaire-outils.js';

export const TYPES_QUESTION = ['ecrit', 'deviner', 'mot'];

const QUESTIONS_PAR_TEXTE = { min: 5, max: 8 };
const CHOIX_PAR_NIVEAU = { 1: { min: 3, max: 3 }, 2: { min: 3, max: 4 }, 3: { min: 3, max: 4 } };
// Au-delà, l'élève devine en choisissant toujours la première proposition.
const PART_MAX_DE_LA_PREMIERE_POSITION = 0.6;

function reglesChoix(question, niveau) {
  const nombre = CHOIX_PAR_NIVEAU[niveau];
  const { choix, reponse } = question;
  if (nombre === undefined) {
    return [];
  }
  if (!estListeDeTextes(choix) || choix.length < nombre.min || choix.length > nombre.max) {
    const attendu = nombre.min === nombre.max ? `${nombre.min}` : `${nombre.min} à ${nombre.max}`;
    return [`choix doit contenir ${attendu} propositions non vides`];
  }
  const regles = [];
  if (!sontTousDifferents(choix)) {
    regles.push('choix : les propositions doivent toutes être différentes');
  }
  const occurrences = estTexteNonVide(reponse)
    ? choix.filter((proposition) => formeComparable(proposition) === formeComparable(reponse)).length
    : 0;
  if (occurrences !== 1) {
    regles.push('reponse doit être présente une seule fois dans choix');
  }
  return regles;
}

function reglesPreuve(question, phrases) {
  const { preuve } = question;
  return Number.isInteger(preuve) && preuve >= 0 && preuve < phrases.length
    ? []
    : [`preuve doit être un entier de 0 à ${phrases.length - 1} (index de la phrase)`];
}

function reglesMot(question, phrases) {
  const { mot, choix, preuve } = question;
  if (!estTexteNonVide(mot)) {
    return ['mot manquant ou vide'];
  }
  const regles = [];
  const phrasePreuve = phrases[preuve];
  if (typeof phrasePreuve === 'string' && compterMotEntier(phrasePreuve, mot) !== 1) {
    regles.push(`mot « ${mot} » doit apparaître une seule fois, comme mot entier, dans la phrase preuve`);
  }
  if (Array.isArray(choix)) {
    choix
      .filter((definition) => typeof definition === 'string' && compterMotEntier(definition, mot) > 0)
      .forEach((definition) => regles.push(`choix : la définition « ${definition} » contient le mot « ${mot} »`));
  }
  return regles;
}

function reglesQuestion(question, contexte) {
  if (!estObjet(question)) {
    return ['la question doit être un objet'];
  }
  if (!TYPES_QUESTION.includes(question.type)) {
    return [`type de question inconnu : « ${question.type} »`];
  }
  return [
    ...reglesCompetence(question),
    ...reglesTextes(question, ['question', 'indice', 'explication']),
    ...reglesChoix(question, contexte.niveau),
    ...reglesPreuve(question, contexte.phrases),
    ...(question.type === 'mot' ? reglesMot(question, contexte.phrases) : []),
  ];
}

function reglesTypesPresents(questions) {
  return TYPES_QUESTION
    .filter((type) => !questions.some((question) => estObjet(question) && question.type === type))
    .map((type) => `il manque une question de type « ${type} »`);
}

function reglesPositionsDesReponses(questions) {
  const avecChoix = questions.filter((question) => estObjet(question) && estListeDeTextes(question.choix)
    && question.choix.length > 0 && estTexteNonVide(question.reponse));
  const enTete = avecChoix
    .filter((question) => formeComparable(question.choix[0]) === formeComparable(question.reponse)).length;
  if (avecChoix.length > 0 && enTete / avecChoix.length > PART_MAX_DE_LA_PREMIERE_POSITION) {
    return [`la bonne réponse est en tête ${enTete} fois sur ${avecChoix.length} : varier les positions`];
  }
  return [];
}

/**
 * Règles des questions d'un texte.
 * @param {{questions: *, niveau: number}} texte
 * @param {string[]} phrases  toutes les phrases du texte, à plat (la preuve est un index dans cette liste)
 * @returns {string[]}
 */
export function reglesQuestions({ questions, niveau }, phrases) {
  const nombre = Array.isArray(questions) ? questions.length : 0;
  if (nombre < QUESTIONS_PAR_TEXTE.min || nombre > QUESTIONS_PAR_TEXTE.max) {
    return [`questions doit contenir ${QUESTIONS_PAR_TEXTE.min} à ${QUESTIONS_PAR_TEXTE.max} questions`];
  }
  const regles = questions.flatMap((question, index) => (
    reglesQuestion(question, { niveau, phrases }).map((regle) => `question ${index + 1} : ${regle}`)
  ));
  return [...regles, ...reglesTypesPresents(questions), ...reglesPositionsDesReponses(questions)];
}
