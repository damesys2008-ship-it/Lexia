/**
 * Catalogue des familles d'exercices que le défi du jour peut proposer.
 * Données seulement : chaque `cle` est le chemin de la route de l'écran (voir routes.js).
 */

/** Les modules de l'accueil qui ont des exercices, dans l'ordre de départage des égalités. */
export const MODULES = ['orthographe', 'grammaire', 'vocabulaire', 'dictee', 'conjugaison', 'lecture'];

/** Nombre d'exercices d'un défi du jour. */
export const NOMBRE_EXERCICES_DEFI = 5;
/** Nombre d'items d'un exercice du défi, pour les familles qui jouent une séance d'items. */
export const NOMBRE_ITEMS_DEFI = 4;
/** Nombre d'items des familles qui ne jouent qu'un texte ou un tableau. */
const UN_SEUL_ITEM = 1;

/**
 * @typedef {Object} Famille
 * @property {string} cle Chemin de la route de l'écran, par exemple 'orthographe/homophones'.
 * @property {string} module Module de l'accueil, tel qu'enregistré dans l'historique.
 * @property {string} mode Mode enregistré dans l'historique.
 * @property {string} contenu Nom du fichier de contenu (voir `chargerContenu`).
 * @property {string|null} type Type d'item à garder dans ce fichier ; `null` : tous les items.
 * @property {string} prefixeId Début commun des ids des items de la famille, par exemple 'orth-homo-'.
 * @property {number} nombreItems Nombre d'items d'un exercice du défi.
 */

/** @type {Famille[]} */
export const FAMILLES = [
  {
    cle: 'orthographe/homophones',
    module: 'orthographe',
    mode: 'homophones',
    contenu: 'orthographe',
    type: 'homophone',
    prefixeId: 'orth-homo-',
    nombreItems: NOMBRE_ITEMS_DEFI,
  },
  {
    cle: 'orthographe/accords',
    module: 'orthographe',
    mode: 'accords',
    contenu: 'orthographe',
    type: 'accord',
    prefixeId: 'orth-acc-',
    nombreItems: NOMBRE_ITEMS_DEFI,
  },
  {
    cle: 'orthographe/invariables',
    module: 'orthographe',
    mode: 'invariables',
    contenu: 'orthographe',
    type: 'invariable',
    prefixeId: 'orth-inv-',
    nombreItems: NOMBRE_ITEMS_DEFI,
  },
  {
    cle: 'orthographe/muettes',
    module: 'orthographe',
    mode: 'muettes',
    contenu: 'orthographe',
    type: 'muette',
    prefixeId: 'orth-mut-',
    nombreItems: NOMBRE_ITEMS_DEFI,
  },
  {
    cle: 'grammaire/tri',
    module: 'grammaire',
    mode: 'tri',
    contenu: 'grammaire',
    type: 'tri',
    prefixeId: 'gram-tri-',
    nombreItems: NOMBRE_ITEMS_DEFI,
  },
  {
    cle: 'grammaire/fonctions',
    module: 'grammaire',
    mode: 'fonctions',
    contenu: 'grammaire',
    type: 'fonctions',
    prefixeId: 'gram-fon-',
    nombreItems: NOMBRE_ITEMS_DEFI,
  },
  {
    cle: 'grammaire/etiquettes',
    module: 'grammaire',
    mode: 'etiquettes',
    contenu: 'grammaire',
    type: 'etiquettes',
    prefixeId: 'gram-eti-',
    nombreItems: NOMBRE_ITEMS_DEFI,
  },
  {
    cle: 'grammaire/transformations',
    module: 'grammaire',
    mode: 'transformations',
    contenu: 'grammaire',
    type: 'transformation',
    prefixeId: 'gram-tra-',
    nombreItems: NOMBRE_ITEMS_DEFI,
  },
  {
    cle: 'vocabulaire/synonymes',
    module: 'vocabulaire',
    mode: 'synonymes',
    contenu: 'vocabulaire',
    type: 'relation',
    prefixeId: 'voc-rel-',
    nombreItems: NOMBRE_ITEMS_DEFI,
  },
  {
    cle: 'vocabulaire/familles',
    module: 'vocabulaire',
    mode: 'familles',
    contenu: 'vocabulaire',
    type: 'famille',
    prefixeId: 'voc-fam-',
    nombreItems: NOMBRE_ITEMS_DEFI,
  },
  {
    cle: 'vocabulaire/affixes',
    module: 'vocabulaire',
    mode: 'affixes',
    contenu: 'vocabulaire',
    type: 'affixe',
    prefixeId: 'voc-aff-',
    nombreItems: NOMBRE_ITEMS_DEFI,
  },
  {
    cle: 'vocabulaire/sens',
    module: 'vocabulaire',
    mode: 'sens',
    contenu: 'vocabulaire',
    type: 'sens',
    prefixeId: 'voc-sen-',
    nombreItems: NOMBRE_ITEMS_DEFI,
  },
  {
    cle: 'dictee/audio',
    module: 'dictee',
    mode: 'audio',
    contenu: 'dictee-audio',
    type: null,
    prefixeId: 'dic-',
    nombreItems: UN_SEUL_ITEM,
  },
  {
    cle: 'dictee/detective',
    module: 'dictee',
    mode: 'detective',
    contenu: 'dictee-detective',
    type: null,
    prefixeId: 'det-',
    nombreItems: UN_SEUL_ITEM,
  },
  // Les trois formes de conjugaison partagent les mêmes tableaux : une seule entrée,
  // pour ne pas compter trois fois les mêmes items.
  {
    cle: 'conjugaison/b',
    module: 'conjugaison',
    mode: 'b',
    contenu: 'conjugaison',
    type: null,
    prefixeId: 'conj-',
    nombreItems: UN_SEUL_ITEM,
  },
  {
    cle: 'lecture/comprehension',
    module: 'lecture',
    mode: 'comprehension',
    contenu: 'lecture',
    type: 'texte',
    prefixeId: 'lec-tex-',
    nombreItems: UN_SEUL_ITEM,
  },
  {
    cle: 'lecture/ordre',
    module: 'lecture',
    mode: 'ordre',
    contenu: 'lecture',
    type: 'ordre',
    prefixeId: 'lec-ord-',
    nombreItems: UN_SEUL_ITEM,
  },
  {
    cle: 'lecture/flash',
    module: 'lecture',
    mode: 'flash',
    contenu: 'lecture',
    type: 'flash',
    prefixeId: 'lec-fla-',
    nombreItems: NOMBRE_ITEMS_DEFI,
  },
];

export const CLES_FAMILLES = FAMILLES.map((famille) => famille.cle);
