// Écran « Les transformations » (cahier §7.4, exercice 4).
//
// L'élève réécrit une phrase : à la forme négative, au pluriel, en question ou au passé composé.
// La séance (orthographe/seance.js) gère indice, correction, sons et clôture ; ici on dessine une étape.
// La réponse n'est jamais montrée avant la 2e erreur. La comparaison est dans transformations-logique.js :
// majuscule et point final sont tolérés (un rappel est affiché), le « ? » est exigé pour une question.

import { creerChampTexte } from '../../ui/champ-texte.js';
import { creer, creerBouton } from '../../ui/dom.js';
import { VERDICT_INDICE, VERDICT_TERMINE } from '../orthographe/seance-logique.js';
import { monterExercice } from '../orthographe/seance.js';
import { MODULE } from './index.js';
import {
  decrireBonneReponse,
  estBienPonctuee,
  estInterrogation,
  estReponseJuste,
  estVide,
} from './transformations-logique.js';

const FEUILLE = new URL('../../../css/modules/grammaire-transformations.css', import.meta.url);
const CONSIGNE = 'Transforme la phrase en suivant la consigne.';
const RAPPEL_PONCTUATION = 'N\'oublie pas la majuscule et le point.';
const CLASSE_SAISIE_TERMINEE = 'grammaire-transformations__saisie--terminee';
const CLASSE_ENONCE_TERMINE = 'grammaire-transformations__enonce--termine';
const TITRE_DES_TOURNURES = 'Les trois façons de poser la question';

function creerTournures(item) {
  const bloc = creer('div', 'grammaire-transformations__tournures');
  const liste = creer('ul', 'grammaire-transformations__liste');
  bloc.append(creer('h3', 'grammaire-transformations__titre', TITRE_DES_TOURNURES), liste);
  item.reponses.forEach((reponse) => liste.append(creer('li', '', reponse)));
  return bloc;
}

/** Après la réponse finale : plus rien ne s'écrit ; accents, bouton « Vérifier » et consigne disparaissent. */
function montrerLaFin(vue) {
  const { enonce, saisie, champ, boutonVerifier } = vue;
  champ.readOnly = true;
  saisie.classList.add(CLASSE_SAISIE_TERMINEE);
  enonce.classList.add(CLASSE_ENONCE_TERMINE);
  boutonVerifier.remove();
}

/** Après une bonne réponse à une question : les trois tournures (après la correction, le message les donne). */
function montrerLesTournures(vue) {
  vue.zoneFin.append(creerTournures(vue.item));
}

function rappelerLaPonctuation(vue) {
  vue.zoneFin.append(creer('p', 'grammaire-transformations__rappel', RAPPEL_PONCTUATION));
}

function verifier(vue) {
  const { etape, item, champ } = vue;
  if (champ.readOnly || estVide(champ.value)) {
    champ.focus();
    return;
  }
  const juste = estReponseJuste(item, champ.value);
  const verdict = etape.valider({ juste, bonneReponse: decrireBonneReponse(item) });
  if (verdict === VERDICT_TERMINE) {
    return;
  }
  if (verdict === VERDICT_INDICE) {
    champ.focus();
    return;
  }
  if (juste && !estBienPonctuee(champ.value)) {
    rappelerLaPonctuation(vue);
  }
  if (juste && estInterrogation(item)) {
    montrerLesTournures(vue);
  }
  montrerLaFin(vue);
}

/** Une ligne de l'énoncé : le texte et, à côté, un bouton « Écouter » qui le lit à voix haute. */
function creerLigneLue(texte, nomDuBouton, lire) {
  const bouton = creerBouton('Écouter', 'bouton--secondaire', lire);
  bouton.setAttribute('aria-label', nomDuBouton);
  const ligne = creer('div', 'grammaire-transformations__ligne');
  ligne.append(texte, bouton);
  return ligne;
}

function creerEnonce(item, etape) {
  const consigne = creer('p', 'grammaire-transformations__consigne', item.consigne);
  const source = creer('p', 'orthographe__phrase grammaire-transformations__source', 'Phrase de départ\u00A0: ');
  source.append(creer('strong', '', item.source));
  const enonce = creer('div', 'grammaire-transformations__enonce');
  enonce.append(
    creerLigneLue(consigne, 'Écouter la demande', () => etape.lire(item.consigne)),
    creerLigneLue(source, 'Écouter la phrase', () => etape.lire(item.source)),
  );
  return enonce;
}

async function monterEtape(item, etape) {
  const { racine: saisie, champ } = await creerChampTexte({ etiquette: 'Ta phrase' });
  const boutonVerifier = creerBouton('Vérifier', 'bouton--principal', () => verifier(vue));
  const zoneFin = creer('div', 'grammaire-transformations__fin');
  const enonce = creerEnonce(item, etape);
  const vue = { etape, item, enonce, saisie, champ, boutonVerifier, zoneFin };
  const reponse = creer('div', 'grammaire-transformations__reponse');
  reponse.append(saisie, boutonVerifier);
  champ.addEventListener('keydown', (evenement) => {
    if (evenement.key === 'Enter') {
      evenement.preventDefault();
      verifier(vue);
    }
  });
  zoneFin.setAttribute('aria-live', 'polite');
  etape.zone.append(enonce, reponse, zoneFin);
}

/**
 * Monte l'exercice « Les transformations ».
 * @param {HTMLElement} conteneur
 * @param {Object} contexte Contexte de l'application.
 * @returns {Promise<void>}
 */
export async function monter(conteneur, contexte) {
  await monterExercice(conteneur, contexte, {
    module: MODULE,
    contenu: MODULE,
    libelleRetour: 'Retour à la grammaire',
    mode: 'transformations',
    type: 'transformation',
    consigne: CONSIGNE,
    feuille: FEUILLE,
    monterEtape,
  });
}
