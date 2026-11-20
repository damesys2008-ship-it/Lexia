// Type `relation` de `vocabulaire.json` : relier des synonymes ou des contraires (contrat : schemas-vocabulaire.md §3).

import { estObjet, estTexteNonVide } from './contenu-outils.js';
import { compterMots, formeComparable, sontTousDifferents } from './contenu-vocabulaire-outils.js';

/** Nombre de paires d'un item `relation`, par niveau. Seul endroit à changer pour modifier le volume. */
export const PAIRES_PAR_NIVEAU = { 1: 4, 2: 5, 3: 6 };

export const RELATIONS = ['synonymes', 'contraires'];
export const CLASSES_DE_MOTS = ['nom', 'verbe', 'adjectif'];

const MOTS_MAX = 3;
const CARACTERES_MAX = 20;
const PONCTUATION = /[.,;:!?…«»"()]/;
// Deux mots de la même famille donnent la réponse par leur ressemblance (« heureux » / « malheureux »).
const PAIRES_DE_LA_MEME_FAMILLE_MAX = { synonymes: 0, contraires: 1 };

function estPaire(paire) {
  return estObjet(paire) && estTexteNonVide(paire.gauche) && estTexteNonVide(paire.droite);
}

function reglesNombreDePaires(item) {
  const attendu = PAIRES_PAR_NIVEAU[item.niveau];
  const formeValide = Array.isArray(item.paires) && item.paires.every(estPaire);
  if (formeValide && (attendu === undefined || item.paires.length === attendu)) {
    return [];
  }
  const nombre = attendu === undefined ? 'des' : `${attendu}`;
  return [`paires doit contenir ${nombre} objets { gauche, droite } (niveau ${item.niveau})`];
}

function reglesFormeDesMots(textes) {
  return textes
    .filter((texte) => compterMots(texte) > MOTS_MAX || texte.length > CARACTERES_MAX || PONCTUATION.test(texte))
    .map((texte) => `paires : « ${texte} » doit faire 1 à ${MOTS_MAX} mots, `
      + `${CARACTERES_MAX} caractères au plus, sans ponctuation`);
}

function estUnMotDansLAutre({ gauche, droite }) {
  const [mot, autreMot] = [formeComparable(gauche), formeComparable(droite)];
  return mot.includes(autreMot) || autreMot.includes(mot);
}

function reglesPairesDeLaMemeFamille(item) {
  const maximum = PAIRES_DE_LA_MEME_FAMILLE_MAX[item.relation] ?? 0;
  if (item.paires.filter(estUnMotDansLAutre).length <= maximum) {
    return [];
  }
  return [`paires : au plus ${maximum} paire dont un mot est dans l'autre en ${item.relation}`];
}

/** Règles propres à `relation`. */
export function reglesRelation(item) {
  const regles = [];
  if (!RELATIONS.includes(item.relation)) {
    regles.push(`relation doit être ${RELATIONS.join(' ou ')}`);
  }
  if (!CLASSES_DE_MOTS.includes(item.classe)) {
    regles.push(`classe doit être ${CLASSES_DE_MOTS.join(', ')}`);
  }
  const reglesPaires = reglesNombreDePaires(item);
  if (reglesPaires.length > 0) {
    return [...regles, ...reglesPaires];
  }
  const textes = item.paires.flatMap(({ gauche, droite }) => [gauche, droite]);
  if (!sontTousDifferents(textes)) {
    regles.push('paires : les mots des deux colonnes doivent tous être différents');
  }
  return [...regles, ...reglesFormeDesMots(textes), ...reglesPairesDeLaMemeFamille(item)];
}
