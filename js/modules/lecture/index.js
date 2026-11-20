// Hub « Lecture » (route '#/lecture') : les trois exercices et le niveau de l'élève.

import { creerHubMatiere } from '../../ui/hub-matiere.js';

export const MODULE = 'lecture';

const JEUX = [
  {
    mode: 'comprehension',
    href: `#/${MODULE}/comprehension`,
    titre: 'Questions sur un texte',
    description: 'Lis un texte, réponds, puis montre la phrase qui le prouve.',
  },
  {
    mode: 'ordre',
    href: `#/${MODULE}/ordre`,
    titre: "Remets dans l'ordre",
    description: "Remets les paragraphes d'une histoire dans le bon ordre.",
  },
  {
    mode: 'flash',
    href: `#/${MODULE}/flash`,
    titre: 'Lecture flash',
    description: 'Un mot apparaît très vite : retrouve-le parmi quatre.',
  },
];

/**
 * Monte le hub Lecture.
 * @param {HTMLElement} conteneur
 * @param {Object} contexte Contexte de l'application.
 * @returns {Promise<void>}
 */
export async function monter(conteneur, contexte) {
  const { page } = await creerHubMatiere(contexte, { module: MODULE, titre: 'Lecture', jeux: JEUX });
  conteneur.replaceChildren(page);
}
