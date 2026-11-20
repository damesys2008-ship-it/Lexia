// Écran « Détective des fautes » (cahier §7.1, mode relecture).
//
// Parcours : l'élève relit un texte qui cache N fautes. Un clic sur un mot le rend modifiable
// sur place (accents, autocorrection coupée). « Vérifier » : la 1re fois, seulement le compte ;
// la 2e fois, les fautes restantes sont soulignées (indice, puis correction) et les mots justes
// modifiés à tort sont signalés en orange. Pour finir, le texte entièrement correct est affiché.
// La logique (comparaison, messages, choix du texte) est dans detective-logique.js.

import { chargerContenu } from '../../coeur/contenu.js';
import { ROUTE_ACCUEIL } from '../../coeur/routes.js';
import { cloturerExercice } from '../../coeur/recompenses.js';
import { chargerFeuille } from '../../coeur/styles.js';
import { tokeniser } from '../../coeur/texte.js';
import { creerBulle } from '../../ui/bulle.js';
import { creerCarteExercice } from '../../ui/carte-exercice.js';
import { creerChampTexte } from '../../ui/champ-texte.js';
import { creerFinDeLExercice, resultatDuDefi } from '../../ui/fin-exercice.js';
import { creerMascotte } from '../../ui/mascotte.js';
import { chargerStylesMotAnnote, creerMotAnnote } from '../../ui/mot-annote.js';
import { creerParleur } from '../../ui/phrases-mascotte.js';
import { choisirAvecRevision, situationDe } from '../../coeur/revisions.js';
import { choisirTexte, idsDejaFaits } from '../../coeur/selection.js';
import {
  compterLesReussites,
  construireTexteFautif,
  estParfait,
  estReussiDuPremierCoup,
  evaluer,
  messageDuCompte,
  motsDuTexteCorrige,
  texteNombreDeFautes,
} from './detective-logique.js';

const FEUILLE_DETECTIVE = new URL('../../../css/modules/detective.css', import.meta.url);
const MODULE = 'dictee';
const MODE = 'detective';
const CONSIGNE = 'Relis le texte et corrige toutes les fautes cachées.';

function creer(balise, classe, texte = '') {
  const element = document.createElement(balise);
  element.className = classe;
  element.textContent = texte;
  return element;
}

function creerBouton(texte, classe, action) {
  const bouton = creer('button', `bouton ${classe}`, texte);
  bouton.type = 'button';
  bouton.addEventListener('click', action);
  return bouton;
}

/** Ajoute des mots dans un paragraphe en les séparant par des espaces. */
function ajouterMots(paragraphe, noeuds) {
  noeuds.forEach((noeud, indice) => {
    if (indice > 0) {
      paragraphe.append(' ');
    }
    paragraphe.append(noeud);
  });
}

// --- Le texte à corriger : un bouton par mot, un champ sur le mot en cours de modification ---

async function creerEdition(session, indice) {
  const { racine, champ } = await creerChampTexte({ etiquette: 'Écris le mot corrigé' });
  const boite = creer('span', 'detective__edition');
  champ.value = session.cellules[indice];
  const valider = () => session.validerMot(indice, champ.value);
  champ.addEventListener('keydown', (evenement) => {
    if (evenement.key === 'Enter') {
      evenement.preventDefault();
      valider();
    } else if (evenement.key === 'Escape') {
      session.fermerEdition(indice);
    }
  });
  const actions = creer('span', 'detective__edition-actions');
  actions.append(creerBouton('Valider', 'bouton--principal', valider));
  if (indice < session.cellules.length - 1) {
    actions.append(creerBouton('Ajouter le mot suivant', 'bouton--secondaire', () => {
      session.reunirAvecSuivant(indice, champ.value);
    }));
  }
  actions.append(creerBouton('Annuler', 'bouton--discret', () => session.fermerEdition(indice)));
  boite.append(racine, actions);
  return { boite, champ };
}

function creerMotModifiable(session, indice) {
  const bouton = creer('button', 'detective__mot', session.cellules[indice]);
  bouton.type = 'button';
  bouton.dataset.indice = String(indice);
  bouton.addEventListener('click', () => session.ouvrirEdition(indice));
  return bouton;
}

/** Affiche le texte en cours de relecture. Le champ du mot ouvert reçoit le focus. */
async function afficherTexteModifiable(session) {
  const noeuds = [];
  let champAFocaliser = null;
  for (let indice = 0; indice < session.cellules.length; indice += 1) {
    if (indice === session.edition) {
      const edition = await creerEdition(session, indice);
      noeuds.push(edition.boite);
      champAFocaliser = edition.champ;
    } else {
      noeuds.push(creerMotModifiable(session, indice));
    }
  }
  session.zoneTexte.replaceChildren();
  ajouterMots(session.zoneTexte, noeuds);
  champAFocaliser?.focus();
}

// --- La correction : chaque mot de l'élève avec son état ---

function creerMotCorrige(mot) {
  const { etat, texte, faute, attendu } = mot;
  if (etat === 'neutre') {
    return document.createTextNode(texte);
  }
  if (etat === 'faux') {
    return creerMotAnnote({
      mot: texte,
      etat: 'faux',
      indice: faute.indice,
      correction: faute.correct,
      explication: faute.explication,
    });
  }
  if (etat === 'fauxPositif') {
    return creerMotAnnote({ mot: texte, etat, correction: attendu });
  }
  if (etat === 'manquant') {
    return creerMotAnnote({
      mot: '',
      etat,
      indice: faute?.indice,
      correction: faute?.correct ?? attendu,
      explication: faute?.explication,
    });
  }
  return creerMotAnnote({ mot: texte, etat });
}

function afficherCorrection(session, evaluation) {
  session.zoneTexte.replaceChildren();
  ajouterMots(session.zoneTexte, evaluation.mots.map(creerMotCorrige));
}

/** Le texte entièrement correct : les mots qui portaient une faute sont surlignés en menthe. */
function creerTexteCorrect(item) {
  const section = creer('section', 'detective__texte-correct zone-exercice');
  const titre = creer('h2', 'detective__titre-correct', 'Le texte sans faute');
  const paragraphe = creer('p', 'detective__texte');
  const noeuds = motsDuTexteCorrige(item).map((mot) => (mot.corrige
    ? creerMotAnnote({ mot: mot.texte, etat: 'corrige' })
    : document.createTextNode(mot.texte)));
  ajouterMots(paragraphe, noeuds);
  section.append(titre, paragraphe);
  return section;
}

// --- Le déroulement d'un exercice ---

function jouerSon(session, nom) {
  session.contexte.sons.jouer(nom).catch((erreur) => session.contexte.signaler('Son indisponible', erreur));
}

/**
 * Enregistre le résultat de l'exercice (étoiles, répétition espacée) et renvoie le bilan.
 * Les étoiles suivent la première vérification ; les compétences ratées, la dernière.
 */
function enregistrerResultat(session, evaluation) {
  const { contexte, item } = session;
  const { reussis, total } = compterLesReussites(item, session.premiereEvaluation);
  const competencesRatees = evaluation.fautes
    .filter((entree) => !entree.corrigee)
    .map((entree) => entree.faute.competence);
  return cloturerExercice(
    { stockage: contexte.stockage, date: new Date() },
    {
      module: MODULE,
      mode: MODE,
      itemId: item.id,
      reussis,
      total,
      competencesRatees,
      items: [{ id: item.id, reussi: estReussiDuPremierCoup(evaluation, session.verifications) }],
      ...resultatDuDefi(contexte),
    },
  );
}

async function terminer(session, evaluation) {
  // Un double clic ne doit enregistrer qu'une seule séance (cloturerExercice s'appelle une seule fois).
  if (session.terminee) {
    return;
  }
  session.terminee = true;
  const { contexte, item } = session;
  const bilan = enregistrerResultat(session, evaluation);
  const donnees = contexte.stockage.lire();
  const fin = await creerFinDeLExercice(contexte, {
    bilan,
    sons: contexte.sons,
    parleur: session.parleur,
    actions: { encoreUn: session.recommencer, accueil: () => { window.location.hash = `#/${ROUTE_ACCUEIL}`; } },
    accessoiresEquipes: donnees.accessoires.equipes,
    nomMascotte: donnees.profil.nomMascotte || undefined,
    signaler: (erreur) => contexte.signaler('Son de fin indisponible', erreur),
  });
  session.conteneur.replaceChildren(creerTexteCorrect(item), fin.racine);
  fin.focaliser();
}

async function verifier(session) {
  const evaluation = evaluer(session.item, session.cellules.join(' '));
  session.premiereEvaluation ??= evaluation;
  if (estParfait(evaluation)) {
    jouerSon(session, 'juste');
    await terminer(session, evaluation);
    return;
  }
  jouerSon(session, 'faux');
  if (session.verifications === 0) {
    session.verifications = 1;
    session.zoneRetour.textContent = messageDuCompte(evaluation.restantes, evaluation.fauxPositifs);
    session.mascotte.definirEtat('encourage');
    return;
  }
  session.edition = null;
  afficherCorrection(session, evaluation);
  session.zoneRetour.textContent = 'Presque ! Touche un mot souligné : un indice, puis la correction.';
  session.zoneActions.replaceChildren(
    creerBouton('Voir le texte corrigé', 'bouton--principal', () => terminer(session, evaluation)),
  );
}

/** Une session : l'état de l'exercice en cours et les actions que les boutons du texte appellent. */
function creerSession({ item, ...composants }) {
  const session = {
    ...composants,
    item,
    cellules: tokeniser(construireTexteFautif(item)),
    edition: null,
    verifications: 0,
    premiereEvaluation: null,
    terminee: false,
    async ouvrirEdition(indice) {
      session.edition = indice;
      await afficherTexteModifiable(session);
    },
    async fermerEdition(indice) {
      session.edition = null;
      await afficherTexteModifiable(session);
      session.zoneTexte.querySelector(`[data-indice="${indice}"]`)?.focus();
    },
    async validerMot(indice, valeur) {
      const mot = valeur.trim();
      if (mot === '') {
        session.cellules.splice(indice, 1);
      } else {
        session.cellules[indice] = mot;
      }
      await session.fermerEdition(Math.min(indice, session.cellules.length - 1));
    },
    async reunirAvecSuivant(indice, valeur) {
      const debut = valeur.trim();
      session.cellules.splice(indice, 2, `${debut} ${session.cellules[indice + 1]}`.trim());
      await session.ouvrirEdition(indice);
    },
  };
  return session;
}

/** Construit l'écran d'un exercice : la mascotte, la carte avec le texte, le bouton « Vérifier ». */
async function creerEcran(ecran, item, recommencer) {
  const { conteneur, contexte } = ecran;
  const donnees = contexte.stockage.lire();
  const mascotte = await creerMascotte({
    accessoiresEquipes: donnees.accessoires.equipes,
    titre: donnees.profil.nomMascotte || undefined,
    signaler: contexte.signaler,
  });
  const bulle = await creerBulle();
  const parleur = creerParleur();
  const carte = await creerCarteExercice({
    consigne: CONSIGNE,
    courant: 1,
    total: 1,
    module: MODULE,
    lireConsigne: (texte) => contexte.voix.lire(texte),
    signaler: (erreur) => contexte.signaler('Lecture de la consigne impossible', erreur),
  });
  const compte = creer('p', 'detective__compte', texteNombreDeFautes(item.fautes.length));
  const zoneTexte = creer('div', 'detective__texte');
  zoneTexte.setAttribute('role', 'group');
  zoneTexte.setAttribute('aria-label', 'Texte à corriger');

  const session = creerSession({
    contexte,
    conteneur,
    item,
    parleur,
    mascotte,
    zoneTexte,
    zoneRetour: carte.zoneRetour,
    zoneActions: carte.zoneActions,
    recommencer,
  });
  carte.zoneExercice.append(compte, zoneTexte);
  carte.zoneActions.append(creerBouton('Vérifier', 'bouton--principal', () => verifier(session)));
  const compagnon = creer('div', 'detective__compagnon');
  compagnon.append(bulle.element, mascotte.element);
  mascotte.definirEtat('pense');
  bulle.parler(parleur.dire('encouragement'));
  const disposition = creer('div', 'detective__disposition');
  disposition.append(compagnon, carte.racine);
  conteneur.replaceChildren(disposition);
  await afficherTexteModifiable(session);
}

/** Joue d'abord un texte à revoir ; sinon en choisit un du niveau de l'élève, en évitant les derniers faits. */
async function demarrer(ecran) {
  const { conteneur, contexte, textes } = ecran;
  const donnees = contexte.stockage.lire();
  const situation = situationDe(donnees, MODULE, new Date());
  const recents = idsDejaFaits(donnees.historique, MODULE, MODE);
  const item = choisirAvecRevision(textes, situation, () => choisirTexte(textes, situation.niveau, recents));
  if (item === null) {
    conteneur.replaceChildren(creer('p', 'detective__vide', "Il n'y a pas de texte pour le moment."));
    return;
  }
  await creerEcran(ecran, item, () => demarrer(ecran));
}

/**
 * Monte l'écran du détective.
 * @param {HTMLElement} conteneur
 * @param {Object} contexte Contexte de l'application.
 * @returns {Promise<void>}
 */
export async function monter(conteneur, contexte) {
  await Promise.all([chargerFeuille(FEUILLE_DETECTIVE), chargerStylesMotAnnote()]);
  const textes = await chargerContenu('dictee-detective', {
    strict: contexte.config.modeDeveloppement,
    journal: contexte.signaler,
  });
  await demarrer({ conteneur, contexte, textes });
}
