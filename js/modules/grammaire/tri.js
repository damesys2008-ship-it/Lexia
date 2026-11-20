// Écran « Le tri des mots » (cahier §7.4, exercice 1).
//
// L'élève range chaque mot de la phrase dans la boîte de sa nature (glisser, toucher, clavier : js/ui/deposer.js).
// La séance (orthographe/seance.js) gère indice, correction, sons et clôture ; ici on dessine une étape.
// 1re erreur : l'indice, sans dire quels mots sont faux. 2e erreur : ✓ / ✗ sur chaque mot et le bon tri.
// La logique (étiquettes, évaluation, solution) est dans tri-logique.js.

import { creer, creerBouton } from '../../ui/dom.js';
import { creerDeposer } from '../../ui/deposer.js';
import { VERDICT_CORRECTION, VERDICT_INDICE, VERDICT_JUSTE } from '../orthographe/seance-logique.js';
import { monterExercice } from '../orthographe/seance.js';
import {
  creerBoites, creerEtiquettes, decrireSolution, evaluerTri, grouperSolution, toutEstJuste,
} from './tri-logique.js';

const FEUILLE = new URL('../../../css/modules/grammaire-tri.css', import.meta.url);
const CONSIGNE = 'Range chaque mot dans la bonne boîte.';
const TITRE_RESERVE = 'Mots à ranger';
// Au-delà de 6 boîtes (niveau 3), elles passent sur 4 colonnes : plus larges, elles ne coupent plus les mots.
const SEUIL_BOITES_SUR_DEUX_RANGEES = 6;

function creerSolution(item) {
  const solution = creer('div', 'grammaire-tri__solution');
  const liste = creer('ul', 'grammaire-tri__solution-liste');
  solution.append(creer('h3', 'grammaire-tri__solution-titre', 'Le bon tri'), liste);
  for (const { titre, mots } of grouperSolution(item)) {
    liste.append(creer('li', 'grammaire-tri__solution-boite', `${titre}\u00A0: ${mots.join(', ')}`));
  }
  return solution;
}

/** Après la réponse finale : ✓ / ✗ sur chaque mot, plus rien ne bouge. */
function montrerLaFin(vue, resultats, montrerSolution) {
  vue.deposer.marquerResultats(resultats);
  vue.deposer.desactiver();
  vue.boutonVerifier.remove();
  if (montrerSolution) {
    vue.zoneFin.append(creerSolution(vue.item));
  }
}

function verifier(vue) {
  const { etape, item, deposer } = vue;
  const resultats = evaluerTri(item, deposer.lirePlacements());
  const verdict = etape.valider({ juste: toutEstJuste(resultats), bonneReponse: decrireSolution(item) });
  if (verdict === VERDICT_JUSTE || verdict === VERDICT_CORRECTION) {
    montrerLaFin(vue, resultats, verdict === VERDICT_CORRECTION);
  }
  // Après VERDICT_INDICE, l'élève range autrement et vérifie de nouveau : rien à dessiner de plus.
}

async function monterEtape(item, etape) {
  const boutonVerifier = creerBouton('Vérifier', 'bouton--principal', () => verifier(vue));
  boutonVerifier.disabled = true;
  const deposer = await creerDeposer({
    etiquettes: creerEtiquettes(item),
    zones: creerBoites(item),
    titreReserve: TITRE_RESERVE,
    onChange: ({ tousPlaces }) => { boutonVerifier.disabled = !tousPlaces; },
  });
  const surDeuxRangees = item.boites.length > SEUIL_BOITES_SUR_DEUX_RANGEES;
  deposer.racine.classList.add('grammaire-tri__boites');
  deposer.racine.classList.toggle('grammaire-tri__boites--nombreuses', surDeuxRangees);
  const zoneFin = creer('div', 'grammaire-tri__fin');
  zoneFin.setAttribute('aria-live', 'polite');
  const vue = { etape, item, deposer, boutonVerifier, zoneFin };
  const ecouter = creerBouton('Écouter la phrase', 'bouton--secondaire', () => etape.lire(item.phrase));
  const phrase = creer('p', 'orthographe__phrase grammaire-tri__phrase', item.phrase);
  const entete = creer('div', 'grammaire-tri__entete');
  entete.append(phrase, ecouter);
  const actions = creer('div', 'grammaire-tri__actions');
  actions.append(boutonVerifier);
  etape.zone.append(entete, deposer.racine, actions, zoneFin);
}

/**
 * Monte l'exercice « Le tri des mots ».
 * @param {HTMLElement} conteneur
 * @param {Object} contexte Contexte de l'application.
 * @returns {Promise<void>}
 */
export async function monter(conteneur, contexte) {
  await monterExercice(conteneur, contexte, {
    module: 'grammaire',
    contenu: 'grammaire',
    libelleRetour: 'Retour à la grammaire',
    mode: 'tri',
    type: 'tri',
    consigne: CONSIGNE,
    feuille: FEUILLE,
    monterEtape,
  });
}
