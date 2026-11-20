// Écran « Les accords dans le groupe nominal » (cahier §7.3, exercice 2).
//
// On montre un groupe nominal (« le chat noir ») et une consigne (« au féminin pluriel »).
// Le groupe d'arrivée s'affiche : le nom est donné, l'élève écrit chaque déterminant et chaque adjectif.
// Entrée vérifie. Une seule barre d'accents sert les champs (elle écrit dans le dernier champ touché).
// La séance (seance.js) gère indice, correction, sons et clôture ; la logique est dans accords-logique.js.

import { creer, creerBouton } from '../../ui/dom.js';
import { creerBarreAccents } from '../../ui/barre-accents.js';
import {
  estGroupeJuste,
  groupeCorrect,
  motsASaisir,
  rangDuPremierVide,
  rapportParMot,
} from './accords-logique.js';
import { VERDICT_INDICE, VERDICT_TERMINE } from './seance-logique.js';
import { monterExercice } from './seance.js';

const FEUILLE = new URL('../../../css/modules/orthographe-accords.css', import.meta.url);
const CONSIGNE = 'Écris le groupe nominal en accordant les mots avec le nom.';
const NOMS_DES_ROLES = { determinant: 'déterminant', nom: 'nom', adjectif: 'adjectif' };
const MARGE_CHAMP = 3;

// --- Les champs ---

function creerChamp(motAccorde, rang, total) {
  const champ = creer('input', 'champ-texte__saisie orthographe-accords__champ');
  champ.type = 'text';
  champ.setAttribute('aria-label', `Mot ${rang + 1} sur ${total} à écrire : ${NOMS_DES_ROLES[motAccorde.role]}`);
  champ.setAttribute('autocorrect', 'off');
  champ.setAttribute('autocapitalize', 'off');
  champ.setAttribute('spellcheck', 'false');
  champ.setAttribute('autocomplete', 'off');
  champ.setAttribute('lang', 'fr');
  champ.style.setProperty('--largeur-mot', `${motAccorde.mot.length + MARGE_CHAMP}ch`);
  return champ;
}

/** La marque ✓ ou ✗ à côté d'un champ : vide tant que le mot n'est pas vérifié. */
function creerMarque() {
  const marque = creer('span', 'orthographe-accords__marque');
  marque.setAttribute('role', 'img');
  return marque;
}

function afficherMarque(marque, ligne) {
  marque.textContent = ligne.juste ? '✓' : '✗';
  marque.setAttribute('aria-label', ligne.juste ? 'juste' : 'faux');
  marque.classList.toggle('orthographe-accords__marque--juste', ligne.juste);
  marque.classList.toggle('orthographe-accords__marque--faux', !ligne.juste);
}

function effacerMarque(marque) {
  marque.textContent = '';
  marque.removeAttribute('aria-label');
  marque.classList.remove('orthographe-accords__marque--juste', 'orthographe-accords__marque--faux');
}

/** Une case : le champ d'un mot à écrire, sa marque ✓ ou ✗ et ses écouteurs. */
function creerCase(motAccorde, rang, total, verifier) {
  const racine = creer('span', 'orthographe-accords__saisie');
  const champ = creerChamp(motAccorde, rang, total);
  const marque = creerMarque();
  champ.addEventListener('input', () => effacerMarque(marque));
  champ.addEventListener('keydown', (evenement) => {
    if (evenement.key === 'Enter') {
      evenement.preventDefault();
      verifier();
    }
  });
  racine.append(champ, marque);
  return { racine, champ, marque };
}

/**
 * Le groupe d'arrivée : le nom en texte, une case pour chaque mot à écrire.
 * @returns {{racine: HTMLElement, champs: HTMLInputElement[], marques: HTMLElement[]}}
 */
function creerGroupe(item, verifier) {
  const racine = creer('div', 'orthographe-accords__groupe');
  const total = motsASaisir(item).length;
  const cases = [];
  racine.setAttribute('role', 'group');
  racine.setAttribute('aria-label', 'Groupe nominal à écrire');
  for (const motAccorde of item.cible) {
    if (motAccorde.saisie) {
      cases.push(creerCase(motAccorde, cases.length, total, verifier));
      racine.append(cases.at(-1).racine);
    } else {
      racine.append(creer('span', 'orthographe-accords__nom', motAccorde.mot));
    }
  }
  return { racine, champs: cases.map((c) => c.champ), marques: cases.map((c) => c.marque) };
}

/**
 * Un « champ » pour la barre d'accents : chaque lettre va dans le champ touché en dernier.
 * La barre ne connaît qu'un champ ; celui-ci lui sert d'intermédiaire.
 */
function creerChampActif(champs) {
  let actif = champs[0];
  champs.forEach((champ) => champ.addEventListener('focus', () => { actif = champ; }));
  return {
    get value() { return actif.value; },
    set value(valeur) { actif.value = valeur; },
    get selectionStart() { return actif.selectionStart; },
    get selectionEnd() { return actif.selectionEnd; },
    setSelectionRange(debut, fin) { actif.setSelectionRange(debut, fin); },
    dispatchEvent(evenement) { return actif.dispatchEvent(evenement); },
    focus() { actif.focus(); },
  };
}

// --- La vérification ---

/** Après la réponse finale : champs figés, et le groupe correct a le dernier mot. */
function montrerLaFin(vue) {
  vue.champs.forEach((champ) => { champ.readOnly = true; });
  vue.verifierBouton.disabled = true;
  vue.zoneFin.append(creer('p', 'orthographe__reponse-juste', `Le groupe correct : ${groupeCorrect(vue.item)}`));
}

function marquerLeRapport(vue, rapport) {
  rapport.forEach((ligne, rang) => afficherMarque(vue.marques[rang], ligne));
}

function verifier(vue) {
  const { etape, item, champs } = vue;
  if (champs[0].readOnly) {
    return;
  }
  const saisies = champs.map((champ) => champ.value);
  const rangVide = rangDuPremierVide(saisies);
  if (rangVide !== -1) {
    champs[rangVide].focus();
    return;
  }
  const rapport = rapportParMot(item, saisies);
  const verdict = etape.valider({ juste: estGroupeJuste(rapport), bonneReponse: groupeCorrect(item) });
  if (verdict === VERDICT_TERMINE) {
    return;
  }
  marquerLeRapport(vue, rapport);
  if (verdict === VERDICT_INDICE) {
    champs[rapport.findIndex((ligne) => !ligne.juste)].focus();
    return;
  }
  montrerLaFin(vue);
}

// --- Une étape ---

async function monterEtape(item, etape) {
  const vue = { etape, item, champs: [], marques: [], verifierBouton: null, zoneFin: creer('div', 'orthographe-accords__fin') };
  const groupe = creerGroupe(item, () => verifier(vue));
  const depart = creer('p', 'orthographe__phrase orthographe-accords__depart', 'Groupe de départ : ');
  depart.append(creer('strong', 'orthographe-accords__modele', item.modele));
  vue.champs = groupe.champs;
  vue.marques = groupe.marques;
  vue.verifierBouton = creerBouton('Vérifier', 'bouton--principal', () => verifier(vue));
  vue.zoneFin.setAttribute('aria-live', 'polite');
  const commandes = creer('div', 'orthographe-accords__commandes');
  commandes.append(vue.verifierBouton);
  etape.zone.append(
    depart,
    creer('p', 'orthographe-accords__consigne', item.consigne),
    groupe.racine,
    await creerBarreAccents(creerChampActif(vue.champs)),
    commandes,
    vue.zoneFin,
  );
}

/**
 * Monte l'exercice « Les accords dans le groupe nominal ».
 * @param {HTMLElement} conteneur
 * @param {Object} contexte Contexte de l'application.
 * @returns {Promise<void>}
 */
export async function monter(conteneur, contexte) {
  await monterExercice(conteneur, contexte, {
    mode: 'accords',
    type: 'accord',
    consigne: CONSIGNE,
    feuille: FEUILLE,
    monterEtape,
  });
}
