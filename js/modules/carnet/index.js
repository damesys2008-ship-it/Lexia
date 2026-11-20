// Écran « Carnet » : la semaine, le mois, les progrès, ce qu'on retravaille et les badges gagnés.
// Il ne calcule rien : tout vient de `preparerCarnet` (js/coeur/carnet.js). Il se lit à l'écran
// et s'imprime sur une page A4 (voir css/modules/carnet.css). Route : '#/carnet'.

import { creerTableCompetences, preparerCarnet } from '../../coeur/carnet.js';
import { statistiquesDuCarnet } from '../../coeur/carnet-stats.js';
import { chargerContenu } from '../../coeur/contenu.js';
import { FAMILLES } from '../../coeur/familles.js';
import { NIVEAU_MAX, niveauModule } from '../../coeur/progression.js';
import { chargerFeuille } from '../../coeur/styles.js';
import { creer, creerBouton } from '../../ui/dom.js';
import { creerListeBadges } from '../../ui/liste-badges.js';

const FEUILLE_CARNET = new URL('../../../css/modules/carnet.css', import.meta.url);
/** La liste des badges est stylée par la feuille des badges. */
const FEUILLE_BADGES = new URL('../../../css/modules/badges.css', import.meta.url);
/** Tous les fichiers de contenu, sauf le test de départ qui n'a pas de famille. */
const NOMS_DES_CONTENUS = [...new Set(FAMILLES.map((famille) => famille.contenu))];

const PHRASE_PAS_DE_BADGE = 'Pas encore de badge. Chaque jour compte, même avec des pauses.';
const PHRASE_PROPOSITION = 'Pompon te les proposera dans le défi du jour.';
/** Les matières du carnet, dans l'ordre de la maquette. */
const MATIERES = [
  { module: 'orthographe', nom: 'Orthographe' },
  { module: 'conjugaison', nom: 'Conjugaison' },
  { module: 'grammaire', nom: 'Grammaire' },
  { module: 'vocabulaire', nom: 'Vocabulaire' },
  { module: 'lecture', nom: 'Lecture' },
  { module: 'dictee', nom: 'Dictée' },
];
const OPTIONS_DATE = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };

/** Les items de tous les fichiers de contenu, pour savoir à quelles compétences chaque item se rattache. */
async function chargerLesItems(contexte) {
  const options = { strict: contexte.config.modeDeveloppement };
  const items = [];
  for (const nom of NOMS_DES_CONTENUS) {
    items.push(...(await chargerContenu(nom, options)));
  }
  return items;
}

/** Les boutons du haut, cachés à l'impression : retour à l'accueil et impression. */
function creerActions() {
  const actions = creer('div', 'carnet__actions');
  const retour = creer('a', 'bouton bouton--discret', "Retour à l'accueil");
  retour.href = '#/accueil';
  actions.append(retour, creerBouton('Imprimer', 'bouton--secondaire', () => window.print()));
  return actions;
}

/** Un titre de section suivi de ce qu'elle contient. */
function creerSection(titre, ...contenu) {
  const section = creer('section', 'carnet__section');
  section.append(creer('h2', 'carnet__sous-titre', titre), ...contenu);
  return section;
}

/** Un jour : sa lettre, son nom et une coche s'il est fait. Le texte lu à voix haute dit tout, sans la couleur. */
function creerJour(jour) {
  const element = creer('li', 'carnet__jour');
  element.classList.toggle('carnet__jour--fait', jour.entraine);
  if (jour.estAujourdhui) {
    element.classList.add('carnet__jour--aujourdhui');
    element.setAttribute('aria-current', 'date');
  }
  const visible = creer('span', 'carnet__jour-visible');
  visible.setAttribute('aria-hidden', 'true');
  visible.append(
    creer('span', 'carnet__pastille', jour.initiale),
    creer('span', 'carnet__jour-nom', jour.nom),
    creer('span', 'carnet__coche', jour.entraine ? '✓' : '–'),
  );
  element.append(visible, creer('span', 'sr-seulement', jour.description));
  return element;
}

/** « 1 séance cette semaine », « 3 séances cette semaine » : le mot suit le nombre. */
function accorder(nombre, singulier, pluriel) {
  return nombre > 1 ? pluriel : singulier;
}

function creerTuile(modificateur, nombre, legende) {
  const tuile = creer('li', `carnet__tuile carnet__tuile--${modificateur}`);
  tuile.append(creer('p', 'carnet__nombre', String(nombre)), creer('p', 'carnet__legende', legende));
  return tuile;
}

/** Les trois tuiles : séances de la semaine, séances du mois, étoiles gagnées cette semaine. */
function creerTuiles(statistiques) {
  const { seancesSemaine, seancesMois, etoilesSemaine } = statistiques;
  const tuiles = creer('ul', 'carnet__tuiles');
  tuiles.append(
    creerTuile('semaine', seancesSemaine, `${accorder(seancesSemaine, 'séance', 'séances')} cette semaine`),
    creerTuile('mois', seancesMois, `${accorder(seancesMois, 'séance', 'séances')} ce mois-ci`),
    creerTuile('etoiles', etoilesSemaine, `${accorder(etoilesSemaine, 'étoile gagnée', 'étoiles gagnées')} cette semaine`),
  );
  return tuiles;
}

function creerSemaine({ semaine, mois }, statistiques) {
  const jours = creer('ul', 'carnet__semaine');
  jours.append(...semaine.jours.map(creerJour));
  return creerSection(
    "Mes jours d'entraînement",
    jours,
    creerTuiles(statistiques),
    creer('p', 'carnet__phrase', semaine.phrase),
    creer('p', 'carnet__phrase', mois.phrase),
  );
}

/** Une matière : son nom et trois segments, autant de pleins que son niveau. Le texte lu dit « Niveau 2 sur 3 ». */
function creerLigneDeProgres({ module, nom }, donnees) {
  const niveau = niveauModule(donnees, module);
  const ligne = creer('li', `carnet__matiere carnet__matiere--${module}`);
  const segments = creer('span', 'carnet__segments');
  segments.setAttribute('aria-hidden', 'true');
  for (let rang = 1; rang <= NIVEAU_MAX; rang += 1) {
    segments.append(creer('span', `carnet__segment${rang <= niveau ? ' carnet__segment--plein' : ''}`));
  }
  ligne.append(
    creer('span', 'carnet__matiere-nom', nom),
    segments,
    creer('span', 'sr-seulement', `Niveau ${niveau} sur ${NIVEAU_MAX}`),
  );
  return ligne;
}

function creerProgres(carnet, donnees) {
  const lignes = creer('ul', 'carnet__progres');
  lignes.append(...MATIERES.map((matiere) => creerLigneDeProgres(matiere, donnees)));
  return creerSection('Mes progrès', lignes, creer('p', 'carnet__phrase', carnet.progres.phrase));
}

/** Les sujets à retravailler en pilules, puis ce que Pompon en fera ; sans sujet, une phrase positive. */
function creerARetravailler({ sujets, phrase }) {
  if (sujets.length === 0) {
    return creerSection('À retravailler', creer('p', 'carnet__phrase', phrase));
  }
  const pilules = creer('ul', 'carnet__pilules');
  pilules.append(...sujets.map((sujet) => creer('li', 'carnet__pilule', sujet)));
  return creerSection('À retravailler', pilules, creer('p', 'carnet__phrase', PHRASE_PROPOSITION));
}

function creerBadgesGagnes(carnet, donnees) {
  const gagnes = carnet.badges.filter((entree) => entree.gagne);
  const contenu = gagnes.length > 0 ? creerListeBadges(gagnes, donnees) : creer('p', 'carnet__phrase', PHRASE_PAS_DE_BADGE);
  return creerSection('Mes badges gagnés', contenu);
}

/**
 * Monte l'écran du Carnet.
 * @param {HTMLElement} conteneur
 * @param {Object} contexte Contexte de l'application.
 * @returns {Promise<void>}
 */
export async function monter(conteneur, contexte) {
  await Promise.all([chargerFeuille(FEUILLE_CARNET), chargerFeuille(FEUILLE_BADGES)]);
  const donnees = contexte.stockage.lire();
  const aujourdhui = new Date();
  const carnet = preparerCarnet(donnees, creerTableCompetences(await chargerLesItems(contexte)), aujourdhui);
  const page = creer('section', 'carnet');
  const duo = creer('div', 'carnet__duo');
  const entete = creer('div', 'carnet__entete');
  const statistiques = statistiquesDuCarnet(donnees.historique, aujourdhui);

  entete.append(
    creer('h1', 'carnet__titre', carnet.titre),
    creer('p', 'carnet__date', aujourdhui.toLocaleDateString('fr-FR', OPTIONS_DATE)),
  );
  duo.append(creerProgres(carnet, donnees), creerARetravailler(carnet.aRetravailler));
  page.append(creerActions(), entete, creerSemaine(carnet, statistiques), duo, creerBadgesGagnes(carnet, donnees));
  conteneur.replaceChildren(page);
}
