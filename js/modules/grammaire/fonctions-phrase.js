// Widget de « La chasse aux fonctions » : la phrase en mots touchables et la légende des fonctions.
//
// L'élève choisit une fonction dans la légende, puis pose un groupe de trois façons :
//   - au toucher ou au clic : le premier mot, puis le dernier (le même mot deux fois = un groupe d'un mot) ;
//   - en glissant (Pointer Events) du premier au dernier mot ;
//   - au clavier : Tab jusqu'au mot, Entrée ou Espace, comme au toucher.
// Retoucher un groupe l'efface. La logique (sélection, chevauchement, évaluation) est dans fonctions-logique.js.
//
// API : `creerSelecteurFonctions({ item, onChange })` renvoie
//   racine                    élément à ajouter à la page
//   lireGroupes()             les groupes posés : [{ debut, fin, fonction }]
//   marquerResultats(Map)     affiche ✓ / ✗ sur les groupes de la Map (clé : clefDeGroupe) ; effacé au prochain changement
//   poserSolution()           remplace les groupes de l'élève par ceux de l'item
//   desactiver()              plus rien ne se touche

import { creer } from '../../ui/dom.js';
import {
  EVENEMENT_CHEVAUCHEMENT,
  EVENEMENT_DEBUT,
  EVENEMENT_FONCTION_MANQUANTE,
  EVENEMENT_GROUPE_AJOUTE,
  EVENEMENT_GROUPE_EFFACE,
  LIBELLES_FONCTIONS,
  choisirFonction,
  clefDeGroupe,
  creerLegende,
  creerSelection,
  groupeContenant,
  poserGroupes,
  selectionnerPlage,
  texteDuGroupe,
  toucherMot,
} from './fonctions-logique.js';

const SEUIL_GLISSER_PX = 6;
const MARQUES = { juste: '✓', faux: '✗' };
const TEXTE_DE_AIDE = '1. Choisis une fonction. 2. Touche le premier mot du groupe, puis le dernier '
  + '(pour un seul mot, touche-le deux fois). Tu peux aussi glisser. Touche un groupe pour l\'effacer.';

function annoncerPour(selecteur, evenement, indice) {
  const { item, selection } = selecteur;
  const groupe = groupeContenant(selection.groupes, indice);
  const messages = {
    [EVENEMENT_FONCTION_MANQUANTE]: 'Choisis d\'abord une fonction dans la légende.',
    [EVENEMENT_DEBUT]: `Début du groupe : ${item.mots[indice]}. Touche le dernier mot du groupe.`,
    [EVENEMENT_CHEVAUCHEMENT]: 'Ces mots font déjà partie d\'un groupe.',
    [EVENEMENT_GROUPE_EFFACE]: 'Groupe effacé.',
    [EVENEMENT_GROUPE_AJOUTE]: groupe && `Groupe posé : ${texteDuGroupe(item, groupe)} (${LIBELLES_FONCTIONS[groupe.fonction].libelle}).`,
  };
  return messages[evenement];
}

class SelecteurFonctions {
  constructor(item, onChange) {
    this.item = item;
    this.onChange = onChange;
    this.selection = creerSelection();
    this.resultats = new Map();
    this.actif = true;
    this.glisse = null;
    this.ignorerProchainClic = false;
    this.legende = creer('div', 'fonctions__legende');
    this.legende.setAttribute('role', 'group');
    this.legende.setAttribute('aria-label', 'Fonctions à trouver');
    this.phrase = creer('p', 'fonctions__phrase');
    this.annonce = creer('p', 'fonctions__annonce');
    this.annonce.setAttribute('aria-live', 'polite');
    this.racine = creer('div', 'fonctions');
    this.racine.append(creer('p', 'fonctions__aide', TEXTE_DE_AIDE), this.legende, this.phrase, this.annonce);
    this.dessiner();
  }

  lireGroupes() {
    return this.selection.groupes;
  }

  marquerResultats(resultats) {
    this.resultats = resultats;
    this.dessiner();
  }

  poserSolution() {
    this.selection = poserGroupes(this.selection, this.item.groupes);
    this.resultats = new Map();
    this.annonce.textContent = '';
    this.dessiner();
  }

  desactiver() {
    this.actif = false;
    this.racine.classList.add('fonctions--terminee');
    this.dessiner();
  }

  // ---------- Dessin ----------

  dessiner() {
    this.legende.replaceChildren(...creerLegende(this.item).map((entree) => this.creerBoutonLegende(entree)));
    this.phrase.replaceChildren(...this.item.mots.map((_, indice) => this.creerMot(indice)));
  }

  creerBoutonLegende({ fonction, libelle, sigle }) {
    const bouton = creer('button', `fonctions__fonction fonctions__couleur--${fonction}`);
    bouton.type = 'button';
    bouton.disabled = !this.actif;
    bouton.setAttribute('aria-pressed', String(this.selection.fonction === fonction));
    bouton.append(creer('span', 'fonctions__sigle', sigle), ` ${libelle}`);
    bouton.addEventListener('click', () => {
      this.selection = choisirFonction(this.selection, fonction);
      this.dessiner();
      this.legende.querySelector('[aria-pressed="true"]').focus();
    });
    return bouton;
  }

  creerMot(indice) {
    const groupe = groupeContenant(this.selection.groupes, indice);
    const bouton = creer('button', this.classesDuMot(indice, groupe));
    bouton.type = 'button';
    bouton.dataset.indice = String(indice);
    bouton.disabled = !this.actif;
    bouton.setAttribute('aria-label', this.nomAccessibleDuMot(indice, groupe));
    if (groupe !== undefined && groupe.debut === indice) {
      bouton.append(this.creerSigleDuGroupe(groupe));
    }
    bouton.append(this.item.mots[indice]);
    bouton.addEventListener('click', () => this.toucher(indice));
    bouton.addEventListener('pointerdown', (evenement) => this.debuterGlisser(evenement, indice));
    bouton.addEventListener('pointermove', (evenement) => this.deplacerGlisser(evenement));
    bouton.addEventListener('pointerup', (evenement) => this.terminerGlisser(evenement));
    bouton.addEventListener('pointercancel', () => { this.glisse = null; });
    return bouton;
  }

  classesDuMot(indice, groupe) {
    const classes = ['fonctions__mot'];
    if (groupe !== undefined) {
      classes.push(`fonctions__couleur--${groupe.fonction}`, `fonctions__mot--${this.resultats.get(clefDeGroupe(groupe)) ?? 'pose'}`);
      classes.push(indice === groupe.debut ? 'fonctions__mot--premier' : 'fonctions__mot--suite');
    }
    if (this.selection.debut === indice) {
      classes.push('fonctions__mot--attente');
    }
    return classes.join(' ');
  }

  creerSigleDuGroupe(groupe) {
    const marque = MARQUES[this.resultats.get(clefDeGroupe(groupe))] ?? '';
    const sigle = creer('span', 'fonctions__sigle', `${LIBELLES_FONCTIONS[groupe.fonction].sigle}${marque}`);
    sigle.setAttribute('aria-hidden', 'true');
    return sigle;
  }

  nomAccessibleDuMot(indice, groupe) {
    const mot = this.item.mots[indice];
    if (this.selection.debut === indice) {
      return `${mot}, début du groupe`;
    }
    if (groupe === undefined) {
      return mot;
    }
    const nom = `${mot}, ${LIBELLES_FONCTIONS[groupe.fonction].libelle}`;
    const resultat = this.resultats.get(clefDeGroupe(groupe));
    return resultat === undefined ? nom : `${nom}, ${resultat}`;
  }

  // ---------- Actions de l'élève ----------

  appliquer({ selection, evenement }, indice) {
    this.selection = selection;
    this.resultats = new Map();
    this.dessiner();
    this.annonce.textContent = annoncerPour(this, evenement, indice);
    this.phrase.querySelector(`[data-indice="${indice}"]`)?.focus();
    this.onChange({ aDesGroupes: selection.groupes.length > 0 });
  }

  toucher(indice) {
    if (this.ignorerProchainClic) {
      return;
    }
    this.appliquer(toucherMot(this.selection, indice), indice);
  }

  // ---------- Glisser (souris et doigt) ----------

  debuterGlisser(evenement, indice) {
    if (!this.actif || (evenement.pointerType === 'mouse' && evenement.button !== 0)) {
      return;
    }
    evenement.currentTarget.setPointerCapture(evenement.pointerId);
    this.glisse = { indice, departX: evenement.clientX, departY: evenement.clientY, enCours: false };
  }

  deplacerGlisser(evenement) {
    const { glisse } = this;
    if (glisse !== null && Math.hypot(evenement.clientX - glisse.departX, evenement.clientY - glisse.departY) >= SEUIL_GLISSER_PX) {
      glisse.enCours = true;
    }
  }

  terminerGlisser(evenement) {
    const { glisse } = this;
    this.glisse = null;
    if (glisse === null || !glisse.enCours) {
      return;
    }
    // Le « click » qui suit un glisser ne doit pas compter comme un toucher.
    this.ignorerProchainClic = true;
    setTimeout(() => { this.ignorerProchainClic = false; }, 0);
    const motSousLePointeur = document.elementFromPoint(evenement.clientX, evenement.clientY)?.closest('[data-indice]');
    if (motSousLePointeur !== null && motSousLePointeur !== undefined && this.phrase.contains(motSousLePointeur)) {
      const fin = Number(motSousLePointeur.dataset.indice);
      this.appliquer(selectionnerPlage(this.selection, glisse.indice, fin), fin);
    }
  }
}

/**
 * Crée le widget de sélection des groupes de mots d'un item « fonctions ».
 * @param {Object} options
 * @param {Object} options.item Item de type `fonctions`.
 * @param {function({aDesGroupes: boolean}): void} options.onChange Appelée après chaque action de l'élève.
 * @returns {SelecteurFonctions}
 */
export function creerSelecteurFonctions({ item, onChange }) {
  return new SelecteurFonctions(item, onChange);
}
