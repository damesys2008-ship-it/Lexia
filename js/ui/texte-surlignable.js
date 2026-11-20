// Composant « texte surlignable » : un texte dont chaque phrase se choisit (clic, toucher, ou Tab puis Entrée
// ou Espace). C'est le seul geste : pas de sélection libre de texte, impraticable au toucher et au clavier.
// Il affiche et signale le choix ; il ne sait pas quelle phrase est juste : l'écran valide, puis appelle
// `marquer`. Calqué sur js/ui/choix.js.
//
// API :
//   const texte = await creerTexteSurlignable({ paragraphes, onChoix });
//     paragraphes  string[][] : les phrases de chaque paragraphe, déjà découpées (le texte est posé par textContent)
//     onChoix      appelé avec { phrase } (index à plat de la phrase choisie) à chaque nouveau choix
//   texte.racine              l'élément à insérer dans la page
//   texte.lireChoix()         index de la phrase choisie, ou null
//   texte.marquer(index, 'juste' | 'faux')
//                             « ✓ preuve » sur la bonne phrase ; « ✗ » sur une mauvaise, qui n'est plus choisissable
//   texte.desactiver()        plus aucun choix possible (correction affichée) ; texte.activer() le rétablit
//
// Le clavier ne touche que la phrase qui a le focus : aucun écouteur sur `document` (contrairement à choix.js),
// donc ce composant cohabite avec un groupe `creerChoix` sur le même écran.

import { chargerFeuille } from '../coeur/styles.js';
import { creer } from './dom.js';
import {
  RESULTAT_FAUX, aplatirPhrases, choisir, creerEtat, estChoisissable, libellePhrase, marquer,
} from './texte-surlignable-logique.js';

const FEUILLE_TEXTE = new URL('../../css/composants/texte-surlignable.css', import.meta.url);
const SYMBOLES = { juste: '✓ preuve', faux: '✗' };
const MOTS_RESULTAT = { juste: ', phrase juste', faux: ', pas la bonne phrase' };
const TOUCHES_DE_CHOIX = new Set(['Enter', ' ']);

class TexteSurlignable {
  constructor({ paragraphes, onChoix }) {
    const textes = aplatirPhrases(paragraphes);
    if (textes.length === 0) {
      throw new Error('creerTexteSurlignable : au moins une phrase est nécessaire.');
    }
    this.textes = textes;
    this.onChoix = onChoix ?? (() => {});
    this.etat = creerEtat();
    this.actif = true;
    this.phrases = [];
    this.racine = creer('div', 'texte-surlignable');
    paragraphes.forEach((phrasesDuParagraphe) => {
      const paragraphe = creer('p', 'texte-surlignable__paragraphe');
      phrasesDuParagraphe.forEach((texte) => {
        const phrase = this.creerPhrase(texte, this.phrases.length);
        this.phrases.push(phrase);
        paragraphe.append(phrase);
      });
      this.racine.append(paragraphe);
    });
    this.annonce = creer('p', 'sr-seulement');
    this.annonce.setAttribute('role', 'status');
    this.racine.append(this.annonce);
  }

  creerPhrase(texte, index) {
    const phrase = creer('span', 'texte-surlignable__phrase');
    phrase.setAttribute('role', 'button');
    phrase.setAttribute('tabindex', '0');
    phrase.setAttribute('aria-pressed', 'false');
    phrase.setAttribute('aria-label', libellePhrase(index, this.textes.length, texte));
    phrase.append(creer('span', 'texte-surlignable__texte', texte), creer('span', 'texte-surlignable__marque'));
    phrase.addEventListener('click', () => this.choisirPhrase(index));
    phrase.addEventListener('keydown', (evenement) => {
      if (TOUCHES_DE_CHOIX.has(evenement.key)) {
        evenement.preventDefault(); // l'espace ne doit pas faire défiler la page
        this.choisirPhrase(index);
      }
    });
    return phrase;
  }

  choisirPhrase(index) {
    if (!this.actif || !estChoisissable(this.etat, index)) {
      return;
    }
    this.etat = choisir(this.etat, index);
    this.afficherSelection();
    this.annonce.textContent = `Phrase choisie : ${this.textes[index]}`;
    this.onChoix({ phrase: index });
  }

  afficherSelection() {
    this.phrases.forEach((phrase, index) => {
      const choisie = index === this.etat.selection;
      phrase.setAttribute('aria-pressed', String(choisie));
      phrase.classList.toggle('est-choisie', choisie);
    });
  }

  marquer(index, resultat) {
    const phrase = this.phrases[index];
    if (phrase === undefined) {
      throw new Error(`marquer : phrase inconnue « ${index} »`);
    }
    this.etat = marquer(this.etat, index, resultat);
    phrase.classList.add(`est-${resultat}`);
    phrase.children[1].textContent = SYMBOLES[resultat];
    phrase.setAttribute('aria-label', libellePhrase(index, this.textes.length, this.textes[index]) + MOTS_RESULTAT[resultat]);
    if (resultat === RESULTAT_FAUX) {
      phrase.setAttribute('aria-disabled', 'true');
    }
    this.afficherSelection();
  }

  lireChoix() {
    return this.etat.selection;
  }

  desactiver() {
    this.actif = false;
    this.racine.classList.add('est-desactive');
    this.phrases.forEach((phrase) => {
      phrase.setAttribute('aria-disabled', 'true');
      phrase.setAttribute('tabindex', '-1');
    });
  }

  activer() {
    this.actif = true;
    this.racine.classList.remove('est-desactive');
    this.phrases.forEach((phrase, index) => {
      if (estChoisissable(this.etat, index)) {
        phrase.removeAttribute('aria-disabled');
      }
      phrase.setAttribute('tabindex', '0');
    });
  }
}

/**
 * Construit le composant sans charger sa feuille de style (utile aux tests, qui n'ont pas de navigateur).
 * @param {Object} parametres
 * @param {string[][]} parametres.paragraphes
 * @param {function({phrase: number}): void} [parametres.onChoix]
 * @returns {TexteSurlignable}
 */
export function construireTexteSurlignable(parametres) {
  return new TexteSurlignable(parametres);
}

/**
 * Crée un texte dont chaque phrase se choisit.
 * @param {Object} parametres
 * @param {string[][]} parametres.paragraphes  les phrases de chaque paragraphe
 * @param {function({phrase: number}): void} [parametres.onChoix]
 * @returns {Promise<TexteSurlignable>}
 */
export async function creerTexteSurlignable(parametres) {
  await chargerFeuille(FEUILLE_TEXTE);
  return construireTexteSurlignable(parametres);
}
