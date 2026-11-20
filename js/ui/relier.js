// Composant « relier » : deux colonnes de cartes, des traits droits en SVG entre les pastilles.
// Il dessine et signale les traits ; il ne sait pas ce qui est juste : la matière valide et appelle
// `marquerResultats`. Réutilisable (conjugaison, vocabulaire).
//
// Trois façons de relier : glisser d'une pastille à l'autre (souris ou doigt), cliquer une pastille
// puis l'autre, ou au clavier Entrée / Espace sur une pastille puis sur une autre.

import { chargerFeuille } from '../coeur/styles.js';
import { ajouterTrait, retirerTraits, supprimerTrait, toutEstRelie } from './relier-logique.js';

const FEUILLE_RELIER = new URL('../../css/composants/relier.css', import.meta.url);
const ESPACE_SVG = 'http://www.w3.org/2000/svg';
const SEUIL_GLISSER_PX = 6;
const SYMBOLES = { juste: '✓', faux: '✗' }; // ✓ ✗
const MOTS_RESULTAT = { juste: ', juste', faux: ', faux' };
const RAYON_MARQUE_PX = 14;
// Chaque paire reliée a un numéro et une couleur (classes `relier__paire-0` à `relier__paire-3`, définies dans relier.css).
const NOMBRE_COULEURS_DE_PAIRE = 4;
const CLASSES_DE_PAIRE = Array.from({ length: NOMBRE_COULEURS_DE_PAIRE }, (_, rang) => `relier__paire-${rang}`);
// Position de la marque le long du trait (0 = pastille de gauche) : évite le milieu, où les traits se croisent.
const POSITION_MARQUE = 0.25;

function creerElement(balise, classe) {
  const element = document.createElement(balise);
  element.className = classe;
  return element;
}

function creerElementSvg(balise, classe) {
  const element = document.createElementNS(ESPACE_SVG, balise);
  element.setAttribute('class', classe);
  return element;
}

/** Pose la couleur de la paire de rang `rang` sur l'élément (`null` : pas de paire, on retire la couleur). */
function poserCouleurDePaire(element, rang) {
  element.classList.remove(...CLASSES_DE_PAIRE);
  if (rang !== null) {
    element.classList.add(CLASSES_DE_PAIRE[rang % NOMBRE_COULEURS_DE_PAIRE]);
  }
}

function cle(cote, id) {
  return `${cote}:${id}`;
}

function verifierElements(elements, nom) {
  if (elements.length === 0) {
    throw new Error(`creerRelier : la colonne « ${nom} » est vide.`);
  }
  const identifiants = new Set(elements.map((element) => element.id));
  if (identifiants.size !== elements.length) {
    throw new Error(`creerRelier : la colonne « ${nom} » contient des id en double.`);
  }
}

class Relier {
  constructor({ gauche, droite, onChange }) {
    verifierElements(gauche, 'gauche');
    verifierElements(droite, 'droite');
    this.gauche = gauche;
    this.droite = droite;
    this.onChange = onChange ?? (() => {});
    this.traits = [];
    this.resultats = new Map();
    this.selection = null;
    this.actif = true;
    this.glisse = null;
    this.ignorerProchainClic = false;
    this.pastilles = new Map();
    this.symboles = new Map();
    this.racine = creerElement('div', 'relier');
    this.svg = creerElementSvg('svg', 'relier__traits');
    this.svg.setAttribute('aria-hidden', 'true');
    this.racine.append(
      this.svg,
      this.construireColonne(this.gauche, 'gauche'),
      this.construireColonne(this.droite, 'droite'),
    );
    this.observateur = new ResizeObserver(() => this.dessiner());
    this.observateur.observe(this.racine);
    this.mettreAJourPastilles();
  }

  construireColonne(elements, cote) {
    const liste = creerElement('ul', `relier__colonne relier__colonne--${cote}`);
    for (const element of elements) {
      const carte = creerElement('li', 'relier__carte');
      const texte = creerElement('span', 'relier__texte');
      texte.textContent = element.texte;
      const pastille = this.creerPastille(cote, element);
      carte.append(texte);
      if (cote === 'gauche') {
        carte.append(this.creerSymboleResultat(element.id));
      }
      carte.append(pastille);
      liste.append(carte);
    }
    return liste;
  }

  // Le symbole ✓ ou ✗ est aussi écrit sur la carte de gauche : il ne dépend pas de la géométrie des traits.
  creerSymboleResultat(gaucheId) {
    const symbole = creerElement('span', 'relier__resultat');
    symbole.setAttribute('aria-hidden', 'true');
    this.symboles.set(gaucheId, symbole);
    return symbole;
  }

  creerPastille(cote, element) {
    const pastille = creerElement('button', 'relier__pastille');
    pastille.type = 'button';
    pastille.dataset.cote = cote;
    pastille.dataset.id = element.id;
    pastille.addEventListener('click', () => this.surClic(cote, element.id));
    pastille.addEventListener('keydown', (evenement) => this.surTouche(evenement, cote, element.id));
    pastille.addEventListener('pointerdown', (evenement) => this.debuterGlisser(evenement, cote, element.id));
    pastille.addEventListener('pointermove', (evenement) => this.deplacerGlisser(evenement));
    pastille.addEventListener('pointerup', (evenement) => this.terminerGlisser(evenement));
    pastille.addEventListener('pointercancel', () => this.annulerGlisser());
    this.pastilles.set(cle(cote, element.id), pastille);
    return pastille;
  }

  // ---------- Lecture de l'état ----------

  texteDe(cote, id) {
    const elements = cote === 'gauche' ? this.gauche : this.droite;
    return elements.find((element) => element.id === id).texte;
  }

  traitDe(cote, id) {
    const champ = cote === 'gauche' ? 'gaucheId' : 'droiteId';
    return this.traits.find((trait) => trait[champ] === id) ?? null;
  }

  estVerrouille(cote, id) {
    const trait = this.traitDe(cote, id);
    return trait !== null && this.resultats.has(trait.gaucheId);
  }

  lireTraits() {
    return this.traits.map((trait) => ({ ...trait }));
  }

  // ---------- Actions de l'élève ----------

  surClic(cote, id) {
    if (this.ignorerProchainClic) {
      this.ignorerProchainClic = false;
      return;
    }
    if (!this.actif || this.estVerrouille(cote, id)) {
      return;
    }
    const { selection } = this;
    if (selection === null || selection.cote === cote) {
      const memePastille = selection !== null && selection.id === id;
      this.selection = memePastille ? null : { cote, id };
      this.mettreAJourPastilles();
      return;
    }
    this.selection = null;
    this.relier(selection, { cote, id });
  }

  surTouche(evenement, cote, id) {
    const estSuppression = evenement.key === 'Delete' || evenement.key === 'Backspace';
    const trait = this.traitDe(cote, id);
    if (!estSuppression || !this.actif || trait === null || this.estVerrouille(cote, id)) {
      return;
    }
    evenement.preventDefault();
    this.supprimer(trait.gaucheId);
  }

  relier(depart, arrivee) {
    const [pastilleGauche, pastilleDroite] = depart.cote === 'gauche' ? [depart, arrivee] : [arrivee, depart];
    if (this.estVerrouille('droite', pastilleDroite.id) || this.estVerrouille('gauche', pastilleGauche.id)) {
      return;
    }
    this.traits = ajouterTrait(this.traits, pastilleGauche.id, pastilleDroite.id);
    this.apresChangement();
  }

  supprimer(gaucheId) {
    this.traits = supprimerTrait(this.traits, gaucheId);
    this.apresChangement();
  }

  apresChangement() {
    this.selection = null;
    this.mettreAJourPastilles();
    this.dessiner();
    this.onChange({ traits: this.lireTraits(), tousRelies: toutEstRelie(this.traits, this.gauche) });
  }

  // ---------- Glisser (souris et doigt) ----------

  debuterGlisser(evenement, cote, id) {
    if (!this.actif || this.estVerrouille(cote, id)) {
      return;
    }
    evenement.currentTarget.setPointerCapture(evenement.pointerId);
    this.glisse = { cote, id, departX: evenement.clientX, departY: evenement.clientY, ligne: null };
  }

  deplacerGlisser(evenement) {
    const { glisse } = this;
    if (glisse === null) {
      return;
    }
    const distance = Math.hypot(evenement.clientX - glisse.departX, evenement.clientY - glisse.departY);
    if (glisse.ligne === null && distance < SEUIL_GLISSER_PX) {
      return;
    }
    if (glisse.ligne === null) {
      glisse.ligne = creerElementSvg('line', 'relier__trait-provisoire');
      this.svg.append(glisse.ligne);
    }
    const origine = this.centrePastille(glisse.cote, glisse.id);
    const fenetre = this.racine.getBoundingClientRect();
    this.placerLigne(glisse.ligne, origine, { x: evenement.clientX - fenetre.left, y: evenement.clientY - fenetre.top });
  }

  terminerGlisser(evenement) {
    const { glisse } = this;
    if (glisse === null) {
      return;
    }
    this.glisse = null;
    if (glisse.ligne === null) {
      return;
    }
    glisse.ligne.remove();
    // Le « click » qui suit un glisser ne doit pas compter comme une sélection.
    this.ignorerProchainClic = true;
    setTimeout(() => { this.ignorerProchainClic = false; }, 0);
    const cible = document.elementFromPoint(evenement.clientX, evenement.clientY)?.closest('.relier__pastille');
    if (cible && cible.dataset.cote !== glisse.cote && this.actif) {
      this.relier(glisse, { cote: cible.dataset.cote, id: cible.dataset.id });
    }
  }

  annulerGlisser() {
    this.glisse?.ligne?.remove();
    this.glisse = null;
  }

  // ---------- Affichage ----------

  centrePastille(cote, id) {
    const boite = this.pastilles.get(cle(cote, id)).getBoundingClientRect();
    const fenetre = this.racine.getBoundingClientRect();
    return { x: boite.left + boite.width / 2 - fenetre.left, y: boite.top + boite.height / 2 - fenetre.top };
  }

  placerLigne(ligne, debut, fin) {
    ligne.setAttribute('x1', debut.x);
    ligne.setAttribute('y1', debut.y);
    ligne.setAttribute('x2', fin.x);
    ligne.setAttribute('y2', fin.y);
  }

  dessiner() {
    this.svg.replaceChildren(...this.traits.map((trait) => this.creerTrait(trait)));
  }

  creerTrait(trait) {
    const debut = this.centrePastille('gauche', trait.gaucheId);
    const fin = this.centrePastille('droite', trait.droiteId);
    const etat = this.resultats.get(trait.gaucheId) ?? 'neutre';
    const groupe = creerElementSvg('g', `relier__trait relier__trait--${etat}`);
    poserCouleurDePaire(groupe, this.traits.indexOf(trait));
    const visible = creerElementSvg('line', 'relier__ligne');
    const zone = creerElementSvg('line', 'relier__zone-clic');
    this.placerLigne(visible, debut, fin);
    this.placerLigne(zone, debut, fin);
    groupe.append(visible, zone);
    if (etat !== 'neutre') {
      groupe.append(this.creerMarque(debut, fin, etat));
    } else {
      groupe.addEventListener('click', () => this.actif && this.supprimer(trait.gaucheId));
    }
    return groupe;
  }

  creerMarque(debut, fin, etat) {
    const marque = creerElementSvg('g', 'relier__marque');
    const rond = creerElementSvg('circle', 'relier__marque-rond');
    const symbole = creerElementSvg('text', 'relier__marque-symbole');
    const milieu = {
      x: debut.x + (fin.x - debut.x) * POSITION_MARQUE,
      y: debut.y + (fin.y - debut.y) * POSITION_MARQUE,
    };
    rond.setAttribute('cx', milieu.x);
    rond.setAttribute('cy', milieu.y);
    rond.setAttribute('r', RAYON_MARQUE_PX);
    symbole.setAttribute('x', milieu.x);
    symbole.setAttribute('y', milieu.y);
    symbole.textContent = SYMBOLES[etat];
    marque.append(rond, symbole);
    return marque;
  }

  mettreAJourPastilles() {
    for (const [, pastille] of this.pastilles) {
      const { cote, id } = pastille.dataset;
      const trait = this.traitDe(cote, id);
      const choisie = this.selection !== null && this.selection.cote === cote && this.selection.id === id;
      const rang = trait === null ? null : this.traits.indexOf(trait);
      pastille.classList.toggle('relier__pastille--reliee', trait !== null);
      pastille.textContent = rang === null ? '' : String(rang + 1);
      poserCouleurDePaire(pastille, rang);
      poserCouleurDePaire(pastille.closest('.relier__carte'), rang);
      pastille.classList.toggle('relier__pastille--selectionnee', choisie);
      pastille.classList.toggle('relier__pastille--verrouillee', this.estVerrouille(cote, id));
      pastille.setAttribute('aria-pressed', String(choisie));
      pastille.setAttribute('aria-label', this.libellePastille(cote, id, trait));
      pastille.disabled = !this.actif;
    }
  }

  libellePastille(cote, id, trait) {
    let libelle = `Relier « ${this.texteDe(cote, id)} »`;
    if (trait !== null) {
      const autreCote = cote === 'gauche' ? 'droite' : 'gauche';
      const autreId = cote === 'gauche' ? trait.droiteId : trait.gaucheId;
      libelle += `, relié à « ${this.texteDe(autreCote, autreId)} »`;
      libelle += MOTS_RESULTAT[this.resultats.get(trait.gaucheId)] ?? '';
    }
    return libelle;
  }

  // ---------- Interface publique ----------

  /**
   * Colore les traits : vert avec ✓ pour « juste », rouge avec ✗ pour « faux ».
   * Les traits marqués sont figés jusqu'à `reinitialiserFaux`.
   * @param {Record<string, 'juste'|'faux'>} resultats Résultat de chaque élément de gauche (par son id).
   */
  marquerResultats(resultats) {
    for (const [gaucheId, etat] of Object.entries(resultats)) {
      this.resultats.set(gaucheId, etat);
    }
    this.mettreAJourPastilles();
    this.dessiner();
    this.mettreAJourSymboles();
  }

  /** Retire les traits faux pour les retenter ; les traits justes restent en place, figés. */
  reinitialiserFaux() {
    const faux = [...this.resultats].filter(([, etat]) => etat === 'faux').map(([gaucheId]) => gaucheId);
    faux.forEach((gaucheId) => this.resultats.delete(gaucheId));
    this.traits = retirerTraits(this.traits, faux);
    this.apresChangement();
    this.mettreAJourSymboles();
  }

  mettreAJourSymboles() {
    for (const [gaucheId, symbole] of this.symboles) {
      const etat = this.resultats.get(gaucheId);
      symbole.textContent = etat ? SYMBOLES[etat] : '';
      symbole.className = `relier__resultat${etat ? ` relier__resultat--${etat}` : ''}`;
    }
  }

  /** Libère l'observateur de taille et retire le composant de la page (à appeler quand l'exercice change). */
  detruire() {
    this.observateur.disconnect();
    this.racine.remove();
  }

  activer() {
    this.actif = true;
    this.racine.classList.remove('est-desactive');
    this.mettreAJourPastilles();
  }

  desactiver() {
    this.actif = false;
    this.selection = null;
    this.racine.classList.add('est-desactive');
    this.mettreAJourPastilles();
  }
}

/**
 * Crée un composant « relier ».
 * Les colonnes sont affichées dans l'ordre reçu : les mélanger avant avec `melangerSansAlignement`.
 * @param {{ gauche: { id: string, texte: string }[], droite: { id: string, texte: string }[],
 *   onChange?: (etat: { traits: { gaucheId: string, droiteId: string }[], tousRelies: boolean }) => void }} options
 * @returns {Promise<Relier>} L'objet expose `racine` (à insérer dans la page), `lireTraits`, `marquerResultats`,
 *   `reinitialiserFaux`, `activer`, `desactiver` et `detruire` (à appeler quand l'exercice est remplacé).
 */
export async function creerRelier(options) {
  await chargerFeuille(FEUILLE_RELIER);
  return new Relier(options);
}
