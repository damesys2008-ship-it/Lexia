/**
 * Synthèse vocale en français. L'objet `speechSynthesis`, la fabrique
 * d'énoncés et l'état de la connexion sont injectés : le choix de la voix
 * est une fonction pure, testable sans navigateur.
 */

/**
 * @typedef {{disponible: true, voix: SpeechSynthesisVoice} | {disponible: false, raison: string}} EtatVoix
 * Quand la synthèse n'est pas disponible, `raison` vaut l'une des constantes `RAISON_*`.
 */

export const LANGUE = 'fr-FR';

/** Vitesses de lecture proposées dans les réglages. */
export const VITESSES = { normale: 1, lente: 0.8, rapide: 1.25 };

/** Voix locales de Windows, de la plus à la moins préférée. */
export const VOIX_WINDOWS = ['Hortense', 'Julie', 'Paul'];

/** Fragment du nom des voix de Google (Chrome propose « Google français »), plus naturelles mais en ligne. */
export const FRAGMENT_VOIX_GOOGLE = 'google';

export const PHRASE_TEST = "Bonjour, est-ce que tu m'entends ?";

/** Raisons pour lesquelles la synthèse n'est pas disponible. */
export const RAISON_SYNTHESE_ABSENTE = 'synthese-absente';
export const RAISON_AUCUNE_VOIX_FRANCAISE = 'aucune-voix-francaise';
export const RAISON_RESEAU_HORS_LIGNE = 'voix-reseau-hors-ligne';

/** Délai maximal d'attente de `voiceschanged`, en millisecondes. */
const DELAI_ATTENTE_VOIX_MS = 1500;

/** Erreurs de lecture qui viennent d'un `cancel()` volontaire, pas d'une panne. */
const ERREURS_INTERRUPTION = ['canceled', 'interrupted'];

/** Erreur de lecture vocale ; `raison` dit pourquoi. */
export class ErreurVoix extends Error {
  /**
   * @param {string} message
   * @param {string} raison
   */
  constructor(message, raison) {
    super(message);
    this.raison = raison;
  }
}

function normaliserLangue(voix) {
  return voix.lang.toLowerCase().replace('_', '-');
}

function estFrancaise(voix) {
  const langue = normaliserLangue(voix);
  return langue === 'fr' || langue.startsWith('fr-');
}

function trouverParNom(voix, fragment) {
  const recherche = fragment.toLowerCase();
  return voix.find((candidate) => candidate.name.toLowerCase().includes(recherche));
}

function trouverVoixWindows(voix) {
  for (const nom of VOIX_WINDOWS) {
    const trouvee = trouverParNom(voix, nom);
    if (trouvee) {
      return trouvee;
    }
  }
  return undefined;
}

/**
 * Choisit la meilleure voix française.
 * Ordre : le nom préféré s'il est utilisable, puis, en ligne seulement, la voix
 * française de Google, puis les voix locales (elles marchent hors ligne) :
 * Hortense / Julie / Paul, `fr-FR`, et enfin la première voix française.
 * Hors ligne, les voix réseau (donc celle de Google) sont écartées.
 *
 * @param {SpeechSynthesisVoice[]} voixDisponibles
 * @param {Object} options
 * @param {string} [options.nomPrefere] Nom (ou fragment de nom) choisi dans les réglages.
 * @param {boolean} options.enLigne
 * @returns {SpeechSynthesisVoice|null} `null` s'il n'y a aucune voix utilisable.
 */
export function choisirVoix(voixDisponibles, { nomPrefere = '', enLigne }) {
  const francaises = voixDisponibles.filter(estFrancaise);
  const utilisables = enLigne ? francaises : francaises.filter((voix) => voix.localService);
  const locales = utilisables.filter((voix) => voix.localService);
  const ordre = locales.length > 0 ? locales : utilisables;
  // Une voix préférée l'emporte même si elle passe par le réseau : c'est un choix explicite de l'élève.
  const preferee = nomPrefere === '' ? undefined : trouverParNom(utilisables, nomPrefere);
  const google = enLigne ? trouverParNom(utilisables, FRAGMENT_VOIX_GOOGLE) : undefined;
  const parLangue = ordre.find((voix) => normaliserLangue(voix) === LANGUE.toLowerCase());
  return preferee ?? google ?? trouverVoixWindows(ordre) ?? parLangue ?? ordre[0] ?? null;
}

/**
 * Dit si la synthèse est utilisable, et pourquoi sinon.
 * @param {SpeechSynthesisVoice[]} voixDisponibles
 * @param {Object} options Mêmes options que `choisirVoix`.
 * @returns {EtatVoix}
 */
export function evaluerDisponibilite(voixDisponibles, options) {
  const voix = choisirVoix(voixDisponibles, options);
  if (voix) {
    return { disponible: true, voix };
  }
  const raison = voixDisponibles.some(estFrancaise)
    ? RAISON_RESEAU_HORS_LIGNE
    : RAISON_AUCUNE_VOIX_FRANCAISE;
  return { disponible: false, raison };
}

/**
 * Récupère les voix. Elles arrivent souvent après le premier appel : on attend
 * `voiceschanged`, au plus `delaiMs`, puis on prend ce qui est là.
 * @param {SpeechSynthesis} synthese
 * @param {number} delaiMs
 * @returns {Promise<SpeechSynthesisVoice[]>}
 */
export function attendreVoix(synthese, delaiMs) {
  const voix = synthese.getVoices();
  if (voix.length > 0) {
    return Promise.resolve(voix);
  }
  return new Promise((resoudre) => {
    const delai = setTimeout(() => resoudre(synthese.getVoices()), delaiMs);
    synthese.addEventListener(
      'voiceschanged',
      () => {
        clearTimeout(delai);
        resoudre(synthese.getVoices());
      },
      { once: true },
    );
  });
}

/**
 * Fait lire un énoncé par la synthèse ; la promesse se résout à la fin de la lecture.
 * Une lecture interrompue par `cancel()` se résout aussi, une vraie panne rejette.
 * @param {SpeechSynthesis} synthese
 * @param {SpeechSynthesisUtterance} enonce
 * @returns {Promise<void>}
 * @throws {ErreurVoix} Si la synthèse tombe en panne.
 */
export function lireEnonce(synthese, enonce) {
  return new Promise((resoudre, rejeter) => {
    enonce.onend = () => resoudre();
    enonce.onerror = (evenement) => {
      if (ERREURS_INTERRUPTION.includes(evenement.error)) {
        resoudre();
        return;
      }
      rejeter(new ErreurVoix(`Erreur de lecture : ${evenement.error}`, evenement.error));
    };
    synthese.cancel();
    synthese.speak(enonce);
  });
}

/**
 * Crée le service de voix.
 * @param {Object} options
 * @param {SpeechSynthesis|undefined} options.synthese `window.speechSynthesis`, ou `undefined` s'il n'existe pas.
 * @param {function(string): SpeechSynthesisUtterance} options.creerEnonce Ex. `(texte) => new SpeechSynthesisUtterance(texte)`.
 * @param {function(): boolean} [options.estEnLigne] Par défaut `navigator.onLine`.
 * @param {function(): string} [options.lireNomPrefere] Nom de voix des réglages.
 * @param {number} [options.delaiAttenteVoixMs]
 * @returns {{etat: function(): Promise<EtatVoix>, lire: function(string, {vitesse?: string}=): Promise<void>,
 *   tester: function({vitesse?: string}=): Promise<void>, arreter: function(): void}}
 */
export function creerVoix({
  synthese,
  creerEnonce,
  estEnLigne = () => globalThis.navigator?.onLine ?? true,
  lireNomPrefere = () => '',
  delaiAttenteVoixMs = DELAI_ATTENTE_VOIX_MS,
}) {
  async function etat() {
    if (!synthese) {
      return { disponible: false, raison: RAISON_SYNTHESE_ABSENTE };
    }
    const voix = await attendreVoix(synthese, delaiAttenteVoixMs);
    return evaluerDisponibilite(voix, { nomPrefere: lireNomPrefere(), enLigne: estEnLigne() });
  }

  /**
   * Lit un texte à voix haute ; la promesse se résout à la fin de la lecture.
   * @param {string} texte
   * @param {Object} [options]
   * @param {'lente'|'normale'|'rapide'} [options.vitesse]
   * @returns {Promise<void>}
   * @throws {RangeError} Si la vitesse est inconnue.
   * @throws {ErreurVoix} Si la synthèse n'est pas disponible ou tombe en panne.
   */
  async function lire(texte, { vitesse = 'normale' } = {}) {
    if (!(vitesse in VITESSES)) {
      throw new RangeError(`Vitesse inconnue : ${vitesse}`);
    }
    const disponibilite = await etat();
    if (!disponibilite.disponible) {
      throw new ErreurVoix(`Synthèse vocale indisponible : ${disponibilite.raison}`, disponibilite.raison);
    }
    const enonce = creerEnonce(texte);
    enonce.lang = LANGUE;
    enonce.voice = disponibilite.voix;
    enonce.rate = VITESSES[vitesse];
    return lireEnonce(synthese, enonce);
  }

  return {
    etat,
    lire,
    tester: (options) => lire(PHRASE_TEST, options),
    arreter: () => synthese?.cancel(),
  };
}
