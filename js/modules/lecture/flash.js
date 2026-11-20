// Écran « Lecture flash » (cahier §7.6) : un mot ou un groupe de mots apparaît très vite, puis l'élève le
// retrouve parmi quatre choix.
//
// L'élève touche « Montre-moi » quand il est prêt (aucun compte à rebours). La cible reste affichée le temps
// donné par le niveau, puis disparaît ; les quatre choix n'apparaissent qu'après. À la 1re erreur, l'indice est
// donné et la cible revient un peu plus longtemps ; à la 2e, la cible reste affichée.
// La séance (orthographe/seance.js) gère indice, correction, sons et clôture ; la logique (durée, choix mélangés)
// est dans flash-logique.js. Rien n'est lu à voix haute, sauf la consigne.

import { creer, creerBouton } from '../../ui/dom.js';
import { creerChoix } from '../../ui/choix.js';
import { VERDICT_INDICE, VERDICT_TERMINE } from '../orthographe/seance-logique.js';
import { monterExercice } from '../orthographe/seance.js';
import { dureeDuFlash, proposerChoix } from './flash-logique.js';

const FEUILLE = new URL('../../../css/modules/lecture-flash.css', import.meta.url);
const CONSIGNE = 'Regarde bien : le mot va apparaître très vite.';
const ETIQUETTE_DES_CHOIX = 'Quel mot as-tu vu ?';

/** Attend `duree` millisecondes, en regardant l'horloge à chaque image. */
function attendre(duree) {
  return new Promise((termine) => {
    const debut = performance.now();
    const surImage = () => {
      if (performance.now() - debut >= duree) {
        termine();
        return;
      }
      requestAnimationFrame(surImage);
    };
    requestAnimationFrame(surImage);
  });
}

// --- Les choix, une fois la cible disparue ---

async function proposerLesChoix(vue) {
  const { options, idJuste } = proposerChoix(vue.item);
  vue.idJuste = idJuste;
  vue.choix = await creerChoix({
    options,
    etiquette: ETIQUETTE_DES_CHOIX,
    onChange: () => { vue.verifierBouton.disabled = false; },
  });
  vue.zoneChoix.replaceChildren(vue.choix.racine);
  vue.verifierBouton.disabled = true;
  vue.zoneBouton.replaceChildren(vue.verifierBouton);
  // Le bouton « Montre-moi » vient de disparaître : le focus passe au premier choix, pour le clavier.
  vue.choix.racine.querySelector('button').focus();
}

function retirerLesChoix(vue) {
  vue.choix?.detruire();
  vue.zoneChoix.replaceChildren();
  vue.zoneBouton.replaceChildren();
}

// --- La présentation de la cible ---

async function presenter(vue) {
  vue.zoneBouton.replaceChildren();
  vue.cible.textContent = vue.item.cible;
  await attendre(dureeDuFlash(vue.item.niveau, vue.erreurs));
  vue.cible.textContent = '';
  await proposerLesChoix(vue);
}

// --- La validation ---

/** Après la réponse finale (juste, ou 2e erreur) : la cible est affichée et les choix sont figés. */
function montrerLaFin(vue, choisi, juste) {
  vue.cible.textContent = vue.item.cible;
  if (!juste) {
    vue.choix.marquerResultat(choisi, 'faux');
  }
  vue.choix.marquerResultat(vue.idJuste, 'juste');
  vue.choix.desactiver();
  vue.verifierBouton.disabled = true;
}

/** 1re erreur : les choix disparaissent et l'élève peut redemander la cible, qui reste un peu plus longtemps. */
function proposerUneNouvellePresentation(vue) {
  vue.erreurs += 1;
  retirerLesChoix(vue);
  vue.zoneBouton.replaceChildren(vue.montreMoiBouton);
  vue.montreMoiBouton.focus();
}

function verifier(vue) {
  const choisi = vue.choix.lireChoix();
  if (choisi === null) {
    return;
  }
  const juste = choisi === vue.idJuste;
  const verdict = vue.etape.valider({ juste, bonneReponse: vue.item.cible });
  if (verdict === VERDICT_TERMINE) {
    return;
  }
  if (verdict === VERDICT_INDICE) {
    proposerUneNouvellePresentation(vue);
    return;
  }
  montrerLaFin(vue, choisi, juste);
}

// --- Une étape ---

/** Renvoie la fonction qui dessine une étape ; `contexte` sert à signaler une erreur inattendue. */
function creerMonterEtape(contexte) {
  return (item, etape) => {
    const cible = creer('p', 'lecture-flash__cible');
    const zoneChoix = creer('div', 'lecture-flash__choix');
    const zoneBouton = creer('div', 'lecture-flash__bouton');
    const vue = { item, etape, erreurs: 0, cible, zoneChoix, zoneBouton };
    const montreMoiBouton = creerBouton('Montre-moi', 'bouton--principal', () => {
      presenter(vue).catch((erreur) => contexte.signaler('Présentation de la cible impossible', erreur));
    });
    const verifierBouton = creerBouton('Vérifier', 'bouton--principal', () => verifier(vue));
    Object.assign(vue, { montreMoiBouton, verifierBouton });
    zoneBouton.append(montreMoiBouton);
    etape.zone.append(cible, zoneChoix, zoneBouton);
  };
}

/**
 * Monte l'exercice « Lecture flash ».
 * @param {HTMLElement} conteneur
 * @param {Object} contexte Contexte de l'application.
 * @returns {Promise<void>}
 */
export async function monter(conteneur, contexte) {
  await monterExercice(conteneur, contexte, {
    mode: 'flash',
    type: 'flash',
    module: 'lecture',
    contenu: 'lecture',
    consigne: CONSIGNE,
    feuille: FEUILLE,
    libelleRetour: 'Retour à la lecture',
    monterEtape: creerMonterEtape(contexte),
  });
}
