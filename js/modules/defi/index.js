// Défi du jour (route '#/defi') : cinq exercices courts à la suite, choisis d'après ce qui mérite d'être revu.
//
// Cet écran ne fait que présenter et enchaîner : il monte l'écran de chaque famille tel quel, avec
// `contexte.defi` (contrat dans js/ui/fin-exercice.js). Les étoiles et l'avancement du défi sont écrits
// par `cloturerExercice` ; seul `demarrerDefi` écrit ici, au premier passage du jour.

import { chargerContenu } from '../../coeur/contenu.js';
import { composerDefi, contenusParFamille, demarrerDefi, etatDuDefi } from '../../coeur/defi.js';
import { CLES_FAMILLES, FAMILLES, NOMBRE_EXERCICES_DEFI, NOMBRE_ITEMS_DEFI } from '../../coeur/familles.js';
import { versJour } from '../../coeur/progression.js';
import { ROUTES, ROUTE_ACCUEIL } from '../../coeur/routes.js';
import { chargerFeuille } from '../../coeur/styles.js';
import { creerBulle } from '../../ui/bulle.js';
import { creer, creerBouton } from '../../ui/dom.js';
import { creerFinSeance } from '../../ui/fin-seance.js';
import { creerMascotte } from '../../ui/mascotte.js';

const FEUILLE_DEFI = new URL('../../../css/modules/defi.css', import.meta.url);
const NOMS_DES_CONTENUS = [...new Set(FAMILLES.map((famille) => famille.contenu))];

const TITRE_DEFI = 'Défi du jour';
const TITRE_PRESENTATION = 'Cinq exercices courts';
const TEXTE_PRESENTATION = "Environ dix minutes. On commence par ce qui mérite d'être revu.";
const PHRASE_DU_COMPAGNON = "On commence doucement, d'accord ?";
const PIED_DE_CARTE = 'À la fin, tu gagnes des étoiles pour la garde-robe';
const NOM_COMPAGNON_PAR_DEFAUT = 'Pompon';
const DOSSIER_ICONES = new URL('../../../assets/icones/matieres/', import.meta.url);

/** Le nom de chaque matière, comme sur l'accueil. */
const NOMS_DES_MATIERES = {
  orthographe: 'Orthographe',
  conjugaison: 'Conjugaison',
  grammaire: 'Grammaire',
  vocabulaire: 'Vocabulaire',
  lecture: 'Lecture',
  dictee: 'Dictée',
};

/** Ce que fait l'élève dans chaque famille d'exercices, en quelques mots (sous le nom de la matière). */
const SOUS_TEXTES_DES_FAMILLES = {
  'orthographe/homophones': 'Choisis le bon petit mot',
  'orthographe/accords': 'Accorde les mots',
  'orthographe/invariables': 'Un mot à retenir',
  'orthographe/muettes': 'Trouve la lettre muette',
  'grammaire/tri': 'Trie les mots',
  'grammaire/fonctions': 'Trouve les fonctions',
  'grammaire/etiquettes': 'Remets la phrase en ordre',
  'grammaire/transformations': 'Transforme la phrase',
  'vocabulaire/synonymes': 'Trouve le synonyme',
  'vocabulaire/familles': "Trouve l'intrus",
  'vocabulaire/affixes': 'Fabrique un mot',
  'vocabulaire/sens': 'Choisis le bon sens',
  'dictee/audio': 'Écoute et écris',
  'dictee/detective': 'Trouve les fautes',
  'conjugaison/b': 'Complète le tableau',
  'lecture/comprehension': 'Réponds sur un texte',
  'lecture/ordre': "Remets l'histoire en ordre",
  'lecture/flash': 'Retrouve le mot',
};
const TEXTE_DEFI_FAIT = "Le défi du jour est terminé. Le prochain t'attend demain.";
const NOTE_REPRISE_POSSIBLE = 'Tu pourras reprendre plus tard.';
const REPERE_DEFI_TERMINE = 'Défi terminé';
/** Phrase de la mascotte à la fin du défi (voir BANQUES dans js/ui/phrases-mascotte.js). */
const SITUATION_FIN_DEFI = 'finDefi';

function allerALAccueil() {
  window.location.hash = `#/${ROUTE_ACCUEIL}`;
}

/** Charge les fichiers de contenu et les range par famille. */
async function chargerLesContenus(contexte) {
  const options = { strict: contexte.config.modeDeveloppement };
  const fichiers = {};
  for (const nom of NOMS_DES_CONTENUS) {
    fichiers[nom] = await chargerContenu(nom, options);
  }
  return contenusParFamille(fichiers);
}

/** Un plan est utilisable s'il a tous ses exercices et que chaque famille existe encore. */
function estPlanUtilisable(plan) {
  return plan.length === NOMBRE_EXERCICES_DEFI && plan.every(({ famille }) => CLES_FAMILLES.includes(famille));
}

/**
 * Le défi du jour à jouer : celui qui est en cours, ou un nouveau (écrit dans le stockage).
 * @returns {{plan: import('../../coeur/stockage.js').ExerciceDuDefi[], faits: number}}
 */
async function preparerLeDefi(contexte, etat, defiStocke) {
  if (etat === 'en-cours' && estPlanUtilisable(defiStocke.plan)) {
    return { plan: defiStocke.plan, faits: defiStocke.faits };
  }
  const donnees = contexte.stockage.lire();
  const date = new Date();
  const plan = composerDefi(await chargerLesContenus(contexte), donnees, date);
  contexte.stockage.ecrire(demarrerDefi(donnees, plan, date));
  return { plan, faits: 0 };
}

/** Un titre qui reçoit le focus programmatique (jamais par Tab). */
function creerTitreFocalisable(balise, classe, texte) {
  const titre = creer(balise, classe, texte);
  titre.tabIndex = -1;
  return titre;
}

/** Pompon et sa bulle, à gauche de la carte. */
async function creerCompagnon(contexte, phrase) {
  const { profil, accessoires } = contexte.stockage.lire();
  const mascotte = await creerMascotte({
    accessoiresEquipes: accessoires.equipes,
    titre: profil.nomMascotte || NOM_COMPAGNON_PAR_DEFAUT,
    signaler: contexte.signaler,
  });
  const bulle = await creerBulle();
  const compagnon = creer('div', 'defi__compagnon');
  bulle.parler(phrase);
  mascotte.definirEtat('content');
  compagnon.append(bulle.element, mascotte.element);
  return compagnon;
}

/** La page : Pompon à gauche, la carte blanche à droite. */
function creerDisposition(compagnon, carte) {
  const disposition = creer('div', 'defi__disposition');
  disposition.append(compagnon, carte);
  return disposition;
}

async function creerEcranDefiFait(contexte) {
  const carte = creer('section', 'defi__carte');
  const retour = creer('a', 'bouton bouton--principal', "Retour à l'accueil");
  retour.href = `#/${ROUTE_ACCUEIL}`;
  carte.append(creer('h1', 'defi__etiquette', TITRE_DEFI), creer('p', 'defi__texte', TEXTE_DEFI_FAIT), retour);
  return creerDisposition(await creerCompagnon(contexte, PHRASE_DU_COMPAGNON), carte);
}

function creerLienRetour() {
  const retour = creer('a', 'lien-retour', "Retour à l'accueil");
  retour.href = `#/${ROUTE_ACCUEIL}`;
  return retour;
}

/** Une ligne de la liste : numéro (ou coche si l'exercice est fait), icône de la matière, nom et sous-texte. */
function creerLigneDeExercice({ famille }, rang, faits) {
  const { module } = FAMILLES.find(({ cle }) => cle === famille);
  const ligne = creer('li', `defi__ligne defi__ligne--${module}`);
  const icone = creer('img', 'defi__icone');
  const textes = creer('span', 'defi__textes');
  icone.src = new URL(`${module}.svg`, DOSSIER_ICONES).href;
  icone.alt = '';
  textes.append(creer('span', 'defi__matiere', NOMS_DES_MATIERES[module]), creer('span', 'defi__sous-texte', SOUS_TEXTES_DES_FAMILLES[famille]));
  ligne.append(creer('span', 'defi__numero', rang < faits ? '✓' : String(rang + 1)), icone, textes);
  return ligne;
}

/** Le pied de la carte : ce que l'élève gagne, et le bouton qui lance le défi. */
function creerPiedDeCarte(faits, demarrer) {
  const pied = creer('div', 'defi__pied');
  const gain = creer('p', 'defi__gain');
  gain.append(creer('span', 'etoiles__symbole'), PIED_DE_CARTE);
  pied.append(gain, creerBouton(faits > 0 ? 'Continuer' : 'Commencer', 'bouton--principal defi__lancer', demarrer));
  return pied;
}

async function creerEcranPresentation({ contexte, plan, faits, demarrer }) {
  const carte = creer('section', 'defi__carte');
  const liste = creer('ol', 'defi__liste');
  const texte = faits > 0 ? `On reprend à l'exercice ${faits + 1} sur ${NOMBRE_EXERCICES_DEFI}.` : TEXTE_PRESENTATION;
  liste.append(...plan.map((exercice, rang) => creerLigneDeExercice(exercice, rang, faits)));
  carte.append(
    creer('h1', 'defi__etiquette', TITRE_DEFI),
    creer('h2', 'defi__titre', TITRE_PRESENTATION),
    creer('p', 'defi__texte', texte),
    liste,
    creerPiedDeCarte(faits, demarrer),
  );
  const disposition = creerDisposition(await creerCompagnon(contexte, PHRASE_DU_COMPAGNON), carte);
  const page = creer('div', 'defi');
  page.append(creerLienRetour(), disposition);
  return page;
}

/**
 * Les options ajoutées à l'écran de fin d'un exercice du défi : passage à la suite, ou fin du défi.
 * @param {number} numero Numéro (1 à 5) de l'exercice qui vient de finir.
 * @param {function(): void} exerciceSuivant Lance l'exercice d'après.
 * @param {Object} options Options reçues de l'écran de l'exercice.
 */
function optionsDeFin(numero, exerciceSuivant, options) {
  if (numero === NOMBRE_EXERCICES_DEFI) {
    const actions = { accueil: options.actions.accueil };
    return { titre: 'Défi du jour terminé', situation: SITUATION_FIN_DEFI, actions };
  }
  return {
    titre: `Exercice ${numero} sur ${NOMBRE_EXERCICES_DEFI} terminé`,
    libelleSuite: 'Exercice suivant',
    note: NOTE_REPRISE_POSSIBLE,
    actions: { encoreUn: exerciceSuivant, accueil: options.actions.accueil },
  };
}

/** Au dernier exercice, le repère « Exercice 5 sur 5 » devient « Défi terminé ». */
function marquerLeDefiTermine(repere, numero) {
  if (numero === NOMBRE_EXERCICES_DEFI) {
    repere.textContent = REPERE_DEFI_TERMINE;
  }
}

/** Crée l'écran de fin d'un exercice du défi, après avoir mis le repère à jour. */
function creerFinDeLExerciceDuDefi({ numero, repere, exerciceSuivant }) {
  return (options) => {
    marquerLeDefiTermine(repere, numero);
    return creerFinSeance({ ...options, ...optionsDeFin(numero, exerciceSuivant, options) });
  };
}

/** Ce que l'écran de l'exercice lit dans `contexte.defi`. */
function creerContratDefi(exercice) {
  return {
    nombreItems: NOMBRE_ITEMS_DEFI,
    resultat: { defiEtape: exercice.numero, defiComplet: exercice.numero === NOMBRE_EXERCICES_DEFI },
    creerFin: creerFinDeLExerciceDuDefi(exercice),
  };
}

/**
 * Monte l'exercice `numero` du plan : un repère en texte, puis l'écran de la famille.
 * @param {{conteneur: HTMLElement, contexte: Object, plan: Array}} defi
 * @param {number} numero De 1 à 5.
 */
async function jouerExercice(defi, numero) {
  const { conteneur, contexte, plan } = defi;
  const repere = creerTitreFocalisable('h2', 'defi__repere', `Exercice ${numero} sur ${NOMBRE_EXERCICES_DEFI}`);
  const zone = creer('div', 'defi__exercice');
  const route = ROUTES.find(({ chemin }) => chemin === plan[numero - 1].famille);
  const exerciceSuivant = () => jouerExercice(defi, numero + 1);
  const contexteDuDefi = { ...contexte, defi: creerContratDefi({ numero, repere, exerciceSuivant }) };

  conteneur.replaceChildren(repere, zone);
  const ecran = await route.charger();
  await ecran.monter(zone, contexteDuDefi, { chemin: route.chemin, parametres: [] });
  repere.focus();
}

/**
 * Monte le défi du jour.
 * @param {HTMLElement} conteneur
 * @param {Object} contexte Contexte de l'application.
 * @returns {Promise<void>}
 */
export async function monter(conteneur, contexte) {
  await chargerFeuille(FEUILLE_DEFI);
  const defiStocke = contexte.stockage.lire().meta.defi;
  const etat = etatDuDefi(defiStocke, versJour(new Date()));
  if (etat === 'fait') {
    conteneur.replaceChildren(await creerEcranDefiFait(contexte));
    return;
  }
  const { plan, faits } = await preparerLeDefi(contexte, etat, defiStocke);
  const defi = { conteneur, contexte, plan };
  const demarrer = () => jouerExercice(defi, faits + 1);
  conteneur.replaceChildren(await creerEcranPresentation({ contexte, plan, faits, demarrer }));
}
