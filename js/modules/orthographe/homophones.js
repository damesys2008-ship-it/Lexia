// Écran « Le pont des homophones » (cahier §7.3, exercice 1).
//
// Une phrase a une planche manquante : l'élève choisit le bon mot parmi 2 ou 3 boutons.
// Au clavier : 1, 2, 3 choisissent directement ; les flèches déplacent le focus ; Entrée valide.
// La séance (seance.js) gère indice, correction, sons et clôture ; ici on dessine une étape.
// La logique (trou, mélange, bonne réponse) est dans homophones-logique.js.

import { creer, creerBouton } from '../../ui/dom.js';
import {
  decouperPhrase,
  estBonChoix,
  melangerChoix,
  phraseComplete,
} from './homophones-logique.js';
import { VERDICT_INDICE, VERDICT_JUSTE, VERDICT_TERMINE } from './seance-logique.js';
import { monterExercice } from './seance.js';

const FEUILLE = new URL('../../../css/modules/orthographe-homophones.css', import.meta.url);
const CONSIGNE = 'Choisis le mot qui va dans la phrase.';
const DEPLACEMENTS = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

/** L'aide des touches, qui suit le nombre de choix : « Au clavier : touches 1 ou 2, puis Entrée. » */
function texteAideClavier(nombreDeChoix) {
  const numeros = Array.from({ length: nombreDeChoix }, (_, position) => String(position + 1));
  const derniers = numeros.slice(-2).join(' ou ');
  const touches = [...numeros.slice(0, -2), derniers].join(', ');
  return `Au clavier : touches ${touches}, puis Entrée.`;
}

// --- La phrase et le pont ---

function creerPlanche() {
  const planche = creer('span', 'orthographe-homophones__planche');
  planche.setAttribute('role', 'img');
  planche.setAttribute('aria-label', 'planche manquante');
  return planche;
}

function creerPhrase(item, planche) {
  const { avant, apres } = decouperPhrase(item.phrase);
  const phrase = creer('p', 'orthographe__phrase orthographe-homophones__phrase');
  phrase.append(avant, planche, apres);
  return phrase;
}

// --- Les boutons de choix ---

function creerBoutonChoix(position, mot, action) {
  const bouton = creerBouton('', 'bouton--secondaire', action);
  const numero = creer('span', 'orthographe-homophones__numero', String(position + 1));
  numero.setAttribute('aria-hidden', 'true');
  bouton.append(numero, creer('span', 'orthographe-homophones__mot', mot));
  bouton.dataset.mot = mot;
  return bouton;
}

/** Déplace le focus vers le prochain bouton encore actif dans le sens demandé (1 ou -1). */
function deplacerFocus(boutons, sens) {
  const nombre = boutons.length;
  const actuel = boutons.indexOf(document.activeElement);
  for (let pas = 1; pas <= nombre; pas += 1) {
    // Le « + nombre » évite un reste négatif quand on recule depuis le premier bouton.
    const candidat = boutons[(actuel + sens * pas + nombre) % nombre];
    if (!candidat.disabled) {
      candidat.focus();
      return;
    }
  }
}

/** Les chiffres marchent partout sur l'écran ; les flèches seulement quand le focus est sur les choix. */
function gererTouche(evenement, vue) {
  if (evenement.ctrlKey || evenement.altKey || evenement.metaKey) {
    return;
  }
  const numero = Number(evenement.key);
  if (numero >= 1 && numero <= vue.boutons.length) {
    vue.boutons[numero - 1].click();
    return;
  }
  if (Object.hasOwn(DEPLACEMENTS, evenement.key) && vue.choix.contains(document.activeElement)) {
    evenement.preventDefault();
    deplacerFocus(vue.boutons, DEPLACEMENTS[evenement.key]);
  }
}

/** Écoute le clavier tant que l'étape est à l'écran ; l'écouteur se retire seul quand elle disparaît. */
function ecouterLeClavier(vue) {
  const ecouteur = (evenement) => {
    if (vue.choix.isConnected) {
      gererTouche(evenement, vue);
      return;
    }
    document.removeEventListener('keydown', ecouteur);
  };
  document.addEventListener('keydown', ecouteur);
}

// --- Les états après une réponse ---

function remplirPlanche(planche, mot) {
  planche.textContent = mot;
  planche.removeAttribute('aria-label');
  planche.removeAttribute('role');
  planche.classList.add('orthographe-homophones__planche--remplie', 'orthographe__etat--juste');
}

/** Après la réponse finale : la bonne forme a le dernier mot, avec l'astuce et la phrase complète. */
function montrerLaFin(vue) {
  const { item, boutons, planche, zoneFin } = vue;
  const bonBouton = boutons.find((bouton) => bouton.dataset.mot === item.reponse);
  boutons.forEach((bouton) => { bouton.disabled = true; });
  bonBouton.classList.add('orthographe__etat--juste');
  remplirPlanche(planche, item.reponse);
  zoneFin.append(
    creer('p', 'orthographe-homophones__astuce', `Astuce : ${item.astuce}`),
    creer('p', 'orthographe-homophones__phrase-complete', `La phrase correcte : ${phraseComplete(item)}`),
  );
}

function choisir(vue, bouton) {
  const { etape, item } = vue;
  const verdict = etape.valider({ juste: estBonChoix(item, bouton.dataset.mot), bonneReponse: item.reponse });
  if (verdict === VERDICT_TERMINE) {
    return;
  }
  if (verdict !== VERDICT_JUSTE) {
    bouton.classList.add('orthographe__etat--faux');
  }
  if (verdict === VERDICT_INDICE) {
    bouton.disabled = true;
    deplacerFocus(vue.boutons, 1);
    return;
  }
  montrerLaFin(vue);
}

// --- Une étape ---

function monterEtape(item, etape) {
  const planche = creerPlanche();
  const choix = creer('div', 'orthographe__choix orthographe-homophones__choix');
  // La zone de fin est annoncée par les lecteurs d'écran quand l'astuce y apparaît.
  const zoneFin = creer('div', 'orthographe-homophones__fin');
  const vue = { etape, item, planche, choix, zoneFin, boutons: [] };
  zoneFin.setAttribute('aria-live', 'polite');
  choix.setAttribute('role', 'group');
  choix.setAttribute('aria-label', 'Choix possibles');
  vue.boutons = melangerChoix(item).map((mot, position) => {
    return creerBoutonChoix(position, mot, (evenement) => choisir(vue, evenement.currentTarget));
  });
  choix.append(...vue.boutons);
  etape.zone.append(creerPhrase(item, planche), choix, creer('p', 'orthographe-homophones__aide', texteAideClavier(vue.boutons.length)), zoneFin);
  ecouterLeClavier(vue);
}

/**
 * Monte l'exercice « Le pont des homophones ».
 * @param {HTMLElement} conteneur
 * @param {Object} contexte Contexte de l'application.
 * @returns {Promise<void>}
 */
export async function monter(conteneur, contexte) {
  await monterExercice(conteneur, contexte, {
    mode: 'homophones',
    type: 'homophone',
    consigne: CONSIGNE,
    feuille: FEUILLE,
    monterEtape,
  });
}
