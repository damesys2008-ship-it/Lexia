// Écran « Remets dans l'ordre » (cahier §7.6, exercice 2).
//
// Les paragraphes d'une histoire sont mélangés ; l'élève les déplace avec « Monter » et « Descendre » (pas de
// glisser-déposer : les flèches marchent au clavier comme au toucher), puis « Vérifier ».
// 1re erreur : l'indice, avec ✓ sur les paragraphes bien placés et ✗ sur les autres. 2e erreur : le bon ordre.
// Le déroulement (choix de l'item, fin, enregistrement) est dans ecran.js ; la logique pure dans ordre-logique.js.

import { chargerFeuille } from '../../coeur/styles.js';
import { creerSuiviSeance, VERDICT_CORRECTION, VERDICT_INDICE } from '../orthographe/seance-logique.js';
import { creer, creerBouton } from '../../ui/dom.js';
import { monterEcranLecture } from './ecran.js';
import {
  SENS_DESCENDRE, SENS_MONTER, comparerOrdre, decrireDeplacement, deplacer, melangerOrdre,
} from './ordre-logique.js';

const FEUILLE_ORDRE = new URL('../../../css/modules/lecture-ordre.css', import.meta.url);
const CONSIGNE = "Remets les paragraphes dans l'ordre de l'histoire.";
const MARQUE_BIEN_PLACE = '✓ bien placé';
const MARQUE_MAL_PLACE = '✗ Presque ! Pas à sa place';

function creerBoutonDeplacement(vue, position, sens) {
  const monter = sens === SENS_MONTER;
  const verbe = monter ? 'Monter' : 'Descendre';
  const arrivee = position + sens;
  const bouton = creerBouton(verbe, 'bouton--secondaire lecture__fleche', () => bouger(vue, position, sens));
  bouton.setAttribute('aria-label', `${verbe} le paragraphe ${position + 1}`);
  bouton.dataset.sens = String(sens);
  bouton.disabled = vue.verrouille || arrivee < 0 || arrivee >= vue.ordre.length;
  return bouton;
}

function creerParagraphe(vue, position) {
  const paragraphe = creer('li', 'lecture__paragraphe');
  const texte = creer('p', 'lecture__paragraphe-texte', vue.item.paragraphes[vue.ordre[position]]);
  const marque = vue.marques?.[position];
  if (marque !== undefined) {
    paragraphe.classList.add(`lecture__paragraphe--${marque.bien ? 'juste' : 'faux'}`);
  }
  const boutons = creer('div', 'lecture__fleches');
  boutons.append(
    creerBoutonDeplacement(vue, position, SENS_MONTER),
    creerBoutonDeplacement(vue, position, SENS_DESCENDRE),
  );
  paragraphe.append(texte);
  if (marque !== undefined) {
    paragraphe.append(creer('p', `lecture__marque lecture__marque--${marque.bien ? 'juste' : 'faux'}`, marque.texte));
  }
  paragraphe.append(boutons);
  return paragraphe;
}

/** Redessine la liste ; `focus` désigne le bouton à focaliser (position et sens) pour ne pas perdre l'élève. */
function afficherLaListe(vue, focus = null) {
  vue.liste.replaceChildren(...vue.ordre.map((_, position) => creerParagraphe(vue, position)));
  if (focus === null) {
    return;
  }
  const boutons = vue.liste.children[focus.position].querySelectorAll('button');
  const voulu = [...boutons].find((bouton) => bouton.dataset.sens === String(focus.sens) && !bouton.disabled);
  (voulu ?? [...boutons].find((bouton) => !bouton.disabled))?.focus();
}

function bouger(vue, position, sens) {
  // Les boutons des bords sont désactivés : le déplacement est toujours réel.
  vue.ordre = deplacer(vue.ordre, position, sens);
  vue.marques = undefined; // les ✓ et ✗ ne concernaient que l'ancien ordre
  vue.annonce.textContent = decrireDeplacement(position, position + sens);
  afficherLaListe(vue, { position: position + sens, sens });
}

// --- La vérification ---

function marquerLesParagraphes(vue, bienPlaces) {
  vue.marques = bienPlaces.map((bien) => ({ bien, texte: bien ? MARQUE_BIEN_PLACE : MARQUE_MAL_PLACE }));
  afficherLaListe(vue);
}

/** Affiche le bon ordre : plus rien ne bouge, tout est ✓. */
function montrerLeBonOrdre(vue) {
  vue.ordre = vue.item.paragraphes.map((_, index) => index);
  vue.verrouille = true;
  marquerLesParagraphes(vue, vue.ordre.map(() => true));
}

function proposerLaFin(vue) {
  const bouton = creerBouton('Terminer', 'bouton--principal', () => terminerLExercice(vue));
  vue.session.carte.zoneActions.replaceChildren(bouton);
  bouton.focus();
}

function terminerLExercice(vue) {
  const { suivi, session } = vue;
  const parfait = suivi.resultatsParItem()[0].reussi;
  session.terminer({ ...suivi.bilan(), reussis: parfait ? 1 : 0, parfait });
}

function reagir(vue, verdict, bienPlaces) {
  const { session, item } = vue;
  if (verdict === VERDICT_INDICE) {
    marquerLesParagraphes(vue, bienPlaces);
    session.reagir('indice', `✗ Presque ! Indice : ${item.indice} Essaie encore.`);
    return;
  }
  montrerLeBonOrdre(vue);
  const reaction = verdict === VERDICT_CORRECTION
    ? ['correction', `✗ Presque ! Voici le bon ordre. ${item.explication}`]
    : ['juste', `✓ Juste ! ${item.explication}`];
  session.reagir(...reaction);
  proposerLaFin(vue);
}

function verifier(vue) {
  const { juste, bienPlaces } = comparerOrdre(vue.ordre);
  reagir(vue, vue.suivi.repondre(juste), bienPlaces);
}

async function monterExercice(session) {
  await chargerFeuille(FEUILLE_ORDRE);
  const { item, carte } = session;
  const vue = {
    session,
    item,
    suivi: creerSuiviSeance([item]),
    ordre: melangerOrdre(item.paragraphes.length),
    verrouille: false,
    liste: creer('ol', 'lecture__ordre'),
    annonce: creer('p', 'sr-seulement'),
  };
  vue.annonce.setAttribute('aria-live', 'polite');
  afficherLaListe(vue);
  carte.zoneExercice.replaceChildren(creer('h2', 'lecture__titre', item.titre), vue.liste, vue.annonce);
  carte.zoneActions.replaceChildren(creerBouton('Vérifier', 'bouton--principal', () => verifier(vue)));
}

/**
 * Monte l'écran « Remets dans l'ordre ».
 * @param {HTMLElement} conteneur
 * @param {Object} contexte Contexte de l'application.
 * @returns {Promise<void>}
 */
export async function monter(conteneur, contexte) {
  await monterEcranLecture(conteneur, contexte, {
    mode: 'ordre',
    type: 'ordre',
    consigne: CONSIGNE,
    monterExercice,
  });
}
