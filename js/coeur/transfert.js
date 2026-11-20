/**
 * Transfert de la progression entre appareils (PC et tablette).
 *
 * Deux formes :
 * - un fichier `lexia-sauvegarde-AAAA-MM-JJ.json` (le JSON des données) ;
 * - un code texte à copier, de la forme `lexia1.<données>.<somme>` :
 *   `lexia1` est le préfixe et la version du format, `<données>` est le JSON
 *   compressé en gzip puis encodé en base64url, `<somme>` est le CRC32 des
 *   octets compressés, en 8 chiffres hexadécimaux.
 *   La somme repère une faute de recopie ; elle ne protège pas d'une falsification.
 *
 * Tout ce qui est importé est validé strictement avant d'être rendu :
 * le contenu n'est jamais interprété, seulement vérifié et copié.
 * Logique pure : pas de DOM, pas de stockage.
 */

import { CLES_FAMILLES, NOMBRE_EXERCICES_DEFI } from './familles.js';
import {
  ErreurStockage,
  ORIGINES_DEFI,
  VERSION_SCHEMA,
  creerDonneesParDefaut,
  estNiveauValide,
  estObjetSimple,
  estRefusValide,
  migrer,
  trouverProblemeReglages,
} from './stockage.js';
import { TAILLE_MAX_HISTORIQUE, versJour } from './progression.js';

/** @typedef {import('./stockage.js').DonneesLexia} DonneesLexia */

export const PREFIXE_CODE = 'lexia1';
/** Préfixe des codes écrits quand le site s'appelait Plume : encore acceptés à l'import, jamais écrits. */
const ANCIEN_PREFIXE_CODE = 'plume1';
const PREFIXES_ACCEPTES = [PREFIXE_CODE, ANCIEN_PREFIXE_CODE];

/** Tailles maximales acceptées à l'import. */
export const TAILLE_MAX_CODE = 300000;
export const TAILLE_MAX_FICHIER = 1000000;
export const TAILLE_MAX_JSON = 1000000;

/** Bornes des valeurs importées. */
const LONGUEUR_MAX_CHAINE = 200;
const MAX_ETOILES = 1000000;
const MAX_ENTREES_PAR_TABLE = 5000;
const MAX_ACCESSOIRES = 200;
const MAX_BADGES = 100;
const MAX_REPONSES_TEST_DEPART = 40;
const LONGUEUR_MAX_ID_TEST_DEPART = 60;
const MAX_JOURS_ENTRAINEMENT = 3700;
const MAX_ITEMS_PAR_SEANCE = 1000;
const MAX_COMPETENCES_PAR_SEANCE = 50;
const MAX_COMPTEUR_COMPETENCE = 1000000;
const FORMAT_JOUR = /^\d{4}-\d{2}-\d{2}$/;
const CARACTERES_BASE64URL = /^[A-Za-z0-9_-]*$/;

const CLES_SEANCE = ['module', 'mode', 'itemId', 'reussis', 'total', 'competencesRatees', 'niveau', 'date'];
const CLES_BOITE = ['boite', 'dernierJour', 'acquis'];
const CLES_DEFI = ['jour', 'faits', 'plan'];
const CLES_EXERCICE_DEFI = ['famille', 'origine'];
const CLES_TEST_DEPART = ['jour', 'reponses', 'termine'];

const MESSAGE_SAUVEGARDE_ABIMEE = "Cette sauvegarde est abîmée ou n'a pas été faite par Lexia.";
const MESSAGE_CODE_ILLISIBLE = "Ce code n'est pas bon : il est incomplet ou il y a une faute de recopie.";
const MESSAGE_FICHIER_ILLISIBLE = "Ce fichier n'est pas une sauvegarde de Lexia.";
const MESSAGE_VERSION_RECENTE = "Cette sauvegarde vient d'une version plus récente de Lexia. Mets le site à jour, puis réessaie.";
const MESSAGE_TROP_GROS = 'Ce fichier est beaucoup trop gros pour être une sauvegarde de Lexia.';

/** Erreur d'import : `message` est lisible par l'élève, `detail` est pour les développeurs. */
export class ErreurImport extends Error {
  /**
   * @param {string} message Phrase simple, affichable telle quelle.
   * @param {string} [detail] Cause technique, à ne pas montrer à l'élève.
   */
  constructor(message, detail = '') {
    super(message);
    this.detail = detail;
  }
}

function refuser(message, detail) {
  throw new ErreurImport(message, detail);
}

// ---------------------------------------------------------------- somme de contrôle

const POLYNOME_CRC32 = 0xedb88320;
const MASQUE_32_BITS = 0xffffffff;
const MASQUE_OCTET = 0xff;
const NB_BITS_PAR_OCTET = 8;
const TAILLE_TABLE_CRC32 = 256;

function construireTableCrc32() {
  const table = new Uint32Array(TAILLE_TABLE_CRC32);
  for (let octet = 0; octet < TAILLE_TABLE_CRC32; octet += 1) {
    let valeur = octet;
    for (let bit = 0; bit < NB_BITS_PAR_OCTET; bit += 1) {
      valeur = valeur & 1 ? (valeur >>> 1) ^ POLYNOME_CRC32 : valeur >>> 1;
    }
    table[octet] = valeur;
  }
  return table;
}

const TABLE_CRC32 = construireTableCrc32();

/**
 * CRC32 d'une suite d'octets, en 8 chiffres hexadécimaux.
 * @param {Uint8Array} octets
 * @returns {string}
 */
function sommeDeControle(octets) {
  let crc = MASQUE_32_BITS;
  for (const octet of octets) {
    crc = TABLE_CRC32[(crc ^ octet) & MASQUE_OCTET] ^ (crc >>> NB_BITS_PAR_OCTET);
  }
  return ((crc ^ MASQUE_32_BITS) >>> 0).toString(16).padStart(8, '0');
}

// ---------------------------------------------------------------- base64url et gzip

/** @param {Uint8Array} octets */
function versBase64Url(octets) {
  let binaire = '';
  for (const octet of octets) {
    binaire += String.fromCharCode(octet);
  }
  return btoa(binaire).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

/**
 * @param {string} texte
 * @returns {Uint8Array}
 * @throws {ErreurImport} Si le texte n'est pas du base64url valide.
 */
function depuisBase64Url(texte) {
  if (!CARACTERES_BASE64URL.test(texte)) {
    refuser(MESSAGE_CODE_ILLISIBLE, 'caractère hors alphabet base64url');
  }
  const standard = texte.replaceAll('-', '+').replaceAll('_', '/');
  const complete = standard.padEnd(Math.ceil(standard.length / 4) * 4, '=');
  try {
    return Uint8Array.from(atob(complete), (caractere) => caractere.charCodeAt(0));
  } catch (erreur) {
    return refuser(MESSAGE_CODE_ILLISIBLE, `base64url invalide : ${erreur.message}`);
  }
}

/**
 * @param {string} texte
 * @returns {Promise<Uint8Array>}
 */
async function compresser(texte) {
  const flux = new Blob([texte]).stream().pipeThrough(new CompressionStream('gzip'));
  return new Uint8Array(await new Response(flux).arrayBuffer());
}

/**
 * Décompresse en s'arrêtant dès que le texte dépasse `TAILLE_MAX_JSON`
 * (une petite archive peut cacher des gigaoctets).
 * @param {Uint8Array} octets
 * @returns {Promise<string>}
 * @throws {ErreurImport} Si l'archive est invalide ou trop grosse.
 */
async function decompresser(octets) {
  const lecteur = new Blob([octets]).stream().pipeThrough(new DecompressionStream('gzip')).getReader();
  const morceaux = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await lecteur.read();
      if (done) {
        break;
      }
      total += value.length;
      if (total > TAILLE_MAX_JSON) {
        await lecteur.cancel();
        refuser(MESSAGE_TROP_GROS, 'texte décompressé trop gros');
      }
      morceaux.push(value);
    }
  } catch (erreur) {
    if (erreur instanceof ErreurImport) {
      throw erreur;
    }
    refuser(MESSAGE_CODE_ILLISIBLE, `archive invalide : ${erreur.message}`);
  }
  return new Blob(morceaux).text();
}

// ---------------------------------------------------------------- validation stricte

function exiger(condition, detail) {
  if (!condition) {
    refuser(MESSAGE_SAUVEGARDE_ABIMEE, detail);
  }
}

function estChaineBornee(valeur) {
  return typeof valeur === 'string' && valeur.length <= LONGUEUR_MAX_CHAINE;
}

function estJour(valeur) {
  return typeof valeur === 'string' && FORMAT_JOUR.test(valeur);
}

function estEntierBorne(valeur, maximum) {
  return Number.isInteger(valeur) && valeur >= 0 && valeur <= maximum;
}

function exigerListeBornee(liste, { maximum, estValide, nom }) {
  exiger(Array.isArray(liste) && liste.length <= maximum, `« ${nom} » doit être une liste d'au plus ${maximum} éléments`);
  exiger(liste.every(estValide), `« ${nom} » contient une valeur invalide`);
}

function exigerClesConnues(objet, clesAutorisees, nom) {
  for (const cle of Object.keys(objet)) {
    exiger(clesAutorisees.includes(cle), `clé inconnue « ${cle} » dans ${nom}`);
  }
}

/** Une table dont les clés sont libres (identifiants) : on borne leur nombre et leur forme. */
function exigerTableSure(table, nom) {
  const cles = Object.keys(table);
  exiger(cles.length <= MAX_ENTREES_PAR_TABLE, `« ${nom} » a trop d'entrées`);
  exiger(
    cles.every((cle) => estChaineBornee(cle) && cle !== '__proto__'),
    `« ${nom} » a une clé invalide`,
  );
}

function verifierProfil(profil, defauts) {
  exigerClesConnues(profil, Object.keys(defauts), 'profil');
  exiger(estChaineBornee(profil.prenom), '« profil.prenom » doit être un texte court');
  exiger(estChaineBornee(profil.nomMascotte), '« profil.nomMascotte » doit être un texte court');
}

/** Les règles des réglages sont celles du stockage local : une seule définition. */
function verifierReglages(reglages) {
  const probleme = trouverProblemeReglages(reglages);
  exiger(probleme === null, probleme);
}

function verifierAccessoires(accessoires, defauts) {
  exigerClesConnues(accessoires, Object.keys(defauts), 'accessoires');
  exigerListeBornee(accessoires.possedes, {
    maximum: MAX_ACCESSOIRES,
    estValide: estChaineBornee,
    nom: 'accessoires.possedes',
  });
  exigerTableSure(accessoires.equipes, 'accessoires.equipes');
  exiger(Object.values(accessoires.equipes).every(estChaineBornee), '« accessoires.equipes » contient une valeur invalide');
}

/** Le niveau d'une séance est facultatif (absent des séances anciennes). */
function estNiveauSeanceValide(niveau) {
  return niveau === undefined || estNiveauValide(niveau);
}

function estSeanceValide(seance) {
  if (!estObjetSimple(seance) || !Object.keys(seance).every((cle) => CLES_SEANCE.includes(cle))) {
    return false;
  }
  return (
    [seance.module, seance.mode, seance.itemId].every(estChaineBornee) &&
    estEntierBorne(seance.total, MAX_ITEMS_PAR_SEANCE) &&
    estEntierBorne(seance.reussis, seance.total) &&
    estNiveauSeanceValide(seance.niveau) &&
    estJour(seance.date) &&
    Array.isArray(seance.competencesRatees) &&
    seance.competencesRatees.length <= MAX_COMPETENCES_PAR_SEANCE &&
    seance.competencesRatees.every(estChaineBornee)
  );
}

function estBoiteBornee(entree) {
  return Object.keys(entree).every((cle) => CLES_BOITE.includes(cle)) && estJour(entree.dernierJour);
}

function verifierRepetition(repetition) {
  exigerTableSure(repetition, 'repetition');
  exiger(Object.values(repetition).every(estBoiteBornee), 'une boîte de répétition est invalide');
}

function verifierCarnet(carnet, defauts) {
  exigerClesConnues(carnet, Object.keys(defauts), 'carnet');
  exigerTableSure(carnet.competencesRatees, 'carnet.competencesRatees');
  exiger(
    Object.values(carnet.competencesRatees).every((nombre) => estEntierBorne(nombre, MAX_COMPTEUR_COMPETENCE)),
    '« carnet.competencesRatees » contient un nombre invalide',
  );
}

function estExerciceDefiBorne(exercice) {
  return (
    Object.keys(exercice).every((cle) => CLES_EXERCICE_DEFI.includes(cle)) &&
    CLES_FAMILLES.includes(exercice.famille) &&
    ORIGINES_DEFI.includes(exercice.origine)
  );
}

/** Le défi du jour est vide ou `{ jour, faits, plan }` : clés exactes, famille connue, 5 exercices au plus. */
function verifierDefi(defi) {
  if (defi === null) {
    return;
  }
  exigerClesConnues(defi, CLES_DEFI, 'meta.defi');
  exiger(estJour(defi.jour), '« meta.defi.jour » doit être un jour');
  exiger(estEntierBorne(defi.faits, NOMBRE_EXERCICES_DEFI), '« meta.defi.faits » est hors bornes');
  exigerListeBornee(defi.plan, {
    maximum: NOMBRE_EXERCICES_DEFI,
    estValide: estExerciceDefiBorne,
    nom: 'meta.defi.plan',
  });
}

/**
 * Le test de départ est vide ou `{ jour, reponses, termine }` : clés exactes, 40 réponses au plus.
 * Les valeurs booléennes sont déjà vérifiées par `verifierForme`.
 */
function verifierTestDepart(testDepart) {
  if (testDepart === null) {
    return;
  }
  exigerClesConnues(testDepart, CLES_TEST_DEPART, 'meta.testDepart');
  exiger(estJour(testDepart.jour), '« meta.testDepart.jour » doit être un jour');
  exigerTableSure(testDepart.reponses, 'meta.testDepart.reponses');
  const identifiants = Object.keys(testDepart.reponses);
  exiger(
    identifiants.length <= MAX_REPONSES_TEST_DEPART,
    `« meta.testDepart.reponses » a plus de ${MAX_REPONSES_TEST_DEPART} entrées`,
  );
  exiger(
    identifiants.every((identifiant) => identifiant.length <= LONGUEUR_MAX_ID_TEST_DEPART),
    '« meta.testDepart.reponses » a un identifiant trop long',
  );
}

function verifierMeta(meta, defauts) {
  exigerClesConnues(meta, Object.keys(defauts), 'meta');
  exigerListeBornee(meta.joursEntrainement, {
    maximum: MAX_JOURS_ENTRAINEMENT,
    estValide: estJour,
    nom: 'meta.joursEntrainement',
  });
  exiger(meta.derniereSeance === null || estJour(meta.derniereSeance), '« meta.derniereSeance » doit être un jour ou vide');
  exigerTableSure(meta.refus, 'meta.refus');
  exiger(Object.values(meta.refus).every(estRefusValide), '« meta.refus » contient un nombre invalide');
  verifierDefi(meta.defi);
  exigerTableSure(meta.badges, 'meta.badges');
  exiger(Object.keys(meta.badges).length <= MAX_BADGES, `« meta.badges » a plus de ${MAX_BADGES} entrées`);
  exiger(Object.values(meta.badges).every(estJour), '« meta.badges » contient un jour invalide');
  verifierTestDepart(meta.testDepart);
}

/**
 * Vérifie clés, tailles et formats de données déjà migrées et complétées.
 * Suppose `verifierForme` (appelée par `migrer`) déjà passée : les types et les bornes des
 * niveaux, des boîtes et des étoiles y sont contrôlés, d'où des contrôles plus légers ici.
 * @param {DonneesLexia} donnees
 * @throws {ErreurImport}
 */
function verifierBornes(donnees) {
  const defauts = creerDonneesParDefaut();
  exigerClesConnues(donnees, Object.keys(defauts), 'la sauvegarde');
  exiger(estEntierBorne(donnees.etoiles, MAX_ETOILES), '« etoiles » est hors bornes');
  exiger(estEntierBorne(donnees.etoilesDepensees, MAX_ETOILES), '« etoilesDepensees » est hors bornes');
  verifierProfil(donnees.profil, defauts.profil);
  verifierReglages(donnees.reglages);
  verifierAccessoires(donnees.accessoires, defauts.accessoires);
  verifierCarnet(donnees.carnet, defauts.carnet);
  verifierMeta(donnees.meta, defauts.meta);
  verifierRepetition(donnees.repetition);
  exigerTableSure(donnees.niveaux, 'niveaux');
  exigerListeBornee(donnees.historique, {
    maximum: TAILLE_MAX_HISTORIQUE,
    estValide: estSeanceValide,
    nom: 'historique',
  });
}

/**
 * Migre des données lues, puis les valide strictement.
 * @param {*} brut Résultat de JSON.parse.
 * @returns {DonneesLexia}
 * @throws {ErreurImport}
 */
function validerEtMigrer(brut) {
  if (Number.isInteger(brut?.version) && brut.version > VERSION_SCHEMA) {
    refuser(MESSAGE_VERSION_RECENTE, `version ${brut.version} > ${VERSION_SCHEMA}`);
  }
  let donnees;
  try {
    donnees = migrer(brut);
  } catch (erreur) {
    if (erreur instanceof ErreurStockage) {
      refuser(MESSAGE_SAUVEGARDE_ABIMEE, erreur.message);
    }
    throw erreur;
  }
  verifierBornes(donnees);
  return donnees;
}

function lireJson(texte) {
  try {
    return JSON.parse(texte);
  } catch (erreur) {
    return refuser(MESSAGE_FICHIER_ILLISIBLE, `JSON invalide : ${erreur.message}`);
  }
}

// ---------------------------------------------------------------- API publique

/**
 * Prépare le fichier de sauvegarde.
 * @param {DonneesLexia} donnees
 * @param {Date} date Date du jour (injectée).
 * @returns {{nomFichier: string, contenu: string}}
 */
export function exporterFichier(donnees, date) {
  return {
    nomFichier: `lexia-sauvegarde-${versJour(date)}.json`,
    contenu: JSON.stringify(donnees, null, 2),
  };
}

/**
 * Produit le code texte à copier : `lexia1.<base64url du gzip>.<crc32>`.
 * @param {DonneesLexia} donnees
 * @returns {Promise<string>}
 */
export async function exporterCode(donnees) {
  const octets = await compresser(JSON.stringify(donnees));
  return `${PREFIXE_CODE}.${versBase64Url(octets)}.${sommeDeControle(octets)}`;
}

/**
 * Lit le contenu d'un fichier de sauvegarde.
 * @param {string} texte Contenu du fichier.
 * @returns {DonneesLexia} Données validées, à la version courante du schéma.
 * @throws {ErreurImport} Si le fichier est trop gros, illisible ou invalide.
 */
export function importerFichier(texte) {
  if (typeof texte !== 'string') {
    refuser(MESSAGE_FICHIER_ILLISIBLE, 'le contenu n\'est pas du texte');
  }
  if (texte.length > TAILLE_MAX_FICHIER) {
    refuser(MESSAGE_TROP_GROS, `${texte.length} caractères`);
  }
  return validerEtMigrer(lireJson(texte));
}

/**
 * Lit un code de sauvegarde.
 * @param {string} code Code produit par `exporterCode`.
 * @returns {Promise<DonneesLexia>} Données validées, à la version courante du schéma.
 * @throws {ErreurImport} Si le code est incomplet, corrompu ou invalide.
 */
export async function importerCode(code) {
  if (typeof code !== 'string' || code.length > TAILLE_MAX_CODE) {
    refuser(MESSAGE_CODE_ILLISIBLE, 'code absent ou trop long');
  }
  const parties = code.trim().split('.');
  const [prefixe, charge, somme] = parties;
  if (parties.length !== 3 || !PREFIXES_ACCEPTES.includes(prefixe)) {
    refuser(MESSAGE_CODE_ILLISIBLE, 'préfixe ou séparateurs incorrects');
  }
  const octets = depuisBase64Url(charge);
  if (sommeDeControle(octets) !== somme.toLowerCase()) {
    refuser(MESSAGE_CODE_ILLISIBLE, 'somme de contrôle différente');
  }
  return validerEtMigrer(lireJson(await decompresser(octets)));
}

/**
 * Résumé affiché avant d'écraser la progression : « 120 étoiles, 9 accessoires, dernière séance le… ».
 * @param {DonneesLexia} donnees
 * @returns {{etoiles: number, nombreAccessoires: number, derniereSeance: string|null}}
 */
export function apercu(donnees) {
  return {
    etoiles: donnees.etoiles,
    nombreAccessoires: donnees.accessoires.possedes.length,
    derniereSeance: donnees.meta.derniereSeance,
  };
}
