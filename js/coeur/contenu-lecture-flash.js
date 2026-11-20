// Règles des items `flash` de `lecture.json` (une présentation éclair : mot ou groupe de mots, 3 leurres proches).
// Contrat : .equipe/ressources/brief-lot3-2.md §1.1.

import { estTexteNonVide, reglesCompetence, reglesTextes } from './contenu-outils.js';
import { distanceLettres } from './texte-alignement.js';
import { formeComparable, sontTousDifferents } from './contenu-vocabulaire-outils.js';

const FORMES = ['mot', 'groupe'];
const LETTRES_D_UN_MOT = { min: 3, max: 9 };
const MOTS_D_UN_GROUPE = { min: 2, max: 4 };
const NOMBRE_DE_LEURRES = 3;
// Un leurre doit ressembler à la cible, sinon l'exercice ne mesure plus la lecture.
const ECART_DE_LONGUEUR_MAX = 2;
const DISTANCE_D_EDITION_MAX = 3;
const MOTS_CHANGES = { min: 1, max: 2 };

function motsDe(texte) {
  return texte.trim().split(/\s+/);
}

function reglesCible(cible, forme) {
  const mots = motsDe(cible);
  if (forme === 'mot') {
    const lettres = cible.trim().length;
    const estUnMotCourt = mots.length === 1 && lettres >= LETTRES_D_UN_MOT.min && lettres <= LETTRES_D_UN_MOT.max;
    const attendu = `un seul mot de ${LETTRES_D_UN_MOT.min} à ${LETTRES_D_UN_MOT.max} lettres`;
    return estUnMotCourt ? [] : [`cible : ${attendu} attendu`];
  }
  const estUnGroupe = mots.length >= MOTS_D_UN_GROUPE.min && mots.length <= MOTS_D_UN_GROUPE.max;
  return estUnGroupe ? [] : [`cible : un groupe de ${MOTS_D_UN_GROUPE.min} à ${MOTS_D_UN_GROUPE.max} mots attendu`];
}

function reglesProximiteDuMot(cible, leurre) {
  const [motCible, motLeurre] = [formeComparable(cible), formeComparable(leurre)];
  const regles = [];
  if (Math.abs(motCible.length - motLeurre.length) > ECART_DE_LONGUEUR_MAX) {
    regles.push(`longueur trop différente de la cible (écart de ${ECART_DE_LONGUEUR_MAX} lettres au plus)`);
  }
  if (distanceLettres(motCible, motLeurre) > DISTANCE_D_EDITION_MAX) {
    regles.push(`trop éloigné de la cible (${DISTANCE_D_EDITION_MAX} lettres changées au plus)`);
  }
  return regles;
}

function reglesProximiteDuGroupe(motsCible, motsLeurre) {
  const changes = motsCible.filter((mot, index) => formeComparable(mot) !== formeComparable(motsLeurre[index])).length;
  return changes >= MOTS_CHANGES.min && changes <= MOTS_CHANGES.max
    ? []
    : [`${changes} mot(s) changé(s), attendu ${MOTS_CHANGES.min} à ${MOTS_CHANGES.max}`];
}

function reglesUnLeurre(cible, leurre, forme) {
  const [motsCible, motsLeurre] = [motsDe(cible), motsDe(leurre)];
  const regles = motsLeurre.length !== motsCible.length
    ? [`doit avoir ${motsCible.length} mot(s), comme la cible`]
    : (forme === 'mot' ? reglesProximiteDuMot(cible, leurre) : reglesProximiteDuGroupe(motsCible, motsLeurre));
  return regles.map((regle) => `leurre « ${leurre} » : ${regle}`);
}

function reglesLeurres({ cible, leurres, forme }) {
  if (!Array.isArray(leurres) || leurres.length !== NOMBRE_DE_LEURRES || !leurres.every(estTexteNonVide)) {
    return [`leurres doit contenir ${NOMBRE_DE_LEURRES} propositions non vides`];
  }
  // Deux textes identiques sont aussi égaux une fois normalisés : une seule comparaison suffit.
  const regles = sontTousDifferents([cible, ...leurres])
    ? []
    : ['leurres : la cible et les leurres doivent tous être différents (même normalisés, casse comprise)'];
  return [...regles, ...leurres.flatMap((leurre) => reglesUnLeurre(cible, leurre, forme))];
}

/**
 * Règles propres à un item de type `flash` (les règles communes sont dans `contenu-lecture.js`).
 * @param {Object} item
 * @returns {string[]}
 */
export function reglesFlash(item) {
  const regles = [...reglesCompetence(item), ...reglesTextes(item, ['cible', 'indice', 'explication'])];
  if (!FORMES.includes(item.forme)) {
    return [...regles, `forme doit être l'une de : ${FORMES.join(', ')}`];
  }
  if (!estTexteNonVide(item.cible)) {
    return regles;
  }
  return [...regles, ...reglesCible(item.cible, item.forme), ...reglesLeurres(item)];
}
