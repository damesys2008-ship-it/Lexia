/**
 * Règle de conflit de la sauvegarde en ligne : que faire quand la progression de cet appareil
 * et celle du compte sont différentes ? Fonctions pures, sans réseau.
 *
 * Principe : on n'écrase jamais une progression en silence. Quand les deux côtés ont du travail
 * et qu'ils diffèrent, c'est l'élève qui choisit (l'écran montre les deux résumés).
 */

/** Ce que l'écran doit faire de la sauvegarde en ligne. */
export const DECISIONS = {
  RIEN: 'rien',
  ENVOYER: 'envoyer',
  RECUPERER: 'recuperer',
  CHOISIR: 'choisir',
};

/**
 * @typedef {Object} ResumeProgression
 * @property {number} etoiles Étoiles gagnées au total.
 * @property {number} joursEntrainement Nombre de jours où l'élève s'est entraîné.
 * @property {number} exercices Nombre de séances dans l'historique.
 * @property {string|null} derniereDate Jour de la dernière séance (AAAA-MM-JJ), `null` si aucune.
 */

/** @returns {ResumeProgression} Le résumé d'une progression vide. */
function resumeVide() {
  return { etoiles: 0, joursEntrainement: 0, exercices: 0, derniereDate: null };
}

/**
 * Résume la progression pour la montrer à l'élève : assez pour reconnaître son travail, sans le détail.
 * @param {Object|null|undefined} donnees Données de Lexia (schéma de `stockage.js`), ou rien.
 * @returns {ResumeProgression}
 */
export function resumerProgression(donnees) {
  if (donnees === null || typeof donnees !== 'object') {
    return resumeVide();
  }
  return {
    etoiles: Number.isInteger(donnees.etoiles) ? donnees.etoiles : 0,
    joursEntrainement: Array.isArray(donnees.meta?.joursEntrainement) ? donnees.meta.joursEntrainement.length : 0,
    exercices: Array.isArray(donnees.historique) ? donnees.historique.length : 0,
    derniereDate: typeof donnees.meta?.derniereSeance === 'string' ? donnees.meta.derniereSeance : null,
  };
}

/**
 * @param {ResumeProgression} resume
 * @returns {boolean} Vrai si l'élève n'a encore rien gagné ni joué.
 */
export function estVide(resume) {
  return resume.etoiles === 0 && resume.joursEntrainement === 0 && resume.exercices === 0;
}

/**
 * Égalité profonde de deux valeurs JSON, sans tenir compte de l'ordre des clés
 * (la base ne garde pas l'ordre des clés d'un objet JSON).
 * @param {*} a
 * @param {*} b
 * @returns {boolean}
 */
function sontIdentiques(a, b) {
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') {
    return a === b;
  }
  if (Array.isArray(a) !== Array.isArray(b)) {
    return false;
  }
  const clesA = Object.keys(a);
  if (clesA.length !== Object.keys(b).length) {
    return false;
  }
  return clesA.every((cle) => Object.hasOwn(b, cle) && sontIdentiques(a[cle], b[cle]));
}

/**
 * @param {ResumeProgression} resumeLocal
 * @param {ResumeProgression} resumeDistant
 * @param {string} decision Une valeur de `DECISIONS`.
 * @returns {{decision: string, local: ResumeProgression, distant: ResumeProgression}}
 */
function reponse(resumeLocal, resumeDistant, decision) {
  return { decision, local: resumeLocal, distant: resumeDistant };
}

/**
 * Décide quoi faire de la sauvegarde en ligne. Les deux jeux de données sont supposés déjà
 * migrés à la version courante (ce que renvoie `lireDistante` de `synchro.js`).
 * @param {{local: Object, distant: Object|null}} donnees `distant` vaut `null` quand le compte n'a rien envoyé.
 * @returns {{decision: string, local: ResumeProgression, distant: ResumeProgression}}
 *   `decision` : `rien`, `envoyer`, `recuperer` ou `choisir` ; les deux résumés servent à l'écran de choix.
 */
export function decider({ local, distant }) {
  const resumeLocal = resumerProgression(local);
  const resumeDistant = resumerProgression(distant);
  const localVide = estVide(resumeLocal);
  const distantVide = estVide(resumeDistant);

  if (localVide && distantVide) {
    return reponse(resumeLocal, resumeDistant, DECISIONS.RIEN);
  }
  if (distantVide) {
    return reponse(resumeLocal, resumeDistant, DECISIONS.ENVOYER);
  }
  if (localVide) {
    return reponse(resumeLocal, resumeDistant, DECISIONS.RECUPERER);
  }
  const decision = sontIdentiques(local, distant) ? DECISIONS.RIEN : DECISIONS.CHOISIR;
  return reponse(resumeLocal, resumeDistant, decision);
}
