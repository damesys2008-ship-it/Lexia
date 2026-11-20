// Outils communs aux validateurs de contenu : tests de type et règles partagées par tous les items.
// Chaque règle violée est une phrase courte ; `decrire` la préfixe par l'id de l'item.

const NIVEAU_MIN = 1;
const NIVEAU_MAX = 3;

export function estObjet(valeur) {
  return typeof valeur === 'object' && valeur !== null && !Array.isArray(valeur);
}

export function estTexteNonVide(valeur) {
  return typeof valeur === 'string' && valeur.trim() !== '';
}

function estNiveauValide(valeur) {
  return Number.isInteger(valeur) && valeur >= NIVEAU_MIN && valeur <= NIVEAU_MAX;
}

/** Règles violées par les champs texte manquants ou vides d'un objet. */
export function reglesTextes(objet, champs) {
  return champs
    .filter((champ) => !estTexteNonVide(objet[champ]))
    .map((champ) => `${champ} manquant ou vide`);
}

export function reglesCommunes(item) {
  const regles = [];
  if (!estTexteNonVide(item.id)) {
    regles.push('id manquant ou vide');
  }
  if (!estNiveauValide(item.niveau)) {
    regles.push(`niveau doit être un entier de ${NIVEAU_MIN} à ${NIVEAU_MAX}`);
  }
  return regles;
}

/** Préfixe chaque règle violée par l'id de l'item, pour des erreurs lisibles. */
export function decrire(item, regles) {
  const id = estObjet(item) && estTexteNonVide(item.id) ? item.id : '(sans id)';
  return regles.map((regle) => `${id} : ${regle}`);
}

// --- Outils et règles partagés par les contenus à items typés (orthographe, grammaire) ---

const FORMAT_COMPETENCE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Vrai si la valeur est une liste dont tous les éléments sont des textes non vides. */
export function estListeDeTextes(valeur) {
  return Array.isArray(valeur) && valeur.every(estTexteNonVide);
}

/** Tous les textes d'un item, y compris ceux des listes et des objets imbriqués. */
export function textesDe(valeur) {
  if (typeof valeur === 'string') {
    return [valeur];
  }
  if (Array.isArray(valeur)) {
    return valeur.flatMap(textesDe);
  }
  return estObjet(valeur) ? Object.values(valeur).flatMap(textesDe) : [];
}

/**
 * Règles de l'identifiant `<prefixe>-<code>-n<niveau>-<nnn>` : forme, code du type et niveau.
 * @param {Object} item
 * @param {string} prefixe  début de l'id du module (`orth`, `gram`)
 * @param {Record<string, string>} codesParType  code d'id de chaque type d'item (`{ tri: 'tri', … }`)
 * @returns {string[]}
 */
export function reglesIdentifiant(item, prefixe, codesParType) {
  const format = new RegExp(`^${prefixe}-([a-z]+)-n(\\d)-\\d{3}$`);
  const trouve = typeof item.id === 'string' ? format.exec(item.id) : null;
  if (trouve === null) {
    return [`id doit avoir la forme ${prefixe}-<code>-n<niveau>-<nnn> (ex. ${prefixe}-${Object.values(codesParType)[0]}-n2-007)`];
  }
  const [, code, niveau] = trouve;
  const regles = [];
  if (code !== codesParType[item.type]) {
    regles.push(`id : le code « ${code} » ne correspond pas au type « ${item.type} »`);
  }
  if (Number(niveau) !== item.niveau) {
    regles.push(`id : le niveau n${niveau} ne correspond pas au niveau ${item.niveau}`);
  }
  return regles;
}

/** Règle : la compétence est un slug en minuscules, qui commence par le type de l'item. */
export function reglesCompetence(item) {
  if (typeof item.competence !== 'string' || !FORMAT_COMPETENCE.test(item.competence)) {
    return ['competence doit être un slug en minuscules et tirets'];
  }
  if (!item.competence.startsWith(`${item.type}-`)) {
    return [`competence doit commencer par « ${item.type}- »`];
  }
  return [];
}

// --- Typographie (§7 du contrat) ---

const REGLES_TYPOGRAPHIE = [
  { motif: /\u202F/, message: 'espace fine insécable U+202F interdite (utiliser U+00A0)' },
  { motif: / {2,}/, message: 'double espace' },
  { motif: /\u2019/, message: 'apostrophe courbe interdite (utiliser \')' },
  { motif: / [;:!?]/, message: 'espace ordinaire avant ; : ! ? (utiliser U+00A0)' },
  { motif: /« | »/, message: 'espace ordinaire à l\'intérieur de « » (utiliser U+00A0)' },
  { motif: /"/, message: 'guillemet droit " interdit (utiliser « »)' },
];

/** Règles de typographie violées par les textes d'un item (valable pour tous les contenus). */
export function reglesTypographie(item) {
  const textes = textesDe({ ...item, id: undefined });
  return REGLES_TYPOGRAPHIE
    .filter(({ motif }) => textes.some((texte) => motif.test(texte)))
    .map(({ message }) => `typographie : ${message}`);
}
