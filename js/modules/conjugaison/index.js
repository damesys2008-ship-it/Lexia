// Hub « Conjugaison » (route '#/conjugaison') : les trois niveaux d'exercice A, B et C.

import { creerHubMatiere } from '../../ui/hub-matiere.js';

const MODULE = 'conjugaison';

const JEUX = [
  {
    mode: 'a',
    href: `#/${MODULE}/a`,
    titre: 'Niveau A : relier',
    description: 'Relie chaque personne à la bonne forme.',
  },
  {
    mode: 'b',
    href: `#/${MODULE}/b`,
    titre: 'Niveau B : compléter',
    description: 'Complète les terminaisons du tableau.',
  },
  {
    mode: 'c',
    href: `#/${MODULE}/c`,
    titre: 'Niveau C : écrire le tableau',
    description: 'Écris toutes les formes toi-même.',
  },
];

/**
 * Monte le hub Conjugaison.
 * @param {HTMLElement} conteneur
 * @param {Object} contexte Contexte de l'application.
 * @returns {Promise<void>}
 */
export async function monter(conteneur, contexte) {
  const { page } = await creerHubMatiere(contexte, { module: MODULE, titre: 'Conjugaison', jeux: JEUX });
  conteneur.replaceChildren(page);
}
