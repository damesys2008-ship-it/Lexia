// Hub « Orthographe » (route '#/orthographe') : les quatre exercices et le niveau de l'élève.

import { creerHubMatiere } from '../../ui/hub-matiere.js';
import { MODULE } from './seance-logique.js';

const JEUX = [
  {
    mode: 'homophones',
    href: `#/${MODULE}/homophones`,
    titre: 'Le pont des homophones',
    description: 'Choisis le bon petit mot : a ou à, et ou est, son ou sont…',
  },
  {
    mode: 'accords',
    href: `#/${MODULE}/accords`,
    titre: 'Les accords dans le groupe nominal',
    description: "Accorde le déterminant et l'adjectif avec le nom.",
  },
  {
    mode: 'invariables',
    href: `#/${MODULE}/invariables`,
    titre: 'Mots à retenir',
    description: 'Regarde un mot pendant trois secondes, puis écris-le de mémoire.',
  },
  {
    mode: 'muettes',
    href: `#/${MODULE}/muettes`,
    titre: 'Lettres muettes',
    description: "Retrouve la lettre qu'on n'entend pas grâce à un mot de la même famille.",
  },
];

/**
 * Monte le hub Orthographe.
 * @param {HTMLElement} conteneur
 * @param {Object} contexte Contexte de l'application.
 * @returns {Promise<void>}
 */
export async function monter(conteneur, contexte) {
  const { page } = await creerHubMatiere(contexte, { module: MODULE, titre: 'Orthographe', jeux: JEUX });
  conteneur.replaceChildren(page);
}
