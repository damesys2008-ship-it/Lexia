// Logique pure de l'exercice « Synonymes et contraires » (aucun accès au DOM).
//
// Un item `relation` est un exercice « relier » complet : N paires { gauche, droite }.
// Les cartes de gauche ont les ids g0, g1… ; les cartes de droite d0, d1… (dans l'ordre des paires) :
// la carte d<i> est la seule bonne réponse de la carte g<i>.

/** Le titre fixe de chaque relation : lisible sans la couleur grâce au signe. */
export const TITRES_DES_RELATIONS = {
  synonymes: { titre: 'Mots de même sens', signe: '=' },
  contraires: { titre: 'Mots de sens contraire', signe: '≠' },
};

const PREFIXE_GAUCHE = 'g';
const PREFIXE_DROITE = 'd';
const SEPARATEUR_DE_PAIRES = ', ';

/**
 * Les deux colonnes à relier, dans l'ordre du contenu (le mélange se fait ensuite).
 * @param {{paires: Array<{gauche: string, droite: string}>}} item
 * @returns {{gauche: Array<{id: string, texte: string}>,
 *   droite: Array<{id: string, texte: string, correspond: string[]}>}}
 */
export function construireColonnes(item) {
  return {
    gauche: item.paires.map((paire, rang) => ({ id: `${PREFIXE_GAUCHE}${rang}`, texte: paire.gauche })),
    droite: item.paires.map((paire, rang) => ({
      id: `${PREFIXE_DROITE}${rang}`,
      texte: paire.droite,
      correspond: [`${PREFIXE_GAUCHE}${rang}`],
    })),
  };
}

/** L'id de la carte de droite qui répond à cette carte de gauche. */
function droiteAttendue(gaucheId) {
  return `${PREFIXE_DROITE}${gaucheId.slice(PREFIXE_GAUCHE.length)}`;
}

/**
 * Juge chaque trait : il est juste s'il relie la carte de gauche à sa réponse.
 * @param {Array<{gaucheId: string, droiteId: string}>} traits
 * @returns {Object<string, 'juste'|'faux'>} Le résultat de chaque carte de gauche reliée.
 */
export function resultatsDesTraits(traits) {
  const resultats = {};
  for (const { gaucheId, droiteId } of traits) {
    resultats[gaucheId] = droiteId === droiteAttendue(gaucheId) ? 'juste' : 'faux';
  }
  return resultats;
}

/** Vrai quand aucun trait n'est faux (et qu'il y en a au moins un). */
export function toutEstJuste(resultats) {
  const etats = Object.values(resultats);
  return etats.length > 0 && etats.every((etat) => etat === 'juste');
}

/**
 * Les bonnes paires écrites « mot = réponse » (ou « mot ≠ réponse » pour les contraires).
 * @returns {string[]}
 */
export function listerBonnesPaires(item) {
  const { signe } = TITRES_DES_RELATIONS[item.relation];
  return item.paires.map((paire) => `${paire.gauche} ${signe} ${paire.droite}`);
}

/** Les bonnes paires en une seule phrase, pour la correction de la séance. */
export function decrireBonnesPaires(item) {
  return listerBonnesPaires(item).join(SEPARATEUR_DE_PAIRES);
}

/** Ce que lit la voix : le titre, puis les mots des deux colonnes tels qu'ils sont affichés. */
export function texteALire(item, colonnes) {
  const { titre } = TITRES_DES_RELATIONS[item.relation];
  const textes = (cartes) => cartes.map((carte) => carte.texte).join(SEPARATEUR_DE_PAIRES);
  return `${titre}. ${textes(colonnes.gauche)}. ${textes(colonnes.droite)}.`;
}
