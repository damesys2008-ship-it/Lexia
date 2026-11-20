// Logique pure de l'exercice « Les transformations » : comparaison de la phrase écrite aux réponses acceptées.
// Aucun accès au DOM : tout se teste dans Node.

import { normaliserPourComparaison } from '../../coeur/texte.js';

const TRANSFORMATION_INTERROGATION = 'interrogation';
const POINT_FINAL = /\.$/;
const SEPARATEUR_DES_REPONSES = ' ou ';
const FIN_DE_PHRASE = /[.!?]$/;
const ESPACE_INSECABLE = '\u00A0';

/**
 * Clé de comparaison d'une phrase : apostrophes, espaces et espaces insécables normalisés, majuscule
 * initiale et point final ignorés. Le « ? » est conservé : il est exigé pour une interrogation.
 * La casse à l'intérieur, les accents, les traits d'union et les accords restent significatifs.
 * @param {string} phrase
 * @returns {string}
 */
export function clePourComparaison(phrase) {
  const normalisee = normaliserPourComparaison(phrase).replace(POINT_FINAL, '');
  return normalisee.charAt(0).toLowerCase() + normalisee.slice(1);
}

/**
 * Dit si la phrase écrite est une des réponses acceptées.
 * @param {{reponses: string[]}} item
 * @param {string} saisie Ce que l'élève a écrit.
 * @returns {boolean}
 */
export function estReponseJuste(item, saisie) {
  const cle = clePourComparaison(saisie);
  return item.reponses.some((reponse) => clePourComparaison(reponse) === cle);
}

/** Dit si l'élève n'a encore rien écrit (des espaces seuls ne comptent pas). */
export function estVide(saisie) {
  return saisie.trim() === '';
}

/** Dit si la phrase commence par une majuscule et finit par un point, un « ? » ou un « ! ». */
export function estBienPonctuee(saisie) {
  const phrase = saisie.trim();
  const premiere = phrase.charAt(0);
  const estUneLettre = premiere.toUpperCase() !== premiere.toLowerCase();
  const commenceParMajuscule = estUneLettre && premiere === premiere.toUpperCase();
  return commenceParMajuscule && FIN_DE_PHRASE.test(phrase);
}

/** Dit si l'item demande de poser une question : il accepte alors trois tournures. */
export function estInterrogation(item) {
  return item.transformation === TRANSFORMATION_INTERROGATION;
}

/** Met la phrase entre guillemets : la séance ajoute un point après la réponse, la phrase garde ainsi le sien. */
function entreGuillemets(phrase) {
  return `«${ESPACE_INSECABLE}${phrase}${ESPACE_INSECABLE}»`;
}

/**
 * La bonne réponse annoncée après la 2e erreur : la forme principale ; pour une question, les trois tournures.
 * Chaque phrase est entre guillemets, pour que la ponctuation de la phrase ne se confonde pas avec celle du message.
 * @param {{transformation: string, reponses: string[]}} item
 * @returns {string}
 */
export function decrireBonneReponse(item) {
  const reponses = estInterrogation(item) ? item.reponses : [item.reponses[0]];
  return reponses.map(entreGuillemets).join(SEPARATEUR_DES_REPONSES);
}
