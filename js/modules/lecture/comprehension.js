// Écran « Questions de compréhension » (cahier §7.6, exercice 1).
//
// Le texte reste affiché ; l'élève répond à une question à la fois. Pour une question `ecrit` ou `deviner`, il
// choisit la réponse ET la phrase qui le prouve (en la touchant dans le texte), puis un seul « Vérifier ».
// Pour une question de vocabulaire (`mot`), il choisit seulement la définition ; la phrase du mot est mise en valeur.
// 1re erreur : l'indice. 2e erreur : la correction, avec la bonne réponse et la phrase-preuve.
// Le déroulement (choix de l'item, fin, enregistrement) est dans ecran.js ; la logique pure dans
// comprehension-logique.js.

import { creerSuiviSeance, VERDICT_CORRECTION, VERDICT_INDICE } from '../orthographe/seance-logique.js';
import { creerChoix } from '../../ui/choix.js';
import { creer, creerBouton } from '../../ui/dom.js';
import { creerTexteSurlignable } from '../../ui/texte-surlignable.js';
import {
  ETAT_JUSTE, ETAT_REPONSE_FAUSSE, choisirQuestionsDuDefi,
  demandeUnePreuve, evaluerReponse, indiceApresErreur, reponseEstComplete,
} from './comprehension-logique.js';
import { monterEcranLecture } from './ecran.js';

const CONSIGNE = 'Lis le texte, réponds, puis touche la phrase qui le prouve.';
const ETIQUETTE_DU_GROUPE = 'Réponses possibles';
const CLASSE_PHRASE_DU_MOT = 'lecture__phrase-du-mot';
const SELECTEUR_PHRASE = '.texte-surlignable__phrase';

function creerOptions(question) {
  return question.choix.map((texte) => ({ id: texte, texte }));
}

/** Pour une question de vocabulaire : le mot est dans cette phrase, on la montre (jamais la couleur seule). */
function mettreLaPhraseDuMotEnValeur(texte, question) {
  texte.racine.querySelectorAll(SELECTEUR_PHRASE)[question.preuve].classList.add(CLASSE_PHRASE_DU_MOT);
  texte.desactiver();
}

/** Les questions posées : toutes, ou quatre variées dans le défi du jour. */
function questionsPosees({ item, contexte }) {
  return contexte.defi ? choisirQuestionsDuDefi(item.questions) : item.questions;
}

// --- Les réactions à une réponse ---

function marquerLaReponse(vue, reponse, etat) {
  const juste = etat !== ETAT_REPONSE_FAUSSE;
  vue.choix.marquerResultat(reponse, juste ? 'juste' : 'faux');
}

/** Seule une phrase qui n'est pas la preuve est marquée fausse : la bonne phrase reste choisissable. */
function marquerLaPhrase(vue, phrase) {
  if (phrase !== null && phrase !== vue.question.preuve) {
    vue.texte.marquer(phrase, 'faux');
  }
}

/** Après la correction : la bonne réponse et la phrase-preuve sont marquées ✓, plus rien ne bouge. */
function montrerLaCorrection(vue) {
  const { question, choix, texte, boutonVerifier } = vue;
  choix.marquerResultat(question.reponse, 'juste');
  if (demandeUnePreuve(question)) {
    texte.marquer(question.preuve, 'juste');
  }
  choix.desactiver();
  texte.desactiver();
  boutonVerifier.remove();
}

function proposerLaSuite(vue) {
  const { session, suivi } = vue;
  const derniere = suivi.position() === suivi.total - 1;
  const bouton = creerBouton(derniere ? 'Terminer' : 'Suivant', 'bouton--principal', () => avancer(vue));
  session.carte.zoneActions.replaceChildren(bouton);
  bouton.focus();
}

function reagir(vue, verdict, etat) {
  const { session, question } = vue;
  if (verdict === VERDICT_INDICE) {
    session.reagir('indice', `Presque ! Indice : ${indiceApresErreur(question, etat)} Essaie encore.`);
    vue.boutonVerifier.disabled = true; // l'élève doit changer quelque chose avant de vérifier de nouveau
    return;
  }
  montrerLaCorrection(vue);
  if (verdict === VERDICT_CORRECTION) {
    session.reagir('correction', `Presque ! Voici la bonne réponse : ${question.reponse}. ${question.explication}`);
  } else {
    session.reagir('juste', `✓ Juste ! ${question.explication}`);
  }
  proposerLaSuite(vue);
}

function verifier(vue) {
  const { question, choix, texte, suivi } = vue;
  const reponse = choix.lireChoix();
  const phrase = demandeUnePreuve(question) ? texte.lireChoix() : null;
  const etat = evaluerReponse(question, reponse, phrase);
  const verdict = suivi.repondre(etat === ETAT_JUSTE);
  if (etat !== ETAT_JUSTE) {
    marquerLaReponse(vue, reponse, etat);
    marquerLaPhrase(vue, phrase);
  }
  reagir(vue, verdict, etat);
}

// --- Le déroulement des questions ---

function sePrepareAVerifier(vue) {
  const { question, choix, texte, boutonVerifier } = vue;
  const phrase = demandeUnePreuve(question) ? texte.lireChoix() : null;
  boutonVerifier.disabled = !reponseEstComplete(question, choix.lireChoix(), phrase);
}

/** Pose la question du suivi sur la carte : progression, titre, texte, question, choix et bouton « Vérifier ». */
function remplirLaCarte(vue) {
  const { session, suivi, question, texte, choix, boutonVerifier } = vue;
  const { item, carte } = session;
  carte.definirProgression(suivi.position() + 1, suivi.total);
  carte.zoneRetour.replaceChildren();
  carte.zoneActions.replaceChildren(boutonVerifier);
  carte.zoneExercice.replaceChildren(
    creer('h2', 'lecture__titre', item.titre),
    texte.racine,
    creer('p', 'lecture__question', question.question),
    choix.racine,
  );
}

async function afficherQuestion(vue) {
  const { session, suivi } = vue;
  const question = suivi.itemCourant();
  const { item } = session;
  const boutonVerifier = creerBouton('Vérifier', 'bouton--principal', () => verifier(vue));
  boutonVerifier.disabled = true;
  Object.assign(vue, { question, boutonVerifier });
  vue.texte = await creerTexteSurlignable({ paragraphes: item.paragraphes, onChoix: () => sePrepareAVerifier(vue) });
  vue.choix = await creerChoix({
    options: creerOptions(question),
    etiquette: ETIQUETTE_DU_GROUPE,
    onChange: () => sePrepareAVerifier(vue),
  });
  if (!demandeUnePreuve(question)) {
    mettreLaPhraseDuMotEnValeur(vue.texte, question);
  }
  remplirLaCarte(vue);
}

function avancer(vue) {
  vue.choix.detruire();
  if (vue.suivi.passerALaSuite()) {
    afficherQuestion(vue).catch((erreur) => vue.session.contexte.signaler('Question impossible', erreur));
    return;
  }
  const { reussis, total, competencesRatees } = bilanDuTexte(vue.suivi);
  vue.session.terminer({ reussis, total, competencesRatees, parfait: reussis === total });
}

/** Réussies du premier coup (et non au 2e essai), sur les questions posées. */
function bilanDuTexte(suivi) {
  const { total, competencesRatees } = suivi.bilan();
  const reussis = suivi.resultatsParItem().filter((resultat) => resultat.reussi).length;
  return { reussis, total, competencesRatees };
}

async function monterExercice(session) {
  const questions = questionsPosees(session);
  await afficherQuestion({ session, suivi: creerSuiviSeance(questions) });
}

/**
 * Monte l'écran des questions de compréhension.
 * @param {HTMLElement} conteneur
 * @param {Object} contexte Contexte de l'application.
 * @returns {Promise<void>}
 */
export async function monter(conteneur, contexte) {
  await monterEcranLecture(conteneur, contexte, {
    mode: 'comprehension',
    type: 'texte',
    consigne: CONSIGNE,
    monterExercice,
  });
}
