// Écran « Mots à retenir » (cahier §7.3, exercice 3) : la copie différée.
//
// Étape 1 : le mot s'affiche en grand pendant 3 secondes, avec un repère de temps (barre qui se vide,
// et un décompte écrit, seul visible quand les animations sont réduites). Il n'y a pas de bouton pour
// le garder. Étape 2 : le mot disparaît ; la phrase s'affiche avec un trou et l'élève écrit le mot de mémoire.
// Après une erreur, « Revoir le mot » le remontre 3 secondes (une seule fois par item).
// La séance (seance.js) gère indice, correction, sons et clôture ; la logique est dans invariables-logique.js.

import { creer, creerBouton } from '../../ui/dom.js';
import { creerChampTexte } from '../../ui/champ-texte.js';
import { DUREE_AFFICHAGE_MS, creerMinuteur, decouperPhrase, estBonneSaisie } from './invariables-logique.js';
import { VERDICT_INDICE, VERDICT_JUSTE } from './seance-logique.js';
import { monterExercice } from './seance.js';

const FEUILLE = new URL('../../../css/modules/orthographe-invariables.css', import.meta.url);
const CONSIGNE = 'Regarde bien le mot pendant trois secondes. Ensuite, écris-le de mémoire.';

// --- L'étape 1 : le mot affiché ---

function creerBarre() {
  const barre = creer('div', 'orthographe-invariables__barre');
  barre.style.setProperty('--duree-affichage', `${DUREE_AFFICHAGE_MS}ms`);
  barre.append(creer('div', 'orthographe-invariables__barre-reste'));
  barre.setAttribute('aria-hidden', 'true');
  return barre;
}

function creerZoneMot(item, etape) {
  const racine = creer('div', 'orthographe-invariables__zone-mot');
  const decompte = creer('p', 'orthographe-invariables__decompte');
  decompte.setAttribute('aria-hidden', 'true');
  const ecouter = creerBouton('Écouter le mot', 'bouton--secondaire', () => etape.lire(item.mot));
  const barre = creerBarre();
  racine.append(creer('p', 'orthographe-invariables__mot', item.mot), barre, decompte, ecouter);
  return { racine, barre, decompte };
}

/** Montre le mot 3 secondes, puis le cache et passe à l'écriture. */
function afficherLeMot(vue) {
  const nouvelleBarre = creerBarre();
  vue.zoneMot.barre.replaceWith(nouvelleBarre);
  vue.zoneMot.barre = nouvelleBarre;
  vue.zoneMot.racine.hidden = false;
  vue.saisie.racine.hidden = true;
  creerMinuteur().demarrer(
    (secondes) => { vue.zoneMot.decompte.textContent = `Il reste ${secondes} s`; },
    () => cacherLeMot(vue),
  );
}

function cacherLeMot(vue) {
  if (!vue.zoneMot.racine.isConnected) {
    return;
  }
  vue.zoneMot.racine.hidden = true;
  vue.saisie.racine.hidden = false;
  vue.saisie.champ.focus();
}

// --- L'étape 2 : l'écriture de mémoire ---

async function creerZoneSaisie(item, surVerifier) {
  const racine = creer('div', 'orthographe-invariables__zone-saisie');
  const { avant, apres } = decouperPhrase(item);
  const trou = creer('span', 'orthographe-invariables__trou');
  const phrase = creer('p', 'orthographe__phrase');
  const { racine: champRacine, champ } = await creerChampTexte({ etiquette: 'Écris le mot que tu viens de voir' });
  const verifierBouton = creerBouton('Vérifier', 'bouton--principal', surVerifier);
  const aide = creer('div', 'orthographe-invariables__aide');
  const commandes = creer('div', 'orthographe-invariables__commandes');

  trou.setAttribute('role', 'img');
  trou.setAttribute('aria-label', 'mot à écrire');
  phrase.append(avant, trou, apres);
  champ.addEventListener('keydown', (evenement) => {
    if (evenement.key === 'Enter') {
      evenement.preventDefault();
      surVerifier();
    }
  });
  commandes.append(verifierBouton);
  racine.append(phrase, champRacine, commandes, aide);
  return { racine, champ, trou, verifierBouton, aide };
}

// --- Les réponses ---

/** Un seul rappel par item : le bouton « Revoir le mot » disparaît dès qu'on s'en sert. */
function proposerLeRappel(vue) {
  if (vue.rappelUtilise) {
    return;
  }
  const bouton = creerBouton('Revoir le mot', 'bouton--secondaire', () => {
    vue.rappelUtilise = true;
    bouton.remove();
    afficherLeMot(vue);
  });
  vue.saisie.aide.replaceChildren(bouton);
}

/** Fin de l'item : le mot bien écrit, dans sa phrase, a le dernier mot. */
function montrerLaFin(vue, item) {
  const { mot } = decouperPhrase(item);
  vue.saisie.champ.readOnly = true;
  vue.saisie.verifierBouton.disabled = true;
  vue.saisie.aide.replaceChildren();
  vue.saisie.trou.textContent = mot;
  vue.saisie.trou.removeAttribute('role');
  vue.saisie.trou.removeAttribute('aria-label');
  vue.saisie.trou.classList.add('orthographe-invariables__trou--rempli', 'orthographe__etat--juste');
}

function verifier(etape, vue, item) {
  const saisie = vue.saisie.champ.value;
  if (vue.saisie.champ.readOnly || saisie.trim() === '') {
    vue.saisie.champ.focus();
    return;
  }
  const verdict = etape.valider({ juste: estBonneSaisie(item, saisie), bonneReponse: item.mot });
  if (verdict === VERDICT_INDICE) {
    proposerLeRappel(vue);
    vue.saisie.champ.focus();
    return;
  }
  if (verdict !== VERDICT_JUSTE) {
    vue.saisie.champ.classList.add('orthographe__etat--faux');
  }
  montrerLaFin(vue, item);
}

async function monterEtape(item, etape) {
  const vue = { zoneMot: creerZoneMot(item, etape), saisie: null, rappelUtilise: false };
  vue.saisie = await creerZoneSaisie(item, () => verifier(etape, vue, item));
  etape.zone.append(vue.zoneMot.racine, vue.saisie.racine);
  afficherLeMot(vue);
}

/**
 * Monte l'exercice « Mots à retenir ».
 * @param {HTMLElement} conteneur
 * @param {Object} contexte Contexte de l'application.
 * @returns {Promise<void>}
 */
export async function monter(conteneur, contexte) {
  await monterExercice(conteneur, contexte, {
    mode: 'invariables',
    type: 'invariable',
    consigne: CONSIGNE,
    feuille: FEUILLE,
    monterEtape,
  });
}
