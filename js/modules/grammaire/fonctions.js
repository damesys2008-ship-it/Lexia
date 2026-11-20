// Écran « La chasse aux fonctions » (cahier §7.4, exercice 2).
//
// L'élève choisit une fonction (verbe, sujet, COD, COI, complément circonstanciel) puis marque dans la phrase
// le groupe de mots qui la porte (toucher, glisser, clavier : fonctions-phrase.js).
// La séance (orthographe/seance.js) gère indice, correction, sons et clôture ; ici on dessine une étape.
// 1re erreur : l'indice et un ✗ sur les groupes faux, sans la correction. 2e erreur : les bons groupes.
// La logique (sélection, évaluation, solution) est dans fonctions-logique.js.

import { creer, creerBouton } from '../../ui/dom.js';
import { VERDICT_CORRECTION, VERDICT_INDICE, VERDICT_JUSTE } from '../orthographe/seance-logique.js';
import { monterExercice } from '../orthographe/seance.js';
import { creerSelecteurFonctions } from './fonctions-phrase.js';
import { decrireSolution, evaluerGroupes, garderLesFaux } from './fonctions-logique.js';
import { MODULE } from './index.js';

const FEUILLE = new URL('../../../css/modules/grammaire-fonctions.css', import.meta.url);
const CONSIGNE = 'Choisis une fonction, puis marque le groupe de mots qui la porte.';

/** Après la réponse finale : plus rien ne bouge. */
function terminerLEtape(vue, resultats) {
  vue.selecteur.marquerResultats(resultats);
  vue.selecteur.desactiver();
  vue.boutonVerifier.remove();
}

function verifier(vue) {
  const { etape, item, selecteur } = vue;
  const evaluation = evaluerGroupes(item, selecteur.lireGroupes());
  const verdict = etape.valider({ juste: evaluation.toutEstJuste, bonneReponse: decrireSolution(item) });
  if (verdict === VERDICT_JUSTE) {
    terminerLEtape(vue, evaluation.resultats);
  } else if (verdict === VERDICT_CORRECTION) {
    selecteur.poserSolution();
    terminerLEtape(vue, evaluerGroupes(item, item.groupes).resultats);
  } else if (verdict === VERDICT_INDICE) {
    selecteur.marquerResultats(garderLesFaux(evaluation.resultats));
  }
}

async function monterEtape(item, etape) {
  const boutonVerifier = creerBouton('Vérifier', 'bouton--principal', () => verifier(vue));
  boutonVerifier.disabled = true;
  const selecteur = creerSelecteurFonctions({
    item,
    onChange: ({ aDesGroupes }) => { boutonVerifier.disabled = !aDesGroupes; },
  });
  const vue = { etape, item, selecteur, boutonVerifier };
  const ecouter = creerBouton('Écouter la phrase', 'bouton--secondaire', () => etape.lire(item.phrase));
  const actions = creer('div', 'grammaire-fonctions__actions');
  actions.append(ecouter, boutonVerifier);
  etape.zone.append(selecteur.racine, actions);
}

/**
 * Monte l'exercice « La chasse aux fonctions ».
 * @param {HTMLElement} conteneur
 * @param {Object} contexte Contexte de l'application.
 * @returns {Promise<void>}
 */
export async function monter(conteneur, contexte) {
  await monterExercice(conteneur, contexte, {
    module: MODULE,
    contenu: MODULE,
    libelleRetour: 'Retour à la grammaire',
    mode: 'fonctions',
    type: 'fonctions',
    consigne: CONSIGNE,
    feuille: FEUILLE,
    monterEtape,
  });
}
