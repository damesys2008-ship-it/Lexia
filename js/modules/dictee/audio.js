// Écran « Dictée audio » (cahier §7.1, mode « Dictée »).
//
// Parcours : un micro-texte de 3 à 6 phrases est lu phrase par phrase par la synthèse vocale.
// L'élève peut réécouter, écouter plus lentement, passer à la phrase suivante, relire tout le
// texte, et choisir de faire dicter la ponctuation. Elle écrit tout le texte dans un seul champ.
// « Vérifier » affiche la correction mot à mot, puis le texte correct. La logique (alignement,
// indices, texte à lire) est dans audio-logique.js.

import { chargerContenu } from '../../coeur/contenu.js';
import { cloturerExercice } from '../../coeur/recompenses.js';
import { ROUTE_ACCUEIL } from '../../coeur/routes.js';
import { chargerFeuille } from '../../coeur/styles.js';
import { creerBulle } from '../../ui/bulle.js';
import { creerCarteExercice } from '../../ui/carte-exercice.js';
import { creerChampTexte } from '../../ui/champ-texte.js';
import { creer, creerBouton } from '../../ui/dom.js';
import { creerFinDeLExercice, resultatDuDefi } from '../../ui/fin-exercice.js';
import { creerMascotte } from '../../ui/mascotte.js';
import { chargerStylesMotAnnote, creerMotAnnote } from '../../ui/mot-annote.js';
import { creerParleur } from '../../ui/phrases-mascotte.js';
import {
  construireRapport,
  phrasesDuTexte,
  ponctuationDicteeParDefaut,
  texteADicter,
  texteAttendu,
} from './audio-logique.js';
import { choisirAvecRevision, situationDe } from '../../coeur/revisions.js';
import { choisirTexte, idsDejaFaits } from '../../coeur/selection.js';

const FEUILLE_AUDIO = new URL('../../../css/modules/dictee-audio.css', import.meta.url);
const MODULE = 'dictee';
const MODE = 'audio';
const CONSIGNE = 'Écoute chaque phrase, puis écris tout le texte dans le champ.';
const MESSAGE_VOIX_INDISPONIBLE = "Je n'arrive pas à lire à voix haute ici. Demande de l'aide à un adulte.";

/** Les mots de l'élève avec leur état : le mot faux ou manquant s'explique en deux temps. */
function creerMotCorrige(mot) {
  const { etat, texte, indice, correction, explication } = mot;
  if (etat === 'faux' || etat === 'manquant') {
    return creerMotAnnote({ mot: texte, etat, indice, correction, explication });
  }
  return creerMotAnnote({ mot: texte, etat });
}

function afficherCorrection(zone, rapport) {
  const noeuds = rapport.mots.map(creerMotCorrige);
  zone.replaceChildren();
  noeuds.forEach((noeud, indice) => {
    if (indice > 0) {
      zone.append(' ');
    }
    zone.append(noeud);
  });
}

// --- La lecture à voix haute ---

/** Lit un texte ; si la voix échoue, l'élève lit un message simple et l'erreur technique est signalée. */
async function lireAHauteVoix(session, texte, vitesse) {
  try {
    await session.contexte.voix.lire(texte, { vitesse });
  } catch (erreur) {
    session.zoneRetour.textContent = MESSAGE_VOIX_INDISPONIBLE;
    session.contexte.signaler('Lecture de la dictée impossible', erreur);
  }
}

function lirePhraseCourante(session, vitesse) {
  const phrase = session.phrases[session.indice];
  return lireAHauteVoix(session, texteADicter(phrase, session.optionPonctuation.checked), vitesse);
}

function passerALaPhraseSuivante(session) {
  session.indice = Math.min(session.indice + 1, session.phrases.length - 1);
  session.carte.definirProgression(session.indice + 1, session.phrases.length);
  return lirePhraseCourante(session, 'normale');
}

function relireToutLeTexte(session) {
  const texte = session.phrases
    .map((phrase) => texteADicter(phrase, session.optionPonctuation.checked))
    .join(' ');
  return lireAHauteVoix(session, texte, 'normale');
}

function creerCommandesDeLecture(session) {
  const commandes = creer('div', 'dictee-audio__commandes');
  commandes.append(
    creerBouton('Écouter la phrase', 'bouton--principal', () => lirePhraseCourante(session, 'normale')),
    creerBouton('Plus lentement', 'bouton--secondaire', () => lirePhraseCourante(session, 'lente')),
    creerBouton('Phrase suivante', 'bouton--secondaire', () => passerALaPhraseSuivante(session)),
    creerBouton('Relire tout le texte', 'bouton--secondaire', () => relireToutLeTexte(session)),
  );
  return commandes;
}

function creerOptionPonctuation(niveau) {
  const etiquette = creer('label', 'dictee-audio__option');
  const caseACocher = document.createElement('input');
  caseACocher.type = 'checkbox';
  caseACocher.checked = ponctuationDicteeParDefaut(niveau);
  etiquette.append(caseACocher, ' Dicter la ponctuation (virgule, point…)');
  return { etiquette, caseACocher };
}

// --- La fin de l'exercice ---

function jouerSon(session, nom) {
  session.contexte.sons.jouer(nom).catch((erreur) => session.contexte.signaler('Son indisponible', erreur));
}

function creerTexteCorrect(item) {
  const section = creer('section', 'dictee-audio__texte-correct zone-exercice');
  section.append(
    creer('h2', 'dictee-audio__titre-correct', 'Le texte sans faute'),
    creer('p', 'dictee-audio__texte', texteAttendu(item)),
  );
  return section;
}

async function terminer(session, rapport) {
  // Un double clic ne doit enregistrer qu'une seule séance (cloturerExercice s'appelle une seule fois).
  if (session.terminee) {
    return;
  }
  session.terminee = true;
  const { contexte, item } = session;
  const bilan = cloturerExercice(
    { stockage: contexte.stockage, date: new Date() },
    {
      module: MODULE,
      mode: MODE,
      itemId: item.id,
      reussis: rapport.reussis,
      total: rapport.total,
      competencesRatees: rapport.competencesRatees,
      items: [{ id: item.id, reussi: rapport.parfait }],
      ...resultatDuDefi(contexte),
    },
  );
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

function verifier(session) {
  const rapport = construireRapport(session.item, session.champ.value);
  jouerSon(session, rapport.parfait ? 'juste' : 'faux');
  const finir = () => terminer(session, rapport).catch((erreur) => {
    session.contexte.signaler('Fin de séance impossible', erreur);
  });
  if (rapport.parfait) {
    finir();
    return;
  }
  session.champ.readOnly = true;
  afficherCorrection(session.zoneCorrection, rapport);
  session.zoneRetour.textContent = 'Presque ! Touche un mot souligné : un indice, puis la correction.';
  session.zoneActions.replaceChildren(creerBouton('Voir le texte corrigé', 'bouton--principal', finir));
}

// --- Le montage de l'écran ---

/** La mascotte, sa bulle et la carte d'exercice (consigne écoutable, progression par phrase). */
async function creerCompagnonEtCarte(contexte, item) {
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
    total: item.phrases.length,
    module: MODULE,
    lireConsigne: (texte) => contexte.voix.lire(texte),
    signaler: (erreur) => contexte.signaler('Lecture de la consigne impossible', erreur),
  });
  const compagnon = creer('div', 'dictee-audio__compagnon');
  compagnon.append(bulle.element, mascotte.element);
  mascotte.definirEtat('pense');
  bulle.parler(parleur.dire('encouragement'));
  return { compagnon, carte, parleur };
}

async function creerEcran(ecran, item, recommencer) {
  const { conteneur, contexte } = ecran;
  const { compagnon, carte, parleur } = await creerCompagnonEtCarte(contexte, item);
  const { racine, champ } = await creerChampTexte({ etiquette: 'Écris le texte dicté', multiligne: true });
  const option = creerOptionPonctuation(item.niveau);
  const zoneCorrection = creer('p', 'dictee-audio__correction');
  const session = {
    contexte,
    conteneur,
    item,
    champ,
    carte,
    parleur,
    recommencer,
    zoneCorrection,
    phrases: phrasesDuTexte(item),
    zoneRetour: carte.zoneRetour,
    zoneActions: carte.zoneActions,
    optionPonctuation: option.caseACocher,
    indice: 0,
    terminee: false,
  };
  carte.zoneExercice.append(
    creer('h2', 'dictee-audio__theme', item.theme),
    creerCommandesDeLecture(session),
    option.etiquette,
    racine,
    zoneCorrection,
  );
  carte.zoneActions.append(creerBouton('Vérifier', 'bouton--principal', () => verifier(session)));
  const disposition = creer('div', 'dictee-audio__disposition');
  disposition.append(compagnon, carte.racine);
  conteneur.replaceChildren(disposition);
}

/** Joue d'abord un micro-texte à revoir ; sinon en choisit un du niveau, en évitant les derniers faits. */
async function demarrer(ecran) {
  const { conteneur, contexte, textes } = ecran;
  const donnees = contexte.stockage.lire();
  const situation = situationDe(donnees, MODULE, new Date());
  const recents = idsDejaFaits(donnees.historique, MODULE, MODE);
  const item = choisirAvecRevision(textes, situation, () => choisirTexte(textes, situation.niveau, recents));
  if (item === null) {
    conteneur.replaceChildren(creer('p', 'dictee-audio__vide', "Il n'y a pas de texte pour le moment."));
    return;
  }
  await creerEcran(ecran, item, () => demarrer(ecran));
}

/**
 * Monte l'écran de la dictée audio.
 * @param {HTMLElement} conteneur
 * @param {Object} contexte Contexte de l'application.
 * @returns {Promise<void>}
 */
export async function monter(conteneur, contexte) {
  await Promise.all([chargerFeuille(FEUILLE_AUDIO), chargerStylesMotAnnote()]);
  const textes = await chargerContenu('dictee-audio', {
    strict: contexte.config.modeDeveloppement,
    journal: contexte.signaler,
  });
  await demarrer({ conteneur, contexte, textes });
}
