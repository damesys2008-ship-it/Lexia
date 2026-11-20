// Composant « déposer » : des étiquettes à ranger dans des zones (boîtes de tri, ou phrase à reconstruire).
// Il affiche et signale les placements ; il ne sait pas ce qui est juste : la matière valide et appelle
// `marquerResultats`. Réutilisable (tri des mots, phrases en étiquettes).
//
// Trois façons de ranger, sans glisser-déposer HTML5 (inopérant au doigt) :
// glisser l'étiquette (souris ou doigt, Pointer Events), la toucher puis toucher la zone,
// ou au clavier Entrée / Espace sur l'étiquette puis sur la zone. Une étiquette placée se reprend
// de la même façon, et se remet dans la réserve en touchant la réserve.

import { chargerFeuille } from '../coeur/styles.js';
import {
  creerEtat, lirePlacementsDe, placer, placerAvant, positionDInsertion, retirer, toutEstPlace, zoneDe,
} from './deposer-logique.js';

const FEUILLE_DEPOSER = new URL('../../css/composants/deposer.css', import.meta.url);
const SEUIL_GLISSER_PX = 6;
const ZONE_RESERVE = '';
const SYMBOLES = { juste: '✓', faux: '✗' }; // ✓ ✗
const MOTS_RESULTAT = { juste: ', juste', faux: ', faux' };
const TITRE_RESERVE_PAR_DEFAUT = 'Étiquettes à placer';

function creerElement(balise, classe, texte = '') {
  const element = document.createElement(balise);
  element.className = classe;
  element.textContent = texte;
  return element;
}

function verifierOptions({ etiquettes, zones }) {
  if (etiquettes.length === 0 || zones.length === 0) {
    throw new Error('creerDeposer : il faut au moins une étiquette et une zone.');
  }
  const identifiants = [...etiquettes.map((etiquette) => etiquette.id), ...zones.map((zone) => zone.id)];
  if (new Set(identifiants).size !== identifiants.length || identifiants.includes(ZONE_RESERVE)) {
    throw new Error('creerDeposer : les id des étiquettes et des zones doivent être uniques et non vides.');
  }
}

class Deposer {
  constructor({ etiquettes, zones, onChange, titreReserve = TITRE_RESERVE_PAR_DEFAUT }) {
    verifierOptions({ etiquettes, zones });
    this.etiquettes = etiquettes;
    this.zones = zones;
    this.onChange = onChange ?? (() => {});
    this.etat = creerEtat(zones);
    this.resultats = new Map();
    this.selection = null;
    this.actif = true;
    this.glisse = null;
    this.zoneSurvolee = null;
    this.ignorerProchainClic = false;
    this.elements = new Map(etiquettes.map((etiquette) => [etiquette.id, this.creerEtiquette(etiquette)]));
    this.listes = new Map();
    this.annonce = creerElement('p', 'sr-seulement');
    this.annonce.setAttribute('aria-live', 'polite');
    this.racine = creerElement('div', 'deposer');
    this.racine.append(
      this.annonce,
      this.creerZone({ id: ZONE_RESERVE, titre: titreReserve }, 'deposer__zone--reserve', 'Remettre dans la réserve'),
      this.creerZones(),
    );
    this.afficher();
  }

  // ---------- Construction ----------

  creerEtiquette(etiquette) {
    const bouton = creerElement('button', 'deposer__etiquette');
    bouton.type = 'button';
    bouton.dataset.id = etiquette.id;
    const symbole = creerElement('span', 'deposer__symbole');
    symbole.setAttribute('aria-hidden', 'true');
    bouton.append(creerElement('span', 'deposer__texte', etiquette.texte), symbole);
    bouton.addEventListener('click', () => this.surClicEtiquette(etiquette.id));
    bouton.addEventListener('pointerdown', (evenement) => this.debuterGlisser(evenement, etiquette.id));
    bouton.addEventListener('pointermove', (evenement) => this.deplacerGlisser(evenement));
    bouton.addEventListener('pointerup', (evenement) => this.terminerGlisser(evenement));
    bouton.addEventListener('pointercancel', () => this.annulerGlisser());
    return bouton;
  }

  creerZones() {
    const conteneur = creerElement('div', 'deposer__zones');
    for (const zone of this.zones) {
      const classe = zone.ordonnee ? 'deposer__zone--ordonnee' : '';
      conteneur.append(this.creerZone(zone, classe, `Déposer dans « ${zone.titre} »`));
    }
    return conteneur;
  }

  creerZone(zone, classe, libelleCible) {
    const section = creerElement('section', `deposer__zone ${classe}`);
    section.dataset.zone = zone.id;
    const cible = creerElement('button', 'deposer__cible', zone.titre);
    cible.type = 'button';
    cible.setAttribute('aria-label', libelleCible);
    cible.addEventListener('click', () => this.surClicZone(zone.id));
    const liste = creerElement('div', 'deposer__liste');
    this.listes.set(zone.id, liste);
    section.append(cible, liste);
    return section;
  }

  // ---------- Lecture de l'état ----------

  etiquette(id) {
    return this.etiquettes.find((etiquette) => etiquette.id === id);
  }

  titreDe(zoneId) {
    return this.zones.find((zone) => zone.id === zoneId)?.titre;
  }

  estVerrouillee(id) {
    return this.resultats.has(id);
  }

  idsDeLaZone(zoneId) {
    if (zoneId === ZONE_RESERVE) {
      return this.etiquettes.filter((etiquette) => zoneDe(this.etat, etiquette.id) === null).map((etiquette) => etiquette.id);
    }
    return this.etat.contenus.get(zoneId);
  }

  // ---------- Actions de l'élève ----------

  surClicEtiquette(id) {
    if (this.ignorerProchainClic) {
      this.ignorerProchainClic = false;
      return;
    }
    if (!this.actif || this.estVerrouillee(id)) {
      return;
    }
    if (this.selection === null || this.selection === id) {
      this.selection = this.selection === id ? null : id;
      this.afficher();
      return;
    }
    this.deposerSurEtiquette(this.selection, id);
  }

  // Une étiquette choisie, puis une autre touchée : on la dépose dans la zone de l'autre, juste avant elle.
  deposerSurEtiquette(id, cibleId) {
    const zoneId = zoneDe(this.etat, cibleId);
    if (zoneId === null) {
      this.deposer(id, ZONE_RESERVE);
      return;
    }
    this.deposer(id, zoneId, placerAvant(this.etat, id, cibleId));
  }

  surClicZone(zoneId) {
    if (!this.actif || this.selection === null) {
      return;
    }
    this.deposer(this.selection, zoneId);
  }

  /** Range l'étiquette dans la zone (la réserve si `zoneId` est vide), à la fin ou à la position donnée. */
  deposer(id, zoneId, etatSuivant = this.etatPour(id, zoneId)) {
    this.selection = null;
    if (etatSuivant === this.etat) {
      this.annoncer(this.messageRefus(zoneId));
      this.afficher();
      return;
    }
    this.etat = etatSuivant;
    this.afficher();
    this.annoncer(this.messageDepot(id, zoneId));
    this.onChange({ placements: this.lirePlacements(), tousPlaces: toutEstPlace(this.etat, this.etiquettes) });
  }

  etatPour(id, zoneId, position) {
    return zoneId === ZONE_RESERVE ? retirer(this.etat, id) : placer(this.etat, id, zoneId, position);
  }

  messageDepot(id, zoneId) {
    const { texte } = this.etiquette(id);
    return zoneId === ZONE_RESERVE ? `« ${texte} » remis dans la réserve.` : `« ${texte} » placé dans « ${this.titreDe(zoneId)} ».`;
  }

  messageRefus(zoneId) {
    return zoneId === ZONE_RESERVE ? '' : `« ${this.titreDe(zoneId)} » est pleine.`;
  }

  annoncer(message) {
    this.annonce.textContent = message;
  }

  // ---------- Glisser (souris et doigt) ----------

  debuterGlisser(evenement, id) {
    if (!this.actif || this.estVerrouillee(id) || (evenement.pointerType === 'mouse' && evenement.button !== 0)) {
      return;
    }
    evenement.currentTarget.setPointerCapture(evenement.pointerId);
    this.glisse = { id, departX: evenement.clientX, departY: evenement.clientY, enCours: false };
  }

  deplacerGlisser(evenement) {
    const { glisse } = this;
    if (glisse === null) {
      return;
    }
    const dx = evenement.clientX - glisse.departX;
    const dy = evenement.clientY - glisse.departY;
    if (!glisse.enCours && Math.hypot(dx, dy) < SEUIL_GLISSER_PX) {
      return;
    }
    glisse.enCours = true;
    const element = this.elements.get(glisse.id);
    element.classList.add('deposer__etiquette--en-deplacement');
    element.style.setProperty('--decalage-x', `${dx}px`);
    element.style.setProperty('--decalage-y', `${dy}px`);
    this.survoler(this.zoneSousLePointeur(evenement));
  }

  terminerGlisser(evenement) {
    const { glisse } = this;
    if (glisse === null) {
      return;
    }
    const zone = glisse.enCours ? this.zoneSousLePointeur(evenement) : null;
    this.annulerGlisser();
    if (!glisse.enCours) {
      return;
    }
    // Le « click » qui suit un glisser ne doit pas compter comme une sélection.
    this.ignorerProchainClic = true;
    setTimeout(() => { this.ignorerProchainClic = false; }, 0);
    if (zone !== null) {
      this.deposerAuPointeur(glisse.id, zone, evenement);
    }
  }

  annulerGlisser() {
    const { glisse } = this;
    this.glisse = null;
    if (glisse === null) {
      return;
    }
    const element = this.elements.get(glisse.id);
    element.classList.remove('deposer__etiquette--en-deplacement');
    element.style.removeProperty('--decalage-x');
    element.style.removeProperty('--decalage-y');
    this.survoler(null);
  }

  // Cherche sous le pointeur la zone du composant, en ignorant l'étiquette qu'on est en train de glisser.
  zoneSousLePointeur(evenement) {
    const glissee = this.elements.get(this.glisse.id);
    const sous = document.elementsFromPoint(evenement.clientX, evenement.clientY).find((element) => !glissee.contains(element));
    const zone = sous?.closest('.deposer__zone') ?? null;
    return zone !== null && this.racine.contains(zone) ? zone : null;
  }

  survoler(zone) {
    if (zone === this.zoneSurvolee) {
      return;
    }
    this.zoneSurvolee?.classList.remove('deposer__zone--survolee');
    zone?.classList.add('deposer__zone--survolee');
    this.zoneSurvolee = zone;
  }

  deposerAuPointeur(id, zone, evenement) {
    const zoneId = zone.dataset.zone;
    const position = this.positionDansLaZone(id, zone, evenement);
    this.deposer(id, zoneId, this.etatPour(id, zoneId, position));
  }

  // Dans une zone ordonnée, la position vient de l'endroit où on lâche ; ailleurs, l'étiquette va à la fin.
  positionDansLaZone(id, zone, evenement) {
    if (!zone.classList.contains('deposer__zone--ordonnee')) {
      return undefined;
    }
    const autres = this.idsDeLaZone(zone.dataset.zone).filter((autreId) => autreId !== id);
    const boites = autres.map((autreId) => this.elements.get(autreId).getBoundingClientRect());
    return positionDInsertion(boites, { x: evenement.clientX, y: evenement.clientY });
  }

  // ---------- Affichage ----------

  afficher() {
    const focus = this.racine.contains(document.activeElement) ? document.activeElement : null;
    for (const [zoneId, liste] of this.listes) {
      liste.replaceChildren(...this.idsDeLaZone(zoneId).map((id) => this.elements.get(id)));
      liste.parentElement.classList.toggle('deposer__zone--vide', liste.children.length === 0);
    }
    this.racine.querySelectorAll('.deposer__cible').forEach((cible) => { cible.disabled = !this.actif; });
    this.etiquettes.forEach((etiquette) => this.mettreAJourEtiquette(etiquette));
    // Déplacer un nœud lui fait perdre le focus : on le rend, pour que le clavier ne soit pas renvoyé en haut de page.
    if (focus !== null && document.activeElement !== focus && !focus.disabled) {
      focus.focus();
    }
  }

  mettreAJourEtiquette({ id, texte }) {
    const element = this.elements.get(id);
    const resultat = this.resultats.get(id);
    const choisie = this.selection === id;
    element.classList.toggle('deposer__etiquette--choisie', choisie);
    element.classList.toggle('deposer__etiquette--juste', resultat === 'juste');
    element.classList.toggle('deposer__etiquette--faux', resultat === 'faux');
    element.setAttribute('aria-pressed', String(choisie));
    element.setAttribute('aria-label', this.libelleEtiquette(id, texte));
    element.disabled = !this.actif;
    element.lastChild.textContent = resultat ? SYMBOLES[resultat] : '';
  }

  libelleEtiquette(id, texte) {
    const zoneId = zoneDe(this.etat, id);
    const lieu = zoneId === null ? ', dans la réserve' : `, dans « ${this.titreDe(zoneId)} »`;
    return `« ${texte} »${lieu}${MOTS_RESULTAT[this.resultats.get(id)] ?? ''}`;
  }

  // ---------- Interface publique ----------

  /** Copie des placements : pour chaque zone, les id des étiquettes dans l'ordre. */
  lirePlacements() {
    return lirePlacementsDe(this.etat);
  }

  /**
   * Marque des étiquettes : ✓ pour « juste », ✗ pour « faux » (en plus de la couleur).
   * Les étiquettes marquées sont figées jusqu'à `reinitialiserFaux`.
   * @param {Map<string, 'juste'|'faux'>} resultats Résultat de chaque étiquette (par son id).
   */
  marquerResultats(resultats) {
    resultats.forEach((resultat, id) => this.resultats.set(id, resultat));
    this.selection = null;
    this.afficher();
  }

  /** Remet les étiquettes fausses dans la réserve pour les retenter ; les justes restent en place, figées. */
  reinitialiserFaux() {
    const faux = [...this.resultats].filter(([, resultat]) => resultat === 'faux').map(([id]) => id);
    faux.forEach((id) => {
      this.resultats.delete(id);
      this.etat = retirer(this.etat, id);
    });
    this.selection = null;
    this.afficher();
    this.onChange({ placements: this.lirePlacements(), tousPlaces: toutEstPlace(this.etat, this.etiquettes) });
  }

  activer() {
    this.actif = true;
    this.racine.classList.remove('est-desactive');
    this.afficher();
  }

  desactiver() {
    this.actif = false;
    this.selection = null;
    this.racine.classList.add('est-desactive');
    this.afficher();
  }

  /** Retire le composant de la page (à appeler quand l'exercice est remplacé). */
  detruire() {
    this.annulerGlisser();
    this.racine.remove();
  }
}

/**
 * Crée un composant « déposer ».
 * Les étiquettes partent dans la réserve, dans l'ordre reçu : les mélanger avant (`melanger`).
 * @param {{ etiquettes: { id: string, texte: string }[],
 *   zones: { id: string, titre: string, ordonnee?: boolean, capacite?: number }[],
 *   titreReserve?: string,
 *   onChange?: (etat: { placements: Record<string, string[]>, tousPlaces: boolean }) => void }} options
 * @returns {Promise<Deposer>} L'objet expose `racine` (à insérer dans la page), `lirePlacements`, `marquerResultats`,
 *   `reinitialiserFaux`, `activer`, `desactiver` et `detruire`.
 */
export async function creerDeposer(options) {
  await chargerFeuille(FEUILLE_DEPOSER);
  return new Deposer(options);
}
