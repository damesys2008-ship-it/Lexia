// Hub « Vocabulaire » (route '#/vocabulaire') : les quatre exercices et le niveau de l'élève.

import { creerHubMatiere } from '../../ui/hub-matiere.js';

export const MODULE = 'vocabulaire';

const JEUX = [
  {
    mode: 'synonymes',
    href: `#/${MODULE}/synonymes`,
    titre: 'Synonymes et contraires',
    description: 'Relie chaque mot à celui qui a le même sens, ou le sens opposé.',
  },
  {
    mode: 'familles',
    href: `#/${MODULE}/familles`,
    titre: 'Les familles de mots',
    description: "Trouve le mot qui n'est pas de la famille.",
  },
  {
    mode: 'affixes',
    href: `#/${MODULE}/affixes`,
    titre: 'Préfixes et suffixes',
    description: 'Assemble les morceaux pour fabriquer un mot, puis trouve son sens.',
  },
  {
    mode: 'sens',
    href: `#/${MODULE}/sens`,
    titre: 'Un mot, plusieurs sens',
    description: 'Lis la phrase et choisis le bon sens du mot.',
  },
];

/**
 * Monte le hub Vocabulaire.
 * @param {HTMLElement} conteneur
 * @param {Object} contexte Contexte de l'application.
 * @returns {Promise<void>}
 */
export async function monter(conteneur, contexte) {
  const { page } = await creerHubMatiere(contexte, { module: MODULE, titre: 'Vocabulaire', jeux: JEUX });
  conteneur.replaceChildren(page);
}
