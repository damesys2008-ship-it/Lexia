// Le contexte : l'unique objet que le routeur donne à chaque écran.
// Il assemble les services (stockage, sons, voix) et les réglages d'affichage ;
// les écrans ne créent jamais ces services eux-mêmes.

import { estModeDeveloppement, NOM_SITE, VERSION_SITE } from '../config.js';
import { afficherToast } from '../ui/toast.js';
import { creerSons } from './sons.js';
import { creerStockage } from './stockage.js';
import { creerVoix } from './voix.js';

/**
 * @typedef {Object} Contexte
 * @property {{lire: function(): Object, ecrire: function(Object): void, estPersistant: function(): boolean}} stockage
 * @property {Object} sons Service de `sons.js` (jouer, couper, reactiver, definirVolume…).
 * @property {Object} voix Service de `voix.js` (etat, lire, tester, arreter).
 * @property {{nomSite: string, version: string, modeDeveloppement: boolean}} config
 * @property {function(): Object} lireReglages Réglages courants (copie des données stockées).
 * @property {function(Object): void} modifierReglages Enregistre un changement de réglages et l'applique tout de suite.
 * @property {function(): void} appliquerReglages Pose les classes d'affichage sur <html>.
 * @property {function(): boolean} profilCree Vrai quand le premier lancement est terminé.
 * @property {function(string, Error=): void} signaler Journal des anomalies non fatales (à passer aux composants qui en acceptent un).
 */

const LIBELLE_COUPER_SON = 'Couper le son';
const LIBELLE_REMETTRE_SON = 'Remettre le son';

/** Support qui échoue à chaque appel : le stockage passe alors en « session seulement » et le dit. */
const SUPPORT_INDISPONIBLE = {
  getItem() {
    throw new Error('Le stockage du navigateur est bloqué.');
  },
  setItem() {
    throw new Error('Le stockage du navigateur est bloqué.');
  },
};

/** Lit `window.localStorage`, que certains navigateurs bloquent en levant une exception. */
function lireSupportDeStockage(fenetre) {
  try {
    return fenetre.localStorage ?? SUPPORT_INDISPONIBLE;
  } catch {
    return SUPPORT_INDISPONIBLE;
  }
}

/** Fabrique un contexte audio, avec le nom préfixé de Safari quand il faut. */
function fabriquerContexteAudio(fenetre) {
  const Constructeur = fenetre.AudioContext ?? fenetre.webkitAudioContext;
  if (!Constructeur) {
    throw new Error("Cet appareil n'a pas de sortie audio (AudioContext absent).");
  }
  return new Constructeur();
}

/** Journal des anomalies non fatales : visible dans la console, jamais avalé. */
function signalerDansLaConsole(message, erreur) {
  console.warn(message, erreur);
}

/** Affiche un message de stockage à l'élève sans jamais faire planter l'appelant. */
function signalerAuToast(message, erreur) {
  afficherToast(message).catch((echecToast) => {
    console.error(message, erreur, echecToast);
  });
}

/**
 * Pose les classes d'affichage sur <html> selon les réglages.
 * @param {Document} document
 * @param {{texteGrand: boolean, animationsReduites: boolean, lettresFaciles: boolean}} reglages
 */
function poserClassesDAffichage(document, reglages) {
  const racine = document.documentElement;
  racine.classList.toggle('texte-grand', reglages.texteGrand);
  racine.classList.toggle('animations-reduites', reglages.animationsReduites);
  racine.classList.toggle('lettres-faciles', reglages.lettresFaciles);
}

/**
 * Branche le bouton muet de l'en-tête et renvoie la fonction qui met son état à jour.
 * @param {Document} document
 * @param {Object} sons Service de sons.
 * @returns {function(): void} À rappeler quand le son change ailleurs (écran Réglages).
 */
function brancherBoutonMuet(document, sons) {
  const bouton = document.getElementById('bouton-muet');
  if (!bouton) {
    return () => {};
  }
  function rafraichir() {
    const muet = sons.estMuet();
    bouton.setAttribute('aria-pressed', String(muet));
    bouton.setAttribute('aria-label', muet ? LIBELLE_REMETTRE_SON : LIBELLE_COUPER_SON);
  }
  bouton.addEventListener('click', () => {
    if (sons.estMuet()) {
      sons.reactiver();
    } else {
      sons.couper();
    }
  });
  rafraichir();
  return rafraichir;
}

/** Les réglages généraux du site pour cette page (nom, version, mode développement). */
function creerConfig(fenetre) {
  return {
    nomSite: NOM_SITE,
    version: VERSION_SITE,
    modeDeveloppement: estModeDeveloppement(fenetre.location.hostname),
  };
}

/** Vrai quand le premier lancement est fait : un prénom (texte non vide) est enregistré. */
function profilEstCree(stockage) {
  const { prenom } = stockage.lire().profil;
  return typeof prenom === 'string' && prenom.trim() !== '';
}

/**
 * Construit le contexte de l'application.
 * @param {Object} [options]
 * @param {Window} [options.fenetre]
 * @param {function(string, Error): void} [options.signalerStockage] Reçoit le message pour l'élève quand
 *   le stockage échoue (par défaut : un toast).
 * @returns {Contexte}
 */
export function creerContexte({ fenetre = globalThis.window, signalerStockage = signalerAuToast } = {}) {
  const document = fenetre.document;
  const stockage = creerStockage({ support: lireSupportDeStockage(fenetre), signaler: signalerStockage });
  let rafraichirBoutonMuet = () => {};

  const lireReglages = () => stockage.lire().reglages;
  const appliquerReglages = () => poserClassesDAffichage(document, lireReglages());

  function modifierReglages(changement) {
    const donnees = stockage.lire();
    stockage.ecrire({ ...donnees, reglages: { ...donnees.reglages, ...changement } });
    appliquerReglages();
    rafraichirBoutonMuet();
  }

  const sons = creerSons({
    creerContexte: () => fabriquerContexteAudio(fenetre),
    lireReglages,
    ecrireReglages: modifierReglages,
  });
  const voix = creerVoix({
    synthese: fenetre.speechSynthesis,
    creerEnonce: (texte) => new fenetre.SpeechSynthesisUtterance(texte),
    lireNomPrefere: () => lireReglages().voix,
  });
  rafraichirBoutonMuet = brancherBoutonMuet(document, sons);

  return {
    stockage,
    sons,
    voix,
    config: creerConfig(fenetre),
    lireReglages,
    modifierReglages,
    appliquerReglages,
    signaler: signalerDansLaConsole,
    profilCree: () => profilEstCree(stockage),
  };
}
