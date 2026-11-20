// Barre d'accents : des boutons qui insèrent une lettre accentuée dans un champ, au curseur.

import { chargerFeuille } from '../coeur/styles.js';

export const FEUILLE_BARRE_ACCENTS = new URL('../../css/composants/barre-accents.css', import.meta.url);

/**
 * Lettres proposées (cahier §4.5), en minuscules : la touche MAJ les passe en majuscules pour la lettre suivante.
 * â, û, ë et ü s'ajoutent à la liste du cahier (« gâteau », « mûr ») : écart décidé par le chef.
 */
export const ACCENTS = ['é', 'è', 'ê', 'ë', 'à', 'â', 'ù', 'û', 'ü', 'ç', 'ô', 'î', 'ï', 'œ'];

/**
 * La lettre à insérer selon l'état de la touche MAJ.
 * @param {string} accent Lettre de `ACCENTS`.
 * @param {boolean} majuscule Vrai si la touche MAJ est active.
 * @returns {string} Par exemple « É » pour « é » avec MAJ.
 */
export function lettreSaisie(accent, majuscule) {
  return majuscule ? accent.toLocaleUpperCase('fr') : accent;
}

/**
 * Insère un caractère à la place de la sélection.
 * @param {string} valeur Texte actuel du champ.
 * @param {number} debut Début de la sélection (ou position du curseur).
 * @param {number} fin Fin de la sélection (égale à `debut` sans sélection).
 * @param {string} caractere Caractère à insérer.
 * @returns {{ valeur: string, curseur: number }} Nouveau texte et position du curseur après le caractère.
 */
export function insererAuCurseur(valeur, debut, fin, caractere) {
  const [de, a] = debut <= fin ? [debut, fin] : [fin, debut];
  return {
    valeur: valeur.slice(0, de) + caractere + valeur.slice(a),
    curseur: de + caractere.length,
  };
}

function insererAccent(champ, accent) {
  const { valeur, curseur } = insererAuCurseur(champ.value, champ.selectionStart, champ.selectionEnd, accent);
  champ.value = valeur;
  champ.setSelectionRange(curseur, curseur);
  champ.dispatchEvent(new Event('input', { bubbles: true }));
  champ.focus();
}

function creerBouton(classe, texte) {
  const touche = document.createElement('button');
  touche.type = 'button';
  touche.className = classe;
  touche.textContent = texte;
  // Évite que le clic vole le focus au champ (souris) ; le clic le lui rend de toute façon (tactile).
  touche.addEventListener('mousedown', (evenement) => evenement.preventDefault());
  return touche;
}

/**
 * Construit la barre d'accents liée à un champ.
 * La touche MAJ met les lettres en majuscules pour la prochaine lettre insérée seulement.
 * @param {HTMLInputElement|HTMLTextAreaElement} champ Champ qui reçoit les lettres.
 * @returns {Promise<HTMLElement>} La barre, prête à être insérée sous le champ.
 */
export async function creerBarreAccents(champ) {
  await chargerFeuille(FEUILLE_BARRE_ACCENTS);
  const barre = document.createElement('div');
  const toucheMajuscule = creerBouton('barre-accents__touche barre-accents__touche--majuscule', 'MAJ');
  const touches = ACCENTS.map((accent) => creerBouton('barre-accents__touche', accent));
  let majuscule = false;

  function afficherLEtat() {
    touches.forEach((touche, rang) => {
      touche.textContent = lettreSaisie(ACCENTS[rang], majuscule);
    });
    toucheMajuscule.setAttribute('aria-pressed', String(majuscule));
  }

  touches.forEach((touche, rang) => {
    touche.addEventListener('click', () => {
      insererAccent(champ, lettreSaisie(ACCENTS[rang], majuscule));
      majuscule = false;
      afficherLEtat();
    });
  });
  toucheMajuscule.addEventListener('click', () => {
    majuscule = !majuscule;
    afficherLEtat();
    champ.focus();
  });
  afficherLEtat();
  barre.className = 'barre-accents';
  barre.setAttribute('role', 'group');
  barre.setAttribute('aria-label', 'Lettres accentuées');
  barre.append(...touches, toucheMajuscule);
  return barre;
}
