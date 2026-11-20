// Écran « Garde-robe » : acheter des accessoires avec les étoiles, les porter, composer des ensembles.
// Pompon montre aussitôt ce qui est porté, le choix est enregistré. Route : '#/garde-robe'.

import { soldeEtoiles } from '../../coeur/progression.js';
import { chargerFeuille } from '../../coeur/styles.js';
import { creer } from '../../ui/dom.js';
import { creerMascotte } from '../../ui/mascotte.js';
import { creerActions } from './actions.js';
import { creerEnsembles } from './ensembles.js';
import { creerGrille } from './grille.js';
import { creerPanneau } from './panneau.js';
import { creerChargeurAvecCache } from './vignette.js';

const FEUILLE_GARDE_ROBE = new URL('../../../css/modules/garde-robe.css', import.meta.url);

/** Le solde à dépenser (grand chiffre) et la phrase qui dit d'où viennent les étoiles. */
function creerSolde() {
  const bloc = creer('div', 'garde-robe__solde');
  const puce = creer('div', 'garde-robe__puce');
  const nombre = creer('p', 'garde-robe__nombre');
  const legende = creer('p', 'garde-robe__legende');
  const texte = creer('div', '');
  const etoile = creer('span', 'etoiles__symbole garde-robe__etoile');

  etoile.setAttribute('aria-hidden', 'true');
  texte.append(nombre, legende);
  puce.append(etoile, texte);
  bloc.append(puce, creer('p', 'garde-robe__explication', "Tu gagnes des étoiles à la fin de chaque série d'exercices."));

  return {
    element: bloc,
    rafraichir(donnees) {
      const solde = soldeEtoiles(donnees);
      nombre.textContent = String(solde);
      legende.textContent = `${solde > 1 ? 'étoiles' : 'étoile'} à dépenser`;
    },
  };
}

/**
 * Monte l'écran de la garde-robe.
 * @param {HTMLElement} conteneur
 * @param {Object} contexte Contexte de l'application.
 * @returns {Promise<void>}
 */
export async function monter(conteneur, contexte) {
  await chargerFeuille(FEUILLE_GARDE_ROBE);
  const donnees = contexte.stockage.lire();
  const chargerSvg = creerChargeurAvecCache();
  const mascotte = await creerMascotte({
    accessoiresEquipes: donnees.accessoires.equipes,
    titre: donnees.profil.nomMascotte || undefined,
    chargerSvg,
    signaler: contexte.signaler,
  });
  const retour = creer('p', 'garde-robe__retour');
  const vues = [];

  function apresChangement(nouvellesDonnees, phrase, idAccessoire) {
    vues.forEach((vue) => vue.rafraichir(nouvellesDonnees));
    retour.textContent = phrase;
    if (idAccessoire) {
      grille.rendreLeFocus(idAccessoire);
    }
  }

  const actions = creerActions({ contexte, mascotte, apresChangement });
  const solde = creerSolde();
  const panneau = creerPanneau({ mascotte, retirer: actions.retirer });
  const grille = creerGrille({ actions, chargerSvg, signaler: contexte.signaler });
  const ensembles = creerEnsembles({ enfiler: actions.enfiler });
  vues.push(solde, panneau, grille, ensembles);

  const retourAccueil = creer('a', 'bouton bouton--discret', "Retour à l'accueil");
  const droite = creer('div', 'garde-robe__droite');
  const corps = creer('div', 'garde-robe__corps');
  const page = creer('section', 'garde-robe');

  retour.setAttribute('role', 'status');
  retourAccueil.href = '#/accueil';
  droite.append(solde.element, retour, grille.element, ensembles.element);
  corps.append(panneau.element, droite);
  page.append(retourAccueil, creer('h1', 'garde-robe__titre', 'Garde-robe'), corps);
  vues.forEach((vue) => vue.rafraichir(donnees));
  conteneur.replaceChildren(page);
}
