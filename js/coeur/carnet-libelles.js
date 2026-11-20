/**
 * Libellés des compétences pour le Carnet : ce que l'élève lit à la place d'un nom technique
 * comme « homophone-a-a ».
 *
 * Un libellé est un groupe nominal AVEC son article, écrit pour compléter « On s'entraîne encore sur … »
 * ou « Tu progresses sur … ». Plusieurs compétences peuvent partager un libellé : le Carnet les compte ensemble.
 * Une compétence sans libellé retombe sur le nom de son module (`libelleModule`).
 *
 * Fonctions pures, aucune lecture du DOM ni du stockage.
 */

/**
 * @typedef {Object} GroupeLibelle
 * @property {string[]} prefixes Débuts de compétences couverts. `futur` couvre `futur` et `futur-pouvoir`,
 *   mais pas `futuriste` : le préfixe doit finir sur un tiret ou sur la fin du nom.
 * @property {string} libelle Le libellé affiché.
 */

/** @type {GroupeLibelle[]} */
export const GROUPES_LIBELLES = [
  // Homophones
  { prefixes: ['homophone-a-a'], libelle: 'les homophones a / à' },
  { prefixes: ['homophone-c-est-s-est'], libelle: "les homophones c'est / s'est" },
  { prefixes: ['homophone-ca-sa'], libelle: 'les homophones ça / sa' },
  { prefixes: ['homophone-ce-se'], libelle: 'les homophones ce / se' },
  { prefixes: ['homophone-ces-ses', 'homophone-ses-ces'], libelle: 'les homophones ces / ses' },
  { prefixes: ['homophone-court-cour'], libelle: 'les homophones court / cour' },
  { prefixes: ['homophone-et-est'], libelle: 'les homophones et / est' },
  { prefixes: ['homophone-faut-faux'], libelle: 'les homophones faut / faux' },
  { prefixes: ['homophone-font-fond'], libelle: 'les homophones font / fond' },
  { prefixes: ['homophone-la-la'], libelle: "les homophones la / l'a / là" },
  { prefixes: ['homophone-leur-leurs'], libelle: 'les homophones leur / leurs' },
  { prefixes: ['homophone-on-ont'], libelle: 'les homophones on / ont' },
  { prefixes: ['homophone-ou-ou', 'ou-ou'], libelle: 'les homophones ou / où' },
  { prefixes: ['homophone-peu-peut'], libelle: 'les homophones peu / peut' },
  { prefixes: ['homophone-quand-quant'], libelle: 'les homophones quand / quant' },
  { prefixes: ['homophone-quel-quelle'], libelle: 'les homophones quel / quelle' },
  { prefixes: ['homophone-son-sont'], libelle: 'les homophones son / sont' },
  // Petits mots qui se ressemblent
  { prefixes: ['quelle-qu-elle'], libelle: "les mots quelle / qu'elle" },
  { prefixes: ['quelle-que'], libelle: 'les mots quelle que / quel que' },
  { prefixes: ['quelque-quelques'], libelle: 'les mots quelque / quelques' },
  { prefixes: ['n-y-ni'], libelle: "les mots n'y / ni" },
  { prefixes: ['sans-s-en'], libelle: "les mots sans / s'en" },
  { prefixes: ['l-as-las'], libelle: "les mots l'as / las" },
  { prefixes: ['plus-tot-plutot'], libelle: 'les mots plus tôt / plutôt' },
  { prefixes: ['peut-etre'], libelle: 'les mots peut-être / peut être' },
  { prefixes: ['quoique'], libelle: 'les mots quoique / quoi que' },
  { prefixes: ['apostrophe-qu-il'], libelle: "l'apostrophe de qu'il et qu'elle" },
  { prefixes: ['determinant-du'], libelle: 'le déterminant du' },
  // Accords et pluriels
  { prefixes: ['accord-sujet-verbe'], libelle: "l'accord du verbe avec son sujet" },
  { prefixes: ['accord-adjectif', 'accord-deux-adjectifs'], libelle: "l'accord des adjectifs" },
  { prefixes: ['accord-genre', 'accord-nombre', 'accord-nom'], libelle: "l'accord du genre et du nombre" },
  { prefixes: ['accord-feminin-irregulier'], libelle: 'les féminins irréguliers' },
  { prefixes: ['accord-pluriel-irregulier', 'pluriel-nom'], libelle: 'le pluriel des noms' },
  { prefixes: ['accord-participe-avoir'], libelle: "l'accord du participe passé avec avoir" },
  { prefixes: ['accord-participe-etre'], libelle: "l'accord du participe passé avec être" },
  { prefixes: ['accord-participe-pronominal'], libelle: "l'accord du participe passé des verbes pronominaux" },
  { prefixes: ['accord-tout'], libelle: "l'accord de tout" },
  // Orthographe des mots
  { prefixes: ['infinitif-participe'], libelle: 'la fin des verbes en -er et en -é' },
  { prefixes: ['invariable'], libelle: 'les mots invariables' },
  { prefixes: ['muette-consonne-finale', 'lettre-muette'], libelle: 'les lettres muettes à la fin des mots' },
  { prefixes: ['orthographe-mot', 'orthographe-verbe'], libelle: "l'orthographe de mots difficiles" },
  { prefixes: ['orthographe-adverbe'], libelle: 'les adverbes en -ment' },
  // Conjugaison
  { prefixes: ['present-1er-groupe', 'present-2e-groupe'], libelle: 'le présent des verbes réguliers' },
  { prefixes: ['present-cer-ger', 'present-eler-eter', 'present-yer'], libelle: "le présent des verbes qui changent d'orthographe" },
  { prefixes: ['present-etre-avoir', 'present-irreguliers'], libelle: 'le présent des verbes irréguliers' },
  { prefixes: ['imparfait'], libelle: "l'imparfait" },
  { prefixes: ['futur'], libelle: 'le futur' },
  { prefixes: ['conditionnel'], libelle: 'le conditionnel' },
  { prefixes: ['imperatif-present'], libelle: "l'impératif" },
  { prefixes: ['passe-compose-avoir', 'passe-compose-etre'], libelle: 'le passé composé' },
  { prefixes: ['passe-simple'], libelle: 'le passé simple' },
  { prefixes: ['plus-que-parfait'], libelle: 'le plus-que-parfait' },
  { prefixes: ['subjonctif'], libelle: 'le subjonctif' },
  // Grammaire
  { prefixes: ['etiquettes'], libelle: 'les parties de la phrase' },
  { prefixes: ['fonctions-verbe-sujet'], libelle: 'le sujet du verbe' },
  { prefixes: ['fonctions-cc', 'fonctions-cod', 'fonctions-coi'], libelle: 'les compléments du verbe' },
  { prefixes: ['transformation'], libelle: 'la transformation de phrases' },
  { prefixes: ['tri'], libelle: 'la nature des mots' },
  // Vocabulaire
  { prefixes: ['affixe-prefixe', 'affixe-suffixe'], libelle: 'les préfixes et les suffixes' },
  { prefixes: ['famille'], libelle: 'les familles de mots' },
  { prefixes: ['relation-synonymes'], libelle: 'les synonymes' },
  { prefixes: ['relation-contraires'], libelle: 'les contraires' },
  { prefixes: ['sens-mot'], libelle: 'le sens des mots' },
  // Lecture
  { prefixes: ['deviner'], libelle: 'les indices cachés dans un texte' },
  { prefixes: ['ecrit'], libelle: 'les informations écrites dans un texte' },
  { prefixes: ['flash'], libelle: 'la lecture rapide' },
  { prefixes: ['mot-contexte'], libelle: 'le sens des mots dans un texte' },
  { prefixes: ['ordre'], libelle: "l'ordre des idées dans un texte" },
];

/** Le libellé de repli : le nom du module, tel que l'accueil le nomme, avec son article. */
export const LIBELLES_MODULES = Object.freeze({
  orthographe: "l'orthographe",
  grammaire: 'la grammaire',
  vocabulaire: 'le vocabulaire',
  dictee: 'la dictée',
  conjugaison: 'la conjugaison',
  lecture: 'la lecture',
});

/** Libellé d'un module inconnu : on ne peut pas nommer plus précisément. */
const LIBELLE_MODULE_INCONNU = "l'entraînement";

/** Vrai si le préfixe couvre la compétence : même nom, ou même début suivi d'un tiret. */
function prefixeCouvre(prefixe, competence) {
  return competence === prefixe || competence.startsWith(`${prefixe}-`);
}

/** Le plus long préfixe qui couvre la compétence, parmi tous les groupes, avec son groupe. */
function meilleureCorrespondance(competence) {
  let meilleure = null;
  for (const groupe of GROUPES_LIBELLES) {
    for (const prefixe of groupe.prefixes) {
      const estPlusPrecis = meilleure === null || prefixe.length > meilleure.prefixe.length;
      if (prefixeCouvre(prefixe, competence) && estPlusPrecis) {
        meilleure = { prefixe, groupe };
      }
    }
  }
  return meilleure;
}

/**
 * Le libellé d'une compétence, ou `null` si aucun groupe ne la couvre.
 * Le préfixe le plus long l'emporte (`homophone-ces-ses` avant un éventuel `homophone`).
 * @param {string} competence Par exemple `homophone-a-a`.
 * @returns {string|null}
 */
export function libelleCompetence(competence) {
  return meilleureCorrespondance(competence)?.groupe.libelle ?? null;
}

/**
 * Le libellé de repli : le nom du module avec son article.
 * @param {string} module Par exemple `orthographe`.
 * @returns {string}
 */
export function libelleModule(module) {
  return LIBELLES_MODULES[module] ?? LIBELLE_MODULE_INCONNU;
}
