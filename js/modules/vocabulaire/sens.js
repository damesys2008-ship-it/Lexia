// Écran « Un mot, plusieurs sens » (cahier §7.5, exercice 4).
//
// La phrase met le mot en valeur (gras, souligné, fond : jamais la couleur seule) ; l'élève choisit la bonne
// définition (js/ui/choix.js), puis « Vérifier ». « Écouter » lit la phrase.
// La séance (orthographe/seance.js) gère indice, correction, sons et clôture ; ici on dessine une étape.
// 1re erreur : l'indice, la définition choisie est marquée ✗ et grisée. 2e erreur : ✗ aussi, et la bonne est ✓.
// La logique (découpage de la phrase, mélange, évaluation) est dans sens-logique.js.

import { creerChoix } from '../../ui/choix.js';
import { creer, creerBouton } from '../../ui/dom.js';
import { VERDICT_CORRECTION, VERDICT_INDICE, VERDICT_JUSTE } from '../orthographe/seance-logique.js';
import { monterExercice } from '../orthographe/seance.js';
import { creerOptions, decouperPhrase, estLaBonneDefinition } from './sens-logique.js';

const FEUILLE = new URL('../../../css/modules/vocabulaire-sens.css', import.meta.url);
const CONSIGNE = 'Lis la phrase et choisis ce que veut dire le mot souligné.';
const ETIQUETTE_DU_GROUPE = 'Sens possibles';

function creerPhrase(item) {
  const { avant, mot, apres } = decouperPhrase(item);
  const phrase = creer('p', 'orthographe__phrase vocabulaire-sens__phrase');
  phrase.append(avant, creer('mark', 'vocabulaire-sens__mot', mot), apres);
  return phrase;
}

/** Après la réponse finale : la bonne définition est marquée ✓, plus rien ne bouge. */
function montrerLaFin(vue) {
  vue.choix.marquerResultat(vue.item.reponse, 'juste');
  vue.choix.desactiver();
  vue.choix.detruire();
  vue.boutonVerifier.remove();
}

function verifier(vue) {
  const { etape, item, choix, boutonVerifier } = vue;
  const definition = choix.lireChoix();
  const verdict = etape.valider({ juste: estLaBonneDefinition(item, definition), bonneReponse: item.reponse });
  if (verdict === VERDICT_JUSTE) {
    choix.marquerResultat(definition, 'juste');
  } else {
    choix.marquerResultat(definition, 'faux');
  }
  if (verdict === VERDICT_INDICE) {
    // L'élève doit choisir une autre définition avant de vérifier de nouveau.
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
  const choix = await creerChoix({
    options: creerOptions(item),
    etiquette: ETIQUETTE_DU_GROUPE,
    onChange: () => { boutonVerifier.disabled = false; },
  });
  const vue = { etape, item, choix, boutonVerifier };
  const ecouter = creerBouton('Écouter la phrase', 'bouton--secondaire', () => etape.lire(item.phrase));
  const entete = creer('div', 'vocabulaire-sens__entete');
  entete.append(creerPhrase(item), ecouter);
  const actions = creer('div', 'vocabulaire-sens__actions');
  actions.append(boutonVerifier);
  etape.zone.append(entete, choix.racine, actions);
}

/**
 * Monte l'exercice « Un mot, plusieurs sens ».
 * @param {HTMLElement} conteneur
 * @param {Object} contexte Contexte de l'application.
 * @returns {Promise<void>}
 */
export async function monter(conteneur, contexte) {
  await monterExercice(conteneur, contexte, {
    module: 'vocabulaire',
    contenu: 'vocabulaire',
    libelleRetour: 'Retour au vocabulaire',
    mode: 'sens',
    type: 'sens',
    consigne: CONSIGNE,
    feuille: FEUILLE,
    monterEtape,
  });
}
