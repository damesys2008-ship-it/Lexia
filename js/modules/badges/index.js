// Écran « Mes badges » : la régularité et la maîtrise, gardées pour toujours.
// Il ne fait que lire : un badge est attribué (et annoncé) à la fin d'un exercice, jamais ici.
// Route : '#/badges'.

import { badgesAffiches, compterJoursEntrainement } from '../../coeur/badges.js';
import { joursEntrainementMois } from '../../coeur/progression.js';
import { chargerFeuille } from '../../coeur/styles.js';
import { creer } from '../../ui/dom.js';
import { creerListeBadges } from '../../ui/liste-badges.js';

const FEUILLE_BADGES = new URL('../../../css/modules/badges.css', import.meta.url);

const GROUPES = [
  { groupe: 'regularite', titre: 'Régularité', sousTitre: 'Reviens souvent, même 10 minutes.' },
  { groupe: 'maitrise', titre: 'Maîtrise', sousTitre: "Ils se gagnent en réussissant les mêmes exercices à plusieurs jours d'écart." },
];

/** « badge gagné », « badges gagnés » : le mot de la tuile suit le nombre. */
function legendeDesBadges(nombre) {
  return nombre > 1 ? 'badges gagnés' : 'badge gagné';
}

function creerTuile(modificateur, nombre, legende) {
  const tuile = creer('li', `badges__tuile badges__tuile--${modificateur}`);
  tuile.append(creer('p', 'badges__nombre', String(nombre)), creer('p', 'badges__legende', legende));
  return tuile;
}

/** Les trois tuiles positives : badges gagnés, jours ce mois-ci, jours en tout. Jamais de série à maintenir. */
function creerTuiles(donnees, gagnes, date) {
  const ceMois = joursEntrainementMois(donnees, date).length;
  const enTout = compterJoursEntrainement(donnees);
  const tuiles = creer('ul', 'badges__tuiles');
  tuiles.append(
    creerTuile('badges', gagnes, legendeDesBadges(gagnes)),
    creerTuile('mois', ceMois, `${ceMois > 1 ? 'jours' : 'jour'} ce mois-ci`),
    creerTuile('total', enTout, `${enTout > 1 ? 'jours' : 'jour'} en tout`),
  );
  return tuiles;
}

/** Le titre et sa phrase d'encouragement, serrés ensemble. */
function creerEntete() {
  const entete = creer('div', 'badges__entete');
  entete.append(
    creer('h1', 'badges__titre', 'Mes badges'),
    creer('p', 'badges__contexte', "Chaque jour d'entraînement compte, même s'il y a des pauses."),
  );
  return entete;
}

/** Un titre de groupe, sa phrase, puis sa liste. */
function creerSectionDeGroupe({ groupe, titre, sousTitre }, entrees, donnees) {
  const section = creer('section', 'badges__groupe');
  const duGroupe = entrees.filter((entree) => entree.badge.groupe === groupe);
  section.append(
    creer('h2', 'badges__sous-titre', titre),
    creer('p', 'badges__contexte', sousTitre),
    creerListeBadges(duGroupe, donnees),
  );
  return section;
}

/**
 * Monte l'écran des badges.
 * @param {HTMLElement} conteneur
 * @param {Object} contexte Contexte de l'application.
 * @returns {Promise<void>}
 */
export async function monter(conteneur, contexte) {
  await chargerFeuille(FEUILLE_BADGES);
  const donnees = contexte.stockage.lire();
  const entrees = badgesAffiches(donnees);
  const gagnes = entrees.filter((entree) => entree.gagne).length;
  const retourAccueil = creer('a', 'bouton bouton--discret', "Retour à l'accueil");
  const page = creer('section', 'badges');

  retourAccueil.href = '#/accueil';
  page.append(
    retourAccueil,
    creerEntete(),
    creerTuiles(donnees, gagnes, new Date()),
    ...GROUPES.map((groupe) => creerSectionDeGroupe(groupe, entrees, donnees)),
  );
  conteneur.replaceChildren(page);
}
