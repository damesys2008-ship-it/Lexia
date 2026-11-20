// Premier lancement (route '#/premier-lancement', cahier §6.9) : la mascotte arrive et propose de créer un compte
// (ou de jouer sans), puis l'élève donne son prénom, nomme sa mascotte, teste la voix et choisit de faire la grande
// aventure ou plus tard. Quelqu'un qui a déjà un compte connecté commence directement par son prénom.
// Le prénom et le nom sont enregistrés dès qu'ils sont donnés : une interruption ne perd rien.

import { ROUTE_ACCUEIL } from '../../coeur/routes.js';
import { LONGUEUR_SAISIE_NOM } from '../../coeur/stockage.js';
import { chargerFeuille } from '../../coeur/styles.js';
import { ESPACE_INSECABLE } from '../../coeur/texte.js';
import { creerBulle } from '../../ui/bulle.js';
import { creerChampTexte } from '../../ui/champ-texte.js';
import { creer, creerBouton } from '../../ui/dom.js';
import { creerMascotte } from '../../ui/mascotte.js';

const FEUILLE_PREMIER_LANCEMENT = new URL('../../../css/modules/premier-lancement.css', import.meta.url);

const SUGGESTIONS_DE_NOM = ['Pompon', 'Praline', 'Caramel'];
const ROUTE_INSCRIPTION = 'inscription';
const ROUTE_GRANDE_AVENTURE = 'test-depart';
// Les deux choix discrets de l'écran de bienvenue (voir premier-lancement.css : espaces égaux).
const CLASSE_CHOIX_DISCRET = 'premier-lancement__choix-discret';

/** Les trois repères de la frise ; chaque étape du parcours (ETAPES, dans l'ordre) en éclaire un. */
const REPERES_DE_LA_FRISE = ['Ton prénom', 'Le nom de ton compagnon', 'Un petit test'];
const REPERE_DE_CHAQUE_ETAPE = [0, 0, 1, 2, 2];

const MESSAGE_PRENOM_VIDE = 'Écris ton prénom pour continuer.';
const MESSAGE_NOM_VIDE = 'Choisis un nom pour moi, ou prends une des idées.';
const MESSAGE_VOIX_INDISPONIBLE =
  "Je n'ai pas de voix sur cet appareil. Ce n'est pas grave : le détective des fautes marche sans voix.";

function enregistrerProfil(contexte, changement) {
  const donnees = contexte.stockage.lire();
  contexte.stockage.ecrire({ ...donnees, profil: { ...donnees.profil, ...changement } });
}

/** Une zone de message lue par les lecteurs d'écran. */
function creerMessage(role) {
  const message = creer('p', 'premier-lancement__message');
  message.setAttribute('role', role);
  return message;
}

/**
 * Un formulaire à un champ : « Entrée » et le bouton font la même chose, un champ vide est refusé.
 * @param {Object} options
 * @param {string} options.etiquette Nom accessible du champ.
 * @param {string} options.libelleBouton
 * @param {string} options.messageVide Dit à l'élève ce qu'il manque.
 * @param {function(string): void} options.auEnvoi Reçoit le texte nettoyé et non vide.
 * @returns {Promise<{formulaire: HTMLFormElement, champ: HTMLInputElement, message: HTMLElement}>}
 */
async function creerFormulaire({ etiquette, libelleBouton, messageVide, auEnvoi }) {
  const { racine, champ } = await creerChampTexte({ etiquette });
  const formulaire = creer('form', 'premier-lancement__formulaire');
  const message = creerMessage('alert');
  const valider = creer('button', 'bouton bouton--principal', libelleBouton);

  champ.maxLength = LONGUEUR_SAISIE_NOM;
  valider.type = 'submit';
  formulaire.noValidate = true;
  formulaire.addEventListener('submit', (evenement) => {
    evenement.preventDefault();
    const texte = champ.value.trim();
    if (texte === '') {
      message.textContent = messageVide;
      champ.focus();
      return;
    }
    auEnvoi(texte);
  });
  formulaire.append(racine, valider, message);
  return { formulaire, champ, message };
}

// --- Les étapes : chacune reçoit le décor, le contexte et la fonction « étape suivante » ---

/** Quelqu'un qui a déjà un compte se connecte AVANT de créer un profil : sa progression revient d'elle-même. */
function creerLienDejaUnCompte() {
  const lien = creer('a', `bouton bouton--discret ${CLASSE_CHOIX_DISCRET}`, "J'ai déjà un compte");
  lien.href = '#/connexion';
  return lien;
}

function etapeBienvenue(decor, contexte, suivante) {
  const creerUnCompte = creer('a', 'bouton bouton--principal premier-lancement__gros', 'Créer un compte');
  creerUnCompte.href = `#/${ROUTE_INSCRIPTION}`;
  decor.bulle.parler(`Salut${ESPACE_INSECABLE}! Je suis ton compagnon. Je vais t'aider à t'entraîner en français.`);
  decor.mascotte.definirEtat('coucou');
  decor.zone.replaceChildren(
    creerUnCompte,
    creerLienDejaUnCompte(),
    creerBouton('Jouer sans compte', `bouton--discret ${CLASSE_CHOIX_DISCRET}`, suivante),
  );
}

async function etapePrenom(decor, contexte, suivante) {
  decor.bulle.parler("Comment tu t'appelles ?");
  decor.mascotte.definirEtat('pense');
  const { formulaire, champ } = await creerFormulaire({
    etiquette: 'Ton prénom',
    libelleBouton: "C'est moi",
    messageVide: MESSAGE_PRENOM_VIDE,
    auEnvoi: (prenom) => {
      enregistrerProfil(contexte, { prenom });
      suivante();
    },
  });
  decor.zone.replaceChildren(formulaire);
  champ.focus();
}

async function etapeNomMascotte(decor, contexte, suivante) {
  const choisir = (nomMascotte) => {
    enregistrerProfil(contexte, { nomMascotte });
    suivante();
  };
  decor.bulle.parler("Et moi, comment tu m'appelles ?");
  decor.mascotte.definirEtat('content');
  const { formulaire, champ } = await creerFormulaire({
    etiquette: 'Le nom de ta mascotte',
    libelleBouton: 'Voilà mon nom',
    messageVide: MESSAGE_NOM_VIDE,
    auEnvoi: choisir,
  });
  const suggestions = creer('div', 'premier-lancement__suggestions');
  suggestions.setAttribute('role', 'group');
  suggestions.setAttribute('aria-label', 'Des idées de noms');
  suggestions.append(...SUGGESTIONS_DE_NOM.map((nom) => creerBouton(nom, 'bouton--secondaire', () => choisir(nom))));
  decor.zone.replaceChildren(formulaire, suggestions);
  champ.focus();
}

function etapeVoix(decor, contexte, suivante) {
  const message = creerMessage('status');
  const ecouter = creerBouton('Écouter ma voix', 'bouton--secondaire', async () => {
    message.textContent = '';
    try {
      await contexte.voix.tester({ vitesse: contexte.lireReglages().vitesseVoix });
    } catch (erreur) {
      contexte.signaler('Test de la voix impossible', erreur);
      message.textContent = MESSAGE_VOIX_INDISPONIBLE;
    }
  });
  decor.bulle.parler("Est-ce que tu m'entends ?");
  decor.mascotte.definirEtat('repos');
  decor.zone.replaceChildren(ecouter, creerBouton('Continuer', 'bouton--principal', suivante), message);
}

function etapeAventure(decor, contexte) {
  const aller = (route) => {
    window.location.hash = `#/${route}`;
  };
  decor.bulle.parler('On fait la grande aventure ? Elle me dira par où commencer.');
  decor.mascotte.definirEtat('fete');
  decor.zone.replaceChildren(
    creerBouton("C'est parti", 'bouton--principal', () => aller(ROUTE_GRANDE_AVENTURE)),
    creerBouton('Plus tard', 'bouton--secondaire', () => aller(ROUTE_ACCUEIL)),
  );
}

/** La frise des trois repères : le repère éclairé est en framboise, les précédents portent une coche. */
function creerFrise() {
  const frise = creer('ol', 'premier-lancement__frise');
  frise.setAttribute('aria-label', 'Les étapes');
  REPERES_DE_LA_FRISE.forEach((libelle, rang) => {
    const repere = creer('li', 'premier-lancement__repere');
    repere.append(creer('span', 'premier-lancement__rond', String(rang + 1)), creer('span', 'premier-lancement__libelle', libelle));
    frise.append(repere);
  });
  return frise;
}

function eclairerLeRepere(frise, numeroEtape) {
  const eclaire = REPERE_DE_CHAQUE_ETAPE[numeroEtape];
  [...frise.children].forEach((repere, rang) => {
    repere.classList.toggle('est-actif', rang === eclaire);
    repere.classList.toggle('est-fait', rang < eclaire);
    repere.firstChild.textContent = rang < eclaire ? '✓' : String(rang + 1);
    if (rang === eclaire) {
      repere.setAttribute('aria-current', 'step');
    } else {
      repere.removeAttribute('aria-current');
    }
  });
}

const ETAPE_BIENVENUE = 0;
const ETAPE_PRENOM = 1;
const ETAPES = [etapeBienvenue, etapePrenom, etapeNomMascotte, etapeVoix, etapeAventure];

/**
 * Monte le parcours de premier lancement.
 * @param {HTMLElement} conteneur
 * @param {Object} contexte Contexte de l'application.
 * @returns {Promise<void>}
 */
export async function monter(conteneur, contexte) {
  await chargerFeuille(FEUILLE_PREMIER_LANCEMENT);
  const mascotte = await creerMascotte({ signaler: contexte.signaler });
  const bulle = await creerBulle();
  const zone = creer('div', 'premier-lancement__zone');
  const page = creer('section', 'premier-lancement');
  const scene = creer('div', 'premier-lancement__scene');
  const frise = creerFrise();
  const decor = { bulle, mascotte, zone };
  // Un compte connecté a déjà fait connaissance : on saute l'écran de bienvenue.
  let numeroEtape = contexte.compte.utilisateur() === null ? ETAPE_BIENVENUE : ETAPE_PRENOM;

  async function afficherEtape() {
    eclairerLeRepere(frise, numeroEtape);
    await ETAPES[numeroEtape](decor, contexte, () => {
      numeroEtape += 1;
      return afficherEtape();
    });
  }

  scene.append(mascotte.element);
  page.append(bulle.element, scene, zone, frise);
  conteneur.replaceChildren(page);
  await afficherEtape();
}
