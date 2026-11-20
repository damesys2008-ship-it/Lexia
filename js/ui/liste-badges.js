// Liste de badges : une carte par badge, avec un anneau de progression (ou un disque coche quand il est gagné),
// son nom, puis « Gagné ! » ou ce qu'il reste à faire. L'état est toujours écrit en toutes lettres,
// jamais porté par la couleur ou l'anneau seuls.
// Réutilisée par l'écran « Mes badges » et par le Carnet.

import { compterAcquis, compterJoursEntrainement, restantPourGagner } from '../coeur/badges.js';
import { creer } from './dom.js';

const ESPACE_SVG = 'http://www.w3.org/2000/svg';
const PHRASE_MAITRISE = "Réussis les mêmes exercices à plusieurs jours d'écart.";
const PHRASE_GAGNE = 'Gagné !';

// L'anneau : un cercle de 88 px, le trait de 8 px, et la longueur du cercle pour dessiner la part faite.
const TAILLE_ANNEAU = 88;
const EPAISSEUR_ANNEAU = 8;
const RAYON_ANNEAU = (TAILLE_ANNEAU - EPAISSEUR_ANNEAU) / 2;
const LONGUEUR_ANNEAU = 2 * Math.PI * RAYON_ANNEAU;

/** La couleur de l'anneau de chaque badge de maîtrise : celle de sa matière. Les badges de régularité sont jaunes. */
const MATIERE_DU_BADGE = {
  'maitrise-homophones': 'orthographe',
  'maitrise-orthographe': 'orthographe',
  'maitrise-grammaire': 'grammaire',
  'maitrise-vocabulaire': 'vocabulaire',
  'maitrise-dictee': 'dictee',
  'maitrise-conjugaison': 'conjugaison',
};
const COULEUR_PAR_DEFAUT = 'regularite';

/**
 * « 0 jour », « 1 jour », « 12 jours ».
 * @param {number} nombre
 * @returns {string}
 */
export function libelleJours(nombre) {
  return `${nombre} ${nombre > 1 ? 'jours' : 'jour'}`;
}

/** Ce qu'il faut faire pour gagner le badge, sans chiffre pour la maîtrise. */
function phraseDeBadgeAGagner(badge, donnees) {
  const restant = restantPourGagner(badge, donnees);
  if (restant === null) {
    return PHRASE_MAITRISE;
  }
  return `Encore ${libelleJours(restant)} d'entraînement.`;
}

/** La part déjà faite d'un badge, entre 0 et 1. */
function partFaite(badge, donnees) {
  if (badge.groupe === 'regularite') {
    return Math.min(1, compterJoursEntrainement(donnees) / badge.jours);
  }
  return Math.min(1, compterAcquis(donnees.repetition, badge.familles) / badge.seuil);
}

function creerElementSvg(balise, classe, attributs) {
  const element = document.createElementNS(ESPACE_SVG, balise);
  element.setAttribute('class', classe);
  for (const [nom, valeur] of Object.entries(attributs)) {
    element.setAttribute(nom, String(valeur));
  }
  return element;
}

/** Le disque d'un badge : l'anneau de progression, ou un disque plein avec une coche quand il est gagné. */
function creerDisque({ badge, gagne }, donnees) {
  const centre = TAILLE_ANNEAU / 2;
  const disque = creerElementSvg('svg', 'liste-badges__disque', {
    viewBox: `0 0 ${TAILLE_ANNEAU} ${TAILLE_ANNEAU}`,
    'aria-hidden': 'true',
  });
  if (gagne) {
    disque.append(
      creerElementSvg('circle', 'liste-badges__plein', { cx: centre, cy: centre, r: centre }),
      creerElementSvg('path', 'liste-badges__coche', { d: 'M28 45 L40 57 L61 33' }),
    );
    return disque;
  }
  const reste = LONGUEUR_ANNEAU * (1 - partFaite(badge, donnees));
  const cercle = { cx: centre, cy: centre, r: RAYON_ANNEAU };
  disque.append(
    creerElementSvg('circle', 'liste-badges__piste', cercle),
    creerElementSvg('circle', 'liste-badges__progres', {
      ...cercle,
      transform: `rotate(-90 ${centre} ${centre})`,
      'stroke-dasharray': LONGUEUR_ANNEAU,
      'stroke-dashoffset': reste,
    }),
  );
  return disque;
}

/** Une carte : le disque, le nom, puis l'état en texte. */
function creerCarteBadge(entree, donnees) {
  const { badge, gagne } = entree;
  const carte = creer('li', 'liste-badges__carte');
  const corps = creer('div', 'liste-badges__corps');
  carte.dataset.badge = badge.id;
  carte.classList.add(`liste-badges__carte--${MATIERE_DU_BADGE[badge.id] ?? COULEUR_PAR_DEFAUT}`);
  carte.classList.toggle('liste-badges__carte--gagne', gagne);
  corps.append(
    creer('h3', 'liste-badges__nom', badge.nom),
    creer('p', 'liste-badges__etat', gagne ? PHRASE_GAGNE : phraseDeBadgeAGagner(badge, donnees)),
  );
  carte.append(creerDisque(entree, donnees), corps);
  return carte;
}

/**
 * La liste des badges donnés, dans l'ordre reçu.
 * @param {{badge: import('../coeur/badges.js').Badge, gagne: boolean}[]} entrees Voir `badgesAffiches`.
 * @param {Object} donnees Données de Lexia (pour compter les jours qui restent et la part faite).
 * @returns {HTMLUListElement}
 */
export function creerListeBadges(entrees, donnees) {
  const liste = creer('ul', 'liste-badges');
  liste.append(...entrees.map((entree) => creerCarteBadge(entree, donnees)));
  return liste;
}
