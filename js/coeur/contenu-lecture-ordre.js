// Règles des items `ordre` de `lecture.json` (paragraphes donnés dans le bon ordre, l'écran les mélange).
// Contrat : .equipe/ressources/brief-lot3-2.md §1.1.

import { estListeDeTextes, reglesTextes } from './contenu-outils.js';
import { sontTousDifferents } from './contenu-vocabulaire-outils.js';
import { compterMotsUtiles } from './contenu-lecture-texte.js';

const COMPETENCES_ORDRE = ['ordre-chronologie', 'ordre-recette', 'ordre-cause'];
const PARAGRAPHES_PAR_NIVEAU = { 1: 4, 2: 5, 3: 6 };
const PHRASES_PAR_PARAGRAPHE = { min: 1, max: 3 };
const MOTS_EN_TOUT = { min: 60, max: 140 };
// Fin de phrase : . ! ? … (éventuellement suivi d'un guillemet fermant),
// puis une majuscule, « ou la fin du paragraphe.
// Une abréviation comme « M. Dupont » compte donc pour une coupure : on la reformule.
const FIN_DE_PHRASE = /[.!?…](?:\s*»)?(?=\s+[A-ZÀ-ÖØ-Þ«]|\s*$)/gu;

function compterPhrases(paragraphe) {
  return (paragraphe.match(FIN_DE_PHRASE) ?? []).length;
}

function reglesPhrasesParParagraphe(paragraphes) {
  return paragraphes
    .map((paragraphe, index) => ({ nombre: compterPhrases(paragraphe), numero: index + 1 }))
    .filter(({ nombre }) => nombre < PHRASES_PAR_PARAGRAPHE.min || nombre > PHRASES_PAR_PARAGRAPHE.max)
    .map(({ nombre, numero }) => {
      const attendu = `${PHRASES_PAR_PARAGRAPHE.min} à ${PHRASES_PAR_PARAGRAPHE.max}`;
      return `paragraphe ${numero} : ${nombre} phrase(s), attendu ${attendu}`;
    });
}

function reglesMotsEnTout(paragraphes) {
  const mots = paragraphes.reduce((total, paragraphe) => total + compterMotsUtiles(paragraphe), 0);
  return mots < MOTS_EN_TOUT.min || mots > MOTS_EN_TOUT.max
    ? [`histoire de ${mots} mots, attendu ${MOTS_EN_TOUT.min} à ${MOTS_EN_TOUT.max}`]
    : [];
}

function reglesParagraphes(item) {
  const { paragraphes, niveau } = item;
  if (!estListeDeTextes(paragraphes) || paragraphes.length === 0) {
    return ['paragraphes doit être une liste de textes non vides'];
  }
  const regles = [];
  const attendu = PARAGRAPHES_PAR_NIVEAU[niveau];
  if (attendu !== undefined && paragraphes.length !== attendu) {
    regles.push(`paragraphes doit en contenir ${attendu} au niveau ${niveau}, pas ${paragraphes.length}`);
  }
  if (!sontTousDifferents(paragraphes)) {
    regles.push('paragraphes : deux paragraphes identiques rendent l\'ordre impossible à vérifier');
  }
  return [...regles, ...reglesPhrasesParParagraphe(paragraphes), ...reglesMotsEnTout(paragraphes)];
}

/**
 * Règles propres à un item de type `ordre` (les règles communes sont dans `contenu-lecture.js`).
 * @param {Object} item
 * @returns {string[]}
 */
export function reglesOrdre(item) {
  const regles = reglesTextes(item, ['titre', 'indice', 'explication']);
  if (!COMPETENCES_ORDRE.includes(item.competence)) {
    regles.push(`competence doit être l'une de : ${COMPETENCES_ORDRE.join(', ')}`);
  }
  return [...regles, ...reglesParagraphes(item)];
}
