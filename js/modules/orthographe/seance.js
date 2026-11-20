// Séance partagée par les exercices d'orthographe (homophones, accords, invariables, muettes)
// et de grammaire (tri, fonctions, étiquettes, transformations).
//
// CONTRAT : un exercice est un objet que son fichier (homophones.js, accords.js…) donne à
// `monterExercice(conteneur, contexte, exercice)`.
//
// Ce que l'exercice fournit :
//   mode          clé de l'historique : 'homophones' | 'accords' | 'invariables' | 'muettes'
//   type          type d'item du contenu : 'homophone' | 'accord' | 'invariable' | 'muette'
//   consigne      phrase affichée (et écoutable) en haut de la carte
//   feuille       (facultatif) URL de la feuille CSS propre à l'exercice
//   module        (facultatif) module de l'historique et du niveau ; 'orthographe' par défaut
//   contenu       (facultatif) nom du fichier de data/ à charger ; 'orthographe' par défaut
//   libelleRetour (facultatif) texte du lien affiché quand le contenu est vide ; « Retour à l'orthographe » par défaut
//   monterEtape(item, etape)   dessine UN item dans `etape.zone` (déjà vide) et attend l'élève ;
//                              peut être asynchrone (le champ de saisie se crée avec await)
//
// Ce que la séance offre à l'exercice, dans `etape` :
//   etape.zone                 <div> de travail : l'exercice y ajoute ses éléments (jamais d'innerHTML)
//   etape.lire(texte)          lit un texte à voix haute (message simple si la voix échoue)
//   etape.valider({ juste, bonneReponse })
//       À appeler à chaque validation de l'élève. `bonneReponse` : texte de la bonne forme.
//       Renvoie le verdict : 'juste' | 'indice' | 'correction' | 'termine'.
//         'indice'      1re erreur : l'indice est déjà affiché ; l'élève peut réessayer
//         'correction'  2e erreur : la bonne forme est annoncée ; montrer la bonne forme dans la zone
//         'juste'       réussi (du 1er ou du 2e essai) ; l'item est fini
//         'termine'     l'item est déjà fini : ignorer
//       Après 'juste' ou 'correction', l'exercice désactive ses commandes.
//
// Ce que la séance fait seule : choix de 8 items, progression, indice, retour (✓ / ✗ et texte),
// sons, mascotte et bulle, bouton « Suivant », clôture (étoiles, historique) et écran de fin.
// Principes : 1re erreur = indice ; 2e erreur = correction, l'item compte comme erreur ; la bonne
// forme a le dernier mot ; aucun chrono. Le contrat détaillé est aussi dans
// .equipe/ressources/orthographe-seance.md.

import { chargerContenu } from '../../coeur/contenu.js';
import { cloturerExercice } from '../../coeur/recompenses.js';
import { inclureRevisions, situationDe } from '../../coeur/revisions.js';
import { ROUTE_ACCUEIL } from '../../coeur/routes.js';
import { chargerFeuille } from '../../coeur/styles.js';
import { creerBulle } from '../../ui/bulle.js';
import { creerCarteExercice } from '../../ui/carte-exercice.js';
import { creer, creerBouton } from '../../ui/dom.js';
import { creerFinDeLExercice, resultatDuDefi } from '../../ui/fin-exercice.js';
import { creerMascotte } from '../../ui/mascotte.js';
import { creerParleur } from '../../ui/phrases-mascotte.js';
import {
  MODULE as MODULE_PAR_DEFAUT,
  NOMBRE_ITEMS_PAR_SEANCE,
  VERDICT_CORRECTION,
  VERDICT_INDICE,
  VERDICT_JUSTE,
  choisirItemsSeance,
  creerSuiviSeance,
  identifiantSeance,
  idsRecentsDesSeances,
} from './seance-logique.js';

const FEUILLE_COMMUNE = new URL('../../../css/modules/orthographe.css', import.meta.url);
const MESSAGE_VOIX_INDISPONIBLE = "Je n'arrive pas à lire à voix haute ici. Demande de l'aide à un adulte.";
const RETOUR_JUSTE = 'juste';
const RETOUR_FAUX = 'faux';
const LIBELLE_RETOUR_PAR_DEFAUT = "Retour à l'orthographe";
const MESSAGE_AUCUN_ITEM = "Il n'y a pas encore d'exercice de ce type.";

/** Module de l'exercice : l'orthographe quand il ne dit rien. */
function moduleDe(exercice) {
  return exercice.module ?? MODULE_PAR_DEFAUT;
}

// --- Les réactions de la séance à chaque verdict ---

function jouerSon(seance, nom) {
  seance.contexte.sons.jouer(nom).catch((erreur) => seance.contexte.signaler('Son indisponible', erreur));
}

function afficherRetour(seance, variante, texte) {
  seance.carte.zoneRetour.replaceChildren(creer('p', `orthographe__verdict orthographe__verdict--${variante}`, texte));
}

function avancer(seance) {
  if (seance.suivi.passerALaSuite()) {
    afficherEtape(seance).catch((erreur) => seance.contexte.signaler("Étape impossible", erreur));
    return;
  }
  terminer(seance).catch((erreur) => seance.contexte.signaler('Fin de séance impossible', erreur));
}

function proposerSuite(seance) {
  const derniere = seance.suivi.position() === seance.suivi.total - 1;
  const bouton = creerBouton(derniere ? 'Terminer' : 'Suivant', 'bouton--principal', () => avancer(seance));
  seance.carte.zoneActions.replaceChildren(bouton);
  bouton.focus();
}

function reagirJuste(seance, item) {
  jouerSon(seance, 'juste');
  seance.mascotte.definirEtat('content');
  seance.bulle.parler(seance.parleur.dire('reussite'));
  afficherRetour(seance, RETOUR_JUSTE, `✓ Juste ! ${item.explication}`);
  proposerSuite(seance);
}

function reagirIndice(seance, item) {
  jouerSon(seance, 'faux');
  seance.mascotte.definirEtat('encourage');
  seance.bulle.parler(seance.parleur.dire('encouragement'));
  afficherRetour(seance, RETOUR_FAUX, `✗ Presque ! Indice : ${item.indice} Essaie encore.`);
}

function reagirCorrection(seance, item, bonneReponse) {
  jouerSon(seance, 'faux');
  seance.mascotte.definirEtat('encourage');
  seance.bulle.parler(seance.parleur.dire('erreur'));
  afficherRetour(seance, RETOUR_FAUX, `✗ Presque ! Voici la bonne forme : ${bonneReponse}. ${item.explication}`);
  proposerSuite(seance);
}

const REACTIONS = {
  [VERDICT_JUSTE]: reagirJuste,
  [VERDICT_INDICE]: reagirIndice,
  [VERDICT_CORRECTION]: reagirCorrection,
};

/** Reçoit la réponse de l'élève, réagit selon le verdict et le renvoie à l'exercice. */
function repondre(seance, { juste, bonneReponse }) {
  const verdict = seance.suivi.repondre(juste);
  REACTIONS[verdict]?.(seance, seance.suivi.itemCourant(), bonneReponse);
  return verdict;
}

// --- Le déroulement ---

/** Lit un texte à voix haute ; si la voix échoue, l'élève lit un message simple. */
async function lireAHauteVoix(seance, texte) {
  try {
    await seance.contexte.voix.lire(texte);
  } catch (erreur) {
    seance.carte.zoneRetour.textContent = MESSAGE_VOIX_INDISPONIBLE;
    seance.contexte.signaler('Lecture à voix haute impossible', erreur);
  }
}

async function afficherEtape(seance) {
  const { carte, suivi, exercice } = seance;
  carte.definirProgression(suivi.position() + 1, suivi.total);
  carte.zoneExercice.replaceChildren();
  carte.zoneRetour.replaceChildren();
  carte.zoneActions.replaceChildren();
  seance.mascotte.definirEtat('pense');
  await exercice.monterEtape(suivi.itemCourant(), {
    zone: carte.zoneExercice,
    valider: (reponse) => repondre(seance, reponse),
    lire: (texte) => lireAHauteVoix(seance, texte),
  });
}

async function terminer(seance) {
  // Un double clic ne doit enregistrer qu'une seule séance (cloturerExercice s'appelle une seule fois).
  if (seance.terminee) {
    return;
  }
  seance.terminee = true;
  const { contexte, exercice, items, suivi } = seance;
  const bilan = cloturerExercice(
    { stockage: contexte.stockage, date: new Date() },
    {
      module: moduleDe(exercice),
      mode: exercice.mode,
      itemId: identifiantSeance(items),
      ...suivi.bilan(),
      items: suivi.resultatsParItem(),
      ...resultatDuDefi(contexte),
    },
  );
  const donnees = contexte.stockage.lire();
  const fin = await creerFinDeLExercice(contexte, {
    bilan,
    sons: contexte.sons,
    parleur: seance.parleur,
    actions: { encoreUn: seance.recommencer, accueil: () => { window.location.hash = `#/${ROUTE_ACCUEIL}`; } },
    accessoiresEquipes: donnees.accessoires.equipes,
    nomMascotte: donnees.profil.nomMascotte || undefined,
    signaler: (erreur) => contexte.signaler('Son de fin indisponible', erreur),
  });
  seance.conteneur.replaceChildren(fin.racine);
  fin.focaliser();
}

// --- Le montage de l'écran ---

async function creerSeance(ecran, items) {
  const { contexte, exercice } = ecran;
  const donnees = contexte.stockage.lire();
  const mascotte = await creerMascotte({
    accessoiresEquipes: donnees.accessoires.equipes,
    titre: donnees.profil.nomMascotte || undefined,
    signaler: contexte.signaler,
  });
  const bulle = await creerBulle();
  const parleur = creerParleur();
  const carte = await creerCarteExercice({
    consigne: exercice.consigne,
    courant: 1,
    total: items.length,
    module: moduleDe(exercice),
    lireConsigne: (texte) => contexte.voix.lire(texte),
    signaler: (erreur) => contexte.signaler('Lecture de la consigne impossible', erreur),
  });
  const compagnon = creer('div', 'orthographe__compagnon');
  compagnon.append(bulle.element, mascotte.element);
  bulle.parler(parleur.dire('encouragement'));
  const recommencer = () => demarrer(ecran).catch((erreur) => contexte.signaler('Nouvelle séance impossible', erreur));
  return { ...ecran, items, suivi: creerSuiviSeance(items), mascotte, bulle, parleur, carte, compagnon, recommencer, terminee: false };
}

function afficherAucunItem(conteneur, exercice) {
  const retour = creer('a', 'bouton bouton--discret', exercice.libelleRetour ?? LIBELLE_RETOUR_PAR_DEFAUT);
  retour.href = `#/${moduleDe(exercice)}`;
  conteneur.replaceChildren(creer('p', 'orthographe__vide', MESSAGE_AUCUN_ITEM), retour);
}

/**
 * Choisit les items du niveau de l'élève, en évitant les derniers vus, puis y fait revenir
 * les items que la répétition espacée juge dus (ils passent par-dessus l'évitement des récents).
 */
async function demarrer(ecran) {
  const { conteneur, contexte, exercice, contenu } = ecran;
  const donnees = contexte.stockage.lire();
  const situation = situationDe(donnees, moduleDe(exercice), new Date());
  const itemsDeLaFamille = contenu.filter((item) => item.type === exercice.type);
  const choisis = choisirItemsSeance({
    items: contenu,
    type: exercice.type,
    niveau: situation.niveau,
    nombre: contexte.defi?.nombreItems ?? NOMBRE_ITEMS_PAR_SEANCE,
    idsRecents: idsRecentsDesSeances(donnees.historique, exercice.mode, moduleDe(exercice)),
  });
  const items = inclureRevisions(choisis, itemsDeLaFamille, situation);
  if (items.length === 0) {
    afficherAucunItem(conteneur, exercice);
    return;
  }
  const seance = await creerSeance(ecran, items);
  const page = creer('div', 'orthographe__page');
  page.append(seance.compagnon, seance.carte.racine);
  conteneur.replaceChildren(page);
  await afficherEtape(seance);
}

/**
 * Monte la séance d'un exercice (voir le contrat en tête de fichier).
 * @param {HTMLElement} conteneur
 * @param {Object} contexte Contexte de l'application.
 * @param {{mode: string, type: string, consigne: string, feuille?: URL, module?: string, contenu?: string,
 *   libelleRetour?: string,
 *   monterEtape: function(Object, {zone: HTMLElement, valider: function(Object): string}): (void|Promise<void>)}} exercice
 * @returns {Promise<void>}
 */
export async function monterExercice(conteneur, contexte, exercice) {
  const feuilles = exercice.feuille ? [FEUILLE_COMMUNE, exercice.feuille] : [FEUILLE_COMMUNE];
  await Promise.all(feuilles.map((feuille) => chargerFeuille(feuille)));
  const contenu = await chargerContenu(exercice.contenu ?? 'orthographe', {
    strict: contexte.config.modeDeveloppement,
    journal: contexte.signaler,
  });
  await demarrer({ conteneur, contexte, exercice, contenu });
}
