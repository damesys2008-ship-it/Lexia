// Validation des items de `vocabulaire.json` (cahier §7.4, §8).
// Contrat complet : .equipe/ressources/schemas-vocabulaire.md
// Chaque type d'item a son fichier `contenu-vocabulaire-<type>.js` ; ce fichier les assemble.

import {
  decrire, estObjet, reglesCommunes, reglesCompetence, reglesIdentifiant, reglesTextes, reglesTypographie,
} from './contenu-outils.js';
import { reglesAffixe } from './contenu-vocabulaire-affixe.js';
import { reglesFamille } from './contenu-vocabulaire-famille.js';
import { reglesRelation } from './contenu-vocabulaire-relation.js';
import { reglesSens } from './contenu-vocabulaire-sens.js';

export { PAIRES_PAR_NIVEAU } from './contenu-vocabulaire-relation.js';

/** Les quatre types d'items mélangés dans `vocabulaire.json`. */
export const TYPES_VOCABULAIRE = ['relation', 'famille', 'affixe', 'sens'];

const CODE_ID_PAR_TYPE = { relation: 'rel', famille: 'fam', affixe: 'aff', sens: 'sen' };

/**
 * @typedef {Object} ItemRelation  Relier des synonymes ou des contraires (un exercice complet).
 * @property {string} id           `voc-rel-n<niveau>-<nnn>`
 * @property {'relation'} type
 * @property {number} niveau       1, 2 ou 3
 * @property {string} competence   commence par `relation-`
 * @property {'synonymes'|'contraires'} relation
 * @property {'nom'|'verbe'|'adjectif'} classe  la même pour tous les mots de l'item
 * @property {{gauche: string, droite: string}[]} paires  4, 5 ou 6 selon le niveau (`PAIRES_PAR_NIVEAU`)
 * @property {string} indice       la méthode, sans la réponse
 * @property {string} explication
 * @example
 * { "id": "voc-rel-n1-009", "type": "relation", "niveau": 1, "competence": "relation-contraires-adjectifs",
 *   "relation": "contraires", "classe": "adjectif",
 *   "paires": [ {"gauche":"grand","droite":"petit"}, {"gauche":"chaud","droite":"froid"},
 *               {"gauche":"lent","droite":"rapide"}, {"gauche":"propre","droite":"sale"} ],
 *   "indice": "…", "explication": "…" }
 */

/**
 * @typedef {Object} ItemFamille  Trouver l'intrus parmi des mots de la famille de `base`.
 * @property {string} id           `voc-fam-n<niveau>-<nnn>`
 * @property {'famille'} type
 * @property {number} niveau
 * @property {string} competence   commence par `famille-`
 * @property {string} base         le mot de départ, toujours affiché
 * @property {string[]} famille    3, 4 ou 5 mots de la famille de `base`
 * @property {string} intrus       le seul mot qui n'est pas de la famille
 * @property {string} indice
 * @property {string} explication
 * @example
 * { "id": "voc-fam-n1-001", "type": "famille", "niveau": 1, "competence": "famille-derives-simples",
 *   "base": "fleur", "famille": ["fleuriste", "fleurir", "fleurette"], "intrus": "fleuve",
 *   "indice": "…", "explication": "…" }
 */

/**
 * @typedef {Object} ItemAffixe  Construire un mot avec ses pièces, puis donner son sens.
 * @property {string} id           `voc-aff-n<niveau>-<nnn>`
 * @property {'affixe'} type
 * @property {number} niveau
 * @property {string} competence   commence par `affixe-`
 * @property {{texte: string, role: 'prefixe'|'radical'|'suffixe'}[]} pieces  2 ou 3, dans l'ordre de construction
 * @property {string} mot          la concaténation exacte des pièces
 * @property {string[]} choix      3 définitions différentes
 * @property {string} reponse      l'une des définitions
 * @property {string} indice
 * @property {string} explication
 * @example
 * { "id": "voc-aff-n1-001", "type": "affixe", "niveau": 1, "competence": "affixe-prefixe-re",
 *   "pieces": [ {"texte":"re","role":"prefixe"}, {"texte":"faire","role":"radical"} ], "mot": "refaire",
 *   "choix": ["faire de nouveau", "ne pas faire", "faire très vite"], "reponse": "faire de nouveau",
 *   "indice": "…", "explication": "…" }
 */

/**
 * @typedef {Object} ItemSens  Choisir le sens d'un mot dans une phrase.
 * @property {string} id           `voc-sen-n<niveau>-<nnn>`
 * @property {'sens'} type
 * @property {number} niveau
 * @property {string} competence   commence par `sens-`
 * @property {string} mot          le mot tel qu'il est écrit dans `phrase`
 * @property {string} phrase       6 à 14 mots, contient `mot` une seule fois
 * @property {string[]} choix      2 (niveau 1), 3 (niveau 2) ou 3 à 4 (niveau 3) définitions différentes
 * @property {string} reponse      l'une des définitions
 * @property {string} indice
 * @property {string} explication
 * @example
 * { "id": "voc-sen-n1-001", "type": "sens", "niveau": 1, "competence": "sens-mot-courant",
 *   "mot": "pied", "phrase": "Le pied de la lampe est en bois.",
 *   "choix": ["partie du corps au bout de la jambe", "partie qui soutient un objet"],
 *   "reponse": "partie qui soutient un objet", "indice": "…", "explication": "…" }
 */

/** @typedef {ItemRelation|ItemFamille|ItemAffixe|ItemSens} ItemVocabulaire */

const REGLES_PAR_TYPE = {
  relation: reglesRelation,
  famille: reglesFamille,
  affixe: reglesAffixe,
  sens: reglesSens,
};

/**
 * Valide un item de `vocabulaire.json`.
 * @param {*} item
 * @returns {string[]} règles violées, vide si l'item est valide
 */
export function validerVocabulaire(item) {
  if (!estObjet(item)) {
    return ['(sans id) : l\'item doit être un objet'];
  }
  if (!TYPES_VOCABULAIRE.includes(item.type)) {
    return decrire(item, [`type inconnu : « ${item.type} »`]);
  }
  const regles = [
    ...reglesCommunes(item),
    ...reglesIdentifiant(item, 'voc', CODE_ID_PAR_TYPE),
    ...reglesCompetence(item),
    ...reglesTextes(item, ['indice', 'explication']),
    ...REGLES_PAR_TYPE[item.type](item),
    ...reglesTypographie(item),
  ];
  return decrire(item, regles);
}
