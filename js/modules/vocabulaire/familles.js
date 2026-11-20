// Écran « Les familles de mots » (cahier §7.5, exercice 2).
//
// L'élève trouve l'intrus parmi 4 à 6 mots : un choix (js/ui/choix.js), puis « Vérifier ».
// La séance (orthographe/seance.js) gère indice, correction, sons et clôture ; ici on dessine une étape.
// 1re erreur : l'indice, le mot choisi est marqué ✗ et grisé. 2e erreur : ✗ aussi, et l'intrus est marqué ✓.
// La logique (question, mélange, évaluation) est dans familles-logique.js.

import { creerChoix } from '../../ui/choix.js';
import { creer, creerBouton } from '../../ui/dom.js';
import { VERDICT_CORRECTION, VERDICT_INDICE, VERDICT_JUSTE } from '../orthographe/seance-logique.js';
import { monterExercice } from '../orthographe/seance.js';
import { creerOptions, estLIntrus, phraseQuestion, texteAEcouter } from './familles-logique.js';

const FEUILLE = new URL('../../../css/modules/vocabulaire-familles.css', import.meta.url);
const CONSIGNE = "Trouve le mot qui n'est pas de la famille.";
const ETIQUETTE_DU_GROUPE = 'Mots proposés';

/** Après la réponse finale : l'intrus est marqué ✓, plus rien ne bouge. */
function montrerLaFin(vue) {
  const { choix, item, boutonVerifier } = vue;
  choix.marquerResultat(item.intrus, 'juste');
  choix.desactiver();
  choix.detruire();
  boutonVerifier.remove();
}

function verifier(vue) {
  const { etape, item, choix, boutonVerifier } = vue;
  const mot = choix.lireChoix();
  const verdict = etape.valider({ juste: estLIntrus(item, mot), bonneReponse: item.intrus });
  if (verdict === VERDICT_JUSTE) {
    choix.marquerResultat(mot, 'juste');
  } else {
    choix.marquerResultat(mot, 'faux');
  }
  if (verdict === VERDICT_INDICE) {
    // L'élève doit choisir un autre mot avant de vérifier de nouveau.
    boutonVerifier.disabled = true;
    return;
  }
  if (verdict === VERDICT_CORRECTION || verdict === VERDICT_JUSTE) {
    montrerLaFin(vue);
  }
}

async function monterEtape(item, etape) {
  const boutonVerifier = creerBouton('Vérifier', 'bouton--principal', () => verifier(vue));
  boutonVerifier.disabled = true;
  const options = creerOptions(item);
  const choix = await creerChoix({
    options,
    etiquette: ETIQUETTE_DU_GROUPE,
    onChange: () => { boutonVerifier.disabled = false; },
  });
  const vue = { etape, item, choix, boutonVerifier };
  const lireLaQuestion = () => etape.lire(texteAEcouter(item, options));
  const ecouter = creerBouton('Écouter la question', 'bouton--secondaire', lireLaQuestion);
  const question = creer('p', 'orthographe__phrase vocabulaire-familles__question', phraseQuestion(item));
  const entete = creer('div', 'vocabulaire-familles__entete');
  entete.append(question, ecouter);
  const actions = creer('div', 'vocabulaire-familles__actions');
  actions.append(boutonVerifier);
  etape.zone.append(entete, choix.racine, actions);
}

/**
 * Monte l'exercice « Les familles de mots ».
 * @param {HTMLElement} conteneur
 * @param {Object} contexte Contexte de l'application.
 * @returns {Promise<void>}
 */
export async function monter(conteneur, contexte) {
  await monterExercice(conteneur, contexte, {
    module: 'vocabulaire',
    contenu: 'vocabulaire',
    libelleRetour: 'Retour au vocabulaire',
    mode: 'familles',
    type: 'famille',
    consigne: CONSIGNE,
    feuille: FEUILLE,
    monterEtape,
  });
}
