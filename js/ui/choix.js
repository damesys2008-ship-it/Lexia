// Composant « choix » : des boutons parmi lesquels l'élève en choisit un (mot intrus, définition…).
// Il affiche et signale le choix ; il ne sait pas ce qui est juste : l'écran valide puis appelle
// `marquerResultat`. Réutilisable (familles de mots, sens d'un mot, sens d'un affixe).
//
// API :
//   const choix = await creerChoix({ options: [{ id, texte }], etiquette, onChange });
//     options    2 à 8 options, id uniques et non vides ; le texte est posé avec textContent
//     etiquette  libellé du groupe, lu par les lecteurs d'écran (« Choisis le mot qui est l'intrus. »)
//     onChange   appelé avec { choix } (id de l'option choisie) à chaque nouveau choix
//   choix.racine               l'élément à insérer dans la page
//   choix.lireChoix()          id de l'option choisie, ou null
//   choix.marquerResultat(id, 'juste' | 'faux')
//                              ✓ sur la bonne option ; ✗ sur une mauvaise, qui reste visible mais grisée et
//                              désactivée (elle n'est plus le choix courant)
//   choix.desactiver()         plus aucun choix possible (fin d'exercice, correction affichée)
//   choix.detruire()           retire l'écouteur du clavier
//
// Au clavier : Tab puis Entrée ou Espace, les flèches déplacent le focus entre les options, et les chiffres
// 1 à 8 choisissent directement l'option correspondante (comme le pont des homophones).

import { chargerFeuille } from '../coeur/styles.js';
import {
  RESULTAT_FAUX, choisir, creerEtat, estChoisissable, marquer, positionSuivante,
} from './choix-logique.js';

const FEUILLE_CHOIX = new URL('../../css/composants/choix.css', import.meta.url);
const OPTIONS_MIN = 2;
const OPTIONS_MAX = 8;
const SYMBOLES = { juste: '✓', faux: '✗' };
const MOTS_RESULTAT = { juste: ', juste', faux: ', faux' };
const DEPLACEMENTS = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

function creerElement(balise, classe, texte = '') {
  const element = document.createElement(balise);
  element.className = classe;
  element.textContent = texte;
  return element;
}

function verifierOptions(options) {
  const identifiants = options.map((option) => option.id);
  const nombreValide = options.length >= OPTIONS_MIN && options.length <= OPTIONS_MAX;
  if (!nombreValide || new Set(identifiants).size !== identifiants.length || identifiants.includes('')) {
    throw new Error(`creerChoix : de ${OPTIONS_MIN} à ${OPTIONS_MAX} options, avec des id uniques et non vides.`);
  }
}

class Choix {
  constructor({ options, etiquette, onChange }) {
    verifierOptions(options);
    this.options = options;
    this.onChange = onChange ?? (() => {});
    this.etat = creerEtat();
    this.actif = true;
    this.boutons = options.map((option, position) => this.creerBouton(option, position));
    this.racine = creerElement('div', 'choix');
    this.racine.setAttribute('role', 'group');
    this.racine.setAttribute('aria-label', etiquette);
    this.racine.append(...this.boutons);
    this.ecouteur = (evenement) => this.gererTouche(evenement);
    document.addEventListener('keydown', this.ecouteur);
  }

  creerBouton(option, position) {
    const bouton = creerElement('button', 'bouton bouton--secondaire choix__option');
    bouton.type = 'button';
    bouton.dataset.id = option.id;
    bouton.setAttribute('aria-pressed', 'false');
    const numero = creerElement('span', 'choix__numero', String(position + 1));
    numero.setAttribute('aria-hidden', 'true');
    const marque = creerElement('span', 'choix__marque');
    marque.setAttribute('aria-hidden', 'true');
    const texte = creerElement('span', 'choix__texte', option.texte);
    bouton.append(numero, marque, texte, creerElement('span', 'sr-seulement'));
    bouton.addEventListener('click', () => this.choisirOption(option.id));
    return bouton;
  }

  boutonDe(id) {
    return this.boutons.find((bouton) => bouton.dataset.id === id);
  }

  choisirOption(id) {
    if (!this.actif || !estChoisissable(this.etat, id)) {
      return;
    }
    this.etat = choisir(this.etat, id);
    this.afficherSelection();
    this.onChange({ choix: id });
  }

  afficherSelection() {
    this.boutons.forEach((bouton) => {
      const choisi = bouton.dataset.id === this.etat.selection;
      bouton.setAttribute('aria-pressed', String(choisi));
      bouton.classList.toggle('est-choisi', choisi);
    });
  }

  deplacerFocus(sens) {
    const ids = this.options.map((option) => option.id);
    const depart = this.boutons.indexOf(document.activeElement);
    const position = depart < 0 ? -1 : positionSuivante(ids, this.etat, { depart, sens });
    if (position >= 0) {
      this.boutons[position].focus();
    }
  }

  /** Les chiffres marchent partout sur l'écran ; les flèches seulement quand le focus est sur les choix. */
  gererTouche(evenement) {
    if (!this.racine.isConnected || evenement.ctrlKey || evenement.altKey || evenement.metaKey) {
      return;
    }
    const numero = Number(evenement.key);
    if (numero >= 1 && numero <= this.options.length) {
      this.choisirOption(this.options[numero - 1].id);
    } else if (Object.hasOwn(DEPLACEMENTS, evenement.key) && this.racine.contains(document.activeElement)) {
      evenement.preventDefault();
      this.deplacerFocus(DEPLACEMENTS[evenement.key]);
    }
  }

  lireChoix() {
    return this.etat.selection;
  }

  marquerResultat(id, resultat) {
    const bouton = this.boutonDe(id);
    if (bouton === undefined) {
      throw new Error(`marquerResultat : option inconnue « ${id} »`);
    }
    const avaitLeFocus = bouton === document.activeElement;
    this.etat = marquer(this.etat, id, resultat);
    bouton.classList.add(`est-${resultat}`);
    bouton.querySelector('.choix__marque').textContent = SYMBOLES[resultat];
    bouton.querySelector('.sr-seulement').textContent = MOTS_RESULTAT[resultat];
    if (resultat === RESULTAT_FAUX) {
      bouton.disabled = true;
    }
    this.afficherSelection();
    if (avaitLeFocus && resultat === RESULTAT_FAUX) {
      this.passerLeFocusAuSuivant(bouton);
    }
  }

  passerLeFocusAuSuivant(bouton) {
    const ids = this.options.map((option) => option.id);
    const position = positionSuivante(ids, this.etat, { depart: this.boutons.indexOf(bouton), sens: 1 });
    if (position >= 0) {
      this.boutons[position].focus();
    }
  }

  desactiver() {
    this.actif = false;
    this.racine.classList.add('est-desactive');
    this.boutons.forEach((bouton) => { bouton.disabled = true; });
  }

  detruire() {
    document.removeEventListener('keydown', this.ecouteur);
  }
}

/**
 * Crée un groupe de boutons-choix.
 * @param {Object} parametres
 * @param {{id: string, texte: string}[]} parametres.options  2 à 8 options
 * @param {string} parametres.etiquette  libellé du groupe pour les lecteurs d'écran
 * @param {function({choix: string}): void} [parametres.onChange]
 * @returns {Promise<Choix>}
 */
export async function creerChoix(parametres) {
  await chargerFeuille(FEUILLE_CHOIX);
  return new Choix(parametres);
}
