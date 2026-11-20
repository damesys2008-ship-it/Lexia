// Élision de « je » devant une forme verbale (« j'aime », « je hurle »).

const VOYELLES = ['a', 'e', 'i', 'o', 'u', 'y', 'œ', 'æ'];

// Radicaux de verbes à h aspiré : devant eux, pas d'élision (« je hurle »).
// Le test se fait sur le début de la forme conjuguée. Chaque radical est
// choisi assez long pour ne pas attraper un mot à h muet (hériter, habiter,
// harmoniser, halogène, hélicoptère, huile…). Le test unitaire conjugue
// chaque verbe pour vérifier que toutes ses formes sont couvertes.
const RADICAUX_H_ASPIRE = [
  // hacher, haïr, handicaper, hanter, harasser, harceler, harponner, harnacher
  'hach', 'hanch', 'haï', 'hais', 'hait', 'hand', 'hant', 'haras', 'harc', 'harp', 'harn',
  // haranguer, hasarder, hausser, hâter, hâler, hâbler, happer
  'harang', 'hasard', 'hauss', 'hât', 'hâl', 'hâbl', 'happ',
  // haler (hale, halons, halions, halais), haleter (halète, halette)
  'hale', 'halé', 'halon', 'halion', 'halie', 'hala', 'halet', 'halèt',
  // héler (hèle, hélons, hélez, hélais, hélions, hélèrent, hélé)
  'hèl', 'héle', 'hélé', 'hélo', 'héla', 'hélè', 'hélâ', 'hélion', 'hélie',
  // hennir, hérisser, herser, heurter, hisser, hocher, honnir, hoqueter, houspiller
  'henn', 'hériss', 'hers', 'heurt', 'hiss', 'hoch', 'honn', 'hoquet', 'hoquèt', 'houspill',
  // huer (hue, huons, huais, huions, huèrent, hué), hurler, hululer
  'hue', 'huo', 'huez', 'hua', 'huâ', 'huè', 'hué', 'huion', 'huie', 'hurl', 'hulul',
];

const LETTRES_ACCENTUEES = /[̀-ͯ]/g;

/**
 * Indique si une forme verbale commence par une voyelle ou un h muet,
 * c'est-à-dire si « je » s'élide devant elle. Les voyelles accentuées
 * et « œ » comptent ; le h aspiré est reconnu par une liste de radicaux
 * de verbes (hacher, haïr, hanter, harceler, hausser, heurter, hisser, hurler…).
 *
 * @param {string} mot forme verbale, par exemple « aime » ou « hurle »
 * @returns {boolean}
 */
export function commenceParVoyelleOuHMuet(mot) {
  const minuscules = mot.toLowerCase();
  if (minuscules === '') {
    return false;
  }
  if (minuscules.startsWith('h')) {
    return !RADICAUX_H_ASPIRE.some((radical) => minuscules.startsWith(radical));
  }
  const premiereLettre = minuscules.normalize('NFD').replace(LETTRES_ACCENTUEES, '')[0];
  return VOYELLES.includes(premiereLettre);
}

/**
 * Assemble un pronom et une forme verbale, avec l'élision de « je ».
 * Les autres pronoms ne s'élident pas.
 *
 * @param {string} pronom par exemple « je », « tu », « il »
 * @param {string} forme  forme verbale, par exemple « aime »
 * @returns {string} « j'aime », « je mange », « tu aimes »
 */
export function elider(pronom, forme) {
  const estJe = pronom.toLowerCase() === 'je';
  if (estJe && commenceParVoyelleOuHMuet(forme)) {
    return `${pronom[0]}'${forme}`;
  }
  return `${pronom} ${forme}`;
}
