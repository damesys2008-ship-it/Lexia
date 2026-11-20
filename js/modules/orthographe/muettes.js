// Écran « Lettres muettes » (cahier §7.3, exercice 4) : la famille de mots.
//
// La phrase s'affiche avec le mot privé de ses lettres muettes finales ; l'élève écrit la ou les lettres
// qui manquent (« 1 lettre » ou « 2 lettres » est annoncé). Après la réponse finale, les mots de la famille
// montrent la lettre qu'on y entend. La séance (seance.js) gère indice, correction, sons et clôture ;
// la logique (découpe, comparaison, mise en évidence) est dans muettes-logique.js.

import { creer, creerBouton } from '../../ui/dom.js';
import { creerChampTexte } from '../../ui/champ-texte.js';
import {
  annoncerNombreDeLettres,
  decouperPhrase,
  direCeQuOnEntend,
  estBonneSaisie,
  mettreEnEvidence,
  motSansLettres,
} from './muettes-logique.js';
import { VERDICT_INDICE, VERDICT_JUSTE, VERDICT_TERMINE } from './seance-logique.js';
import { monterExercice } from './seance.js';

const FEUILLE = new URL('../../../css/modules/orthographe-muettes.css', import.meta.url);
const CONSIGNE = 'Retrouve les lettres muettes à la fin du mot. Pense à un mot de la même famille.';
const ESPACE_INSECABLE = '\u00a0';

// --- La phrase et le trou ---

function creerTrou() {
  const trou = creer('span', 'orthographe-muettes__trou');
  trou.setAttribute('role', 'img');
  trou.setAttribute('aria-label', 'lettres muettes à écrire');
  return trou;
}

function creerPhrase(item, trou) {
  const { avant, mot, apres } = decouperPhrase(item);
  const phrase = creer('p', 'orthographe__phrase');
  phrase.append(avant, creer('span', 'orthographe-muettes__debut-du-mot', motSansLettres(item, mot)), trou, apres);
  return phrase;
}

// --- Le champ et les commandes ---

function etiquetteDuChamp(item) {
  return item.lettres.length === 1 ? 'Lettre muette à la fin du mot' : 'Lettres muettes à la fin du mot';
}

async function creerSaisie(item, verifier) {
  const { racine: champRacine, champ } = await creerChampTexte({ etiquette: etiquetteDuChamp(item) });
  const racine = creer('div', 'orthographe-muettes__saisie');
  racine.append(champRacine);
  champ.addEventListener('keydown', (evenement) => {
    if (evenement.key === 'Enter') {
      evenement.preventDefault();
      verifier();
    }
  });
  return { racine, champ };
}

function creerCommandes(etape, item, verifier) {
  const commandes = creer('div', 'orthographe-muettes__commandes');
  const verifierBouton = creerBouton('Vérifier', 'bouton--principal', verifier);
  const ecouter = creerBouton('Écouter la phrase', 'bouton--secondaire', () => etape.lire(item.phrase));
  commandes.append(verifierBouton, ecouter);
  return { commandes, verifierBouton };
}

// --- La fin de l'item : la famille de mots ---

function creerLigneFamille(item, motDeFamille) {
  const { debut, lettres, fin } = mettreEnEvidence(item, motDeFamille);
  const ligne = creer('li', 'orthographe-muettes__mot-de-famille');
  ligne.append(debut);
  if (lettres !== '') {
    ligne.append(creer('span', 'orthographe-muettes__lettre', lettres), fin, `${ESPACE_INSECABLE}: ${direCeQuOnEntend(item)}`);
  }
  return ligne;
}

function montrerLaFamille(zoneFamille, item) {
  const liste = creer('ul', 'orthographe-muettes__famille');
  liste.append(...item.famille.map((motDeFamille) => creerLigneFamille(item, motDeFamille)));
  zoneFamille.append(creer('p', 'orthographe-muettes__titre-famille', 'Les mots de la même famille'), liste);
}

function remplirLeTrou(trou, lettres) {
  trou.textContent = lettres;
  trou.removeAttribute('role');
  trou.removeAttribute('aria-label');
  trou.classList.add('orthographe-muettes__trou--rempli', 'orthographe__etat--juste');
}

/** Après la réponse finale : les lettres dans le mot, puis la famille où on les entend. */
function montrerLaFin(vue) {
  vue.champ.readOnly = true;
  vue.verifierBouton.disabled = true;
  remplirLeTrou(vue.trou, vue.item.lettres);
  montrerLaFamille(vue.zoneFamille, vue.item);
}

function verifier(vue) {
  const { item, champ, etape } = vue;
  if (champ.readOnly || champ.value.trim() === '') {
    champ.focus();
    return;
  }
  const verdict = etape.valider({ juste: estBonneSaisie(item, champ.value), bonneReponse: item.lettres });
  if (verdict === VERDICT_TERMINE) {
    return;
  }
  if (verdict !== VERDICT_JUSTE) {
    champ.classList.add('orthographe__etat--faux');
  }
  if (verdict === VERDICT_INDICE) {
    champ.focus();
    return;
  }
  montrerLaFin(vue);
}

// --- Une étape ---

async function monterEtape(item, etape) {
  const trou = creerTrou();
  const vue = { item, etape, trou, zoneFamille: creer('div', 'orthographe-muettes__zone-famille') };
  const faireVerifier = () => verifier(vue);
  const saisie = await creerSaisie(item, faireVerifier);
  const { commandes, verifierBouton } = creerCommandes(etape, item, faireVerifier);

  Object.assign(vue, { champ: saisie.champ, verifierBouton });
  // La zone de la famille est annoncée par les lecteurs d'écran quand les mots y apparaissent.
  vue.zoneFamille.setAttribute('aria-live', 'polite');
  etape.zone.append(
    creerPhrase(item, trou),
    creer('p', 'orthographe-muettes__nombre', annoncerNombreDeLettres(item)),
    saisie.racine,
    commandes,
    vue.zoneFamille,
  );
}

/**
 * Monte l'exercice « Lettres muettes ».
 * @param {HTMLElement} conteneur
 * @param {Object} contexte Contexte de l'application.
 * @returns {Promise<void>}
 */
export async function monter(conteneur, contexte) {
  await monterExercice(conteneur, contexte, {
    mode: 'muettes',
    type: 'muette',
    consigne: CONSIGNE,
    feuille: FEUILLE,
    monterEtape,
  });
}
