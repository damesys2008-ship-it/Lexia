// Page d'accueil d'une matière (hub) : le même gabarit pour les six matières.
// Retour, icône et titre, niveau du module, une carte par jeu, puis Pompon et sa bulle en bas à droite.

import { libelleDuNiveau, niveauDuJeu, pointsDeNiveau } from '../coeur/hub-stats.js';
import { niveauModule } from '../coeur/progression.js';
import { chargerFeuille } from '../coeur/styles.js';
import { creer } from './dom.js';
import { creerMascotte } from './mascotte.js';
import { monterPropositionNiveau } from './proposition-niveau.js';

const FEUILLE_HUB = new URL('../../css/modules/hub.css', import.meta.url);
const FEUILLE_BULLE = new URL('../../css/composants/bulle.css', import.meta.url);
const DOSSIER_ICONES = new URL('../../assets/icones/matieres/', import.meta.url);

const NOM_COMPAGNON_PAR_DEFAUT = 'Pompon';
const ESPACE_INSECABLE = ' ';
const PHRASE_DU_COMPAGNON = "Choisis un jeu, je t'attends.";

/**
 * @typedef {Object} JeuDuHub
 * @property {string} mode Le jeu dans le module, tel qu'enregistré dans l'historique (`audio`, `a`, `tri`…).
 * @property {string} href Destination, par exemple '#/dictee/audio'.
 * @property {string} titre
 * @property {string} description
 */

/** L'icône de la matière : décorative, le titre à côté dit la matière. */
function creerIconeDeMatiere(module) {
  const conteneur = creer('span', 'hub__icone');
  const image = creer('img', 'hub__image');
  image.src = new URL(`${module}.svg`, DOSSIER_ICONES).href;
  image.alt = '';
  conteneur.append(image);
  return conteneur;
}

/** Les trois points de niveau (décoratifs : le texte voisin dit le niveau). */
function creerPoints(niveau) {
  const points = creer('span', 'hub__points');
  points.setAttribute('aria-hidden', 'true');
  points.append(...pointsDeNiveau(niveau).map((plein) => creer('span', plein ? 'hub__point est-plein' : 'hub__point')));
  return points;
}

/** Une carte de jeu : icône et titre, description, puis les points de niveau et la flèche. */
function creerCarteJeu(jeu, module, historique) {
  const niveau = niveauDuJeu(historique, module, jeu.mode);
  const carte = creer('a', 'carte-jeu');
  const entete = creer('span', 'carte-jeu__entete');
  const pied = creer('span', 'carte-jeu__pied');
  const fleche = creer('span', 'carte-jeu__fleche');
  carte.href = jeu.href;
  fleche.setAttribute('aria-hidden', 'true');
  entete.append(creerIconeDeMatiere(module), creer('span', 'carte-jeu__titre', jeu.titre));
  pied.append(creerPoints(niveau), creer('span', 'carte-jeu__niveau', libelleDuNiveau(niveau)), fleche);
  carte.append(entete, creer('span', 'carte-jeu__description', jeu.description));
  carte.append(pied);
  return carte;
}

/** Pompon et sa bulle : la phrase ne change pas, la bulle n'est donc pas une région « status ». */
async function creerCompagnon(contexte, donnees) {
  const { profil, accessoires } = donnees;
  const mascotte = await creerMascotte({
    accessoiresEquipes: accessoires.equipes,
    titre: profil.nomMascotte || NOM_COMPAGNON_PAR_DEFAUT,
    signaler: contexte.signaler,
  });
  const bulle = creer('div', 'bulle');
  const compagnon = creer('div', 'hub__compagnon');
  bulle.append(creer('p', 'bulle__texte', PHRASE_DU_COMPAGNON));
  compagnon.append(bulle, mascotte.element);
  return compagnon;
}

/** La pilule « Ton niveau : N ». Les points sont dessinés par le CSS d'après `data-niveau`. */
function creerPastilleDeNiveau(niveau) {
  const pastille = creer('p', 'hub__niveau', `Ton niveau${ESPACE_INSECABLE}: ${niveau}`);
  pastille.dataset.niveau = String(niveau);
  return pastille;
}

/** Quand l'élève accepte un autre niveau, la proposition réécrit le texte : les points suivent. */
function suivreLeNiveauAffiche(pastille) {
  const lireNiveau = () => pastille.textContent.trim().at(-1);
  new MutationObserver(() => {
    pastille.dataset.niveau = lireNiveau();
  }).observe(pastille, { childList: true, characterData: true, subtree: true });
}

function creerEntete(module, titre, niveau) {
  const entete = creer('div', 'hub__entete');
  const identite = creer('div', 'hub__identite');
  const pastille = creerPastilleDeNiveau(niveau);
  identite.append(creerIconeDeMatiere(module), creer('h1', 'hub__titre', titre));
  entete.append(identite, pastille);
  suivreLeNiveauAffiche(pastille);
  return entete;
}

/**
 * Construit le hub d'une matière (pas encore affiché : l'appelant fait `conteneur.replaceChildren(page)`).
 * @param {Object} contexte Contexte de l'application.
 * @param {Object} matiere
 * @param {string} matiere.module Clé de la matière (`dictee`, `lecture`…).
 * @param {string} matiere.titre Nom affiché (« Dictée »).
 * @param {JeuDuHub[]} matiere.jeux Les jeux, dans l'ordre d'affichage.
 * @returns {Promise<{page: HTMLElement, grille: HTMLElement, cartes: HTMLAnchorElement[]}>}
 */
export async function creerHubMatiere(contexte, { module, titre, jeux }) {
  await Promise.all([chargerFeuille(FEUILLE_HUB), chargerFeuille(FEUILLE_BULLE)]);
  const donnees = contexte.stockage.lire();
  const page = creer('section', `hub hub--${module}`);
  const retour = creer('a', 'hub__retour', "Retour à l'accueil");
  const grille = creer('div', 'hub__cartes');
  const cartes = jeux.map((jeu) => creerCarteJeu(jeu, module, donnees.historique));
  retour.href = '#/accueil';
  grille.append(...cartes);
  page.append(retour, creerEntete(module, titre, niveauModule(donnees, module)), grille, await creerCompagnon(contexte, donnees));
  await monterPropositionNiveau(page, contexte, module);
  return { page, grille, cartes };
}
