// Validation du type `transformation` de `grammaire.json`.
// Contrat : .equipe/ressources/schemas-grammaire.md §6

import { normaliserPourComparaison } from './texte.js';
import { estListeDeTextes, reglesTextes } from './contenu-outils.js';
import { sontMemesTextes } from './contenu-grammaire-outils.js';

/** Les transformations possibles. */
export const TRANSFORMATIONS = ['negation', 'interrogation', 'pluriel', 'passe-compose'];

const TRANSFORMATIONS_PAR_NIVEAU = {
  1: ['negation', 'pluriel'],
  2: ['interrogation', 'negation'],
  3: ['interrogation', 'passe-compose'],
};
const REPONSES_MIN = 1;
const REPONSES_MAX = 4;
const REPONSES_INTERROGATION = 3;
const FIN_D_INTERROGATION = '?';

function reglesNiveauDeLaTransformation(item) {
  const permises = TRANSFORMATIONS_PAR_NIVEAU[item.niveau];
  if (permises === undefined || permises.includes(item.transformation)) {
    return [];
  }
  return [`transformation « ${item.transformation} » n'existe pas au niveau ${item.niveau} (${permises.join(', ')})`];
}

function reglesInterrogation(reponses) {
  const regles = [];
  if (reponses.length !== REPONSES_INTERROGATION) {
    regles.push(`reponses doit contenir exactement ${REPONSES_INTERROGATION} tournures pour une interrogation`);
  }
  if (!reponses.every((reponse) => normaliserPourComparaison(reponse).endsWith(FIN_D_INTERROGATION))) {
    regles.push(`reponses : chaque question doit finir par « ${FIN_D_INTERROGATION} »`);
  }
  return regles;
}

function reglesReponses(item) {
  const { reponses } = item;
  const nombreValide = Array.isArray(reponses) && reponses.length >= REPONSES_MIN && reponses.length <= REPONSES_MAX;
  if (!nombreValide || !estListeDeTextes(reponses)) {
    return [`reponses doit contenir de ${REPONSES_MIN} à ${REPONSES_MAX} phrases non vides`];
  }
  const regles = [];
  const cles = reponses.map(normaliserPourComparaison);
  if (new Set(cles).size !== cles.length) {
    regles.push('reponses : les phrases doivent toutes être différentes');
  }
  if (item.transformation === 'interrogation') {
    regles.push(...reglesInterrogation(reponses));
  }
  return regles;
}

function reglesSource(item) {
  if (typeof item.source === 'string' && typeof item.phrase === 'string' && !sontMemesTextes(item.source, item.phrase)) {
    return ['source et phrase doivent être la même phrase'];
  }
  return [];
}

/**
 * Règles propres au type `transformation`.
 * @param {*} item
 * @returns {string[]}
 */
export function reglesTransformation(item) {
  if (!TRANSFORMATIONS.includes(item.transformation)) {
    return [`transformation doit être l'une de ${TRANSFORMATIONS.join(', ')}`];
  }
  return [
    ...reglesTextes(item, ['consigne', 'source']),
    ...reglesSource(item),
    ...reglesNiveauDeLaTransformation(item),
    ...reglesReponses(item),
  ];
}
