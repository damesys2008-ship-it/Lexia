// Écran « Réglages » (cahier §6.8) : profil, son, voix, affichage, transfert, réinitialisation.
// Chaque changement est enregistré tout de suite ; les réglages d'affichage s'appliquent aussitôt.
// Route : '#/reglages'. Le transfert de progression est dans transfert.js.

import { reculerLeDefi } from '../../coeur/defi.js';
import { reculerLesJours } from '../../coeur/repetition.js';
import { ROUTE_PREMIER_LANCEMENT } from '../../coeur/routes.js';
import { LONGUEUR_SAISIE_NOM, creerDonneesParDefaut } from '../../coeur/stockage.js';
import { chargerFeuille } from '../../coeur/styles.js';
import { ESPACE_INSECABLE } from '../../coeur/texte.js';
import { EVENEMENT_DONNEES_CHANGEES } from '../../ui/barre-etat.js';
import { creerChampTexte } from '../../ui/champ-texte.js';
import { creer, creerBouton } from '../../ui/dom.js';
import { creerMascotte } from '../../ui/mascotte.js';
import { ouvrirModale } from '../../ui/modale.js';
import { creerSectionTransfert } from './transfert.js';
import { creerDefi } from './verrou.js';

const FEUILLE_REGLAGES = new URL('../../../css/modules/reglages.css', import.meta.url);

const VOLUME_POUR_CENT = 100;
const PAS_VOLUME = 5;
const LIBELLE_VOIX_AUTOMATIQUE = 'Choix automatique';
const VITESSES = [
  ['lente', 'Lente'],
  ['normale', 'Normale'],
  ['rapide', 'Rapide'],
];
const ROUTE_GARDE_ROBE = '#/garde-robe';
const MESSAGE_VOIX_INDISPONIBLE = "Je n'arrive pas à parler sur cet appareil.";

function creerGroupe(titre) {
  const groupe = creer('section', 'reglages__groupe');
  groupe.append(creer('h2', 'reglages__titre-groupe', titre));
  return groupe;
}

/**
 * Une ligne « libellé + contrôle » : le libellé est un <label> qui enveloppe le contrôle.
 * Le nom accessible est posé explicitement : sinon une liste y mêlerait le texte de ses options.
 */
function creerLigne(libelle, controle) {
  const ligne = creer('label', 'reglages__ligne');
  controle.setAttribute('aria-label', libelle);
  ligne.append(creer('span', 'reglages__libelle', libelle), controle);
  return ligne;
}

/**
 * Une bascule : une case à cocher (accessible comme telle) dessinée en interrupteur par la feuille de style.
 * `explication` est une petite phrase sous le libellé.
 */
function creerCaseACocher(libelle, coche, auChangement, explication = '') {
  const controle = creer('input', 'reglages__case');
  controle.type = 'checkbox';
  controle.checked = coche;
  controle.addEventListener('change', () => auChangement(controle.checked));
  const ligne = creerLigne(libelle, controle);
  if (explication !== '') {
    const libelleEtExplication = creer('span', 'reglages__texte');
    libelleEtExplication.append(ligne.querySelector('.reglages__libelle'), creer('span', 'reglages__explication', explication));
    ligne.prepend(libelleEtExplication);
  }
  return ligne;
}

function enregistrerProfil(contexte, changement) {
  const donnees = contexte.stockage.lire();
  contexte.stockage.ecrire({ ...donnees, profil: { ...donnees.profil, ...changement } });
}

// --- Profil ---

/**
 * Champ du profil enregistré dès que l'élève a fini de le modifier.
 * Un champ obligatoire laissé vide retrouve sa valeur : un prénom vide renverrait au premier lancement.
 */
async function creerChampProfil(contexte, { libelle, cle, obligatoire }) {
  const { racine, champ } = await creerChampTexte({ etiquette: libelle });
  const ligne = creer('div', 'reglages__ligne reglages__ligne--champ');
  champ.value = contexte.stockage.lire().profil[cle];
  champ.maxLength = LONGUEUR_SAISIE_NOM;
  champ.addEventListener('change', () => {
    const texte = champ.value.trim();
    if (obligatoire && texte === '') {
      champ.value = contexte.stockage.lire().profil[cle];
      return;
    }
    enregistrerProfil(contexte, { [cle]: texte });
  });
  ligne.append(creer('span', 'reglages__libelle', libelle), racine);
  return ligne;
}

/** L'aperçu de Pompon, habillé comme l'élève l'a choisi, dans un carré bonbon. */
async function creerApercuDePompon(contexte) {
  const donnees = contexte.stockage.lire();
  const mascotte = await creerMascotte({
    accessoiresEquipes: donnees.accessoires.equipes,
    titre: donnees.profil.nomMascotte || undefined,
    signaler: contexte.signaler,
  });
  const apercu = creer('div', 'reglages__apercu');
  apercu.append(mascotte.element);
  return apercu;
}

async function creerGroupeProfil(contexte) {
  const groupe = creerGroupe('Moi et ma mascotte');
  const champs = creer('div', 'reglages__champs');
  champs.append(
    await creerChampProfil(contexte, { libelle: 'Mon prénom', cle: 'prenom', obligatoire: true }),
    await creerChampProfil(contexte, { libelle: 'Le nom de ma mascotte', cle: 'nomMascotte', obligatoire: false }),
  );
  const habits = creer('a', 'bouton bouton--secondaire reglages__habits', 'Changer ses habits');
  habits.href = ROUTE_GARDE_ROBE;
  const corps = creer('div', 'reglages__profil');
  corps.append(await creerApercuDePompon(contexte), champs);
  groupe.append(corps, habits);
  return groupe;
}

// --- Son ---

function creerCurseurVolume(contexte) {
  const curseur = creer('input', 'reglages__curseur');
  curseur.type = 'range';
  curseur.min = '0';
  curseur.max = String(VOLUME_POUR_CENT);
  curseur.step = String(PAS_VOLUME);
  curseur.value = String(Math.round(contexte.lireReglages().volume * VOLUME_POUR_CENT));
  curseur.addEventListener('input', () => contexte.sons.definirVolume(Number(curseur.value) / VOLUME_POUR_CENT));
  return curseur;
}

function creerGroupeSon(contexte) {
  const groupe = creerGroupe('Le son');
  groupe.classList.add('reglages__groupe--demi');
  groupe.append(
    creerCaseACocher('Son activé', contexte.lireReglages().sonActif, (actif) => {
      contexte.modifierReglages({ sonActif: actif });
    }),
    creerLigne('Volume', creerCurseurVolume(contexte)),
  );
  return groupe;
}

// --- Voix ---

/** Noms des voix françaises du navigateur, plus la voix déjà choisie si elle a disparu de la liste. */
function listerNomsDeVoix(voixChoisie) {
  const voix = globalThis.speechSynthesis?.getVoices() ?? [];
  const noms = voix.filter((v) => v.lang.toLowerCase().startsWith('fr')).map((v) => v.name);
  return [...new Set([...noms, voixChoisie].filter((nom) => nom !== ''))];
}

function creerOption(valeur, libelle) {
  const option = document.createElement('option');
  option.value = valeur;
  option.textContent = libelle;
  return option;
}

/** La liste des voix arrive parfois après le chargement de la page : on la remplit quand elle est prête. */
function creerChoixDeVoix(contexte) {
  const choix = creer('select', 'reglages__choix');
  const remplir = () => {
    const voixChoisie = contexte.lireReglages().voix;
    const options = listerNomsDeVoix(voixChoisie).map((nom) => creerOption(nom, nom));
    choix.replaceChildren(creerOption('', LIBELLE_VOIX_AUTOMATIQUE), ...options);
    choix.value = voixChoisie;
  };
  remplir();
  contexte.voix.etat().then(remplir).catch((erreur) => contexte.signaler('Liste des voix indisponible', erreur));
  choix.addEventListener('change', () => contexte.modifierReglages({ voix: choix.value }));
  return choix;
}

/** La vitesse : trois choix côte à côte (des boutons radio, un seul est choisi), pas une liste déroulante. */
function creerChoixDeVitesse(contexte) {
  const choix = creer('div', 'reglages__segments');
  choix.setAttribute('role', 'radiogroup');
  choix.setAttribute('aria-label', 'Vitesse');
  const vitesseActuelle = contexte.lireReglages().vitesseVoix;
  for (const [valeur, libelle] of VITESSES) {
    const segment = creer('label', 'reglages__segment');
    const radio = creer('input', 'reglages__radio');
    radio.type = 'radio';
    radio.name = 'vitesse-voix';
    radio.value = valeur;
    radio.checked = valeur === vitesseActuelle;
    radio.addEventListener('change', () => contexte.modifierReglages({ vitesseVoix: valeur }));
    segment.append(radio, creer('span', 'reglages__segment-texte', libelle));
    choix.append(segment);
  }
  return choix;
}

/** La ligne de la vitesse : un groupe de boutons radio n'est pas un contrôle unique, il n'a pas de <label> enveloppant. */
function creerLigneVitesse(contexte) {
  const ligne = creer('div', 'reglages__ligne');
  ligne.append(creer('span', 'reglages__libelle', 'Vitesse'), creerChoixDeVitesse(contexte));
  return ligne;
}

function creerBoutonTesterLaVoix(contexte, message) {
  return creerBouton('Tester la voix', 'bouton--secondaire', async () => {
    message.textContent = '';
    try {
      await contexte.voix.tester({ vitesse: contexte.lireReglages().vitesseVoix });
    } catch (erreur) {
      contexte.signaler('Test de la voix impossible', erreur);
      message.textContent = MESSAGE_VOIX_INDISPONIBLE;
    }
  });
}

function creerGroupeVoix(contexte) {
  const groupe = creerGroupe('La voix');
  groupe.classList.add('reglages__groupe--demi');
  const message = creer('p', 'reglages__message');
  message.setAttribute('role', 'status');
  groupe.append(
    creerLigne('Voix', creerChoixDeVoix(contexte)),
    creerLigneVitesse(contexte),
    creerBoutonTesterLaVoix(contexte, message),
    message,
  );
  return groupe;
}

// --- Affichage ---

function creerGroupeAffichage(contexte) {
  const { texteGrand, animationsReduites, lettresFaciles } = contexte.lireReglages();
  const groupe = creerGroupe("L'affichage");
  groupe.append(
    creerCaseACocher('Texte plus grand', texteGrand, (actif) => contexte.modifierReglages({ texteGrand: actif })),
    creerCaseACocher(
      'Animations réduites',
      animationsReduites,
      (actif) => contexte.modifierReglages({ animationsReduites: actif }),
      'Pompon bouge moins',
    ),
    creerCaseACocher(
      'Lettres faciles à lire',
      lettresFaciles,
      (actif) => contexte.modifierReglages({ lettresFaciles: actif }),
      'Plus espacées, plus larges',
    ),
  );
  return groupe;
}

// --- Mon compte ---

/** La carte « Mon compte » : l'adresse et la page du compte si on est connecté, sinon de quoi s'en créer un. */
function creerGroupeCompte(contexte) {
  const groupe = creerGroupe('Mon compte');
  const utilisateur = contexte.compte.utilisateur();
  if (utilisateur === null) {
    groupe.append(
      creer('p', 'reglages__aide', 'Avec un compte, ta progression te suit sur tous tes appareils.'),
      creerLienBouton('Se connecter', '#/connexion', 'bouton--secondaire'),
      creerLienBouton('Créer un compte', '#/inscription', 'bouton--discret'),
    );
    return groupe;
  }
  groupe.append(
    creer('p', 'reglages__aide', `Tu es connecté avec${ESPACE_INSECABLE}: ${utilisateur.email}`),
    creerLienBouton('Ouvrir mon compte', '#/compte', 'bouton--secondaire'),
  );
  return groupe;
}

function creerLienBouton(texte, route, variante) {
  const lien = creer('a', `bouton ${variante}`, texte);
  lien.href = route;
  return lien;
}

// --- Sauvegarde de secours (l'ancien code) ---

/**
 * Le code de sauvegarde, caché : le compte le remplace, il ne sert plus que de secours.
 * `etat` appartient à un montage de l'écran : il garde le bloc ouvert quand l'écran se redessine après une récupération
 * (l'élève n'a pas fini de s'en servir), et le bloc est replié dès qu'on revient sur l'écran.
 * @param {Object} contexte
 * @param {{secoursOuvert: boolean}} etat
 * @param {function(): void} apresImport
 */
function creerGroupeDeSecours(contexte, etat, apresImport) {
  const groupe = creer('details', 'reglages__groupe reglages__groupe--imbrique');
  const contenu = creer('div', 'reglages__bloc');
  contenu.append(...creerSectionTransfert(contexte, apresImport).children);
  groupe.open = etat.secoursOuvert;
  groupe.addEventListener('toggle', () => { etat.secoursOuvert = groupe.open; });
  groupe.append(creer('summary', 'reglages__titre-groupe reglages__resume', 'Sauvegarde de secours (ancien code)'), contenu);
  return groupe;
}

// --- Pour les grands (simuler le passage des jours) ---

const MESSAGE_BIENVENUE_GRANDS = "C'est bon, tu peux entrer.";
const JOURS_PAR_SEMAINE = 7;
const AVANCES = [
  { libelle: "Avancer d'un jour", jours: 1, confirmation: "C'est fait : les révisions sont avancées d'un jour." },
  {
    libelle: "Avancer d'une semaine",
    jours: JOURS_PAR_SEMAINE,
    confirmation: "C'est fait : les révisions sont avancées d'une semaine.",
  },
];

/** Recule le dernier jour de révision de chaque item et le jour du défi : le reste des données ne change pas. */
function creerBoutonAvancer(contexte, { libelle, jours, confirmation }, message) {
  return creerBouton(libelle, 'bouton--discret', () => {
    const donnees = contexte.stockage.lire();
    const meta = { ...donnees.meta, defi: reculerLeDefi(donnees.meta.defi, jours) };
    contexte.stockage.ecrire({ ...donnees, repetition: reculerLesJours(donnees.repetition, jours), meta });
    message.textContent = confirmation;
  });
}

/** Le contenu réservé aux grands : les jours qui passent, la sauvegarde de secours, « Tout recommencer ». */
function creerContenuDesGrands(contexte, etat, apresImport) {
  const message = creer('p', 'reglages__message');
  message.setAttribute('role', 'status');
  const boutonsAvancer = AVANCES.map((avance) => creerBoutonAvancer(contexte, avance, message));
  const contenu = creer('div', 'reglages__bloc reglages__bloc--large');
  contenu.append(
    creer(
      'p',
      'reglages__aide',
      'Pour tester : fait comme si les jours passaient. Les révisions reviennent plus tôt.',
    ),
    ...boutonsAvancer,
    message,
    creerGroupeDeSecours(contexte, etat, apresImport),
    creerGroupeReinitialisation(contexte),
  );
  return { contenu, message, premierBouton: boutonsAvancer[0] };
}

/** Met le contenu à la place du défi et renvoie de quoi accueillir l'élève (message et premier bouton). */
function afficherLeContenuDesGrands(corps, contexte, etat, apresImport) {
  const { contenu, message, premierBouton } = creerContenuDesGrands(contexte, etat, apresImport);
  corps.replaceChildren(contenu);
  return { message, premierBouton };
}

/**
 * Montre le défi tant que la section est verrouillée, le contenu seulement après la bonne réponse.
 * Au déverrouillage, le message est écrit une fois le contenu en place (pour être annoncé) et le focus y entre.
 */
function remplirLesGrands(corps, contexte, etat, apresImport) {
  if (etat.grandsDeverrouilles) {
    afficherLeContenuDesGrands(corps, contexte, etat, apresImport);
    return;
  }
  corps.replaceChildren(creerDefi(() => {
    etat.grandsDeverrouilles = true;
    const { message, premierBouton } = afficherLeContenuDesGrands(corps, contexte, etat, apresImport);
    message.textContent = MESSAGE_BIENVENUE_GRANDS;
    premierBouton.focus();
  }));
}

/**
 * Un groupe fermé par défaut et verrouillé : les enfants n'ont aucune raison de l'ouvrir.
 * Son contenu n'existe pas dans la page tant que le défi n'est pas résolu.
 */
function creerGroupePourLesGrands(contexte, etat, apresImport) {
  const groupe = creer('details', 'reglages__groupe');
  const corps = creer('div', 'reglages__corps');
  remplirLesGrands(corps, contexte, etat, apresImport);
  groupe.open = etat.grandsOuvert;
  groupe.addEventListener('toggle', () => { etat.grandsOuvert = groupe.open; });
  groupe.append(creer('summary', 'reglages__titre-groupe reglages__resume', 'Pour les grands'), corps);
  return groupe;
}

// --- Réinitialisation (double confirmation) ---

async function confirmer({ titre, texte, libelleOui, libelleNon }) {
  const choix = await ouvrirModale({
    titre,
    contenu: creer('p', 'reglages__confirmation', texte),
    boutons: [
      { id: 'oui', libelle: libelleOui, variante: 'secondaire' },
      { id: 'non', libelle: libelleNon, variante: 'principal' },
    ],
  });
  return choix === 'oui';
}

async function reinitialiser(contexte) {
  const premiere = await confirmer({
    titre: 'Tout effacer ?',
    texte: 'Ta progression, tes accessoires et tes réglages vont être effacés de cet appareil.',
    libelleOui: 'Continuer',
    libelleNon: 'Garder ma progression',
  });
  if (!premiere) {
    return;
  }
  const seconde = await confirmer({
    titre: 'Vraiment tout effacer ?',
    texte: 'Après, ta progression ne pourra plus être retrouvée, sauf avec une sauvegarde.',
    libelleOui: 'Oui, tout effacer',
    libelleNon: 'Non, je garde tout',
  });
  if (!seconde) {
    return;
  }
  const defauts = creerDonneesParDefaut();
  contexte.stockage.ecrire(defauts);
  contexte.modifierReglages(defauts.reglages);
  window.dispatchEvent(new Event(EVENEMENT_DONNEES_CHANGEES));
  window.location.hash = `#/${ROUTE_PREMIER_LANCEMENT}`;
}

function creerGroupeReinitialisation(contexte) {
  const groupe = creerGroupe('Tout recommencer');
  groupe.classList.add('reglages__groupe--imbrique');
  groupe.append(
    creer('p', 'reglages__aide', 'Efface ta progression sur cet appareil. Fais une sauvegarde avant si tu veux pouvoir la retrouver.'),
    creerBouton('Réinitialiser Lexia', 'bouton--secondaire', () => reinitialiser(contexte)),
  );
  return groupe;
}

/** Dessine l'écran ; `etat` est celui du montage en cours (voir `creerGroupeDeSecours`). */
async function dessiner(conteneur, contexte, etat) {
  await chargerFeuille(FEUILLE_REGLAGES);
  const page = creer('section', 'reglages contenu__centre');
  const retour = creer('a', 'bouton bouton--discret', "Retour à l'accueil");
  retour.href = '#/accueil';
  page.append(
    retour,
    creer('h1', 'reglages__titre', 'Réglages'),
    await creerGroupeProfil(contexte),
    creerGroupeSon(contexte),
    creerGroupeVoix(contexte),
    creerGroupeAffichage(contexte),
    creerGroupeCompte(contexte),
    creerGroupePourLesGrands(contexte, etat, () => dessiner(conteneur, contexte, etat)),
  );
  conteneur.replaceChildren(page);
}

/**
 * Monte l'écran des réglages.
 * @param {HTMLElement} conteneur
 * @param {Object} contexte Contexte de l'application.
 * @returns {Promise<void>}
 */
export function monter(conteneur, contexte) {
  return dessiner(conteneur, contexte, { grandsOuvert: false, grandsDeverrouilles: false, secoursOuvert: false });
}
