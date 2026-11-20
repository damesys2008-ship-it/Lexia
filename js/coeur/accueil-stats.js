/**
 * Chiffres affichés sur l'écran d'accueil, calculés à partir des données existantes
 * (défi du jour, test de départ, historique, solde, badges). Fonctions pures : rien n'est écrit.
 */

import { accessoiresAchetables } from './accessoires.js';
import { badgesAffiches } from './badges.js';
import { etatDuDefi } from './defi.js';
import { NOMBRE_EXERCICES_DEFI } from './familles.js';
import { ORDRE_DES_ETAPES, prochaineQuestion } from './test-depart.js';

/** Nombre de jeux de chaque module : un par carte du hub du module. */
export const JEUX_PAR_MODULE = {
  orthographe: 4,
  conjugaison: 3,
  grammaire: 4,
  vocabulaire: 4,
  lecture: 3,
  dictee: 2,
};

/** Nom thématique de chaque étape de la grande aventure, dans l'ordre de `ORDRE_DES_ETAPES`. */
export const NOMS_DES_ETAPES = ['Départ', 'Les accords', 'Le verbe', 'La phrase', 'Le texte', 'Le trésor'];

/** @typedef {import('./stockage.js').DonneesLexia} DonneesLexia */

/**
 * Les pastilles du défi du jour : une par exercice, faite ou à faire.
 * @param {import('./stockage.js').DefiDuJour|null} defi `meta.defi`.
 * @param {string} jour Jour courant, AAAA-MM-JJ (un défi d'un autre jour ne compte pas).
 * @returns {{numero: number, faite: boolean}[]}
 */
export function pastillesDuDefi(defi, jour) {
  const faits = etatDuDefi(defi, jour) === 'neuf' ? 0 : defi.faits;
  return Array.from({ length: NOMBRE_EXERCICES_DEFI }, (_, rang) => ({ numero: rang + 1, faite: rang < faits }));
}

/**
 * Les six étapes de la grande aventure : les modules finis sont faits, le premier non fini est en cours.
 * @param {import('./test-depart.js').ItemTestDepart[]} items Tout le test de départ.
 * @param {import('./stockage.js').TestDepart|null} testDepart `meta.testDepart`.
 * @returns {{numero: number, nom: string, etat: 'faite'|'en-cours'|'a-venir'}[]}
 */
export function etapesDeLAventure(items, testDepart) {
  const prochaine = prochaineQuestion(items, testDepart?.reponses ?? {});
  const rangEnCours = prochaine === null ? ORDRE_DES_ETAPES.length : ORDRE_DES_ETAPES.indexOf(prochaine.module);
  return NOMS_DES_ETAPES.map((nom, rang) => {
    const etat = rang < rangEnCours ? 'faite' : rang === rangEnCours ? 'en-cours' : 'a-venir';
    return { numero: rang + 1, nom, etat };
  });
}

/**
 * Combien de jeux du module ont déjà été joués (au moins une séance dans l'historique, qui garde les 200 dernières).
 * @param {import('./stockage.js').ResumeSeance[]} historique
 * @param {string} module Par exemple 'dictee'.
 * @returns {{joues: number, total: number}}
 */
export function jeuxJouesDuModule(historique, module) {
  const modes = new Set(historique.filter((seance) => seance.module === module).map((seance) => seance.mode));
  const total = JEUX_PAR_MODULE[module];
  return { joues: Math.min(modes.size, total), total };
}

/**
 * « Tu peux acheter 3 choses » : les accessoires que le solde permet d'acheter.
 * @param {DonneesLexia} donnees
 * @returns {string}
 */
export function phraseAchats(donnees) {
  const nombre = accessoiresAchetables(donnees).length;
  if (nombre === 0) {
    return 'Gagne des étoiles pour acheter';
  }
  return nombre === 1 ? 'Tu peux acheter 1 chose' : `Tu peux acheter ${nombre} choses`;
}

/**
 * « 3 gagnés » : les badges gagnés.
 * @param {DonneesLexia} donnees
 * @returns {string}
 */
export function phraseBadges(donnees) {
  const nombre = badgesAffiches(donnees).filter(({ gagne }) => gagne).length;
  return nombre > 1 ? `${nombre} gagnés` : `${nombre} gagné`;
}
