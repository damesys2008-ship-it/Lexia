/**
 * Sons de Lexia, synthétisés avec la Web Audio API (aucun fichier audio).
 * Le contexte audio et le stockage des réglages sont injectés : ce module
 * ne référence ni `AudioContext` ni `localStorage`.
 */

/**
 * @typedef {Object} Note
 * @property {number} frequence En hertz.
 * @property {number} debut Décalage de départ, en secondes.
 * @property {number} duree En secondes.
 * @property {'sine'|'triangle'|'square'|'sawtooth'} forme Forme d'onde.
 * @property {number} volume Volume relatif de la note, entre 0 et 1.
 */

/**
 * @typedef {Object} ReglagesSon
 * @property {boolean} sonActif Faux quand le son est coupé.
 * @property {number} volume Entre 0 et 1.
 */

/** Formes d'onde acceptées dans les recettes. */
export const FORMES_ONDE = ['sine', 'triangle', 'square', 'sawtooth'];

/** Niveau sonore minimal d'une enveloppe exponentielle : elle ne peut pas atteindre 0. */
const GAIN_MINIMAL = 0.0001;
const DUREE_ATTAQUE = 0.01;

/**
 * Les recettes : une liste de notes par son. Ce sont des données pures.
 * @type {Object<string, Note[]>}
 */
export const RECETTES = {
  // Deux notes montantes, brillantes (do6 puis mi6).
  juste: [
    { frequence: 1046.5, debut: 0, duree: 0.14, forme: 'sine', volume: 0.5 },
    { frequence: 1318.5, debut: 0.09, duree: 0.22, forme: 'sine', volume: 0.5 },
  ],
  // Une note basse et douce (la3), sans attaque dure.
  faux: [{ frequence: 220, debut: 0, duree: 0.35, forme: 'triangle', volume: 0.4 }],
  // Arpège court do-mi-sol-do, pour trois bonnes réponses d'affilée.
  serie: [
    { frequence: 523.25, debut: 0, duree: 0.12, forme: 'triangle', volume: 0.45 },
    { frequence: 659.25, debut: 0.08, duree: 0.12, forme: 'triangle', volume: 0.45 },
    { frequence: 783.99, debut: 0.16, duree: 0.12, forme: 'triangle', volume: 0.45 },
    { frequence: 1046.5, debut: 0.24, duree: 0.3, forme: 'triangle', volume: 0.45 },
  ],
  // Petit accord de victoire : do majeur joué d'un coup.
  fin: [
    { frequence: 523.25, debut: 0, duree: 0.7, forme: 'triangle', volume: 0.3 },
    { frequence: 659.25, debut: 0, duree: 0.7, forme: 'triangle', volume: 0.3 },
    { frequence: 783.99, debut: 0, duree: 0.7, forme: 'triangle', volume: 0.3 },
    { frequence: 1046.5, debut: 0, duree: 0.7, forme: 'triangle', volume: 0.3 },
  ],
  // Scintillement : cinq notes aiguës très courtes.
  deblocage: [
    { frequence: 1318.5, debut: 0, duree: 0.1, forme: 'sine', volume: 0.35 },
    { frequence: 1568, debut: 0.06, duree: 0.1, forme: 'sine', volume: 0.35 },
    { frequence: 1975.5, debut: 0.12, duree: 0.1, forme: 'sine', volume: 0.35 },
    { frequence: 2093, debut: 0.18, duree: 0.1, forme: 'sine', volume: 0.35 },
    { frequence: 2637, debut: 0.24, duree: 0.25, forme: 'sine', volume: 0.35 },
  ],
};

export const NOMS_SONS = Object.keys(RECETTES);

/**
 * Ramène un volume entre 0 et 1.
 * @param {number} valeur
 * @returns {number}
 * @throws {RangeError} Si la valeur n'est pas un nombre.
 */
function bornerVolume(valeur) {
  if (typeof valeur !== 'number' || Number.isNaN(valeur)) {
    throw new RangeError(`Volume invalide : ${valeur}`);
  }
  return Math.min(1, Math.max(0, valeur));
}

/**
 * Planifie une note : un oscillateur dont le volume monte vite puis décroît.
 * @param {Object} contexte Contexte audio.
 * @param {Note} note
 * @param {number} volumeGeneral Entre 0 et 1.
 */
function planifierNote(contexte, note, volumeGeneral) {
  const depart = contexte.currentTime + note.debut;
  const fin = depart + note.duree;
  const volumeCrete = Math.max(note.volume * volumeGeneral, GAIN_MINIMAL);
  const oscillateur = contexte.createOscillator();
  const gain = contexte.createGain();

  oscillateur.type = note.forme;
  oscillateur.frequency.setValueAtTime(note.frequence, depart);
  gain.gain.setValueAtTime(GAIN_MINIMAL, depart);
  gain.gain.exponentialRampToValueAtTime(volumeCrete, depart + DUREE_ATTAQUE);
  gain.gain.exponentialRampToValueAtTime(GAIN_MINIMAL, fin);
  oscillateur.connect(gain);
  gain.connect(contexte.destination);
  oscillateur.start(depart);
  oscillateur.stop(fin);
}

/**
 * Joue toutes les notes d'une recette, après avoir repris un contexte suspendu
 * (les navigateurs le suspendent tant qu'il n'y a pas eu de geste de l'utilisateur).
 * @param {Object} contexte Contexte audio.
 * @param {Note[]} recette
 * @param {number} volume Entre 0 et 1.
 * @returns {Promise<void>}
 */
async function jouerRecette(contexte, recette, volume) {
  if (contexte.state === 'suspended') {
    await contexte.resume();
  }
  for (const note of recette) {
    planifierNote(contexte, note, volume);
  }
}

/**
 * Crée le lecteur de sons.
 * @param {Object} options
 * @param {function(): Object} options.creerContexte Fabrique le contexte audio (ex. `() => new AudioContext()`).
 * @param {function(): ReglagesSon} options.lireReglages Lit le son et le volume enregistrés.
 * @param {function(Partial<ReglagesSon>): void} options.ecrireReglages Enregistre un changement.
 * @returns {{jouer: function(string): Promise<void>, couper: function(): void, reactiver: function(): void,
 *   definirVolume: function(number): void, estMuet: function(): boolean, volume: function(): number}}
 */
export function creerSons({ creerContexte, lireReglages, ecrireReglages }) {
  let contexte = null;

  // Le contexte est créé au premier son : il est donc lié à un geste de l'utilisateur.
  function obtenirContexte() {
    if (contexte === null) {
      contexte = creerContexte();
    }
    return contexte;
  }

  /**
   * Joue un son. Ne fait rien si le son est coupé ou le volume à 0.
   * @param {string} nom `juste`, `faux`, `serie`, `fin` ou `deblocage`.
   * @returns {Promise<void>}
   * @throws {RangeError} Si le nom est inconnu.
   */
  async function jouer(nom) {
    const recette = RECETTES[nom];
    if (!recette) {
      throw new RangeError(`Son inconnu : ${nom}`);
    }
    const { sonActif, volume: volumeEnregistre } = lireReglages();
    // Le stockage peut contenir un volume hors bornes : on le ramène entre 0 et 1.
    const volumeJoue = bornerVolume(volumeEnregistre);
    if (!sonActif || volumeJoue === 0) {
      return;
    }
    await jouerRecette(obtenirContexte(), recette, volumeJoue);
  }

  return {
    jouer,
    couper: () => ecrireReglages({ sonActif: false }),
    reactiver: () => ecrireReglages({ sonActif: true }),
    /** @param {number} valeur Entre 0 et 1 ; au-delà, ramenée aux bornes. */
    definirVolume: (valeur) => ecrireReglages({ volume: bornerVolume(valeur) }),
    estMuet: () => !lireReglages().sonActif,
    volume: () => lireReglages().volume,
  };
}
