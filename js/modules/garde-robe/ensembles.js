// Les ensembles : seize tenues complètes. Un ensemble se débloque tout seul quand toutes ses pièces sont achetées.

import { ENSEMBLES } from '../../coeur/accessoires.js';
import { creer, creerBouton } from '../../ui/dom.js';
import { NOM_RARETE, progressionEnsemble } from './logique.js';

const CONDITION_DE_DEBLOCAGE = 'Se débloque quand tous les accessoires sont achetés.';

/** « 2 pièces sur 3 achetées » */
function phraseDeProgression({ possedees, total }) {
  const pluriel = possedees > 1;
  return `${possedees} ${pluriel ? 'pièces' : 'pièce'} sur ${total} ${pluriel ? 'achetées' : 'achetée'}`;
}

function creerCarteEnsemble(ensemble, donnees, enfiler) {
  const progression = progressionEnsemble(donnees, ensemble.id);
  const carte = creer('li', 'garde-robe__ensemble');
  carte.dataset.ensemble = ensemble.id;
  carte.classList.toggle('garde-robe__ensemble--debloque', progression.complet);
  carte.append(
    creer('h3', 'garde-robe__nom', ensemble.nom),
    creer('p', 'garde-robe__emplacement', NOM_RARETE[ensemble.rarete]),
    creer('p', 'garde-robe__progression', phraseDeProgression(progression)),
  );
  if (progression.complet) {
    const bouton = creerBouton('Tout enfiler', 'bouton--principal', () => enfiler(ensemble.id));
    bouton.setAttribute('aria-label', `Tout enfiler : ${ensemble.nom}`);
    carte.append(creer('p', 'garde-robe__debloque', '✓ Ensemble débloqué'), bouton);
  } else {
    carte.append(creer('p', 'garde-robe__condition', CONDITION_DE_DEBLOCAGE));
  }
  return carte;
}

/**
 * @param {Object} options
 * @param {function(string): void} options.enfiler Enfile toutes les pièces d'un ensemble débloqué.
 * @returns {{element: HTMLElement, rafraichir: function(Object): void}}
 */
export function creerEnsembles({ enfiler }) {
  const section = creer('section', 'garde-robe__ensembles');
  const liste = creer('ul', 'garde-robe__liste-ensembles');
  section.append(creer('h2', 'garde-robe__sous-titre', 'Les ensembles'), liste);

  return {
    element: section,
    rafraichir(donnees) {
      liste.replaceChildren(...ENSEMBLES.map((ensemble) => creerCarteEnsemble(ensemble, donnees, enfiler)));
    },
  };
}
