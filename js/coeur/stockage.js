/**
 * Stockage local de Lexia : une seule clé versionnée, une table de migrations,
 * et un repli « session seulement » si le support échoue.
 *
 * Le support (localStorage ou un faux support en mémoire) est injecté :
 * `localStorage` n'apparaît que comme valeur par défaut de ce paramètre.
 */

import { ETOILES_PAR_ANCIENNE_ETOILE, NIVEAU_MAX, NIVEAU_MIN, SEANCES_APRES_REFUS } from './progression.js';
import { NOMBRE_EXERCICES_DEFI } from './familles.js';
import { BOITE_A_CONFIRMER, INTERVALLES_JOURS } from './repetition.js';
import { ACCESSOIRES, NOUVEAUX_IDENTIFIANTS } from './catalogue-garde-robe.js';
import { migrerCle } from './migration-cles.js';

export const CLE_STOCKAGE = 'lexia:v1';
/** Nom de la clé quand le site s'appelait Plume : copiée vers `CLE_STOCKAGE` au premier chargement. */
export const ANCIENNE_CLE_STOCKAGE = 'plume:v1';
export const VERSION_SCHEMA = 2;

/** Pourquoi une famille est dans le défi : un item à revoir, ou un module à travailler. */
export const ORIGINES_DEFI = ['revision', 'faible'];

/**
 * @typedef {Object} Profil
 * @property {string} prenom Prénom de l'élève (saisi par elle, jamais écrit dans le code).
 * @property {string} nomMascotte Nom donné à la mascotte.
 */

/**
 * @typedef {Object} Reglages
 * @property {boolean} sonActif
 * @property {number} volume Entre 0 et 1.
 * @property {string} voix Nom de la voix choisie, '' pour le choix automatique.
 * @property {'lente'|'normale'|'rapide'} vitesseVoix
 * @property {boolean} texteGrand
 * @property {boolean} animationsReduites
 * @property {boolean} lettresFaciles Lettres et mots plus espacés (réglage ajouté en même temps que la vitesse « rapide »).
 */

/**
 * @typedef {Object} Accessoires
 * @property {string[]} possedes Identifiants des accessoires achetés.
 * @property {Object<string, string>} equipes Identifiant porté par emplacement (un seul par emplacement).
 */

/**
 * @typedef {Object} ResumeSeance
 * @property {string} module Ex. « dictee », « conjugaison ».
 * @property {string} mode Ex. « audio », « detective ».
 * @property {string} itemId Identifiant de l'item de contenu.
 * @property {number} reussis
 * @property {number} total
 * @property {string[]} competencesRatees
 * @property {number} [niveau] Niveau (1 à 3) auquel la séance a été jouée (absent des anciennes séances).
 * @property {string} date Jour de la séance, au format AAAA-MM-JJ.
 */

/**
 * @typedef {Object} BoiteRepetition
 * @property {number} boite De 0 (à confirmer) à 5.
 * @property {string} dernierJour Dernier jour de révision, AAAA-MM-JJ.
 * @property {boolean} acquis Vrai quand l'item est acquis (réussi en boîte 5, ou confirmé depuis la boîte 0).
 */

/**
 * @typedef {Object} DonneesLexia
 * @property {number} version Version du schéma.
 * @property {Profil} profil
 * @property {Reglages} reglages
 * @property {Object<string, number>} niveaux Niveau (1 à 3) par module.
 * @property {number} etoiles Total d'étoiles gagnées, qui ne diminue jamais.
 * @property {number} etoilesDepensees Étoiles dépensées en achats : le solde est `etoiles - etoilesDepensees`.
 * @property {Accessoires} accessoires
 * @property {ResumeSeance[]} historique Séances dans l'ordre chronologique (la plus récente en dernier).
 * @property {Object<string, BoiteRepetition>} repetition Boîtes de Leitner par id d'item.
 * @property {{competencesRatees: Object<string, number>}} carnet Nombre d'échecs par compétence.
 * @property {Meta} meta
 */

/**
 * @typedef {Object} ExerciceDuDefi
 * @property {string} famille Clé de la famille (chemin de route, ex. `orthographe/homophones`).
 * @property {'revision'|'faible'} origine
 */

/**
 * @typedef {Object} DefiDuJour
 * @property {string} jour Jour du défi, AAAA-MM-JJ.
 * @property {number} faits Exercices terminés (0 à 5).
 * @property {ExerciceDuDefi[]} plan Les exercices du défi (5 au plus).
 */

/**
 * @typedef {Object} Meta
 * @property {string[]} joursEntrainement
 * @property {string|null} derniereSeance
 * @property {Object<string, number>} refus Par module : séances à jouer (0 à 3) avant de reproposer un niveau.
 * @property {DefiDuJour|null} defi Défi du jour en cours ou terminé, `null` avant le premier défi.
 * @property {Object<string, string>} badges Badges gagnés : identifiant du badge -> jour d'attribution (AAAA-MM-JJ).
 * @property {TestDepart|null} testDepart Test de départ « La grande aventure », `null` avant son début.
 */

/**
 * @typedef {Object} TestDepart
 * @property {string} jour Jour de la dernière réponse, AAAA-MM-JJ.
 * @property {Object<string, boolean>} reponses Par identifiant d'item du test : réussi (`true`) ou raté (`false`).
 * @property {boolean} termine Vrai quand les niveaux de départ ont été appliqués.
 */

/** Erreur levée quand les données stockées ne peuvent pas être lues. */
export class ErreurStockage extends Error {}

/**
 * Données d'un nouvel utilisateur.
 * @returns {DonneesLexia}
 */
export function creerDonneesParDefaut() {
  return {
    version: VERSION_SCHEMA,
    profil: { prenom: '', nomMascotte: '' },
    reglages: {
      sonActif: true,
      volume: 0.7,
      voix: '',
      vitesseVoix: 'normale',
      texteGrand: false,
      animationsReduites: false,
      lettresFaciles: false,
    },
    niveaux: {},
    etoiles: 0,
    etoilesDepensees: 0,
    accessoires: { possedes: [], equipes: {} },
    historique: [],
    repetition: {},
    carnet: { competencesRatees: {} },
    meta: { joursEntrainement: [], derniereSeance: null, refus: {}, defi: null, badges: {}, testDepart: null },
  };
}

/**
 * Migrations : la clé est la version de départ, la fonction renvoie les
 * données à la version suivante. Les données sans `version` sont en version 0.
 */
const MIGRATIONS = {
  // Version 0 → 1 : le champ `version` est ajouté, le reste est complété par les valeurs par défaut.
  0: (donnees) => ({ ...donnees }),
  // Version 1 → 2 : garde-robe à l'achat. Les étoiles gagnées passent à la nouvelle échelle (même valeur),
  // rien n'est dépensé.
  1: (donnees) => ({
    ...donnees,
    ...convertirEtoilesV1(donnees),
    etoilesDepensees: 0,
    accessoires: convertirAccessoiresV1(donnees.accessoires),
  }),
};

/**
 * @param {*} valeur
 * @returns {boolean} Vrai pour un objet simple (ni null, ni liste).
 */
export function estObjetSimple(valeur) {
  return valeur !== null && typeof valeur === 'object' && !Array.isArray(valeur);
}

/** L'accessoire du nouveau catalogue qui remplace un ancien, ou `undefined` s'il n'a pas d'équivalent. */
function trouverEquivalent(ancienId) {
  const id = Object.hasOwn(NOUVEAUX_IDENTIFIANTS, ancienId) ? NOUVEAUX_IDENTIFIANTS[ancienId] : ancienId;
  return ACCESSOIRES.find((accessoire) => accessoire.id === id);
}

/**
 * Les étoiles gagnées, de l'ancienne échelle à la nouvelle : `{ etoiles }` à fusionner dans les données.
 * Sans étoiles (sauvegarde très ancienne) ou avec une valeur inattendue, rien n'est changé :
 * les valeurs par défaut et `verifierForme` s'en occupent.
 */
function convertirEtoilesV1({ etoiles }) {
  return Number.isInteger(etoiles) ? { etoiles: etoiles * ETOILES_PAR_ANCIENNE_ETOILE } : {};
}

/**
 * Convertit les accessoires de l'ancienne garde-robe : ceux qui ont un équivalent sont offerts
 * (possédés sans dépenser d'étoiles), ceux qui étaient portés le restent, les autres sont retirés.
 * Une forme inattendue est laissée telle quelle : `verifierForme` la refusera.
 */
function convertirAccessoiresV1(accessoires) {
  if (!estObjetSimple(accessoires) || !Array.isArray(accessoires.possedes) || !estObjetSimple(accessoires.equipes)) {
    return accessoires;
  }
  const portes = Object.values(accessoires.equipes).map(trouverEquivalent).filter(Boolean);
  const offerts = [...accessoires.possedes, ...Object.values(accessoires.equipes)].map(trouverEquivalent).filter(Boolean);
  return {
    ...accessoires,
    possedes: [...new Set(offerts.map((accessoire) => accessoire.id))],
    equipes: Object.fromEntries(portes.map((accessoire) => [accessoire.emplacement, accessoire.id])),
  };
}

/**
 * Complète une section avec ses valeurs par défaut. Une valeur d'un autre type
 * est gardée telle quelle : `verifierForme` la refusera.
 */
function completerSection(defaut, valeur) {
  if (valeur === undefined || estObjetSimple(valeur)) {
    return { ...defaut, ...valeur };
  }
  return valeur;
}

/** Complète des données partielles avec les valeurs par défaut (une section à la fois). */
function completerAvecDefauts(donnees) {
  const defauts = creerDonneesParDefaut();
  return {
    ...defauts,
    ...donnees,
    profil: completerSection(defauts.profil, donnees.profil),
    reglages: completerSection(defauts.reglages, donnees.reglages),
    accessoires: completerSection(defauts.accessoires, donnees.accessoires),
    carnet: completerSection(defauts.carnet, donnees.carnet),
    meta: completerSection(defauts.meta, donnees.meta),
  };
}

function exiger(condition, description) {
  if (!condition) {
    throw new ErreurStockage(`Données invalides : ${description}.`);
  }
}

export function estNiveauValide(niveau) {
  return Number.isInteger(niveau) && niveau >= NIVEAU_MIN && niveau <= NIVEAU_MAX;
}

/** Un refus mémorisé est un nombre de séances restantes : de 0 à SEANCES_APRES_REFUS. */
export function estRefusValide(restant) {
  return Number.isInteger(restant) && restant >= 0 && restant <= SEANCES_APRES_REFUS;
}

function estExerciceDefiValide(exercice) {
  return estObjetSimple(exercice) && typeof exercice.famille === 'string' && ORIGINES_DEFI.includes(exercice.origine);
}

/** Le défi est `null` (jamais lancé) ou `{ jour, faits, plan }` avec au plus NOMBRE_EXERCICES_DEFI exercices. */
function estDefiValide(defi) {
  return (
    defi === null ||
    (estObjetSimple(defi) &&
      typeof defi.jour === 'string' &&
      Number.isInteger(defi.faits) &&
      defi.faits >= 0 &&
      defi.faits <= NOMBRE_EXERCICES_DEFI &&
      Array.isArray(defi.plan) &&
      defi.plan.length <= NOMBRE_EXERCICES_DEFI &&
      defi.plan.every(estExerciceDefiValide))
  );
}

/** Le test de départ est `null` (pas commencé) ou `{ jour, reponses, termine }` avec des réponses booléennes. */
function estTestDepartValide(testDepart) {
  return (
    testDepart === null ||
    (estObjetSimple(testDepart) &&
      typeof testDepart.jour === 'string' &&
      estObjetSimple(testDepart.reponses) &&
      Object.values(testDepart.reponses).every((reussi) => typeof reussi === 'boolean') &&
      typeof testDepart.termine === 'boolean')
  );
}

function estBoiteValide(entree) {
  return (
    estObjetSimple(entree) &&
    Number.isInteger(entree.boite) &&
    entree.boite >= BOITE_A_CONFIRMER &&
    entree.boite <= INTERVALLES_JOURS.length &&
    typeof entree.dernierJour === 'string' &&
    typeof entree.acquis === 'boolean'
  );
}

/** Longueur maximale du nom d'une voix enregistré dans les réglages. */
export const LONGUEUR_MAX_NOM_VOIX = 200;

/** Longueur maximale acceptée du prénom et du nom de la mascotte (stockage et import). */
export const LONGUEUR_MAX_NOM = 200;

/** Longueur laissée à la saisie : un prénom ou un nom de mascotte reste court. */
export const LONGUEUR_SAISIE_NOM = 30;

const VITESSES_VOIX = ['lente', 'normale', 'rapide'];

function estNomValide(valeur) {
  return typeof valeur === 'string' && valeur.length <= LONGUEUR_MAX_NOM;
}

function estBooleen(valeur) {
  return typeof valeur === 'boolean';
}

/**
 * Règle de chaque réglage : une fonction qui dit si la valeur est acceptable.
 * Pour ajouter un réglage : une ligne ici et sa valeur dans `creerDonneesParDefaut`.
 */
const REGLES_REGLAGES = {
  sonActif: estBooleen,
  volume: (valeur) => typeof valeur === 'number' && Number.isFinite(valeur) && valeur >= 0 && valeur <= 1,
  voix: (valeur) => typeof valeur === 'string' && valeur.length <= LONGUEUR_MAX_NOM_VOIX,
  vitesseVoix: (valeur) => VITESSES_VOIX.includes(valeur),
  texteGrand: estBooleen,
  animationsReduites: estBooleen,
  lettresFaciles: estBooleen,
};

/**
 * Cherche un problème dans les réglages (type, borne ou clé inconnue).
 * Les règles n'existent qu'ici : le stockage local et l'import les partagent.
 * @param {*} reglages
 * @returns {string|null} Description du premier problème trouvé, ou `null` si tout est valide.
 */
export function trouverProblemeReglages(reglages) {
  if (!estObjetSimple(reglages)) {
    return '« reglages » doit être un objet';
  }
  for (const cle of Object.keys(reglages)) {
    if (!Object.hasOwn(REGLES_REGLAGES, cle)) {
      return `réglage inconnu « ${cle} »`;
    }
  }
  for (const [cle, estValide] of Object.entries(REGLES_REGLAGES)) {
    if (!estValide(reglages[cle])) {
      return `« reglages.${cle} » a une valeur invalide`;
    }
  }
  return null;
}

/** Les accessoires achetés et portés sont des accessoires du catalogue, et chacun est porté à son emplacement. */
function verifierAccessoires({ possedes, equipes }) {
  exiger(Array.isArray(possedes), '« accessoires.possedes » doit être une liste');
  exiger(estObjetSimple(equipes), '« accessoires.equipes » doit être un objet');
  exiger(
    possedes.every((id) => ACCESSOIRES.some((accessoire) => accessoire.id === id)),
    '« accessoires.possedes » contient un accessoire inconnu',
  );
  exiger(
    Object.entries(equipes).every(([emplacement, id]) =>
      ACCESSOIRES.some((accessoire) => accessoire.id === id && accessoire.emplacement === emplacement),
    ),
    '« accessoires.equipes » contient un accessoire inconnu ou mal placé',
  );
}

/**
 * Vérifie la forme de données complètes : le contenu du stockage peut avoir été
 * modifié à la main ou écrit par une version boguée, on ne lui fait pas confiance.
 * @param {*} donnees Données déjà complétées (ex. sortie de `migrer`).
 * @throws {ErreurStockage} Au premier champ qui n'a pas le bon type ou la bonne valeur.
 */
export function verifierForme(donnees) {
  const sections = ['profil', 'reglages', 'accessoires', 'carnet', 'meta', 'niveaux', 'repetition'];
  for (const section of sections) {
    exiger(estObjetSimple(donnees[section]), `« ${section} » doit être un objet`);
  }
  const problemeReglages = trouverProblemeReglages(donnees.reglages);
  exiger(problemeReglages === null, problemeReglages);
  exiger(estNomValide(donnees.profil.prenom), `« profil.prenom » doit être un texte de ${LONGUEUR_MAX_NOM} caractères au plus`);
  exiger(
    estNomValide(donnees.profil.nomMascotte),
    `« profil.nomMascotte » doit être un texte de ${LONGUEUR_MAX_NOM} caractères au plus`,
  );
  exiger(Number.isInteger(donnees.etoiles) && donnees.etoiles >= 0, '« etoiles » doit être un entier positif ou nul');
  exiger(Object.values(donnees.niveaux).every(estNiveauValide), 'un niveau est hors de 1 à 3');
  exiger(Object.values(donnees.repetition).every(estBoiteValide), 'une boîte de répétition est invalide');
  exiger(Array.isArray(donnees.historique), '« historique » doit être une liste');
  exiger(Array.isArray(donnees.meta.joursEntrainement), '« meta.joursEntrainement » doit être une liste');
  exiger(estObjetSimple(donnees.meta.refus), '« meta.refus » doit être un objet');
  exiger(Object.values(donnees.meta.refus).every(estRefusValide), 'un refus de niveau est hors de 0 à 3');
  exiger(estDefiValide(donnees.meta.defi), '« meta.defi » doit être vide ou { jour, faits, plan }');
  exiger(estObjetSimple(donnees.meta.badges), '« meta.badges » doit être un objet');
  exiger(Object.values(donnees.meta.badges).every((jour) => typeof jour === 'string'), '« meta.badges » contient une valeur invalide');
  exiger(estTestDepartValide(donnees.meta.testDepart), '« meta.testDepart » est invalide');
  exiger(
    Number.isInteger(donnees.etoilesDepensees) && donnees.etoilesDepensees >= 0 && donnees.etoilesDepensees <= donnees.etoiles,
    "« etoilesDepensees » doit être un entier entre 0 et le total d'étoiles gagnées",
  );
  verifierAccessoires(donnees.accessoires);
  exiger(estObjetSimple(donnees.carnet.competencesRatees), '« carnet.competencesRatees » doit être un objet');
}

/**
 * Amène des données lues du support à la version courante du schéma.
 * @param {*} donnees Objet issu de JSON.parse.
 * @param {Object<number, function(Object): Object>} [migrations] Table de migrations.
 * @param {number} [versionCible] Version visée.
 * @returns {DonneesLexia}
 * @throws {ErreurStockage} Si les données ne sont pas un objet, viennent d'une version
 *   plus récente que le site, ou si une migration manque.
 */
export function migrer(donnees, migrations = MIGRATIONS, versionCible = VERSION_SCHEMA) {
  if (donnees === null || typeof donnees !== 'object' || Array.isArray(donnees)) {
    throw new ErreurStockage('Les données enregistrées ne sont pas un objet.');
  }
  let version = Number.isInteger(donnees.version) ? donnees.version : 0;
  if (version > versionCible) {
    throw new ErreurStockage(`Données de version ${version}, plus récente que le site (${versionCible}).`);
  }
  let courantes = donnees;
  while (version < versionCible) {
    const migration = migrations[version];
    if (!migration) {
      throw new ErreurStockage(`Aucune migration depuis la version ${version}.`);
    }
    courantes = migration(courantes);
    version += 1;
  }
  const completes = completerAvecDefauts({ ...courantes, version: versionCible });
  verifierForme(completes);
  return completes;
}

/**
 * Lit et migre les données du support.
 * @returns {DonneesLexia} Les données par défaut si rien n'est enregistré.
 * @throws {Error} Si le support échoue ou si les données sont corrompues.
 */
function lireDepuisSupport(support) {
  const cleALire = migrerCle(support, ANCIENNE_CLE_STOCKAGE, CLE_STOCKAGE);
  const brut = support.getItem(cleALire);
  return brut === null ? creerDonneesParDefaut() : migrer(JSON.parse(brut));
}

function ecrireDansSupport(support, donnees) {
  support.setItem(CLE_STOCKAGE, JSON.stringify(donnees));
}

/**
 * Crée un stockage qui lit et écrit les données sous la clé `lexia:v1`
 * (les données d'une ancienne clé `plume:v1` y sont déplacées une fois, voir `migrerCle`).
 * Au premier échec (support absent, plein, JSON corrompu), il bascule en mode
 * « session seulement » : les données restent en mémoire et `signaler` est appelé.
 * Les données corrompues ne sont jamais écrasées.
 *
 * @param {Object} [options]
 * @param {{getItem: Function, setItem: Function}} [options.support] Par défaut `localStorage`.
 * @param {function(string, Error): void} [options.signaler] Reçoit un message pour l'élève et l'erreur d'origine.
 * @returns {{
 *   lire: function(): DonneesLexia,
 *   ecrire: function(DonneesLexia): void,
 *   estPersistant: function(): boolean,
 *   ecouterEcriture: function(function(): void): void
 * }}
 *   `ecouterEcriture(fonction)` : `fonction` est appelée après chaque `ecrire`. Si elle lève une exception,
 *   l'écriture n'en souffre pas : l'échec est donné à `signaler`.
 */
export function creerStockage({ support = globalThis.localStorage, signaler = () => {} } = {}) {
  let persistant = true;
  let enMemoire = creerDonneesParDefaut();
  const ecouteursDEcriture = [];

  // Un support absent lève une TypeError au premier appel : elle est traitée comme les autres échecs.
  function passerEnSessionSeulement(erreur) {
    persistant = false;
    signaler(
      "Je n'arrive pas à enregistrer sur cet appareil : tes données restent jusqu'à la fermeture du site.",
      erreur,
    );
  }

  /** @returns {DonneesLexia} */
  function lire() {
    if (!persistant) {
      return enMemoire;
    }
    try {
      enMemoire = lireDepuisSupport(support);
    } catch (erreur) {
      passerEnSessionSeulement(erreur);
    }
    return enMemoire;
  }

  /** @param {DonneesLexia} donnees */
  function ecrire(donnees) {
    enMemoire = donnees;
    if (persistant) {
      try {
        ecrireDansSupport(support, donnees);
      } catch (erreur) {
        passerEnSessionSeulement(erreur);
      }
    }
    ecouteursDEcriture.forEach(prevenirUnEcouteur);
  }

  /** Un écouteur qui plante ne doit pas casser l'écriture (c'est la fin d'un exercice) ni les autres écouteurs. */
  function prevenirUnEcouteur(ecouteur) {
    try {
      ecouteur();
    } catch (erreur) {
      signaler('La sauvegarde en ligne a eu un souci. Ta progression reste sur cet appareil.', erreur);
    }
  }

  function estPersistant() {
    return persistant;
  }

  return { lire, ecrire, estPersistant, ecouterEcriture: (fonction) => ecouteursDEcriture.push(fonction) };
}
