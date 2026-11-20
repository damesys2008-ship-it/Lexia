// Socle commun des écrans de conjugaison (niveaux A, B et C) : charge le contenu, choisit le
// tableau, monte la mascotte et la carte d'exercice, puis conclut avec la fin de séance.
// Chaque niveau ne fournit que sa zone de travail.

import { chargerContenu } from '../../coeur/contenu.js';
import { cloturerExercice } from '../../coeur/recompenses.js';
import { chargerFeuille } from '../../coeur/styles.js';
import { creerBulle } from '../../ui/bulle.js';
import { creerCarteExercice } from '../../ui/carte-exercice.js';
import { creerFinDeLExercice, resultatDuDefi } from '../../ui/fin-exercice.js';
import { creerMascotte } from '../../ui/mascotte.js';
import { creerParleur } from '../../ui/phrases-mascotte.js';
import { choisirAvecRevision, situationDe } from '../../coeur/revisions.js';
import { idsDejaFaits } from '../../coeur/selection.js';
import { choisirTableau, ligneDuTableau, personnesDuTemps } from './logique.js';

const FEUILLE_CONJUGAISON = new URL('../../../css/modules/conjugaison.css', import.meta.url);
const MODULE = 'conjugaison';
const NOM_MASCOTTE_PAR_DEFAUT = 'Pompon';

const NOMS_DES_TEMPS = {
  present: 'présent',
  imparfait: 'imparfait',
  futur: 'futur',
  'passe-compose': 'passé composé',
  'passe-simple': 'passé simple',
  'conditionnel-present': 'conditionnel présent',
  'imperatif-present': 'impératif présent',
  'plus-que-parfait': 'plus-que-parfait',
};

/**
 * Crée un élément avec une classe et un texte.
 * @param {string} balise
 * @param {string} classe
 * @param {string} [texte]
 * @returns {HTMLElement}
 */
export function creer(balise, classe, texte = '') {
  const element = document.createElement(balise);
  element.className = classe;
  element.textContent = texte;
  return element;
}

/**
 * Crée un bouton d'action.
 * @param {string} texte
 * @param {string} variante Classe de bouton du design : `bouton--principal`, `bouton--secondaire`…
 * @param {function(): void} action
 * @returns {HTMLButtonElement}
 */
export function creerBouton(texte, variante, action) {
  const bouton = creer('button', `bouton ${variante}`, texte);
  bouton.type = 'button';
  bouton.addEventListener('click', action);
  return bouton;
}

/**
 * Joue un son de l'application sans jamais faire échouer l'exercice.
 * @param {{contexte: Object}} exercice
 * @param {string} nom Ex. `juste`, `faux`.
 */
export function jouerSon(exercice, nom) {
  exercice.contexte.sons.jouer(nom).catch((erreur) => exercice.contexte.signaler('Son indisponible', erreur));
}

/**
 * Le nom du temps, comme on le dit à l'élève.
 * @param {string} temps Identifiant du temps (`present`, `passe-compose`…).
 * @returns {string}
 */
export function nomDuTemps(temps) {
  return NOMS_DES_TEMPS[temps];
}

/** Le tableau correct en liste : la bonne forme a toujours le dernier mot (principe 4). */
function creerTableauCorrect(item) {
  const section = creer('section', 'conjugaison__correct zone-exercice');
  const liste = creer('ul', 'conjugaison__liste-correcte');
  for (const personne of personnesDuTemps(item)) {
    liste.append(creer('li', 'conjugaison__ligne-correcte', ligneDuTableau(item, personne)));
  }
  section.append(
    creer('h2', 'conjugaison__titre-correct', `${item.verbe} : ${nomDuTemps(item.temps)}`),
    liste,
    creer('p', 'conjugaison__regle', item.explication),
  );
  return section;
}

/**
 * Conclut l'exercice : enregistre le résultat, affiche le tableau correct, la règle et la fin de séance.
 * @param {Object} exercice Ce que `monterConjugaison` donne à la fonction du niveau.
 * @param {{reussis: number, total: number, competencesRatees: string[], reussi: boolean}} resultat
 *   `reussi` : juste du premier coup, sans indice ni correction (répétition espacée).
 * @returns {Promise<void>}
 */
export async function terminerExercice(exercice, { reussi, ...resultat }) {
  // Un double clic ne doit enregistrer qu'une seule séance (cloturerExercice s'appelle une seule fois).
  if (exercice.terminee) {
    return;
  }
  exercice.terminee = true;
  const { contexte, conteneur, item, mode, parleur } = exercice;
  const bilan = cloturerExercice(
    { stockage: contexte.stockage, date: new Date() },
    {
      module: MODULE,
      mode,
      itemId: item.id,
      ...resultat,
      items: [{ id: item.id, reussi }],
      ...resultatDuDefi(contexte),
    },
  );
  const donnees = contexte.stockage.lire();
  const fin = await creerFinDeLExercice(contexte, {
    bilan,
    sons: contexte.sons,
    parleur,
    actions: { encoreUn: exercice.recommencer, accueil: () => { window.location.hash = '#/accueil'; } },
    accessoiresEquipes: donnees.accessoires.equipes,
    nomMascotte: donnees.profil.nomMascotte || NOM_MASCOTTE_PAR_DEFAUT,
    signaler: (erreur) => contexte.signaler('Son de fin indisponible', erreur),
  });
  conteneur.replaceChildren(creerTableauCorrect(item), fin.racine);
  fin.focaliser();
}

async function creerExercice(base, item) {
  const { conteneur, contexte, mode, instruction } = base;
  const donnees = contexte.stockage.lire();
  const nomMascotte = donnees.profil.nomMascotte || NOM_MASCOTTE_PAR_DEFAUT;
  const mascotte = await creerMascotte({
    accessoiresEquipes: donnees.accessoires.equipes,
    titre: nomMascotte,
    signaler: contexte.signaler,
  });
  const bulle = await creerBulle();
  const parleur = creerParleur();
  const carte = await creerCarteExercice({
    consigne: `${instruction} Verbe : ${item.verbe}. Temps : ${nomDuTemps(item.temps)}.`,
    courant: 1,
    total: 1,
    module: MODULE,
    lireConsigne: (texte) => contexte.voix.lire(texte),
    signaler: (erreur) => contexte.signaler('Lecture de la consigne impossible', erreur),
  });
  const compagnon = creer('div', 'conjugaison__compagnon');
  compagnon.append(bulle.element, mascotte.element);
  mascotte.definirEtat('pense');
  bulle.parler(parleur.dire('encouragement'));
  const disposition = creer('div', 'conjugaison__disposition');
  disposition.append(compagnon, carte.racine);
  conteneur.replaceChildren(disposition);
  return { ...base, item, carte, mascotte, bulle, parleur, terminee: false, recommencer: () => demarrer(base) };
}

/** Joue d'abord un tableau à revoir ; sinon en choisit un du niveau de l'élève, en évitant les derniers faits. */
async function demarrer(base) {
  const { conteneur, contexte, mode, tableaux, jouer } = base;
  const donnees = contexte.stockage.lire();
  const situation = situationDe(donnees, MODULE, new Date());
  const idsRecents = idsDejaFaits(donnees.historique, MODULE, mode);
  const { niveau } = situation;
  const item = choisirAvecRevision(tableaux, situation, () => choisirTableau(tableaux, { niveau, idsRecents }));
  if (item === null) {
    conteneur.replaceChildren(creer('p', 'conjugaison__vide', "Il n'y a pas de tableau pour le moment."));
    return;
  }
  await jouer(await creerExercice(base, item));
}

/**
 * Monte un écran de conjugaison.
 * @param {HTMLElement} conteneur
 * @param {Object} contexte Contexte de l'application.
 * @param {{mode: string, instruction: string, jouer: function(Object): Promise<void>}} niveau
 *   `mode` : `a`, `b` ou `c` (clé de l'historique) ; `instruction` : la consigne, avant le verbe et le temps ;
 *   `jouer` reçoit `{ item, carte, mascotte, parleur, conteneur, contexte, mode, recommencer }`
 *   et remplit la zone de travail de la carte.
 * @returns {Promise<void>}
 */
export async function monterConjugaison(conteneur, contexte, niveau) {
  await chargerFeuille(FEUILLE_CONJUGAISON);
  const tableaux = await chargerContenu('conjugaison', {
    strict: contexte.config.modeDeveloppement,
    journal: contexte.signaler,
  });
  await demarrer({ conteneur, contexte, tableaux, ...niveau });
}
