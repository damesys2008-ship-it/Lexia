/**
 * Écran de fin de série : à gauche Pompon et sa bulle, à droite la carte avec « Bravo, quelle série ! », les étoiles
 * gagnées et leur détail, ce que l'élève peut s'offrir, puis les boutons. Les textes sont posés avec `textContent`.
 * Le calcul des récompenses est fait en amont par `cloturerExercice` (js/coeur/recompenses.js).
 */

import { estGrosSucces } from '../coeur/recompenses.js';
import { chargerFeuille } from '../coeur/styles.js';
import { creerBulle } from './bulle.js';
import { creerMascotte } from './mascotte.js';

const FEUILLE_FIN_SEANCE = new URL('../../css/composants/fin-seance.css', import.meta.url);
const MESSAGE_SON_INDISPONIBLE = 'Le son ne marche pas ici.';
const ESPACE_INSECABLE = ' ';
const ROUTE_GARDE_ROBE = '#/garde-robe';

function creerElement(document, balise, classe, texte = '') {
  const element = document.createElement(balise);
  element.className = classe;
  element.textContent = texte;
  return element;
}

function creerBouton(document, texte, classe, action) {
  const bouton = creerElement(document, 'button', `bouton ${classe}`, texte);
  bouton.type = 'button';
  bouton.addEventListener('click', action);
  return bouton;
}

/** La rangée décorative ne dépasse pas ce nombre d'étoiles : le gain exact est dit par le texte « +N étoiles gagnées ». */
export const ETOILES_DECORATIVES_MAX = 5;

/** Une rangée d'étoiles décoratives (au plus ETOILES_DECORATIVES_MAX), qui apparaissent l'une après l'autre. */
function creerRangeeEtoiles(document, nombre) {
  const rangee = creerElement(document, 'p', 'fin-seance__etoiles');
  rangee.setAttribute('aria-hidden', 'true');
  for (let numero = 0; numero < Math.min(nombre, ETOILES_DECORATIVES_MAX); numero += 1) {
    rangee.append(creerElement(document, 'span', 'fin-seance__etoile', '★'));
  }
  return rangee;
}

/** « +30 étoiles gagnées » : le nombre en grand, puis le libellé (« étoile gagnée » au singulier). */
function creerGain(document, nombre) {
  const gain = creerElement(document, 'p', 'fin-seance__gain');
  const libelle = nombre > 1 ? 'étoiles gagnées' : 'étoile gagnée';
  gain.append(creerElement(document, 'span', 'fin-seance__nombre', `+${nombre}`), ' ', creerElement(document, 'span', 'fin-seance__libelle', libelle));
  return gain;
}

/** Le bloc jaune : la rangée d'étoiles et le gain. */
function creerBlocDeGain(document, bilan) {
  const bloc = creerElement(document, 'div', 'fin-seance__bloc-gain');
  bloc.append(creerRangeeEtoiles(document, bilan.etoilesGagnees), creerGain(document, bilan.etoilesGagnees));
  return bloc;
}

function creerLigneDeDetail(document, libelle, etoiles) {
  const ligne = creerElement(document, 'li', 'fin-seance__ligne');
  const valeur = creerElement(document, 'span', 'fin-seance__valeur', `+${etoiles}`);
  valeur.append(creerElement(document, 'span', 'sr-seulement', ` ${etoiles > 1 ? 'étoiles' : 'étoile'}`));
  ligne.append(creerElement(document, 'span', 'fin-seance__ligne-texte', libelle), valeur);
  return ligne;
}

/**
 * Le détail du gain, d'après la formule réelle : l'exercice terminé, puis « Aucune erreur » et « Défi complet »
 * quand ils comptent. Un bilan écrit à la main, sans `etoilesSansErreur`, n'a pas cette ligne.
 */
function creerDetailDuGain(document, bilan) {
  const { etoilesGagnees, bonusDefi = 0, etoilesSansErreur = 0 } = bilan;
  const liste = creerElement(document, 'ul', 'fin-seance__detail');
  liste.append(creerLigneDeDetail(document, '1 exercice terminé', etoilesGagnees - bonusDefi - etoilesSansErreur));
  if (etoilesSansErreur > 0) {
    liste.append(creerLigneDeDetail(document, 'Aucune erreur', etoilesSansErreur));
  }
  if (bonusDefi > 0) {
    liste.append(creerLigneDeDetail(document, 'Défi complet', bonusDefi));
  }
  return liste;
}

/**
 * La phrase sur la garde-robe : de quoi s'offrir l'accessoire le moins cher, ou combien il manque.
 * Rien quand l'élève les a tous (ou que le bilan n'a pas de `prochainAchat`).
 * @param {Object} bilan
 * @returns {string} Vide s'il n'y a rien à proposer.
 */
export function phraseDeLaGardeRobe(bilan) {
  const { prochainAchat = null, soldeEtoiles = bilan.totalEtoiles } = bilan;
  if (prochainAchat === null) {
    return '';
  }
  const nom = `«${ESPACE_INSECABLE}${prochainAchat.nom}${ESPACE_INSECABLE}»`;
  const debut = `Tu as maintenant ${soldeEtoiles} ★${ESPACE_INSECABLE}:`;
  if (soldeEtoiles >= prochainAchat.prix) {
    return `${debut} de quoi t'offrir ${nom}${ESPACE_INSECABLE}!`;
  }
  return `${debut} encore ${prochainAchat.prix - soldeEtoiles} ★ pour ${nom}${ESPACE_INSECABLE}!`;
}

/**
 * Une ligne « Nouveau badge : <nom> » puis le texte du badge, pour chaque badge gagné.
 * Un bilan sans `badgesGagnes` (écrit à la main) n'annonce rien.
 * L'espace avant les deux-points est insécable.
 */
function creerLignesDeBadges(document, bilan) {
  return (bilan.badgesGagnes ?? []).flatMap((badge) => [
    creerElement(document, 'p', 'fin-seance__badge', `Nouveau badge${ESPACE_INSECABLE}: ${badge.nom}`),
    creerElement(document, 'p', 'fin-seance__badge-texte', badge.texte),
  ]);
}

/** Le titre de l'écran : il reçoit le focus quand l'écran apparaît. */
function creerTitre(document, texte) {
  const titre = creerElement(document, 'h2', 'fin-seance__titre', texte);
  titre.tabIndex = -1;
  return titre;
}

/** Les boutons : la garde-robe, « Rejouer » (ou `libelleSuite`) s'il y a une suite, puis le retour à l'accueil. */
function creerZoneActions(document, { actions, libelleSuite }) {
  const zone = creerElement(document, 'div', 'fin-seance__actions');
  const gardeRobe = creerElement(document, 'a', 'bouton bouton--principal', 'Aller à la garde-robe');
  gardeRobe.href = ROUTE_GARDE_ROBE;
  zone.append(gardeRobe);
  if (actions.encoreUn) {
    zone.append(creerBouton(document, libelleSuite, 'bouton--secondaire', actions.encoreUn));
  }
  zone.append(creerBouton(document, "Retour à l'accueil", 'bouton--discret', actions.accueil));
  return zone;
}

/** Choisit la phrase de la mascotte et le son ; `situation` force la phrase. */
function choisirSituation(bilan, situation) {
  if (situation) {
    return { situation, son: estGrosSucces(bilan) ? 'fin' : null };
  }
  if (estGrosSucces(bilan)) {
    return { situation: 'reussite', son: 'fin' };
  }
  return { situation: 'encouragement', son: null };
}

/** Joue le son de fin (s'il y en a un) ; s'il ne peut pas être joué, le dit à l'écran et signale l'erreur. */
function jouerLeSonDeFin({ sons, son, retourSon, signaler }) {
  if (!son) {
    return;
  }
  sons.jouer(son).catch((erreur) => {
    retourSon.textContent = MESSAGE_SON_INDISPONIBLE;
    signaler(erreur);
  });
}

/** La carte blanche : pastille, titre, gain, détail, phrase de la garde-robe, badges, note et boutons. */
function creerCarte(document, { bilan, titre, pastille, note, actions, libelleSuite }) {
  const carte = creerElement(document, 'div', 'fin-seance__carte');
  const phrase = phraseDeLaGardeRobe(bilan);
  carte.append(
    creerElement(document, 'p', 'fin-seance__pastille', pastille),
    titre,
    creerBlocDeGain(document, bilan),
    creerDetailDuGain(document, bilan),
    ...(phrase ? [creerElement(document, 'p', 'fin-seance__total', phrase)] : []),
    ...creerLignesDeBadges(document, bilan),
    creerZoneActions(document, { actions, libelleSuite }),
    ...(note ? [creerElement(document, 'p', 'fin-seance__total', note)] : []),
  );
  return carte;
}

/**
 * Construit l'écran de fin de série.
 * @param {Object} options
 * @param {import('../coeur/recompenses.js').Bilan} options.bilan Résultat de `cloturerExercice`.
 * @param {{jouer: function(string): Promise<void>}} options.sons Lecteur de sons.
 * @param {{dire: function(string): string}} options.parleur Parleur de `phrases-mascotte.js`.
 * @param {{encoreUn: (function(): void)|undefined, accueil: function(): void}} options.actions Navigation ;
 *   sans `encoreUn`, il n'y a pas de bouton de suite.
 * @param {string} [options.titre] Titre de l'écran (« Bravo, quelle série ! » par défaut).
 * @param {string} [options.pastille] Texte de la pastille verte (« Série terminée » par défaut).
 * @param {string} [options.libelleSuite] Texte du bouton de suite (« Rejouer » par défaut).
 * @param {string} [options.situation] Force la phrase de la mascotte (ex. `finDefi`).
 * @param {string} [options.note] Ligne de texte sous les boutons.
 * @param {function(Error): void} [options.signaler] Reçoit l'erreur d'origine quand le son ne peut pas être joué.
 * @param {Object<string, string>} [options.accessoiresEquipes] Tenue actuelle de la mascotte.
 * @param {string} [options.nomMascotte] Nom de la mascotte, pour le lecteur d'écran.
 * @param {Document} [options.document]
 * @returns {Promise<{racine: HTMLElement, focaliser: function(): void}>} La racine à insérer dans la page,
 *   puis `focaliser()` à appeler une fois insérée : le titre prend le focus, le lecteur d'écran le lit.
 */
export async function creerFinSeance({
  bilan,
  sons,
  parleur,
  actions,
  titre: texteTitre = 'Bravo, quelle série !',
  pastille = 'Série terminée',
  libelleSuite = 'Rejouer',
  situation: situationForcee,
  note = '',
  accessoiresEquipes = {},
  nomMascotte = 'Pompon',
  signaler = () => {},
  document = globalThis.document,
}) {
  await chargerFeuille(FEUILLE_FIN_SEANCE, document);
  const racine = creerElement(document, 'section', 'fin-seance');
  const panneau = creerElement(document, 'div', 'fin-seance__panneau');
  const scene = creerElement(document, 'div', 'fin-seance__scene');
  const retourSon = creerElement(document, 'p', 'fin-seance__retour-son');
  const { situation, son } = choisirSituation(bilan, situationForcee);
  const titre = creerTitre(document, texteTitre);
  const mascotte = await creerMascotte({ accessoiresEquipes, titre: nomMascotte, document });
  const bulle = await creerBulle(document);

  mascotte.definirEtat(estGrosSucces(bilan) ? 'fete' : 'encourage');
  bulle.parler(parleur.dire(situation));
  scene.append(mascotte.element);
  panneau.append(bulle.element, scene, retourSon);
  racine.append(panneau, creerCarte(document, { bilan, titre, pastille, note, actions, libelleSuite }));
  jouerLeSonDeFin({ sons, son, retourSon, signaler });
  return { racine, focaliser: () => titre.focus() };
}
