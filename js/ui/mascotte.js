/**
 * La mascotte : Pompon, en SVG, habillé de calques d'accessoires.
 * Le SVG est chargé depuis `assets/mascotte/` puis importé nœud par nœud
 * (DOMParser + importNode) : jamais d'`innerHTML`.
 * Les animations sont dans `css/composants/mascotte.css`, pilotées par les attributs
 * `data-etat` (le mouvement) et `data-expression` (le visage).
 */

import { chargerFeuille } from '../coeur/styles.js';
import {
  CATALOGUE,
  equiperAccessoire,
  retirerAccessoire,
  trouverAccessoire,
} from '../coeur/accessoires.js';

/**
 * Les états de la mascotte et le visage de chacun. Les cinq premiers sont ceux des écrans appelants :
 * repos = Content, content = Bravo !, encourage = Presque !, pense = Je réfléchis, fete = Waouh !.
 */
const EXPRESSION_PAR_ETAT = {
  repos: 'content',
  content: 'bravo',
  encourage: 'presque',
  pense: 'reflechis',
  fete: 'waouh',
  fier: 'fier',
  dodo: 'dodo',
  calin: 'calin',
  coucou: 'content',
};

export const ETATS = Object.keys(EXPRESSION_PAR_ETAT);

const ETAT_INITIAL = 'repos';
const ESPACE_SVG = 'http://www.w3.org/2000/svg';
const URL_POMPON = new URL('../../assets/mascotte/pompon.svg', import.meta.url);
const FEUILLE_MASCOTTE = new URL('../../css/composants/mascotte.css', import.meta.url);
const URL_DOSSIER_CALQUES = new URL('../../assets/mascotte/accessoires/', import.meta.url);
const DESCRIPTION = 'Une petite créature blanche aux pompons roses, qui réagit à tes réponses.';

/** Numéro de la prochaine mascotte : sert à fabriquer des identifiants uniques et prévisibles. */
let prochainNumero = 1;

/**
 * Charge le texte d'un fichier SVG du site.
 * @param {URL} adresse
 * @returns {Promise<string>}
 * @throws {Error} Si le fichier n'est pas servi.
 */
async function chargerSvgParDefaut(adresse) {
  const reponse = await fetch(adresse);
  if (!reponse.ok) {
    throw new Error(`Impossible de charger ${adresse.href} (HTTP ${reponse.status})`);
  }
  return reponse.text();
}

/** Transforme un texte SVG en élément du document donné. */
function lireSvg(texte, document) {
  const analyseur = new document.defaultView.DOMParser();
  const lu = analyseur.parseFromString(texte, 'image/svg+xml');
  if (lu.querySelector('parsererror')) {
    throw new Error('Fichier SVG invalide');
  }
  return document.importNode(lu.documentElement, true);
}

/** Ajoute le titre et la description lus par les lecteurs d'écran. */
function rendreAccessible(svg, titre, document) {
  const identifiant = `mascotte-${prochainNumero}`;
  prochainNumero += 1;
  const elementTitre = document.createElementNS(ESPACE_SVG, 'title');
  const elementDescription = document.createElementNS(ESPACE_SVG, 'desc');
  elementTitre.id = `${identifiant}-titre`;
  elementTitre.textContent = titre;
  elementDescription.id = `${identifiant}-desc`;
  elementDescription.textContent = DESCRIPTION;
  svg.prepend(elementTitre, elementDescription);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-labelledby', `${elementTitre.id} ${elementDescription.id}`);
}

/** Enveloppe le contenu d'un calque dans un groupe identifiable. */
function creerGroupeCalque(svgCalque, accessoire, document) {
  const groupe = document.createElementNS(ESPACE_SVG, 'g');
  groupe.dataset.accessoire = accessoire.id;
  groupe.append(...svgCalque.childNodes);
  return groupe;
}

/**
 * @param {SVGElement} element Le SVG de la mascotte.
 * @param {string} nom Un des `EMPLACEMENTS` : `tete`, `pompons`, `visage`, `col`, `corps`, `dos`, `main`, `queue` ou `pieds`.
 * @returns {SVGElement} Le groupe qui reçoit l'accessoire de cet emplacement.
 * @throws {Error} Si le SVG n'a pas cet emplacement.
 */
function trouverEmplacement(element, nom) {
  const groupe = element.querySelector(`[data-emplacement="${nom}"]`);
  if (!groupe) {
    throw new Error(`Le SVG de Pompon n'a pas d'emplacement « ${nom} »`);
  }
  return groupe;
}

/**
 * Pose l'état sur l'élément. Reposer le même état rejoue son animation.
 * @param {SVGElement} element
 * @param {string} etat Un des `ETATS`.
 * @throws {RangeError} Si l'état est inconnu.
 */
function changerEtat(element, etat) {
  if (!ETATS.includes(etat)) {
    throw new RangeError(`État de mascotte inconnu : ${etat}`);
  }
  delete element.dataset.etat;
  element.getBoundingClientRect(); // force le recalcul pour que l'animation reparte
  element.dataset.etat = etat;
  element.dataset.expression = EXPRESSION_PAR_ETAT[etat];
}

/**
 * Crée une fonction qui charge le texte d'un calque, une seule fois par accessoire.
 * Le calque de l'accessoire `beret` est `assets/mascotte/accessoires/beret.svg`.
 * @param {function(URL): Promise<string>} chargerSvg
 * @returns {function(Object): Promise<string>}
 */
function creerCacheCalques(chargerSvg) {
  const textes = new Map();
  return async (accessoire) => {
    if (!textes.has(accessoire.id)) {
      textes.set(accessoire.id, await chargerSvg(new URL(`${accessoire.id}.svg`, URL_DOSSIER_CALQUES)));
    }
    return textes.get(accessoire.id);
  };
}

/**
 * L'habillage de la mascotte : les accessoires portés, un par emplacement, dessinés dans le SVG.
 * @param {SVGElement} element Le SVG de la mascotte.
 * @param {Object} options `{chargerSvg, document, signaler}`, comme ceux de `creerMascotte`.
 * @returns {{equiper: function(string): Promise<void>, retirer: function(string): void,
 *   equipes: function(): Object<string, string>}}
 */
function creerHabillage(element, { chargerSvg, document, signaler }) {
  const lireTexteCalque = creerCacheCalques(chargerSvg);
  let equipes = {};

  /** @returns {Promise<SVGElement|null>} `null` si le fichier du calque manque : l'accessoire n'est pas dessiné. */
  async function dessinerCalque(accessoire) {
    try {
      const calque = lireSvg(await lireTexteCalque(accessoire), document);
      return creerGroupeCalque(calque, accessoire, document);
    } catch (erreur) {
      signaler(`Calque non dessiné pour ${accessoire.id} : ${erreur.message}`);
      return null;
    }
  }

  return {
    /**
     * Équipe un accessoire, à la place de celui qui occupe son emplacement.
     * Si son calque manque, il est équipé mais pas dessiné (et signalé).
     * @throws {RangeError} Si l'identifiant est inconnu.
     */
    async equiper(id) {
      const accessoire = trouverAccessoire(id);
      const emplacement = trouverEmplacement(element, accessoire.emplacement);
      const groupe = await dessinerCalque(accessoire);
      emplacement.replaceChildren(...(groupe ? [groupe] : []));
      equipes = equiperAccessoire(equipes, id);
    },
    /** @param {string} emplacement Un des `EMPLACEMENTS`, par exemple `col`. */
    retirer(emplacement) {
      equipes = retirerAccessoire(equipes, emplacement);
      trouverEmplacement(element, emplacement).replaceChildren();
    },
    equipes: () => ({ ...equipes }),
  };
}

/**
 * Crée la mascotte.
 * @param {Object} [options]
 * @param {Object<string, string>} [options.accessoiresEquipes] Identifiant équipé par emplacement.
 *   Un identifiant absent du catalogue est ignoré et signalé.
 * @param {string} [options.titre] Nom accessible, par exemple le nom donné à la mascotte.
 * @param {function(URL): Promise<string>} [options.chargerSvg] Chargeur de SVG (injectable pour les tests).
 * @param {Document} [options.document] Document cible (injectable pour les tests).
 * @param {function(string): void} [options.signaler] Reçoit un message quand un accessoire est ignoré ou que son calque manque.
 * @returns {Promise<{element: SVGSVGElement, definirEtat: function(string): void,
 *   equiper: function(string): Promise<void>, retirer: function(string): void,
 *   equipes: function(): Object<string, string>}>}
 */
export async function creerMascotte({
  accessoiresEquipes = {},
  titre = 'Pompon',
  chargerSvg = chargerSvgParDefaut,
  document = globalThis.document,
  signaler = () => {},
} = {}) {
  await chargerFeuille(FEUILLE_MASCOTTE, document);
  const element = lireSvg(await chargerSvg(URL_POMPON), document);
  const habillage = creerHabillage(element, { chargerSvg, document, signaler });

  element.classList.add('mascotte');
  changerEtat(element, ETAT_INITIAL);
  rendreAccessible(element, titre, document);

  for (const id of Object.values(accessoiresEquipes)) {
    if (CATALOGUE.some((accessoire) => accessoire.id === id)) {
      await habillage.equiper(id);
    } else {
      signaler(`Accessoire inconnu ignoré : ${id}`);
    }
  }

  return { element, definirEtat: (etat) => changerEtat(element, etat), ...habillage };
}
