// Validation des items de `conjugaison.json` (cahier §7.2, §8).

import { decrire, estObjet, estTexteNonVide, reglesCommunes, reglesTextes } from './contenu-outils.js';

const NIVEAU_PLUS_QUE_PARFAIT = 3;
const SIX_PERSONNES = ['je', 'tu', 'il', 'nous', 'vous', 'ils'];

/**
 * Personnes attendues dans `formes` selon le temps. Les clés de cet objet
 * sont les identifiants de temps acceptés dans `conjugaison.json`.
 * @type {Object<string, string[]>}
 */
export const PERSONNES_PAR_TEMPS = {
  present: SIX_PERSONNES,
  imparfait: SIX_PERSONNES,
  futur: SIX_PERSONNES,
  'passe-compose': SIX_PERSONNES,
  'conditionnel-present': SIX_PERSONNES,
  'plus-que-parfait': SIX_PERSONNES,
  'passe-simple': ['il', 'ils'],
  'imperatif-present': ['tu', 'nous', 'vous'],
};

/**
 * @typedef {Object} ItemConjugaison
 * @property {string} id
 * @property {number} niveau
 * @property {string} verbe        infinitif
 * @property {string} temps        une clé de `PERSONNES_PAR_TEMPS`
 * @property {string} competence
 * @property {Object<string, string>} formes     une forme par personne du temps
 * @property {Object<string, string>} radicaux   début de chaque forme ('' = écrire la forme entière)
 * @property {Object<string, string[]>} variantes  formes alternatives acceptées, par personne
 * @property {string} explication
 */

// --- Conjugaison ---

/** Règles sur les clés d'un objet indexé par personne : ni manquante, ni en trop. */
function reglesPersonnes(objet, personnes, nom) {
  if (!estObjet(objet)) {
    return [`${nom} doit être un objet`];
  }
  const manquantes = personnes.filter((personne) => !(personne in objet));
  const enTrop = Object.keys(objet).filter((personne) => !personnes.includes(personne));
  return [
    ...manquantes.map((personne) => `${nom} : « ${personne} » manquant`),
    ...enTrop.map((personne) => `${nom} : « ${personne} » inattendu pour ce temps`),
  ];
}

function reglesFormes(item, personnes) {
  const regles = reglesPersonnes(item.formes, personnes, 'formes');
  if (regles.length > 0) {
    return regles;
  }
  return personnes
    .filter((personne) => !estTexteNonVide(item.formes[personne]))
    .map((personne) => `formes : « ${personne} » vide`);
}

function reglesRadicaux(item, personnes) {
  const regles = reglesPersonnes(item.radicaux, personnes, 'radicaux');
  if (regles.length > 0 || !estObjet(item.formes)) {
    return regles;
  }
  for (const personne of personnes) {
    const radical = item.radicaux[personne];
    const forme = item.formes[personne];
    if (typeof radical !== 'string' || typeof forme !== 'string' || !forme.startsWith(radical)) {
      regles.push(`radicaux : « ${radical} » n'est pas le début de la forme « ${forme} » (${personne})`);
    } else if (radical !== '' && radical === forme) {
      // Au niveau B, la terminaison à taper serait vide : le radical doit être plus court que la forme.
      regles.push(`radicaux : « ${radical} » est la forme entière, il doit être plus court ou vide (${personne})`);
    }
  }
  return regles;
}

function reglesVariantes(item, personnes) {
  if (!estObjet(item.variantes)) {
    return ['variantes doit être un objet (vide s\'il n\'y en a pas)'];
  }
  const regles = [];
  for (const [personne, formes] of Object.entries(item.variantes)) {
    const formesValides = Array.isArray(formes) && formes.length > 0 && formes.every(estTexteNonVide);
    if (!personnes.includes(personne)) {
      regles.push(`variantes : « ${personne} » inattendu pour ce temps`);
    } else if (!formesValides) {
      regles.push(`variantes : « ${personne} » doit être une liste de formes non vides`);
    }
  }
  return regles;
}

/**
 * Valide un item de `conjugaison.json`.
 * @param {*} item
 * @returns {string[]} règles violées, vide si l'item est valide
 */
export function validerConjugaison(item) {
  if (!estObjet(item)) {
    return ['(sans id) : l\'item doit être un objet'];
  }
  const regles = [
    ...reglesCommunes(item),
    ...reglesTextes(item, ['verbe', 'competence', 'explication']),
  ];
  const personnes = Object.hasOwn(PERSONNES_PAR_TEMPS, item.temps) ? PERSONNES_PAR_TEMPS[item.temps] : undefined;
  if (personnes === undefined) {
    regles.push(`temps inconnu : « ${item.temps} »`);
    return decrire(item, regles);
  }
  if (item.temps === 'plus-que-parfait' && item.niveau !== NIVEAU_PLUS_QUE_PARFAIT) {
    regles.push(`le plus-que-parfait est réservé au niveau ${NIVEAU_PLUS_QUE_PARFAIT}`);
  }
  regles.push(
    ...reglesFormes(item, personnes),
    ...reglesRadicaux(item, personnes),
    ...reglesVariantes(item, personnes),
  );
  return decrire(item, regles);
}
