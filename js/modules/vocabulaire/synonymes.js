// Écran « Synonymes et contraires » (cahier §7.5).
//
// L'élève relie chaque mot de gauche à son synonyme ou à son contraire (glisser, toucher ou clavier :
// js/ui/relier.js). La séance (orthographe/seance.js) gère indice, correction, sons et clôture ;
// ici on dessine une étape. 1re erreur : ✗ sur les traits faux, l'indice, et « Corriger » pour les refaire.
// 2e erreur : les traits sont figés et la séance écrit les bonnes paires (une seule fois, sous les cartes).
// La logique (colonnes, évaluation, texte des bonnes paires) est dans synonymes-logique.js.

import { creer, creerBouton } from '../../ui/dom.js';
import { creerRelier } from '../../ui/relier.js';
import { melangerSansAlignement } from '../../ui/relier-logique.js';
import { VERDICT_CORRECTION, VERDICT_INDICE, VERDICT_JUSTE } from '../orthographe/seance-logique.js';
import { monterExercice } from '../orthographe/seance.js';
import {
  TITRES_DES_RELATIONS, construireColonnes, decrireBonnesPaires,
  resultatsDesTraits, texteALire, toutEstJuste,
} from './synonymes-logique.js';

const FEUILLE = new URL('../../../css/modules/vocabulaire-synonymes.css', import.meta.url);
const CONSIGNE = 'Relie chaque mot à son synonyme ou à son contraire.';
const GRAINE_MAXIMALE = 2 ** 32;

/** Deux colonnes mélangées au hasard, sans qu'aucune carte soit en face de sa réponse. */
function melangerLesColonnes(item) {
  const colonnes = construireColonnes(item);
  const graine = Math.floor(Math.random() * GRAINE_MAXIMALE);
  const { gauche, droite } = melangerSansAlignement(colonnes.gauche, colonnes.droite, graine);
  return { gauche, droite };
}

/** Le titre de la relation, « Écouter » et les boutons de réponse sur une seule ligne (voir le CSS). */
function creerEntete(item, colonnes, vue) {
  const { titre, signe } = TITRES_DES_RELATIONS[item.relation];
  const entete = creer('div', 'vocabulaire-synonymes__entete');
  const titreVisible = creer('p', 'vocabulaire-synonymes__titre');
  titreVisible.append(`${titre} `, creer('span', 'vocabulaire-synonymes__signe', signe));
  const { etape, actions } = vue;
  const ecouter = creerBouton('Écouter les mots', 'bouton--secondaire', () => etape.lire(texteALire(item, colonnes)));
  entete.append(titreVisible, ecouter, actions);
  return entete;
}

/** Après la réponse finale : plus rien ne bouge. */
function terminerEtape(vue) {
  vue.relier.desactiver();
  vue.actions.replaceChildren();
}

/** Après la 1re erreur : « Corriger » enlève les traits faux, « Vérifier » attend que tout soit relié. */
function proposerCorrection(vue) {
  vue.boutonVerifier.disabled = true;
  vue.actions.replaceChildren(vue.boutonCorriger);
}

function corriger(vue) {
  vue.relier.reinitialiserFaux();
  vue.actions.replaceChildren(vue.boutonVerifier);
}

function verifier(vue) {
  const { etape, item, relier } = vue;
  const resultats = resultatsDesTraits(relier.lireTraits());
  relier.marquerResultats(resultats);
  const verdict = etape.valider({ juste: toutEstJuste(resultats), bonneReponse: decrireBonnesPaires(item) });
  if (verdict === VERDICT_JUSTE || verdict === VERDICT_CORRECTION) {
    terminerEtape(vue);
  } else if (verdict === VERDICT_INDICE) {
    proposerCorrection(vue);
  }
}

async function monterEtape(item, etape) {
  const colonnes = melangerLesColonnes(item);
  const vue = { etape, item };
  vue.boutonVerifier = creerBouton('Vérifier', 'bouton--principal', () => verifier(vue));
  vue.boutonCorriger = creerBouton('Corriger', 'bouton--secondaire', () => corriger(vue));
  vue.boutonVerifier.disabled = true;
  vue.relier = await creerRelier({
    ...colonnes,
    onChange: ({ tousRelies }) => { vue.boutonVerifier.disabled = !tousRelies; },
  });
  vue.relier.racine.classList.add('vocabulaire-synonymes__relier');
  vue.actions = creer('div', 'vocabulaire-synonymes__actions');
  vue.actions.append(vue.boutonVerifier);
  etape.zone.append(creerEntete(item, colonnes, vue), vue.relier.racine);
}

/**
 * Monte l'exercice « Synonymes et contraires ».
 * @param {HTMLElement} conteneur
 * @param {Object} contexte Contexte de l'application.
 * @returns {Promise<void>}
 */
export async function monter(conteneur, contexte) {
  await monterExercice(conteneur, contexte, {
    module: 'vocabulaire',
    contenu: 'vocabulaire',
    libelleRetour: 'Retour au vocabulaire',
    mode: 'synonymes',
    type: 'relation',
    consigne: CONSIGNE,
    feuille: FEUILLE,
    monterEtape,
  });
}
