// Écran « Préfixes et suffixes » (cahier §7.5).
//
// Deux temps dans la même étape : l'élève construit un mot en rangeant ses pièces (glisser, toucher,
// clavier : js/ui/deposer.js), puis il choisit le sens du mot parmi trois définitions (js/ui/choix.js).
// La séance (orthographe/seance.js) gère indice, correction, sons et clôture ; ici on dessine une étape.
// Une erreur à l'un ou l'autre temps est l'erreur de l'item : 1re = indice, 2e = le mot et son sens.
// `valider` n'est appelé qu'après une construction fausse ou à la fin du sens
// (jamais quand la construction est juste).
// La logique (mélange, mot construit, définitions) est dans affixes-logique.js.

import { creer, creerBouton } from '../../ui/dom.js';
import { creerChoix } from '../../ui/choix.js';
import { creerDeposer } from '../../ui/deposer.js';
import { VERDICT_CORRECTION, VERDICT_JUSTE } from '../orthographe/seance-logique.js';
import { monterExercice } from '../orthographe/seance.js';
import {
  construireMot, creerDefinitions, creerPieces, creerZoneMot, decrireCorrection, estLaBonneDefinition, estLeBonMot,
  evaluerPieces, idDeLaBonneDefinition, lireOrdre, poserLaQuestion,
} from './affixes-logique.js';

const FEUILLE = new URL('../../../css/modules/vocabulaire-affixes.css', import.meta.url);
const CONSIGNE = 'Assemble les morceaux pour fabriquer un mot, puis choisis son sens.';
const TITRE_RESERVE = 'Morceaux de mot';
const ETIQUETTE_DES_DEFINITIONS = 'Choisis le sens du mot.';
const TEMPS_CONSTRUIRE = 'construire';
const TEMPS_SENS = 'sens';

/** La bonne réponse, écrite à la fin : le mot construit avec ses pièces, puis son sens. */
function creerCorrection(item) {
  const correction = creer('div', 'vocabulaire-affixes__correction');
  const liste = creer('ul', 'vocabulaire-affixes__correction-liste');
  const pieces = item.pieces.map((piece) => piece.texte).join(' + ');
  liste.append(
    creer('li', '', `${pieces} = ${item.mot}`),
    creer('li', '', `Sens : ${item.reponse}`),
  );
  correction.append(creer('h3', 'vocabulaire-affixes__correction-titre', 'La bonne réponse'), liste);
  return correction;
}

/** Après la réponse finale : plus rien ne bouge. */
function terminer(vue, verdict) {
  vue.boutonVerifier.remove();
  vue.deposer.desactiver();
  vue.choix.desactiver();
  vue.choix.detruire();
  if (verdict === VERDICT_CORRECTION) {
    vue.zoneFin.append(creerCorrection(vue.item));
  }
}

/** Construction fausse deux fois : les pièces reçoivent ✓ ou ✗ avant la correction. */
function terminerLaConstruction(vue, ordre) {
  vue.deposer.marquerResultats(evaluerPieces(ordre));
  terminer(vue, VERDICT_CORRECTION);
}

/** Construction juste : le mot est fabriqué, on passe à son sens. */
function passerAuSens(vue) {
  vue.temps = TEMPS_SENS;
  vue.deposer.racine.classList.add('vocabulaire-affixes__cache');
  vue.titre.textContent = poserLaQuestion(vue.item);
  vue.boutonEcouter.textContent = 'Écouter le mot';
  vue.boutonEcouter.disabled = false;
  vue.boutonVerifier.disabled = true;
  vue.corps.append(vue.choix.racine);
}

function verifierLaConstruction(vue) {
  const { etape, item, deposer } = vue;
  const ordre = lireOrdre(deposer.lirePlacements());
  if (estLeBonMot(item, ordre)) {
    passerAuSens(vue);
    return;
  }
  const verdict = etape.valider({ juste: false, bonneReponse: decrireCorrection(item) });
  if (verdict === VERDICT_CORRECTION) {
    terminerLaConstruction(vue, ordre);
  }
  // Après VERDICT_INDICE, l'élève change l'ordre et vérifie de nouveau : rien à dessiner de plus.
}

function verifierLeSens(vue) {
  const { etape, item, choix } = vue;
  const choisi = choix.lireChoix();
  const juste = estLaBonneDefinition(item, choisi);
  choix.marquerResultat(choisi, juste ? 'juste' : 'faux');
  const verdict = etape.valider({ juste, bonneReponse: decrireCorrection(item) });
  if (verdict === VERDICT_CORRECTION) {
    choix.marquerResultat(idDeLaBonneDefinition(item), 'juste');
  }
  if (verdict === VERDICT_JUSTE || verdict === VERDICT_CORRECTION) {
    terminer(vue, verdict);
  } else {
    vue.boutonVerifier.disabled = true; // 1re erreur : il faut choisir une autre définition
  }
}

function verifier(vue) {
  if (vue.temps === TEMPS_CONSTRUIRE) {
    verifierLaConstruction(vue);
  } else {
    verifierLeSens(vue);
  }
}

function lireLeMot(vue) {
  vue.etape.lire(vue.temps === TEMPS_CONSTRUIRE ? vue.motPropose : vue.item.mot);
}

/** Le mot que l'élève a construit pour l'instant ; « Vérifier » attend que toutes les pièces soient rangées. */
function actualiserLaConstruction(vue, { placements, tousPlaces }) {
  vue.motPropose = construireMot(vue.item, lireOrdre(placements));
  vue.boutonVerifier.disabled = !tousPlaces;
  vue.boutonEcouter.disabled = !tousPlaces;
}

function creerEntete(vue) {
  const entete = creer('div', 'vocabulaire-affixes__entete');
  const actions = creer('div', 'vocabulaire-affixes__actions');
  actions.append(vue.boutonEcouter, vue.boutonVerifier);
  entete.append(vue.titre, actions);
  return entete;
}

async function monterEtape(item, etape) {
  const vue = { etape, item, temps: TEMPS_CONSTRUIRE, motPropose: '' };
  vue.titre = creer('p', 'vocabulaire-affixes__titre', 'Range les morceaux dans l\'ordre pour fabriquer le mot.');
  vue.boutonVerifier = creerBouton('Vérifier', 'bouton--principal', () => verifier(vue));
  vue.boutonEcouter = creerBouton('Écouter mon mot', 'bouton--secondaire', () => lireLeMot(vue));
  vue.deposer = await creerDeposer({
    etiquettes: creerPieces(item),
    zones: creerZoneMot(item),
    titreReserve: TITRE_RESERVE,
    onChange: (etat) => actualiserLaConstruction(vue, etat),
  });
  // Le choix n'est posé dans la page qu'au second temps : ses touches 1 à 3 ne servent pas avant.
  vue.choix = await creerChoix({
    options: creerDefinitions(item),
    etiquette: ETIQUETTE_DES_DEFINITIONS,
    onChange: () => { vue.boutonVerifier.disabled = false; },
  });
  actualiserLaConstruction(vue, { placements: {}, tousPlaces: false });
  vue.corps = creer('div', 'vocabulaire-affixes__corps');
  vue.corps.append(vue.deposer.racine);
  vue.zoneFin = creer('div', 'vocabulaire-affixes__fin');
  vue.zoneFin.setAttribute('aria-live', 'polite');
  etape.zone.append(creerEntete(vue), vue.corps, vue.zoneFin);
}

/**
 * Monte l'exercice « Préfixes et suffixes ».
 * @param {HTMLElement} conteneur
 * @param {Object} contexte Contexte de l'application.
 * @returns {Promise<void>}
 */
export async function monter(conteneur, contexte) {
  await monterExercice(conteneur, contexte, {
    module: 'vocabulaire',
    contenu: 'vocabulaire',
    libelleRetour: 'Retour au vocabulaire',
    mode: 'affixes',
    type: 'affixe',
    consigne: CONSIGNE,
    feuille: FEUILLE,
    monterEtape,
  });
}
