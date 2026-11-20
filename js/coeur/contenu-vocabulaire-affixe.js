// Type `affixe` de `vocabulaire.json` : construire un mot avec ses pièces, puis donner son sens
// (contrat : schemas-vocabulaire.md §5).

import { estObjet, reglesTextes } from './contenu-outils.js';
import { reglesChoixEtReponse, reglesDefinitionsCourtes } from './contenu-vocabulaire-outils.js';

export const ROLES_DES_PIECES = ['prefixe', 'radical', 'suffixe'];

/** Affixes du niveau 3 : ils suffisent à justifier un mot de seulement deux pièces. */
export const AFFIXES_DU_NIVEAU_3 = ['anti', 'inter', 'trans', 'il', 'ir', 'able', 'ible', 'tion', 'ation', 'oir'];

const PIECES_MIN = 2;
const PIECES_MAX = 3;
const RANG_DU_RADICAL = ROLES_DES_PIECES.indexOf('radical');
const NOMBRE_DE_DEFINITIONS = { min: 3, max: 3 };
const DE_UNE_A_HUIT_LETTRES_MINUSCULES = /^\p{Ll}{1,8}$/u;

function estPiece(piece) {
  return estObjet(piece) && DE_UNE_A_HUIT_LETTRES_MINUSCULES.test(piece.texte) && ROLES_DES_PIECES.includes(piece.role);
}

// Un seul radical, au plus un préfixe et un suffixe, dans l'ordre : les rangs doivent strictement croître.
function estDansLOrdre(pieces) {
  const rangs = pieces.map((piece) => ROLES_DES_PIECES.indexOf(piece.role));
  const croissants = rangs.every((rang, position) => position === 0 || rangs[position - 1] < rang);
  return rangs.includes(RANG_DU_RADICAL) && croissants;
}

function reglesNombreDePiecesDuNiveau(item) {
  const { pieces, niveau } = item;
  if (niveau === 1 && pieces.length !== PIECES_MIN) {
    return ['pieces doit contenir 2 pièces au niveau 1'];
  }
  const aUnAffixeSavant = pieces.some((piece) => AFFIXES_DU_NIVEAU_3.includes(piece.texte));
  if (niveau === 3 && pieces.length !== PIECES_MAX && !aUnAffixeSavant) {
    return [`pieces doit contenir 3 pièces au niveau 3, ou 2 avec ${AFFIXES_DU_NIVEAU_3.join(', ')}`];
  }
  return [];
}

function reglesPieces(item) {
  const { pieces } = item;
  const formeValide = Array.isArray(pieces) && pieces.length >= PIECES_MIN && pieces.length <= PIECES_MAX
    && pieces.every(estPiece);
  if (!formeValide) {
    return [`pieces doit contenir ${PIECES_MIN} ou ${PIECES_MAX} objets { texte (1 à 8 lettres minuscules), role }`];
  }
  const regles = reglesNombreDePiecesDuNiveau(item);
  if (!estDansLOrdre(pieces)) {
    regles.push('pieces : un seul radical, au plus un préfixe et un suffixe, dans l\'ordre préfixe, radical, suffixe');
  }
  if (typeof item.mot === 'string' && pieces.map((piece) => piece.texte).join('') !== item.mot) {
    regles.push('mot doit être la concaténation exacte des pièces');
  }
  return regles;
}

function reglesDefinitionsDeLAffixe(item) {
  const regles = reglesChoixEtReponse(item, NOMBRE_DE_DEFINITIONS);
  return Array.isArray(item.choix) && regles.length === 0 ? reglesDefinitionsCourtes(item.choix) : regles;
}

/** Règles propres à `affixe`. */
export function reglesAffixe(item) {
  return [...reglesTextes(item, ['mot']), ...reglesPieces(item), ...reglesDefinitionsDeLAffixe(item)];
}
