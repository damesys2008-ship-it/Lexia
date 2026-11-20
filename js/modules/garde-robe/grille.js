// Grille des accessoires : les filtres par emplacement et une carte par accessoire.
// Les cartes sont créées une fois (la vignette est lourde) puis mises à jour après chaque achat ou changement.

import { CATALOGUE, EMPLACEMENTS } from '../../coeur/accessoires.js';
import { libelleEtoiles } from '../../ui/barre-etat.js';
import { creer, creerBouton } from '../../ui/dom.js';
import {
  ETAT_CARTE,
  FILTRE_TOUT,
  NOM_EMPLACEMENT,
  NOM_RARETE,
  correspondAuFiltre,
  etatCarte,
} from './logique.js';
import { creerVignette } from './vignette.js';

/** Le bouton (ou la phrase) que propose la carte, selon son état. */
function creerAction(accessoire, etat, actions) {
  const { genre, manque } = etat;
  if (genre === ETAT_CARTE.TROP_CHER) {
    return creer('p', 'garde-robe__manque', `Encore ${libelleEtoiles(manque)}`);
  }
  if (genre === ETAT_CARTE.ACHETABLE) {
    const bouton = creerBouton(`Acheter · ${accessoire.prix}`, 'bouton--soleil', () => actions.acheter(accessoire.id));
    bouton.setAttribute('aria-label', `Acheter · ${accessoire.prix} : ${accessoire.nom}`);
    return bouton;
  }
  if (genre === ETAT_CARTE.A_PORTER) {
    const bouton = creerBouton('Porter', 'bouton--secondaire', () => actions.porter(accessoire.id));
    bouton.setAttribute('aria-label', `Porter : ${accessoire.nom}`);
    return bouton;
  }
  const porte = creerBouton('✓ Porté', 'bouton--secondaire garde-robe__porte', () => actions.retirer(accessoire.emplacement));
  porte.setAttribute('aria-pressed', 'true');
  porte.setAttribute('aria-label', `Porté : ${accessoire.nom}. Appuie pour le retirer`);
  return porte;
}

/** La pastille de prix posée sur la vignette des accessoires pas encore achetés. */
function creerPastillePrix(prix) {
  const pastille = creer('span', 'garde-robe__prix');
  const etoile = creer('span', 'etoiles__symbole');
  etoile.setAttribute('aria-hidden', 'true');
  pastille.setAttribute('aria-hidden', 'true');
  pastille.append(etoile, creer('span', '', String(prix)));
  return pastille;
}

/**
 * Une carte d'accessoire.
 * @param {Object} accessoire Un élément du catalogue.
 * @param {Object} actions `{acheter, porter, retirer}`.
 * @param {{chargerSvg: function(URL): Promise<string>, signaler: function(string, Error): void}} vignettes
 * @returns {{element: HTMLLIElement, mettreAJour: function(Object): void}}
 */
function creerCarte(accessoire, actions, vignettes) {
  const carte = creer('li', 'garde-robe__carte');
  const vignette = creer('div', 'garde-robe__vignette');
  const zoneAction = creer('div', 'garde-robe__action');
  const pastille = creerPastillePrix(accessoire.prix);

  carte.dataset.accessoire = accessoire.id;
  vignette.append(pastille);
  creerVignette(accessoire, vignettes.chargerSvg)
    .then((dessin) => vignette.prepend(dessin))
    .catch((erreur) => vignettes.signaler(`Vignette impossible pour ${accessoire.id}`, erreur));
  carte.append(
    vignette,
    creer('h3', 'garde-robe__nom', accessoire.nom),
    creer('p', 'garde-robe__emplacement', `${NOM_EMPLACEMENT[accessoire.emplacement]} · ${NOM_RARETE[accessoire.rarete]}`),
    zoneAction,
  );

  return {
    element: carte,
    mettreAJour(donnees) {
      const etat = etatCarte(donnees, accessoire);
      const possede = etat.genre === ETAT_CARTE.PORTE || etat.genre === ETAT_CARTE.A_PORTER;
      carte.classList.toggle('garde-robe__carte--porte', etat.genre === ETAT_CARTE.PORTE);
      pastille.hidden = possede;
      zoneAction.replaceChildren(creerAction(accessoire, etat, actions));
    },
  };
}

/** Les filtres : « Tout » puis un bouton par emplacement. Un seul est enfoncé. */
function creerFiltres(quandChoisi) {
  const barre = creer('div', 'garde-robe__filtres');
  barre.setAttribute('role', 'group');
  barre.setAttribute('aria-label', 'Filtrer par emplacement');
  const choix = [FILTRE_TOUT, ...EMPLACEMENTS];
  const boutons = choix.map((filtre) => {
    const libelle = filtre === FILTRE_TOUT ? 'Tout' : NOM_EMPLACEMENT[filtre];
    const bouton = creerBouton(libelle, 'garde-robe__filtre', () => {
      boutons.forEach((autre) => autre.setAttribute('aria-pressed', String(autre === bouton)));
      quandChoisi(filtre);
    });
    bouton.setAttribute('aria-pressed', String(filtre === FILTRE_TOUT));
    return bouton;
  });
  barre.append(...boutons);
  return barre;
}

/**
 * @param {Object} options
 * @param {Object} options.actions `{acheter(id), porter(id), retirer(emplacement)}`.
 * @param {function(URL): Promise<string>} options.chargerSvg Chargeur de SVG partagé par les vignettes.
 * @param {function(string, Error): void} options.signaler Reçoit l'erreur d'une vignette qui ne se dessine pas.
 * @returns {{element: HTMLElement, rafraichir: function(Object): void, rendreLeFocus: function(string): void}}
 */
export function creerGrille({ actions, chargerSvg, signaler }) {
  const cartes = CATALOGUE.map((accessoire) => ({ accessoire, ...creerCarte(accessoire, actions, { chargerSvg, signaler }) }));
  const liste = creer('ul', 'garde-robe__liste');
  const groupe = creer('div', 'garde-robe__grille');

  function filtrer(filtre) {
    for (const { accessoire, element } of cartes) {
      element.hidden = !correspondAuFiltre(filtre, accessoire.emplacement);
    }
  }

  liste.append(...cartes.map(({ element }) => element));
  groupe.append(creer('h2', 'garde-robe__sous-titre', 'Les accessoires'), creerFiltres(filtrer), liste);

  return {
    element: groupe,
    rafraichir(donnees) {
      cartes.forEach(({ mettreAJour }) => mettreAJour(donnees));
    },
    rendreLeFocus(idAccessoire) {
      liste.querySelector(`[data-accessoire="${idAccessoire}"] button`)?.focus();
    },
  };
}
