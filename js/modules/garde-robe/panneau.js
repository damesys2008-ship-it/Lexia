// Panneau de Pompon : son aperçu, les trois petites démonstrations et les neuf emplacements portés.

import { EMPLACEMENTS } from '../../coeur/accessoires.js';
import { creer, creerBouton } from '../../ui/dom.js';
import { NOM_EMPLACEMENT, accessoirePorte } from './logique.js';

/** Au bout de ce délai, Pompon reprend sa pose de repos après une démonstration. */
const DUREE_DEMONSTRATION_MS = 2500;

const DEMONSTRATIONS = [
  { libelle: 'Coucou', etat: 'coucou' },
  { libelle: 'Saute !', etat: 'content' },
  { libelle: 'Il réfléchit', etat: 'pense' },
];

/** Une case d'emplacement : son nom, l'accessoire porté (ou « Rien ») et le moyen de le retirer. */
function creerCase(donnees, emplacement, retirer) {
  const porte = accessoirePorte(donnees, emplacement);
  const caseEmplacement = creer('li', 'garde-robe__case');
  caseEmplacement.classList.toggle('garde-robe__case--vide', !porte);
  caseEmplacement.append(
    creer('span', 'garde-robe__case-emplacement', NOM_EMPLACEMENT[emplacement]),
    creer('span', 'garde-robe__case-nom', porte ? porte.nom : 'Rien'),
  );
  if (porte) {
    const bouton = creerBouton('Retirer', 'bouton--discret', () => retirer(emplacement));
    bouton.setAttribute('aria-label', `Retirer : ${porte.nom}`);
    caseEmplacement.append(bouton);
  }
  return caseEmplacement;
}

/** Les boutons de démonstration : Pompon joue l'état, puis se repose. */
function creerDemonstrations(mascotte) {
  let minuteur;
  const barre = creer('div', 'garde-robe__demos');
  for (const { libelle, etat } of DEMONSTRATIONS) {
    barre.append(
      creerBouton(libelle, 'bouton--secondaire', () => {
        mascotte.definirEtat(etat);
        clearTimeout(minuteur);
        minuteur = setTimeout(() => mascotte.definirEtat('repos'), DUREE_DEMONSTRATION_MS);
      }),
    );
  }
  return barre;
}

/**
 * @param {Object} options
 * @param {Object} options.mascotte La mascotte du panneau (voir `creerMascotte`).
 * @param {function(string): void} options.retirer Retire l'accessoire d'un emplacement.
 * @returns {{element: HTMLElement, rafraichir: function(Object): void}}
 */
export function creerPanneau({ mascotte, retirer }) {
  const panneau = creer('section', 'garde-robe__panneau');
  const apercu = creer('div', 'garde-robe__apercu');
  const cases = creer('ul', 'garde-robe__cases');

  apercu.append(mascotte.element);
  panneau.append(apercu, creerDemonstrations(mascotte), cases);
  panneau.setAttribute('aria-label', 'Pompon et ce qu\'il porte');

  return {
    element: panneau,
    rafraichir(donnees) {
      cases.replaceChildren(...EMPLACEMENTS.map((emplacement) => creerCase(donnees, emplacement, retirer)));
    },
  };
}
