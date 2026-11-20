/**
 * Badges de régularité et de maîtrise.
 * Fonctions pures : ni DOM, ni stockage, ni horloge (la date est un paramètre).
 * Un badge gagné ne se perd jamais : on ne fait qu'en ajouter.
 */

import { FAMILLES } from './familles.js';
import { versJour } from './progression.js';

/** @typedef {import('./stockage.js').DonneesLexia} DonneesLexia */

/**
 * @typedef {Object} Badge
 * @property {string} id Identifiant stable : c'est une clé de sauvegarde, ne jamais le renommer.
 * @property {'regularite'|'maitrise'} groupe
 * @property {string} nom
 * @property {string} texte Phrase affichée une fois le badge gagné.
 * @property {number} [jours] Régularité : nombre de jours d'entraînement à atteindre.
 * @property {string[]} [familles] Maîtrise : clés des familles dont on compte les items acquis.
 * @property {number} [seuil] Maîtrise : nombre d'items acquis à atteindre.
 */

/** Les clés des familles d'un module (voir familles.js). */
function famillesDuModule(module) {
  return FAMILLES.filter((famille) => famille.module === module).map((famille) => famille.cle);
}

/** @type {Badge[]} */
export const BADGES = Object.freeze([
  {
    id: 'jours-3',
    groupe: 'regularite',
    nom: '3 jours',
    texte: '3 jours d\'entraînement. L\'habitude commence à s\'installer.',
    jours: 3,
  },
  {
    id: 'jours-7',
    groupe: 'regularite',
    nom: '7 jours',
    texte: '7 jours d\'entraînement. Chaque séance compte, même courte.',
    jours: 7,
  },
  {
    id: 'jours-15',
    groupe: 'regularite',
    nom: '15 jours',
    texte: '15 jours d\'entraînement. La régularité, c\'est ta force.',
    jours: 15,
  },
  {
    id: 'jours-30',
    groupe: 'regularite',
    nom: '30 jours',
    texte: '30 jours d\'entraînement. Un vrai rythme de travail.',
    jours: 30,
  },
  {
    id: 'jours-60',
    groupe: 'regularite',
    nom: '60 jours',
    texte: '60 jours d\'entraînement. Quelle belle constance.',
    jours: 60,
  },
  {
    id: 'maitrise-homophones',
    groupe: 'maitrise',
    nom: 'Reine des homophones',
    texte: 'Tu retiens durablement les homophones. Ta couronne est bien méritée.',
    familles: ['orthographe/homophones'],
    seuil: 15,
  },
  {
    id: 'maitrise-orthographe',
    groupe: 'maitrise',
    nom: 'Orthographe sûre',
    texte: 'Tu as bien retenu beaucoup de règles d\'orthographe.',
    familles: famillesDuModule('orthographe'),
    seuil: 40,
  },
  {
    id: 'maitrise-grammaire',
    groupe: 'maitrise',
    nom: 'Grammaire claire',
    texte: 'Les natures et les fonctions deviennent claires pour toi.',
    familles: famillesDuModule('grammaire'),
    seuil: 40,
  },
  {
    id: 'maitrise-vocabulaire',
    groupe: 'maitrise',
    nom: 'Vocabulaire riche',
    texte: 'Tes mots sont de plus en plus nombreux et précis.',
    familles: famillesDuModule('vocabulaire'),
    seuil: 40,
  },
  {
    id: 'maitrise-dictee',
    groupe: 'maitrise',
    nom: 'Dictée attentive',
    texte: 'Tu retiens les textes et leurs pièges d\'orthographe.',
    familles: famillesDuModule('dictee'),
    seuil: 10,
  },
  {
    id: 'maitrise-conjugaison',
    groupe: 'maitrise',
    nom: 'Conjugaison au point',
    texte: 'Tes tableaux de conjugaison sont bien en place.',
    familles: famillesDuModule('conjugaison'),
    seuil: 10,
  },
]);

/**
 * Nombre de jours distincts où l'élève s'est entraîné.
 * Le `Set` écarte les doublons qu'un import pourrait contenir.
 * @param {DonneesLexia} donnees
 * @returns {number}
 */
export function compterJoursEntrainement(donnees) {
  return new Set(donnees.meta.joursEntrainement).size;
}

/**
 * Nombre d'items acquis (`acquis: true`) appartenant aux familles données.
 * On ne compte pas par boîte : un item réussi du premier coup devient acquis sans passer par les boîtes 1 à 4.
 * @param {Object<string, {acquis?: boolean}>} repetition Les boîtes, indexées par id d'item.
 * @param {string[]} cles Clés des familles visées.
 * @returns {number}
 */
export function compterAcquis(repetition, cles) {
  const prefixes = FAMILLES.filter((famille) => cles.includes(famille.cle)).map(
    (famille) => famille.prefixeId,
  );
  return Object.entries(repetition).filter(
    ([id, etat]) => etat.acquis === true && prefixes.some((prefixe) => id.startsWith(prefixe)),
  ).length;
}

/**
 * Le badge est-il mérité par l'historique actuel ?
 * @param {Badge} badge
 * @param {DonneesLexia} donnees
 * @returns {boolean}
 */
function estMerite(badge, donnees) {
  if (badge.groupe === 'regularite') {
    return compterJoursEntrainement(donnees) >= badge.jours;
  }
  return compterAcquis(donnees.repetition, badge.familles) >= badge.seuil;
}

/**
 * Ids des badges mérités par l'historique, dans l'ordre du catalogue.
 * @param {DonneesLexia} donnees
 * @returns {string[]}
 */
export function badgesMerites(donnees) {
  return BADGES.filter((badge) => estMerite(badge, donnees)).map((badge) => badge.id);
}

/** Badges déjà attribués (`id` → jour d'attribution). Tolère une sauvegarde qui n'en a pas encore. */
function badgesAttribues(donnees) {
  return donnees.meta.badges ?? {};
}

/**
 * Ajoute à `meta.badges` les badges mérités et pas encore attribués, datés du jour de `date`.
 * Ne modifie pas `donnees`, n'écrase aucune date et ne retire rien.
 * @param {DonneesLexia} donnees
 * @param {Date} date
 * @returns {{donnees: DonneesLexia, nouveaux: Badge[]}}
 */
export function attribuerBadges(donnees, date) {
  const dejaAttribues = badgesAttribues(donnees);
  const nouveaux = BADGES.filter(
    (badge) => !Object.hasOwn(dejaAttribues, badge.id) && estMerite(badge, donnees),
  );
  const badges = { ...dejaAttribues };
  for (const badge of nouveaux) {
    badges[badge.id] = versJour(date);
  }
  return { donnees: { ...donnees, meta: { ...donnees.meta, badges } }, nouveaux };
}

/**
 * Jours d'entraînement qui manquent pour gagner un badge de régularité.
 * @param {Badge} badge
 * @param {DonneesLexia} donnees
 * @returns {number|null} `0` si le badge est mérité ; `null` pour la maîtrise (aucun chiffre affiché).
 */
export function restantPourGagner(badge, donnees) {
  if (badge.groupe !== 'regularite') {
    return null;
  }
  return Math.max(0, badge.jours - compterJoursEntrainement(donnees));
}

/**
 * Tous les badges du catalogue, avec leur état : gagné (déjà attribué) ou mérité maintenant.
 * Ne lit que les données : rien n'est écrit ici.
 * @param {DonneesLexia} donnees
 * @returns {{badge: Badge, gagne: boolean}[]}
 */
export function badgesAffiches(donnees) {
  const dejaAttribues = badgesAttribues(donnees);
  return BADGES.map((badge) => ({
    badge,
    gagne: Object.hasOwn(dejaAttribues, badge.id) || estMerite(badge, donnees),
  }));
}
