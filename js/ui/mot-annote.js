// Mot annoté : un mot de la correction, avec son état et ses explications en deux temps.
// Principe 3 du cahier : 1er clic, toucher ou Entrée = indice, 2e = correction et règle (le survol souris montre l'indice).

import { chargerFeuille } from '../coeur/styles.js';

const FEUILLE_MOT_ANNOTE = new URL('../../css/composants/mot-annote.css', import.meta.url);

/** Classe CSS de chaque état. Les états interactifs (indice puis correction) sont `faux`, `fauxPositif`, `manquant`. */
const CLASSES_ETAT = {
  neutre: 'mot-annote--neutre',
  faux: 'mot-annote--faux',
  fauxPositif: 'mot-annote--faux-positif',
  manquant: 'mot-annote--manquant',
  enTrop: 'mot-annote--en-trop',
  corrige: 'mot-annote--corrige',
};

/** Texte lu en plus de la couleur et du soulignement : l'état n'est jamais porté par la couleur seule. */
const MENTIONS_ETAT = {
  faux: ' (faute)',
  fauxPositif: ' (mot juste modifié à tort)',
  manquant: ' (mot manquant)',
  enTrop: ' (mot en trop)',
  corrige: ' (corrigé)',
};

const MARGE_ECRAN_PX = 16;
const MARQUEUR_MANQUANT = '‸'; // ‸ : petit accent circonflexe, à l'endroit du manque

export function chargerStylesMotAnnote() {
  return chargerFeuille(FEUILLE_MOT_ANNOTE);
}

/**
 * Messages affichés à la 1re puis à la 2e activation.
 * @param {string} etat `faux`, `fauxPositif` ou `manquant`.
 * @param {{ indice?: string, correction: string, explication?: string }} details
 * @returns {string[]} `[indice, correction avec règle]`.
 */
export function messagesDeCorrection(etat, { indice, correction, explication = '' }) {
  const regle = explication === '' ? '' : ` ${explication}`;
  if (etat === 'fauxPositif') {
    return ['Ce mot était juste.', `Voici sa forme correcte : ${correction}.${regle}`];
  }
  if (etat === 'manquant') {
    return [indice ?? 'Il manque un mot ici.', `Mot manquant : ${correction}.${regle}`];
  }
  return [indice ?? 'Il y a une faute dans ce mot.', `Correction : ${correction}.${regle}`];
}

function creerEnveloppe(etat) {
  if (!Object.hasOwn(CLASSES_ETAT, etat)) {
    throw new Error(`creerMotAnnote : état inconnu « ${etat} ».`);
  }
  const enveloppe = document.createElement('span');
  enveloppe.className = `mot-annote ${CLASSES_ETAT[etat]}`;
  return enveloppe;
}

function ajouterMention(element, etat) {
  const mention = MENTIONS_ETAT[etat];
  if (!mention) {
    return;
  }
  const lecteur = document.createElement('span');
  lecteur.className = 'sr-seulement';
  lecteur.textContent = mention;
  element.append(lecteur);
}

/**
 * Décalage horizontal (en px) à donner à une bulle pour qu'elle reste entièrement dans l'écran.
 * @param {number} gauche Position gauche du mot, depuis le bord gauche de l'écran.
 * @param {number} largeur Largeur de la bulle.
 * @param {number} largeurEcran Largeur visible de la page.
 * @param {number} marge Espace à garder de chaque côté.
 * @returns {number} Valeur à ajouter à la position gauche (0 si tout tient déjà).
 */
export function decalageHorizontal(gauche, largeur, largeurEcran, marge) {
  const gaucheVoulue = Math.min(gauche, largeurEcran - marge - largeur);
  return Math.max(gaucheVoulue, marge) - gauche;
}

function placerInfo(enveloppe, info) {
  info.style.left = '0px';
  const { left } = enveloppe.getBoundingClientRect();
  const { width } = info.getBoundingClientRect();
  const largeurEcran = document.documentElement.clientWidth;
  info.style.left = `${decalageHorizontal(left, width, largeurEcran, MARGE_ECRAN_PX)}px`;
}

/** Une seule bulle ouverte à la fois : elles se chevaucheraient. */
function fermerLesAutres(enveloppe) {
  for (const autre of document.querySelectorAll('.mot-annote--ouvert')) {
    if (autre !== enveloppe) {
      autre.fermer();
    }
  }
}

function rendreInteractif(enveloppe, bouton, messages) {
  const info = document.createElement('span');
  info.className = 'mot-annote__info';
  info.setAttribute('aria-live', 'polite');
  let etape = 0;
  const afficher = (nouvelleEtape) => {
    etape = nouvelleEtape;
    info.textContent = etape === 0 ? '' : messages[etape - 1];
    enveloppe.classList.toggle('mot-annote--ouvert', etape > 0);
    if (etape > 0) {
      fermerLesAutres(enveloppe);
      placerInfo(enveloppe, info);
    }
  };
  enveloppe.fermer = () => afficher(0);
  // Un clic, un toucher ou Entrée avance : 1 = indice, 2 = correction, 3 = on referme.
  bouton.addEventListener('click', () => afficher(etape >= messages.length ? 0 : etape + 1));
  // À la souris, le survol montre l'indice sans compter comme une étape : le 1er clic le garde affiché.
  bouton.addEventListener('pointerenter', (evenement) => {
    if (evenement.pointerType === 'mouse' && etape === 0) {
      info.textContent = messages[0];
      placerInfo(enveloppe, info);
    }
  });
  bouton.addEventListener('pointerleave', () => {
    if (etape === 0) {
      info.textContent = '';
    }
  });
  enveloppe.append(info);
}

/**
 * Crée un mot annoté. Appeler `chargerStylesMotAnnote()` une fois avant d'en créer.
 * @param {{ mot: string, etat?: string, indice?: string, correction?: string, explication?: string }} options
 *   `mot` est le texte affiché ; `correction` est obligatoire pour `faux`, `fauxPositif` et `manquant`.
 * @returns {HTMLElement}
 */
export function creerMotAnnote({ mot, etat = 'neutre', indice, correction, explication }) {
  const enveloppe = creerEnveloppe(etat);
  const interactif = etat === 'faux' || etat === 'fauxPositif' || etat === 'manquant';
  if (interactif && !correction) {
    throw new Error(`creerMotAnnote : « correction » est obligatoire pour l'état « ${etat} ».`);
  }
  const elementMot = document.createElement(interactif ? 'button' : 'span');
  elementMot.className = 'mot-annote__mot';
  elementMot.textContent = etat === 'manquant' ? MARQUEUR_MANQUANT : mot;
  ajouterMention(elementMot, etat);
  if (interactif) {
    elementMot.type = 'button';
    rendreInteractif(enveloppe, elementMot, messagesDeCorrection(etat, { indice, correction, explication }));
  }
  enveloppe.prepend(elementMot);
  return enveloppe;
}
