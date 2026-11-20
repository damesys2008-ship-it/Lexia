// Les phrases des pages « Mon compte » et « Quelle progression garder ? » : fonctions pures, testées sans navigateur.
// Espaces insécables (U+00A0) avant `: ; ! ?` et dans les « ».

import { DECISIONS, decider } from '../../coeur/synchro-conflit.js';
import { ESPACE_INSECABLE } from '../../coeur/texte.js';

export const MESSAGE_HORS_LIGNE = `Hors ligne${ESPACE_INSECABLE}: ta progression est sur cet appareil.`;
export const MESSAGE_PROGRESSION_SUR_L_APPAREIL = 'Ta progression reste sur cet appareil.';

/** Où en est la sauvegarde en ligne, vue par l'élève. */
export const ETATS_SAUVEGARDE = {
  A_JOUR: 'a-jour',
  EN_ATTENTE: 'en-attente',
  HORS_LIGNE: 'hors-ligne',
  INDISPONIBLE: 'indisponible',
};

/**
 * Compare cet appareil et le compte : identiques = à jour, sinon l'appareil a du nouveau qui n'est pas encore parti.
 * @param {{local: Object, distant: Object|null}} progressions Données de Lexia (`distant` : `null` si le compte est vide).
 * @returns {string} `A_JOUR` ou `EN_ATTENTE`.
 */
export function trouverEtatSauvegarde({ local, distant }) {
  const identiques = decider({ local, distant }).decision === DECISIONS.RIEN;
  return identiques ? ETATS_SAUVEGARDE.A_JOUR : ETATS_SAUVEGARDE.EN_ATTENTE;
}

/**
 * Les deux phrases de l'état de la sauvegarde : ce qui se passe, puis ce que ça change pour l'élève.
 * @param {string} etat Une valeur de `ETATS_SAUVEGARDE`.
 * @param {string|null} misAJour Date ISO de la dernière sauvegarde du compte.
 * @param {string} [fuseau]
 * @returns {{titre: string, detail: string}}
 */
export function decrireEtatSauvegarde(etat, misAJour, fuseau) {
  if (etat === ETATS_SAUVEGARDE.A_JOUR && misAJour === null) {
    return {
      titre: "Tu n'as rien à sauvegarder pour l'instant.",
      detail: 'Dès que tu joueras, ta progression partira dans ton compte.',
    };
  }
  if (etat === ETATS_SAUVEGARDE.A_JOUR) {
    return { titre: 'Ta progression est sauvegardée.', detail: decrireLaDerniereSauvegarde(misAJour, fuseau) };
  }
  if (etat === ETATS_SAUVEGARDE.EN_ATTENTE) {
    return {
      titre: 'Ta sauvegarde se met à jour.',
      detail: 'Ce que tu viens de faire partira dans le compte dès que possible.',
    };
  }
  if (etat === ETATS_SAUVEGARDE.HORS_LIGNE) {
    return { titre: 'Tu es hors ligne.', detail: MESSAGE_PROGRESSION_SUR_L_APPAREIL };
  }
  return { titre: 'Je ne vois pas ta sauvegarde pour l\'instant.', detail: MESSAGE_PROGRESSION_SUR_L_APPAREIL };
}

/** « 1 étoile », « 12 étoiles ». */
function compter(nombre, singulier, pluriel) {
  return `${nombre} ${nombre > 1 ? pluriel : singulier}`;
}

/**
 * « 12 étoiles, 3 jours d'entraînement, 8 exercices » : assez pour reconnaître son travail.
 * @param {{etoiles: number, joursEntrainement: number, exercices: number}} resume Voir `resumerProgression`.
 * @returns {string}
 */
export function decrireProgression({ etoiles, joursEntrainement, exercices }) {
  return [
    compter(etoiles, 'étoile', 'étoiles'),
    compter(joursEntrainement, "jour d'entraînement", "jours d'entraînement"),
    compter(exercices, 'exercice', 'exercices'),
  ].join(', ');
}

/**
 * La date d'un jour AAAA-MM-JJ, écrite en toutes lettres : « 12 novembre 2026 ».
 * @param {string|null} jour
 * @returns {string} Vide si la date est absente ou illisible.
 */
export function ecrireLeJour(jour) {
  const morceaux = /^(\d{4})-(\d{2})-(\d{2})$/.exec(jour ?? '');
  if (morceaux === null) {
    return '';
  }
  const [, annee, mois, numero] = morceaux.map(Number);
  const date = new Date(Date.UTC(annee, mois - 1, numero));
  const existe = date.getUTCMonth() === mois - 1 && date.getUTCDate() === numero; // « 2026-13-45 » déborde sur 2027
  if (Number.isNaN(date.getTime()) || !existe) {
    return '';
  }
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

/**
 * Le texte d'une carte du choix : où est cette progression, et ce qu'elle contient.
 * @param {string} lieu « Sur cet appareil » ou « Dans ton compte ».
 * @param {Object} resume Voir `resumerProgression`.
 * @returns {{titre: string, contenu: string, dernierEntrainement: string}}
 *   `dernierEntrainement` est vide quand la date n'est pas connue.
 */
export function decrireUneProgression(lieu, resume) {
  const jour = ecrireLeJour(resume.derniereDate);
  return {
    titre: lieu,
    contenu: decrireProgression(resume),
    dernierEntrainement: jour === '' ? '' : `Dernier entraînement${ESPACE_INSECABLE}: ${jour}`,
  };
}

/**
 * « Dernière sauvegarde : le 19 novembre 2026 » (date et heure du serveur, dans le fuseau de l'appareil).
 * @param {string|null} misAJour Date ISO renvoyée par le compte, ou `null` s'il n'a encore rien reçu.
 * @param {string} [fuseau] Fuseau horaire (celui de l'appareil par défaut).
 * @returns {string}
 */
export function decrireLaDerniereSauvegarde(misAJour, fuseau) {
  const date = new Date(misAJour ?? '');
  if (misAJour === null || Number.isNaN(date.getTime())) {
    return "Rien n'a encore été sauvegardé dans ton compte.";
  }
  const jour = date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: fuseau });
  const heure = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: fuseau });
  return `Dernière sauvegarde${ESPACE_INSECABLE}: le ${jour} à ${heure}`;
}
