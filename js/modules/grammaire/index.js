// Hub « Grammaire » (route '#/grammaire') : les quatre exercices et le niveau de l'élève.
// Fournit aussi l'écran provisoire des exercices qui ne sont pas encore montés.

import { chargerFeuille } from '../../coeur/styles.js';
import { creer } from '../../ui/dom.js';
import { creerHubMatiere } from '../../ui/hub-matiere.js';

export const MODULE = 'grammaire';

const FEUILLE_HUB = new URL('../../../css/modules/hub.css', import.meta.url);

const JEUX = [
  {
    mode: 'tri',
    href: `#/${MODULE}/tri`,
    titre: 'Le tri des mots',
    description: 'Range chaque mot dans sa boîte : nom, verbe, adjectif…',
  },
  {
    mode: 'fonctions',
    href: `#/${MODULE}/fonctions`,
    titre: 'La chasse aux fonctions',
    description: 'Trouve le sujet, le verbe et les compléments dans la phrase.',
  },
  {
    mode: 'etiquettes',
    href: `#/${MODULE}/etiquettes`,
    titre: 'Les phrases en étiquettes',
    description: "Remets les morceaux dans l'ordre pour refaire la phrase.",
  },
  {
    mode: 'transformations',
    href: `#/${MODULE}/transformations`,
    titre: 'Les transformations',
    description: 'Mets la phrase au pluriel, au passé ou à la forme négative.',
  },
];

/**
 * Monte l'écran provisoire d'un exercice de grammaire pas encore prêt.
 * @param {HTMLElement} conteneur
 * @param {string} titre Titre de l'exercice.
 * @returns {Promise<void>}
 */
export async function monterBientotDisponible(conteneur, titre) {
  await chargerFeuille(FEUILLE_HUB);
  const page = creer('section', 'hub hub--grammaire');
  const retour = creer('a', 'hub__retour', 'Retour à la grammaire');
  retour.href = `#/${MODULE}`;
  page.append(retour, creer('h1', 'hub__titre', titre), creer('p', 'hub__message', 'Cet exercice arrive bientôt.'));
  conteneur.replaceChildren(page);
}

/**
 * Monte le hub Grammaire.
 * @param {HTMLElement} conteneur
 * @param {Object} contexte Contexte de l'application.
 * @returns {Promise<void>}
 */
export async function monter(conteneur, contexte) {
  const { page } = await creerHubMatiere(contexte, { module: MODULE, titre: 'Grammaire', jeux: JEUX });
  conteneur.replaceChildren(page);
}
