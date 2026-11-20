// Écran d'accueil (route '#/accueil') : Pompon et sa bulle, le défi du jour, la grande aventure,
// les six matières et « Ma bulle à moi » (garde-robe, badges, carnet, réglages).
// Ce fichier fournit aussi la carte de navigation que les hubs réutilisent.

import {
  etapesDeLAventure,
  jeuxJouesDuModule,
  pastillesDuDefi,
  phraseAchats,
  phraseBadges,
} from '../../coeur/accueil-stats.js';
import { titreDuCarnet } from '../../coeur/carnet.js';
import { chargerContenu } from '../../coeur/contenu.js';
import { etatDuDefi } from '../../coeur/defi.js';
import { ETOILES_DEFI_COMPLET, versJour } from '../../coeur/progression.js';
import { chargerFeuille } from '../../coeur/styles.js';
import { creerBulle } from '../../ui/bulle.js';
import { creer } from '../../ui/dom.js';
import { creerMascotte } from '../../ui/mascotte.js';

const FEUILLE_ACCUEIL = new URL('../../../css/modules/accueil.css', import.meta.url);
const FEUILLE_HUB = new URL('../../../css/modules/hub.css', import.meta.url);

const NOM_COMPAGNON_PAR_DEFAUT = 'Pompon';
const DOSSIER_ICONES = new URL('../../../assets/icones/', import.meta.url);
const ESPACE_INSECABLE = ' ';

/** Les six matières, dans l'ordre de la maquette. */
const MATIERES = [
  { module: 'orthographe', titre: 'Orthographe', description: 'Homophones, accords, mots à retenir et lettres muettes.' },
  { module: 'conjugaison', titre: 'Conjugaison', description: 'Relie, complète et écris les tableaux.' },
  { module: 'grammaire', titre: 'Grammaire', description: 'Trie les mots, trouve les fonctions, remets les phrases en ordre.' },
  { module: 'vocabulaire', titre: 'Vocabulaire', description: 'Synonymes, familles de mots, préfixes et sens des mots.' },
  { module: 'lecture', titre: 'Lecture', description: 'Comprends un texte, remets une histoire en ordre, lis en un éclair.' },
  { module: 'dictee', titre: 'Dictée', description: 'Écoute et écris, ou traque les fautes cachées.' },
];

const TITRE_AVENTURE = 'La grande aventure';
const TITRE_AVENTURE_EN_COURS = 'Reprendre la grande aventure';
const LIBELLE_ETAT_DES_ETAPES = { faite: 'faite', 'en-cours': 'en cours', 'a-venir': 'à venir' };
const DESCRIPTION_DEFI_FAIT = "Fait pour aujourd'hui. À demain.";
const TITRE_DEFI = '5 mini-jeux, environ 10 minutes';

/**
 * Crée une carte-lien : un grand lien avec un titre et une phrase.
 * @param {Object} options
 * @param {string} options.href Destination, par exemple '#/dictee'.
 * @param {string} options.titre
 * @param {string} options.description
 * @param {string} [options.module] Module dont la couleur borde la carte (`dictee`, `conjugaison`…).
 * @returns {HTMLAnchorElement}
 */
export function creerCarteLien({ href, titre, description, module = '' }) {
  const lien = creer('a', module ? `carte-lien carte-lien--${module}` : 'carte-lien');
  lien.href = href;
  lien.append(creer('span', 'carte-lien__titre', titre), creer('span', 'carte-lien__description', description));
  return lien;
}

/** « Salut Camille ! On s'entraîne ? » (espaces insécables avant « ! » et « ? »). */
function salutation(prenom) {
  const nom = prenom ? ` ${prenom}` : '';
  return `Salut${nom}${ESPACE_INSECABLE}! On s'entraîne${ESPACE_INSECABLE}?`;
}

/** Une pastille ronde du défi (faite : coche ; à faire : son numéro). */
function creerPastilleDefi({ numero, faite }) {
  const classe = faite ? 'pastille-defi pastille-defi--faite' : 'pastille-defi';
  const pastille = creer('li', classe, faite ? '✓' : String(numero));
  const etat = faite ? 'fait' : 'à faire';
  pastille.append(creer('span', 'sr-seulement', `${ESPACE_INSECABLE}: exercice ${numero} ${etat}`));
  return pastille;
}

const BOUTON_DU_DEFI = {
  neuf: { texte: 'Commencer le défi', variante: 'bouton--soleil' },
  'en-cours': { texte: 'Continuer le défi', variante: 'bouton--soleil' },
  fait: { texte: 'Revoir le défi', variante: 'bouton--secondaire' },
};

/** Le bouton du défi ; « Défi du jour » est dit aux lecteurs d'écran pour que le lien se retrouve. */
function creerBoutonDefi(etat) {
  const { texte, variante } = BOUTON_DU_DEFI[etat];
  const lien = creer('a', `bouton ${variante}`, texte);
  lien.href = '#/defi';
  lien.append(creer('span', 'sr-seulement', ', Défi du jour'));
  return lien;
}

/** Le bloc framboise « Défi du jour » : titre, cinq pastilles, bouton (« Revoir le défi » quand il est fait). */
function creerHeroDefi(defi) {
  const jour = versJour(new Date());
  const etat = etatDuDefi(defi, jour);
  const hero = creer('section', 'defi-hero');
  const pastilles = creer('ol', 'defi-hero__pastilles');
  pastilles.append(...pastillesDuDefi(defi, jour).map(creerPastilleDefi));
  hero.append(creer('p', 'defi-hero__etiquette', 'Défi du jour'));
  if (etat === 'fait') {
    hero.append(creer('h1', 'defi-hero__titre', DESCRIPTION_DEFI_FAIT), pastilles, creerBoutonDefi(etat));
    return hero;
  }
  const recompense = creer('p', 'defi-hero__recompense');
  recompense.append(creer('span', 'etoiles__symbole'), `+${ETOILES_DEFI_COMPLET} étoiles à gagner à la fin`);
  hero.append(creer('h1', 'defi-hero__titre', TITRE_DEFI), pastilles, creerBoutonDefi(etat), recompense);
  return hero;
}

const ICONE_DE_L_ETAPE = { faite: 'coche', 'en-cours': 'drapeau', 'a-venir': 'cadenas' };

/** Une image décorative : le texte voisin dit la même chose. */
function creerIcone(chemin, classe) {
  const image = creer('img', classe);
  image.src = new URL(chemin, DOSSIER_ICONES).href;
  image.alt = '';
  return image;
}

/** Un rond d'étape : coche (faite), drapeau (en cours) ou cadenas (à venir), et l'état dit aussi en texte. */
function creerEtape({ nom, etat }) {
  const etape = creer('li', `etape etape--${etat}`);
  const rond = creer('span', 'etape__rond');
  rond.append(creerIcone(`etapes/${ICONE_DE_L_ETAPE[etat]}.svg`, 'etape__icone'));
  etape.append(rond, creer('span', 'etape__nom', nom), creer('span', 'sr-seulement', ` (${LIBELLE_ETAT_DES_ETAPES[etat]})`));
  return etape;
}

/** La carte « La grande aventure » : un lien vers le test de départ, avec les six étapes. */
function creerCarteAventure(etapes, commence) {
  const numeroEnCours = etapes.find((etape) => etape.etat === 'en-cours')?.numero ?? etapes.length;
  const carte = creer('a', 'aventure');
  const liste = creer('ol', 'aventure__etapes');
  carte.href = '#/test-depart';
  liste.append(...etapes.map(creerEtape));
  carte.append(
    creer('span', 'aventure__titre', commence ? TITRE_AVENTURE_EN_COURS : TITRE_AVENTURE),
    creer('span', 'aventure__numero', `Étape ${numeroEnCours} sur ${etapes.length}`),
    liste,
  );
  return carte;
}

/** La carte de Pompon : sa bulle, lui, son nom et le lien vers la garde-robe. */
function creerCarteCompagnon(bulle, mascotte, nom) {
  const carte = creer('section', 'compagnon');
  const habiller = creer('a', 'bouton bouton--secondaire', `Habiller ${nom}`);
  const presentation = creer('p', 'compagnon__nom', nom);
  habiller.href = '#/garde-robe';
  presentation.append(creer('span', 'compagnon__role', ' ton compagnon'));
  const scene = creer('div', 'compagnon__scene');
  scene.append(mascotte.element);
  carte.append(bulle.element, scene, presentation, habiller);
  return carte;
}

/** La barre d'une matière : un segment par jeu, plein quand le jeu a déjà été joué. */
function creerBarreDesJeux({ joues, total }) {
  const barre = creer('span', 'carte-matiere__segments');
  for (let rang = 0; rang < total; rang += 1) {
    barre.append(creer('span', rang < joues ? 'carte-matiere__segment est-fait' : 'carte-matiere__segment'));
  }
  return barre;
}

/** Une carte de matière : icône et titre, description, puis la barre des jeux et son compte. */
function creerCarteMatiere({ module, titre, description }, historique) {
  const jeux = jeuxJouesDuModule(historique, module);
  const carte = creer('a', `carte-matiere carte-matiere--${module}`);
  const entete = creer('span', 'carte-matiere__entete');
  const pied = creer('span', 'carte-matiere__pied');
  const icone = creer('span', 'carte-matiere__icone');
  carte.href = `#/${module}`;
  icone.append(creerIcone(`matieres/${module}.svg`, 'carte-matiere__image'));
  entete.append(icone, creer('span', 'carte-matiere__titre', titre));
  pied.append(creerBarreDesJeux(jeux), creer('span', 'carte-matiere__compte', `${jeux.joues}/${jeux.total} jeux`));
  carte.append(entete, creer('span', 'carte-matiere__description', description), pied);
  return carte;
}

/** Une tuile de « Ma bulle à moi ». */
function creerTuile({ chemin, titre, soustitre, couleur }) {
  const tuile = creer('a', `tuile tuile--${couleur}`);
  const textes = creer('span', 'tuile__textes');
  tuile.href = `#/${chemin}`;
  textes.append(creer('span', 'carte-lien__titre', titre), creer('span', 'tuile__soustitre', soustitre));
  tuile.append(textes);
  return tuile;
}

function creerTuiles(donnees) {
  const tuiles = [
    { chemin: 'garde-robe', titre: 'Garde-robe', soustitre: phraseAchats(donnees), couleur: 'bonbon' },
    { chemin: 'badges', titre: 'Mes badges', soustitre: phraseBadges(donnees), couleur: 'soleil' },
    { chemin: 'carnet', titre: titreDuCarnet(donnees), soustitre: 'Mes jours et mes progrès', couleur: 'lilas' },
    { chemin: 'reglages', titre: 'Réglages', soustitre: 'Son, voix, affichage', couleur: 'ciel' },
  ];
  const liste = creer('div', 'accueil__tuiles accueil__parties');
  liste.append(...tuiles.map(creerTuile));
  return liste;
}

function creerSection(titre, contenu) {
  const section = creer('section', 'accueil__section');
  section.append(creer('h2', 'accueil__titre-section', titre), contenu);
  return section;
}

/** La colonne de droite du haut de page : le défi, puis la grande aventure si elle n'est pas finie. */
async function creerColonneDefi(donnees) {
  const colonne = creer('div', 'accueil__colonne');
  const { defi, testDepart } = donnees.meta;
  colonne.append(creerHeroDefi(defi));
  if (!testDepart?.termine) {
    const etapes = etapesDeLAventure(await chargerContenu('test-depart'), testDepart);
    const commence = Object.keys(testDepart?.reponses ?? {}).length > 0;
    colonne.append(creerCarteAventure(etapes, commence));
  }
  return colonne;
}

async function creerCompagnon(donnees, contexte) {
  const { profil, accessoires } = donnees;
  const nom = profil.nomMascotte || NOM_COMPAGNON_PAR_DEFAUT;
  const mascotte = await creerMascotte({
    accessoiresEquipes: accessoires.equipes,
    titre: nom,
    signaler: contexte.signaler,
  });
  const bulle = await creerBulle();
  bulle.parler(salutation(profil.prenom));
  mascotte.definirEtat('content');
  return creerCarteCompagnon(bulle, mascotte, nom);
}

/**
 * Monte l'écran d'accueil.
 * @param {HTMLElement} conteneur
 * @param {Object} contexte Contexte de l'application.
 * @returns {Promise<void>}
 */
export async function monter(conteneur, contexte) {
  await Promise.all([chargerFeuille(FEUILLE_ACCUEIL), chargerFeuille(FEUILLE_HUB)]);
  const donnees = contexte.stockage.lire();
  const page = creer('div', 'accueil');
  const haut = creer('div', 'accueil__haut');
  const matieres = creer('div', 'accueil__matieres');

  haut.append(await creerCompagnon(donnees, contexte), await creerColonneDefi(donnees));
  matieres.append(...MATIERES.map((matiere) => creerCarteMatiere(matiere, donnees.historique)));
  page.append(haut, creerSection('Choisis ton jeu', matieres), creerSection('Ma bulle à moi', creerTuiles(donnees)));
  conteneur.replaceChildren(page);
}
