// Section « Sauvegarde » de l'écran Réglages : exporter (fichier ou code) et importer la progression.
// La logique de format et de validation est dans coeur/transfert.js ; ici, seulement l'interface.

import { ErreurImport, apercu, exporterCode, exporterFichier, importerCode, importerFichier } from '../../coeur/transfert.js';
import { EVENEMENT_DONNEES_CHANGEES } from '../../ui/barre-etat.js';
import { creer, creerBouton } from '../../ui/dom.js';
import { ouvrirModale } from '../../ui/modale.js';
import { afficherToast } from '../../ui/toast.js';

const MESSAGE_IMPORT_IMPOSSIBLE = "Je n'arrive pas à lire cette sauvegarde.";
const MESSAGE_EXPORT_IMPOSSIBLE = "Je n'arrive pas à préparer la sauvegarde.";
const MESSAGE_COPIE_IMPOSSIBLE = 'Je ne peux pas copier toute seule : sélectionne le code et copie-le.';
const MESSAGE_IMPORT_FAIT = 'Ta progression est récupérée.';

/** Une zone de message lue par les lecteurs d'écran, avec une méthode pour l'écrire. */
function creerMessage(role) {
  const zone = creer('p', 'reglages__message');
  zone.setAttribute('role', role);
  return zone;
}

function creerZoneDeCode(etiquette, { lectureSeule }) {
  const zone = creer('textarea', 'reglages__code');
  zone.rows = 4;
  zone.readOnly = lectureSeule;
  zone.setAttribute('aria-label', etiquette);
  zone.setAttribute('autocomplete', 'off');
  zone.setAttribute('autocapitalize', 'off');
  zone.setAttribute('spellcheck', 'false');
  return zone;
}

/** Message affichable à l'élève pour une erreur : le texte d'une erreur d'import, sinon un message général. */
function messagePourEleve(erreur, parDefaut) {
  return erreur instanceof ErreurImport ? erreur.message : parDefaut;
}

// --- Exporter ---

function telechargerFichier({ nomFichier, contenu }) {
  const adresse = URL.createObjectURL(new Blob([contenu], { type: 'application/json' }));
  const lien = document.createElement('a');
  lien.href = adresse;
  lien.download = nomFichier;
  lien.click();
  URL.revokeObjectURL(adresse);
}

async function copierLeCode(zone, message) {
  try {
    await navigator.clipboard.writeText(zone.value);
    message.textContent = 'Code copié.';
  } catch {
    zone.select();
    message.textContent = MESSAGE_COPIE_IMPOSSIBLE;
  }
}

async function afficherLeCode(contexte, zone, message) {
  try {
    zone.value = await exporterCode(contexte.stockage.lire());
    zone.hidden = false;
    message.textContent = 'Voici ton code. Copie-le, puis colle-le sur l\'autre appareil.';
  } catch (erreur) {
    contexte.signaler('Export du code impossible', erreur);
    message.textContent = MESSAGE_EXPORT_IMPOSSIBLE;
  }
}

function creerBlocExport(contexte) {
  const bloc = creer('div', 'reglages__bloc');
  const zone = creerZoneDeCode('Mon code de sauvegarde', { lectureSeule: true });
  const message = creerMessage('status');
  zone.hidden = true;
  bloc.append(
    creer('h3', 'reglages__sous-titre', 'Sauvegarder ma progression'),
    creerBouton('Enregistrer un fichier', 'bouton--secondaire', () => {
      telechargerFichier(exporterFichier(contexte.stockage.lire(), new Date()));
    }),
    creerBouton('Obtenir un code', 'bouton--secondaire', () => afficherLeCode(contexte, zone, message)),
    zone,
    creerBouton('Copier le code', 'bouton--secondaire', () => copierLeCode(zone, message)),
    message,
  );
  return bloc;
}

// --- Importer ---

function nombreEtMot(nombre, singulier, pluriel) {
  return `${nombre} ${nombre > 1 ? pluriel : singulier}`;
}

/** « 12 étoiles, 3 accessoires, dernière séance le 15/10/2026. » */
function decrireApercu(donnees) {
  const { etoiles, nombreAccessoires, derniereSeance } = apercu(donnees);
  const [annee, mois, jour] = (derniereSeance ?? '').split('-');
  const seance = derniereSeance ? `dernière séance le ${jour}/${mois}/${annee}` : 'aucune séance';
  return `${nombreEtMot(etoiles, 'étoile', 'étoiles')}, ${nombreEtMot(nombreAccessoires, 'accessoire', 'accessoires')}, ${seance}.`;
}

/** Montre ce que contient la sauvegarde et demande confirmation avant d'écraser la progression. */
async function confirmerLeRemplacement(donnees) {
  const contenu = creer('div', 'reglages__apercu');
  contenu.append(
    creer('p', 'reglages__confirmation', decrireApercu(donnees)),
    creer('p', 'reglages__confirmation', 'Ta progression actuelle sera remplacée.'),
  );
  const choix = await ouvrirModale({
    titre: 'Récupérer cette progression ?',
    contenu,
    boutons: [
      { id: 'remplacer', libelle: 'Remplacer ma progression', variante: 'secondaire' },
      { id: 'annuler', libelle: 'Garder ma progression', variante: 'principal' },
    ],
  });
  return choix === 'remplacer';
}

/**
 * Lit une sauvegarde puis, si l'élève confirme, remplace la progression.
 * @param {function(): (Object|Promise<Object>)} lire Renvoie les données validées ou lève une ErreurImport.
 */
async function importer(lire, { contexte, message, apresImport }) {
  message.textContent = '';
  let donnees;
  try {
    donnees = await lire();
  } catch (erreur) {
    contexte.signaler('Import refusé', erreur);
    message.textContent = messagePourEleve(erreur, MESSAGE_IMPORT_IMPOSSIBLE);
    return;
  }
  if (!(await confirmerLeRemplacement(donnees))) {
    return;
  }
  contexte.stockage.ecrire(donnees);
  contexte.modifierReglages(donnees.reglages);
  window.dispatchEvent(new Event(EVENEMENT_DONNEES_CHANGEES));
  apresImport();
  await afficherToast(MESSAGE_IMPORT_FAIT);
}

function creerChoixDeFichier(demarrerImport) {
  const entree = creer('input', 'reglages__fichier');
  entree.type = 'file';
  entree.accept = '.json,application/json';
  entree.setAttribute('aria-label', 'Choisir un fichier de sauvegarde');
  entree.addEventListener('change', async () => {
    const [fichier] = entree.files;
    entree.value = '';
    if (fichier) {
      await demarrerImport(async () => importerFichier(await fichier.text()));
    }
  });
  return entree;
}

function creerBlocImport(contexte, apresImport) {
  const bloc = creer('div', 'reglages__bloc');
  const zone = creerZoneDeCode('Code de sauvegarde à coller', { lectureSeule: false });
  const message = creerMessage('alert');
  const demarrerImport = (lire) => importer(lire, { contexte, message, apresImport });
  bloc.append(
    creer('h3', 'reglages__sous-titre', 'Récupérer une progression'),
    creerChoixDeFichier(demarrerImport),
    zone,
    creerBouton('Lire le code', 'bouton--secondaire', () => demarrerImport(() => importerCode(zone.value))),
    message,
  );
  return bloc;
}

/**
 * Construit la section de sauvegarde et de récupération de la progression.
 * @param {Object} contexte Contexte de l'application.
 * @param {function(): void} apresImport Appelée après un import réussi (l'écran se redessine).
 * @returns {HTMLElement}
 */
export function creerSectionTransfert(contexte, apresImport) {
  const groupe = creer('section', 'reglages__groupe');
  groupe.append(
    creer('h2', 'reglages__titre-groupe', 'Passer de la tablette au PC'),
    creerBlocExport(contexte),
    creerBlocImport(contexte, apresImport),
  );
  return groupe;
}
