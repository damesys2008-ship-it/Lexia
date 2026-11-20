// Le test de départ « La grande aventure » (route '#/test-depart', cahier §6.3) : une question à choix par étape,
// un seul essai, la bonne réponse et son explication, puis les six niveaux de départ.
// Ce test ne donne ni étoile, ni historique, ni révision : il n'appelle jamais `cloturerExercice`.
// Chaque réponse est écrite dans `meta.testDepart` dès qu'elle est donnée : l'état se recalcule à la reprise.

import { chargerContenu } from '../../coeur/contenu.js';
import { ROUTE_ACCUEIL } from '../../coeur/routes.js';
import { chargerFeuille } from '../../coeur/styles.js';
import {
  ORDRE_DES_ETAPES, appliquerNiveaux, enregistrerReponse, niveauxDeDepart, prochaineQuestion,
} from '../../coeur/test-depart.js';
import { melanger } from '../orthographe/seance-logique.js';
import { creerBulle } from '../../ui/bulle.js';
import { creerCarteExercice } from '../../ui/carte-exercice.js';
import { creerChoix } from '../../ui/choix.js';
import { creer, creerBouton } from '../../ui/dom.js';
import { creerMascotte } from '../../ui/mascotte.js';

const FEUILLE_TEST_DEPART = new URL('../../../css/modules/test-depart.css', import.meta.url);

const CONSIGNE = 'Choisis la bonne réponse.';
const PHRASE_DEBUT = 'Voyons par où commencer. Prends ton temps.';
const PHRASE_PASSAGE = 'On passe à la suite.';
const PHRASE_FIN = 'On sait par où commencer.';
const MESSAGE_CHOISIR = 'Choisis une réponse pour continuer.';

const LIBELLES_DES_MODULES = {
  orthographe: 'Orthographe',
  vocabulaire: 'Vocabulaire',
  lecture: 'Lecture',
  grammaire: 'Grammaire',
  conjugaison: 'Conjugaison',
  dictee: 'Dictée',
};

function allerALAccueil() {
  window.location.hash = `#/${ROUTE_ACCUEIL}`;
}

// --- Une question ---

/** Les options dans un ordre différent à chaque affichage ; l'id est le rang du choix dans le fichier. */
function creerOptions(item) {
  return melanger(item.choix.map((texte, rang) => ({ id: String(rang), texte })));
}

function idDeLaBonneReponse(item) {
  return String(item.choix.indexOf(item.reponse));
}

function creerZoneDeQuestion(item) {
  const zone = creer('div', 'test-depart__question');
  if (item.texte !== undefined) {
    zone.append(creer('p', 'test-depart__texte', item.texte));
  }
  zone.append(creer('p', 'test-depart__enonce', item.enonce));
  return zone;
}

function creerCorrection(item, reussi) {
  const correction = creer('div', 'test-depart__correction');
  const verdict = reussi ? 'Bonne réponse.' : `Presque ! La bonne réponse est : ${item.reponse}`;
  correction.append(creer('p', 'test-depart__verdict', verdict), creer('p', 'test-depart__explication', item.explication));
  return correction;
}

/** Garde la réponse dans le stockage tout de suite : une interruption ne la fait pas perdre. */
function enregistrer(contexte, item, reussi) {
  const donnees = contexte.stockage.lire();
  contexte.stockage.ecrire(enregistrerReponse(donnees, { idItem: item.id, reussi }, new Date()));
}

/**
 * Pose un seul verdict : marque la réponse, garde le résultat, affiche la correction et propose « Suite ».
 * @param {Object} question  { session, item, carte, choix, suite }
 */
function verifier({ session, item, carte, choix, suite }) {
  const choisi = choix.lireChoix();
  if (choisi === null) {
    carte.zoneRetour.textContent = MESSAGE_CHOISIR;
    return;
  }
  const bonneReponse = idDeLaBonneReponse(item);
  const reussi = choisi === bonneReponse;
  enregistrer(session.contexte, item, reussi);
  if (!reussi) {
    choix.marquerResultat(choisi, 'faux');
  }
  choix.marquerResultat(bonneReponse, 'juste');
  choix.desactiver();
  session.mascotte.definirEtat(reussi ? 'content' : 'encourage');
  carte.zoneRetour.replaceChildren(creerCorrection(item, reussi));
  const boutonSuite = creerBouton('Suite', 'bouton--principal', () => {
    choix.detruire();
    suite();
  });
  carte.zoneActions.replaceChildren(boutonSuite);
  boutonSuite.focus();
}

/** La carte d'étape : « Étape N sur 6 : matière » et les six segments, dans la couleur de la matière en cours. */
function creerCarteEtape(module) {
  const rang = ORDRE_DES_ETAPES.indexOf(module);
  const carte = creer('section', `test-depart__etape-carte test-depart__etape-carte--${module}`);
  const titre = creer('h1', 'test-depart__etape', `Étape ${rang + 1} sur ${ORDRE_DES_ETAPES.length} : ${LIBELLES_DES_MODULES[module]}`);
  const segments = creer('ol', 'test-depart__segments');
  ORDRE_DES_ETAPES.forEach((autre, position) => {
    const segment = creer('li', 'test-depart__segment');
    segment.classList.toggle('test-depart__segment--fait', position <= rang);
    segment.classList.toggle('test-depart__segment--courant', position === rang);
    segment.append(creer('span', 'test-depart__barre'), creer('span', 'test-depart__libelle', LIBELLES_DES_MODULES[autre]));
    if (position === rang) {
      segment.setAttribute('aria-current', 'step');
    }
    segments.append(segment);
  });
  carte.append(titre, segments);
  return carte;
}

async function afficherQuestion(session, item, phrase) {
  const { contexte } = session;
  const etape = ORDRE_DES_ETAPES.indexOf(item.module) + 1;
  const carte = await creerCarteExercice({
    consigne: CONSIGNE,
    courant: etape,
    total: ORDRE_DES_ETAPES.length,
    module: item.module,
    lireConsigne: (texte) => contexte.voix.lire(texte),
    signaler: (erreur) => contexte.signaler('Consigne du test de départ illisible', erreur),
  });
  const choix = await creerChoix({ options: creerOptions(item), etiquette: item.enonce });
  const question = { session, item, carte, choix, suite: () => afficherSuivante(session) };

  if (phrase !== null) {
    session.bulle.parler(phrase);
  }
  session.mascotte.definirEtat('pense');
  carte.zoneExercice.append(creerZoneDeQuestion(item), choix.racine);
  carte.zoneActions.append(creerBouton('Vérifier', 'bouton--principal', () => verifier(question)));
  session.zone.replaceChildren(creerCarteEtape(item.module), carte.racine);
  choix.racine.querySelector('button').focus();
}

// --- La fin ---

function creerListeDesNiveaux(niveaux) {
  const liste = creer('ul', 'test-depart__niveaux');
  const lignes = ORDRE_DES_ETAPES.map((module) => (
    creer('li', 'test-depart__niveau', `${LIBELLES_DES_MODULES[module]} : on commence au niveau ${niveaux[module]}.`)
  ));
  liste.append(...lignes);
  return liste;
}

function afficherFin(session, niveaux) {
  session.plusTard.remove();
  session.bulle.parler(PHRASE_FIN);
  session.mascotte.definirEtat('fete');
  const titre = creer('h1', 'test-depart__etape test-depart__etape--fin', 'La grande aventure est finie');
  session.zone.replaceChildren(titre, creerListeDesNiveaux(niveaux), creerBouton("Aller à l'accueil", 'bouton--principal', allerALAccueil));
  titre.tabIndex = -1;
  titre.focus();
}

/** Écrit les six niveaux d'un coup, une seule fois : le test est alors terminé. */
function terminerLeTest(session) {
  const { contexte, items } = session;
  const donnees = contexte.stockage.lire();
  const niveaux = niveauxDeDepart(items, donnees.meta.testDepart?.reponses ?? {});
  contexte.stockage.ecrire(appliquerNiveaux(donnees, niveaux, new Date()));
  afficherFin(session, niveaux);
}

// --- Le déroulé ---

/** Vrai quand le module qu'on quitte n'a pas posé tous ses items : il s'est arrêté en route. */
function moduleArreteEnRoute(items, reponses, module) {
  return items.some((item) => item.module === module && !Object.hasOwn(reponses, item.id));
}

/** Ce que dit la mascotte avant la question : un mot au début et au changement d'étape, sinon rien de nouveau. */
function phraseAvant(session, prochaine, reponses) {
  if (session.moduleCourant === null) {
    return PHRASE_DEBUT;
  }
  const changeDEtape = prochaine.module !== session.moduleCourant;
  return changeDEtape && moduleArreteEnRoute(session.items, reponses, session.moduleCourant) ? PHRASE_PASSAGE : null;
}

async function afficherSuivante(session) {
  const donnees = session.contexte.stockage.lire();
  const testDepart = donnees.meta.testDepart;
  if (testDepart?.termine) {
    afficherFin(session, donnees.niveaux);
    return;
  }
  const reponses = testDepart?.reponses ?? {};
  const prochaine = prochaineQuestion(session.items, reponses);
  if (prochaine === null) {
    terminerLeTest(session);
    return;
  }
  const phrase = phraseAvant(session, prochaine, reponses);
  session.moduleCourant = prochaine.module;
  await afficherQuestion(session, prochaine, phrase);
}

/**
 * Monte le test de départ.
 * @param {HTMLElement} conteneur
 * @param {Object} contexte Contexte de l'application.
 * @returns {Promise<void>}
 */
export async function monter(conteneur, contexte) {
  await chargerFeuille(FEUILLE_TEST_DEPART);
  const items = await chargerContenu('test-depart');
  const donnees = contexte.stockage.lire();
  const mascotte = await creerMascotte({
    accessoiresEquipes: donnees.accessoires.equipes,
    titre: donnees.profil.nomMascotte || undefined,
    signaler: contexte.signaler,
  });
  const bulle = await creerBulle();
  const zone = creer('div', 'test-depart__zone');
  const plusTard = creer('a', 'test-depart__plus-tard', 'Continuer plus tard');
  const compagnon = creer('div', 'test-depart__compagnon');
  const disposition = creer('div', 'test-depart__disposition');
  const page = creer('section', 'test-depart');
  const session = { contexte, items, mascotte, bulle, zone, plusTard, moduleCourant: null };

  plusTard.href = `#/${ROUTE_ACCUEIL}`;
  compagnon.append(bulle.element, mascotte.element);
  disposition.append(compagnon, zone);
  page.append(plusTard, disposition);
  conteneur.replaceChildren(page);
  await afficherSuivante(session);
}
