// Socle des écrans « un texte = un exercice » du module Lecture (compréhension, remettre dans l'ordre).
//
// Il choisit l'item (une révision due d'abord, sinon un item du niveau en évitant les derniers faits), monte la
// mascotte et la carte d'exercice, puis laisse l'écran dessiner son exercice. À la fin, il enregistre la séance
// et montre l'écran de fin.
//
// CONTRAT : un écran appelle `monterEcranLecture(conteneur, contexte, ecran)` avec
//   mode        clé de l'historique : 'comprehension' | 'ordre'
//   type        type d'item du contenu : 'texte' | 'ordre'
//   consigne    phrase affichée (et écoutable) en haut de la carte
//   monterExercice(session)   dessine l'exercice dans `session.carte` et, quand l'élève a fini, appelle
//                             `session.terminer({ reussis, total, competencesRatees, parfait })`
// La session offre aussi : `contexte`, `item`, `reagir(nom, texte)` (son, mascotte et retour à l'écran).

import { chargerContenu } from '../../coeur/contenu.js';
import { cloturerExercice } from '../../coeur/recompenses.js';
import { choisirAvecRevision, situationDe } from '../../coeur/revisions.js';
import { ROUTE_ACCUEIL } from '../../coeur/routes.js';
import { choisirTexte, idsDejaFaits } from '../../coeur/selection.js';
import { chargerFeuille } from '../../coeur/styles.js';
import { creerBulle } from '../../ui/bulle.js';
import { creerCarteExercice } from '../../ui/carte-exercice.js';
import { creer } from '../../ui/dom.js';
import { creerFinDeLExercice, resultatDuDefi } from '../../ui/fin-exercice.js';
import { creerMascotte } from '../../ui/mascotte.js';
import { creerParleur } from '../../ui/phrases-mascotte.js';

export const MODULE = 'lecture';

const FEUILLE = new URL('../../../css/modules/lecture.css', import.meta.url);
const MESSAGE_AUCUN_ITEM = "Il n'y a pas encore d'exercice de ce type.";

/** Ce que fait chaque réaction : le son, l'état de la mascotte, sa phrase et l'aspect du retour (« Presque ! » pour une erreur). */
const REACTIONS = {
  juste: { son: 'juste', etat: 'content', phrase: 'reussite', classe: 'lecture__verdict lecture__verdict--juste' },
  indice: { son: 'faux', etat: 'encourage', phrase: 'encouragement', classe: 'lecture__verdict presque' },
  correction: { son: 'faux', etat: 'encourage', phrase: 'erreur', classe: 'lecture__verdict presque' },
};

function jouerSon(session, nom) {
  session.contexte.sons.jouer(nom).catch((erreur) => session.contexte.signaler('Son indisponible', erreur));
}

/** Réagit à un verdict : son, mascotte et texte du retour (✓ pour juste, « Presque ! » avec son symbole sinon). */
function reagir(session, nom, texte) {
  const reaction = REACTIONS[nom];
  jouerSon(session, reaction.son);
  session.mascotte.definirEtat(reaction.etat);
  session.bulle.parler(session.parleur.dire(reaction.phrase));
  const verdict = creer('p', reaction.classe, texte);
  session.carte.zoneRetour.replaceChildren(verdict);
}

async function terminer(session, resultat) {
  // Un double clic ne doit enregistrer qu'une seule séance (cloturerExercice s'appelle une seule fois).
  if (session.terminee) {
    return;
  }
  session.terminee = true;
  const { contexte, item, ecran } = session;
  const bilan = cloturerExercice(
    { stockage: contexte.stockage, date: new Date() },
    {
      module: MODULE,
      mode: ecran.mode,
      itemId: item.id,
      reussis: resultat.reussis,
      total: resultat.total,
      competencesRatees: resultat.competencesRatees,
      items: [{ id: item.id, reussi: resultat.parfait }],
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
  session.conteneur.replaceChildren(fin.racine);
  fin.focaliser();
}

async function creerSession(ecran, item) {
  const { contexte } = ecran;
  const donnees = contexte.stockage.lire();
  const mascotte = await creerMascotte({
    accessoiresEquipes: donnees.accessoires.equipes,
    titre: donnees.profil.nomMascotte || undefined,
    signaler: contexte.signaler,
  });
  const bulle = await creerBulle();
  const parleur = creerParleur();
  const carte = await creerCarteExercice({
    consigne: ecran.consigne,
    courant: 1,
    total: 1,
    module: MODULE,
    lireConsigne: (texte) => contexte.voix.lire(texte),
    signaler: (erreur) => contexte.signaler('Lecture de la consigne impossible', erreur),
  });
  const compagnon = creer('div', 'lecture__compagnon');
  compagnon.append(bulle.element, mascotte.element);
  mascotte.definirEtat('pense');
  bulle.parler(parleur.dire('encouragement'));
  const { conteneur } = ecran;
  const session = { contexte, conteneur, ecran, item, mascotte, bulle, parleur, carte, compagnon, terminee: false };
  session.recommencer = () => {
    demarrer(ecran).catch((erreur) => contexte.signaler('Nouvel exercice impossible', erreur));
  };
  session.reagir = (nom, texte) => reagir(session, nom, texte);
  session.terminer = (resultat) => terminer(session, resultat).catch((erreur) => {
    contexte.signaler('Fin de séance impossible', erreur);
  });
  return session;
}

/** Joue d'abord un item à revoir ; sinon en choisit un du niveau, en évitant les derniers faits. */
async function demarrer(ecran) {
  const { conteneur, contexte, items } = ecran;
  const donnees = contexte.stockage.lire();
  const situation = situationDe(donnees, MODULE, new Date());
  const recents = idsDejaFaits(donnees.historique, MODULE, ecran.mode);
  const item = choisirAvecRevision(items, situation, () => choisirTexte(items, situation.niveau, recents));
  if (item === null) {
    const retour = creer('a', 'bouton bouton--discret', 'Retour à la lecture');
    retour.href = `#/${MODULE}`;
    conteneur.replaceChildren(creer('p', 'lecture__vide', MESSAGE_AUCUN_ITEM), retour);
    return;
  }
  const session = await creerSession(ecran, item);
  const disposition = creer('div', 'lecture__disposition');
  disposition.append(session.compagnon, session.carte.racine);
  conteneur.replaceChildren(disposition);
  await ecran.monterExercice(session);
}

/**
 * Monte un écran de lecture (voir le contrat en tête de fichier).
 * @param {HTMLElement} conteneur
 * @param {Object} contexte Contexte de l'application.
 * @param {{mode: string, type: string, consigne: string,
 *   monterExercice: function(Object): Promise<void>}} ecran
 * @returns {Promise<void>}
 */
export async function monterEcranLecture(conteneur, contexte, ecran) {
  await chargerFeuille(FEUILLE);
  const contenu = await chargerContenu(MODULE, {
    strict: contexte.config.modeDeveloppement,
    journal: contexte.signaler,
  });
  const items = contenu.filter((item) => item.type === ecran.type);
  await demarrer({ ...ecran, conteneur, contexte, items });
}
