// Carte d'exercice : consigne écoutable, progression, zone de travail, retour et actions.

import { chargerFeuille } from '../coeur/styles.js';

const FEUILLE_CARTE = new URL('../../css/composants/carte-exercice.css', import.meta.url);

/** Les matières qui ont une pastille et une couleur dans l'en-tête de la carte. */
const NOMS_MODULES = {
  dictee: 'Dictée',
  conjugaison: 'Conjugaison',
  orthographe: 'Orthographe',
  grammaire: 'Grammaire',
  vocabulaire: 'Vocabulaire',
  lecture: 'Lecture',
};

const MESSAGE_LECTURE_IMPOSSIBLE = 'Je ne peux pas lire la consigne ici. Tu peux la lire toi-même.';

/**
 * Texte de la progression, par exemple « 2 / 5 ».
 * @param {number} courant Numéro de l'exercice en cours (à partir de 1).
 * @param {number} total Nombre d'exercices de la séance.
 * @returns {string}
 */
export function texteProgression(courant, total) {
  return `${courant} / ${total}`;
}

function creerElement(balise, classe) {
  const element = document.createElement(balise);
  element.className = classe;
  return element;
}

/** La barre de segments : un segment par exercice, plein jusqu'à l'exercice en cours. */
function remplirBarre(barre, courant, total) {
  const segments = Array.from({ length: total }, (_, index) => {
    const segment = creerElement('span', 'carte-exercice__segment');
    segment.classList.toggle('carte-exercice__segment--fait', index < courant);
    return segment;
  });
  barre.replaceChildren(...segments);
}

function creerPastilleModule(module) {
  const pastille = creerElement('span', `etiquette-module etiquette-module--${module}`);
  pastille.textContent = NOMS_MODULES[module];
  return pastille;
}

function creerBoutonEcouter(consigne, { lireConsigne, signaler }, zoneRetour) {
  const bouton = creerElement('button', 'bouton bouton--secondaire carte-exercice__ecouter');
  bouton.type = 'button';
  bouton.textContent = 'Écouter';
  bouton.setAttribute('aria-label', 'Écouter la consigne');
  bouton.addEventListener('click', async () => {
    try {
      await lireConsigne(consigne);
    } catch (erreur) {
      signaler(erreur);
      zoneRetour.textContent = MESSAGE_LECTURE_IMPOSSIBLE;
    }
  });
  return bouton;
}

/**
 * Construit la carte d'un exercice.
 * @param {{ consigne: string, courant: number, total: number,
 *   module?: string, lireConsigne?: (texte: string) => (void|Promise<void>), signaler?: (erreur: Error) => void }} options
 *   `module` (dictee, conjugaison, orthographe, grammaire, vocabulaire ou lecture) ajoute la pastille et la couleur
 *   de la matière ; une autre valeur est refusée (RangeError).
 *   Sans `lireConsigne`, le bouton « Écouter » n'est pas affiché. Si la lecture échoue, l'élève lit un message
 *   simple et l'erreur technique est transmise à `signaler` (journal de l'appelant).
 * @returns {Promise<{ racine: HTMLElement, zoneExercice: HTMLElement, zoneRetour: HTMLElement,
 *   zoneActions: HTMLElement, definirProgression: (courant: number, total: number) => void }>}
 */
export async function creerCarteExercice({ consigne, courant, total, module, lireConsigne, signaler = () => {} }) {
  if (module !== undefined && !Object.hasOwn(NOMS_MODULES, module)) {
    throw new RangeError(`Matière inconnue : ${module}`);
  }
  await chargerFeuille(FEUILLE_CARTE);
  const racine = creerElement('section', 'zone-exercice carte-exercice');
  const haut = creerElement('div', 'carte-exercice__haut');
  const barre = creerElement('div', 'carte-exercice__barre');
  barre.setAttribute('aria-hidden', 'true');
  const progression = creerElement('p', 'carte-exercice__progression');
  const entete = creerElement('div', 'carte-exercice__consigne');
  const texteConsigne = creerElement('p', 'carte-exercice__texte');
  const zoneExercice = creerElement('div', 'carte-exercice__zone');
  const zoneRetour = creerElement('div', 'carte-exercice__retour');
  const zoneActions = creerElement('div', 'carte-exercice__actions');

  texteConsigne.textContent = consigne;
  zoneRetour.setAttribute('aria-live', 'polite');
  entete.append(texteConsigne);
  if (lireConsigne) {
    entete.append(creerBoutonEcouter(consigne, { lireConsigne, signaler }, zoneRetour));
  }
  const definirProgression = (nouveauCourant, nouveauTotal) => {
    progression.textContent = texteProgression(nouveauCourant, nouveauTotal);
    remplirBarre(barre, nouveauCourant, nouveauTotal);
  };
  definirProgression(courant, total);
  if (module !== undefined) {
    racine.classList.add(`etiquette-module--${module}`);
    haut.append(creerPastilleModule(module));
  }
  haut.append(barre, progression);
  racine.append(haut, entete, zoneExercice, zoneRetour, zoneActions);
  return { racine, zoneExercice, zoneRetour, zoneActions, definirProgression };
}
