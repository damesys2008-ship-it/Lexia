// Écran « Les phrases en étiquettes » (cahier §7.4, exercice 3).
//
// L'élève range des morceaux de phrase mélangés dans l'ordre (glisser, toucher, clavier : js/ui/deposer.js).
// Toute solution listée dans le contenu est acceptée. L'application met la majuscule et la ponctuation.
// La séance (orthographe/seance.js) gère indice, correction, sons et clôture ; ici on dessine une étape.
// 1re erreur : l'indice, sans dire quels morceaux sont mal placés. 2e erreur : ✓ / ✗ et la bonne phrase.
// La logique (mélange, phrase, solutions) est dans etiquettes-logique.js.

import { creer, creerBouton } from '../../ui/dom.js';
import { creerDeposer } from '../../ui/deposer.js';
import { VERDICT_CORRECTION, VERDICT_JUSTE } from '../orthographe/seance-logique.js';
import { monterExercice } from '../orthographe/seance.js';
import { MODULE } from './index.js';
import {
  construirePhrase,
  creerEtiquettes,
  creerZones,
  estUneSolution,
  evaluerOrdre,
  lireOrdre,
  phrasesAcceptees,
} from './etiquettes-logique.js';

const FEUILLE = new URL('../../../css/modules/grammaire-etiquettes.css', import.meta.url);
const CONSIGNE = 'Remets les morceaux dans l\'ordre pour refaire la phrase.';
const TITRE_RESERVE = 'Morceaux de phrase';

function creerAutresOrdres(item) {
  const [, ...autres] = phrasesAcceptees(item);
  if (autres.length === 0) {
    return null;
  }
  const bloc = creer('div', 'grammaire-etiquettes__autres');
  const liste = creer('ul', 'grammaire-etiquettes__autres-liste');
  bloc.append(creer('h3', 'grammaire-etiquettes__autres-titre', 'Cette phrase marche aussi\u00A0:'), liste);
  autres.forEach((phrase) => liste.append(creer('li', '', phrase)));
  return bloc;
}

/** Après la réponse finale : ✓ / ✗ sur chaque morceau, plus rien ne bouge. */
function montrerLaFin(vue, ordre, montrerLesAutresOrdres) {
  vue.deposer.marquerResultats(evaluerOrdre(vue.item, ordre));
  vue.deposer.desactiver();
  vue.boutonVerifier.remove();
  const autresOrdres = montrerLesAutresOrdres ? creerAutresOrdres(vue.item) : null;
  if (autresOrdres !== null) {
    vue.zoneFin.append(autresOrdres);
  }
}

function verifier(vue) {
  const { etape, item, deposer } = vue;
  const ordre = lireOrdre(deposer.lirePlacements());
  const verdict = etape.valider({ juste: estUneSolution(item, ordre), bonneReponse: item.phrase });
  if (verdict === VERDICT_JUSTE || verdict === VERDICT_CORRECTION) {
    montrerLaFin(vue, ordre, verdict === VERDICT_CORRECTION);
  }
  // Après VERDICT_INDICE, l'élève change l'ordre et vérifie de nouveau : rien à dessiner de plus.
}

function actualiser(vue, { placements, tousPlaces }) {
  vue.apercu.textContent = construirePhrase(vue.item, lireOrdre(placements));
  vue.boutonVerifier.disabled = !tousPlaces;
  vue.boutonEcouter.disabled = !tousPlaces;
}

async function monterEtape(item, etape) {
  const vue = { etape, item };
  vue.boutonVerifier = creerBouton('Vérifier', 'bouton--principal', () => verifier(vue));
  vue.boutonEcouter = creerBouton('Écouter ma phrase', 'bouton--secondaire', () => etape.lire(vue.apercu.textContent));
  vue.apercu = creer('p', 'orthographe__phrase grammaire-etiquettes__apercu');
  vue.zoneFin = creer('div', 'grammaire-etiquettes__fin');
  vue.zoneFin.setAttribute('aria-live', 'polite');
  vue.deposer = await creerDeposer({
    etiquettes: creerEtiquettes(item),
    zones: creerZones(item),
    titreReserve: TITRE_RESERVE,
    onChange: (etat) => actualiser(vue, etat),
  });
  actualiser(vue, { placements: {}, tousPlaces: false });
  const actions = creer('div', 'grammaire-etiquettes__actions');
  actions.append(vue.boutonEcouter, vue.boutonVerifier);
  etape.zone.append(vue.deposer.racine, vue.apercu, actions, vue.zoneFin);
}

/**
 * Monte l'exercice « Les phrases en étiquettes ».
 * @param {HTMLElement} conteneur
 * @param {Object} contexte Contexte de l'application.
 * @returns {Promise<void>}
 */
export async function monter(conteneur, contexte) {
  await monterExercice(conteneur, contexte, {
    module: MODULE,
    contenu: MODULE,
    libelleRetour: 'Retour à la grammaire',
    mode: 'etiquettes',
    type: 'etiquettes',
    consigne: CONSIGNE,
    feuille: FEUILLE,
    monterEtape,
  });
}
