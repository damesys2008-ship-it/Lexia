// Page « Quelle progression garder ? » (route '#/compte/choix') : cet appareil et le compte ont chacun du travail,
// et ce n'est pas le même. Rien n'est décidé tant que l'élève n'a pas cliqué : deux cartes, deux boutons, aucun choisi
// d'avance. La progression qu'on ne garde pas reste mise de côté en copie sur l'appareil (voir `synchro-demarrage.js`).

import { chargerFeuille } from '../../coeur/styles.js';
import { creer, creerBouton } from '../../ui/dom.js';
import { aller, chargerStyles } from '../connexion/formulaire.js';
import { decrireUneProgression } from './compte-logique.js';

const FEUILLE_COMPTE = new URL('../../../css/modules/compte.css', import.meta.url);
const INTRODUCTION = 'Cet appareil et ton compte n\'ont pas la même progression. '
  + 'Choisis celle que tu veux garder : l\'autre est mise de côté, tu ne perds rien.';

/**
 * Une carte : où est la progression, ce qu'elle contient, et le bouton qui la garde.
 * @param {Object} options
 * @param {string} options.id Identifiant du titre de la carte (la carte s'y réfère pour son nom accessible).
 * @param {string} options.lieu « Sur cet appareil » ou « Dans ton compte ».
 * @param {Object} options.resume Voir `resumerProgression`.
 * @param {string} options.libelleBouton
 * @param {function(): void} options.auChoix
 * @returns {{carte: HTMLElement, bouton: HTMLButtonElement}}
 */
function creerOption({ id, lieu, resume, libelleBouton, auChoix }) {
  const { titre, contenu, dernierEntrainement } = decrireUneProgression(lieu, resume);
  const carte = creer('section', 'compte-choix__option');
  const titreCarte = creer('h2', 'compte-choix__titre', titre);
  const bouton = creerBouton(libelleBouton, 'bouton--secondaire', auChoix);

  titreCarte.id = id;
  carte.setAttribute('aria-labelledby', titreCarte.id);
  carte.append(titreCarte, creer('p', 'compte-choix__contenu', contenu));
  if (dernierEntrainement !== '') {
    carte.append(creer('p', 'compte-choix__date', dernierEntrainement));
  }
  carte.append(bouton);
  return { carte, bouton };
}

/**
 * Lance un choix : les deux boutons se bloquent pendant l'action. Si le conflit reste, l'action a échoué
 * (elle l'a signalée) : on rouvre les boutons ; sinon on va à la page suivante.
 */
async function choisir({ synchroDemarrage, boutons, action, routeApres }) {
  boutons.forEach((bouton) => { bouton.disabled = true; });
  await action();
  if (synchroDemarrage.conflit() === null) {
    aller(routeApres);
    return;
  }
  boutons.forEach((bouton) => { bouton.disabled = false; });
}

/** Les deux cartes, côte à côte : l'appareil, puis le compte. Aucune n'est choisie d'avance. */
function creerCartes(synchroDemarrage, conflit) {
  const boutons = [];
  const choix = (action, routeApres) => () => choisir({ synchroDemarrage, boutons, action, routeApres });
  const appareil = creerOption({
    id: 'choix-appareil',
    lieu: 'Sur cet appareil',
    resume: conflit.local,
    libelleBouton: 'Garder celle de cet appareil',
    auChoix: choix(() => synchroDemarrage.garderCetAppareil(), 'compte'),
  });
  const compte = creerOption({
    id: 'choix-compte',
    lieu: 'Dans ton compte',
    resume: conflit.distant,
    libelleBouton: 'Garder celle du compte',
    auChoix: choix(() => synchroDemarrage.prendreLeCompte(), 'accueil'),
  });
  boutons.push(appareil.bouton, compte.bouton);
  const cartes = creer('div', 'compte-choix__cartes');
  cartes.append(appareil.carte, compte.carte);
  return cartes;
}

/**
 * Monte la page de choix. Sans choix à faire (page rechargée, déjà réglé), elle mène à « Mon compte ».
 * @param {HTMLElement} conteneur
 * @param {Object} contexte Contexte de l'application (`synchroDemarrage`).
 * @returns {Promise<void>}
 */
export async function monter(conteneur, contexte) {
  const conflit = contexte.synchroDemarrage.conflit();
  if (conflit === null) {
    window.location.replace('#/compte');
    return;
  }
  await Promise.all([chargerStyles(), chargerFeuille(FEUILLE_COMPTE)]);

  const page = creer('section', 'compte-choix contenu__centre');
  page.append(
    creer('h1', 'connexion__titre', 'Quelle progression garder ?'),
    creer('p', 'connexion__intro', INTRODUCTION),
    creerCartes(contexte.synchroDemarrage, conflit),
  );
  conteneur.replaceChildren(page);
}
