// Moteur de texte pur : aucun accès au DOM, au stockage ni à la fenêtre.
// Il sert à la dictée (comparaison), au détective (positions des mots)
// et à la conjugaison (élision). L'alignement et l'élision sont dans
// leurs propres fichiers ; l'élision est ré-exportée ici : on importe tout depuis texte.js.

import { alignerMots } from './texte-alignement.js';
export { commenceParVoyelleOuHMuet, elider } from './texte-elision.js';

/** L'espace ins\u00E9cable : la seule d\u00E9finition du site pour les textes des comptes (\u00E0 importer d'ici). */
export const ESPACE_INSECABLE = '\u00A0';
const APOSTROPHES_TYPOGRAPHIQUES = /[\u2019\u2018\u02BC\u2032]/g;
const SUITE_D_ESPACES = /\s+/g;
const ESPACE_AVANT_PONCTUATION = / +([,;:!?.\u2026\u00BB])/g;
const GUILLEMET_OUVRANT = '«';
const GUILLEMET_FERMANT = '»';
const ESPACE_APRES_GUILLEMET_OUVRANT = /« +/g;
const PONCTUATION_DE_DEBUT = /^[«"([]+/;
const PONCTUATION_DE_FIN = /[.,;:!?…»")\]]+$/;
// Un signe double (; : ! ?) précédé d'autre chose qu'une espace ou un autre signe,
// et non suivi d'un chiffre (pour laisser « 12:30 » intact).
const SIGNE_DOUBLE_A_ESPACER = /([^\s;:!?])\s*([;:!?])(?!\d)/g;
const APRES_GUILLEMET_OUVRANT = /«\s*/g;
const AVANT_GUILLEMET_FERMANT = /\s*»/g;

/**
 * Prépare un texte pour la comparaison entre une saisie et une phrase attendue.
 *
 * Ce qui est rendu équivalent : apostrophes typographiques et droites
 * (le résultat utilise l'apostrophe droite), suites d'espaces (y compris
 * insécables), espaces avant la ponctuation et à l'intérieur des « ».
 * Ce qui reste significatif : majuscules, accents et ponctuation.
 *
 * @param {string} texte
 * @returns {string}
 */
export function normaliserPourComparaison(texte) {
  return texte
    .replace(APOSTROPHES_TYPOGRAPHIQUES, "'")
    .replace(SUITE_D_ESPACES, ' ')
    .replace(ESPACE_AVANT_PONCTUATION, '$1')
    .replace(ESPACE_APRES_GUILLEMET_OUVRANT, GUILLEMET_OUVRANT)
    .trim();
}

/**
 * Découpe un texte en mots.
 *
 * Règle (celle des `position` du contenu du détective) : on normalise
 * d'abord le texte (voir `normaliserPourComparaison`), puis on coupe
 * aux espaces. Comme les espaces avant la ponctuation ont disparu, la
 * ponctuation est collée au mot précédent (« mot ! » donne « mot! ») et
 * les guillemets sont collés aux mots qu'ils entourent. Une apostrophe
 * ou un trait d'union ne coupe pas : « l'adjectif » et « dit-il » sont
 * chacun un seul mot.
 *
 * @param {string} texte
 * @returns {string[]} les mots, avec leur ponctuation ; `[]` si le texte est vide
 */
export function tokeniser(texte) {
  const texteNormalise = normaliserPourComparaison(texte);
  if (texteNormalise === '') {
    return [];
  }
  return texteNormalise.split(' ');
}

/**
 * Renvoie un mot sans sa ponctuation de début (« ( [) et de fin (. , ; : ! ? … » ")).
 * La ponctuation à l'intérieur du mot (apostrophe, trait d'union) est conservée.
 *
 * @param {string} mot
 * @returns {string}
 */
export function motSansPonctuation(mot) {
  return mot.replace(PONCTUATION_DE_DEBUT, '').replace(PONCTUATION_DE_FIN, '');
}

/**
 * Prépare un texte pour l'affichage : espace insécable avant ; : ! ? et
 * à l'intérieur des guillemets « ». Insère l'espace s'il manque, sauf
 * entre deux chiffres (« 12:30 » reste tel quel).
 *
 * @param {string} texte
 * @returns {string}
 */
export function appliquerEspacesInsecables(texte) {
  return texte
    .replace(SIGNE_DOUBLE_A_ESPACER, `$1${ESPACE_INSECABLE}$2`)
    .replace(APRES_GUILLEMET_OUVRANT, GUILLEMET_OUVRANT + ESPACE_INSECABLE)
    .replace(AVANT_GUILLEMET_FERMANT, ESPACE_INSECABLE + GUILLEMET_FERMANT);
}

/**
 * Aligne mot à mot la saisie de l'élève sur le texte attendu.
 * Les deux textes sont découpés par `tokeniser` ; chaque opération
 * est décrite dans `OperationAlignement` (texte-alignement.js).
 *
 * @param {string} attendu texte correct
 * @param {string} saisi   texte écrit par l'élève
 * @returns {import('./texte-alignement.js').OperationAlignement[]}
 */
export function aligner(attendu, saisi) {
  return alignerMots(tokeniser(attendu), tokeniser(saisi));
}
