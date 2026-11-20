/**
 * Logique du Carnet de l'élève : tout ce que l'écran affiche, calculé ici sans toucher au DOM ni au stockage.
 * Fonctions pures : les données et la date du jour sont fournies, rien n'est écrit.
 *
 * Forme de ce que renvoie `preparerCarnet(donnees, competencesParItem, date)` :
 *
 *   {
 *     titre: 'Carnet de Léa' ou 'Ton carnet' (prénom vide),
 *     semaine: {
 *       jours: [ // sept entrées, du lundi au dimanche
 *         { nom: 'lundi', initiale: 'L', jour: '2026-11-02', entraine: true, estAujourdhui: false,
 *           description: "lundi, jour d'entraînement" }, // texte lisible : jamais la couleur seule
 *         ...
 *       ],
 *       nombreDeJours: 3,
 *       phrase: "Cette semaine, 3 jours d'entraînement.",
 *     },
 *     mois: { nombreDeJours: 9, phrase: "Ce mois-ci, 9 jours d'entraînement." }, // mois civil
 *     progres: {
 *       periode: 'deux-semaines' | 'semaine' | 'aucune',
 *       sujets: ['les homophones a / à'], // 3 au plus
 *       phrase: 'Ces deux dernières semaines, tu progresses sur les homophones a / à.',
 *     },
 *     aRetravailler: {
 *       sujets: ['le futur'], // 3 au plus, les plus ratés d'abord
 *       phrase: "On s'entraîne encore sur le futur.",
 *     },
 *     badges: [{ badge, gagne }], // tel que renvoyé par `badgesAffiches` (badges.js)
 *   }
 *
 * Les phrases ne contiennent ni pourcentage, ni « 3 sur 5 », ni nombre d'échecs (cahier §6.6).
 * Le prénom est lu dans les données au moment de l'appel, jamais écrit dans le code.
 *
 * `competencesParItem` associe l'id d'un item de contenu à ses compétences : voir `creerTableCompetences`.
 *
 * Ce qui est vérifié sur l'historique (lecture du code, pas de supposition) :
 *  - `historique[].competencesRatees` et `historique[].date` (AAAA-MM-JJ) sont écrits par `enregistrerSeance`
 *    pour tous les modules : c'est la seule source utilisée pour compter les échecs.
 *  - `historique[].itemId` n'est PAS utilisé : orthographe, grammaire et vocabulaire y écrivent un identifiant
 *    de séance composé (`identifiantSeance`), dictée, conjugaison et lecture l'id de l'item.
 *  - `repetition[idItem]` est toujours indexé par l'id réel d'un item de contenu (`resultatsParItem`).
 */

import { badgesAffiches } from './badges.js';
import { libelleCompetence, libelleModule } from './carnet-libelles.js';
import { ecartEnJours, joursEntrainementMois, joursEntrainementSemaine, versJour } from './progression.js';

/** Période des progrès récents, et sa période de secours si rien n'y apparaît. */
export const JOURS_PROGRES = 14;
export const JOURS_PROGRES_SECOURS = 7;
/** Nombre d'échecs d'une compétence, avant la période récente, qui rend un progrès possible. */
export const ECHECS_AVANT_PROGRES = 2;
/** Fenêtre et seuil d'une compétence « à retravailler ». */
export const JOURS_A_RETRAVAILLER = 21;
export const ECHECS_A_RETRAVAILLER = 3;
/** Nombre maximum de compétences montrées dans chaque liste, pour ne pas décourager. */
export const NOMBRE_MAX_SUJETS = 3;

export const PERIODE_DEUX_SEMAINES = 'deux-semaines';
export const PERIODE_SEMAINE = 'semaine';
export const PERIODE_AUCUNE = 'aucune';

/** Un item revenu en boîte 1 de la répétition espacée vient d'être raté ; toute autre boîte vient d'une réussite. */
const BOITE_APRES_ECHEC = 1;

const NOMS_DES_JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const JOURS_PAR_SEMAINE = NOMS_DES_JOURS.length;

const TITRE_SANS_PRENOM = 'Ton carnet';
const PHRASE_PAS_DE_SEANCE_SEMAINE = 'Pas encore de séance cette semaine.';
const PHRASE_PAS_DE_SEANCE_MOIS = 'Pas encore de séance ce mois-ci.';
const PHRASE_PATIENCE = "Les progrès arrivent petit à petit, continue de t'entraîner.";
const PHRASE_RIEN_A_RETRAVAILLER = 'Rien à retravailler pour le moment.';

// --- Table des compétences par item ---

/** Ajoute à `trouvees` chaque texte `competence` du noeud, quelle que soit sa profondeur (pièges, fautes, questions). */
function collecterCompetences(noeud, trouvees) {
  if (Array.isArray(noeud)) {
    noeud.forEach((element) => collecterCompetences(element, trouvees));
  } else if (noeud !== null && typeof noeud === 'object') {
    if (typeof noeud.competence === 'string') {
      trouvees.add(noeud.competence);
    }
    Object.values(noeud).forEach((valeur) => collecterCompetences(valeur, trouvees));
  }
}

/**
 * Associe l'id de chaque item de contenu à la liste de ses compétences.
 * Une dictée ou un texte de lecture en contient plusieurs. Un item sans compétence n'y figure pas.
 * @param {Object[]} items Items des fichiers de `data/` (le test de départ n'en fait pas partie).
 * @returns {Object<string, string[]>}
 */
export function creerTableCompetences(items) {
  const table = {};
  for (const item of items) {
    const competences = new Set();
    collecterCompetences(item, competences);
    if (competences.size > 0) {
      table[item.id] = [...competences];
    }
  }
  return table;
}

// --- Les échecs de l'historique, regroupés par sujet ---

/** Un échec par compétence ratée : son sujet (libellé), son module et son jour. */
function listerLesEchecs(historique) {
  return historique.flatMap(({ module, date, competencesRatees }) =>
    competencesRatees.map((competence) => ({
      sujet: libelleCompetence(competence) ?? libelleModule(module),
      module,
      jour: date,
    })),
  );
}

/** Regroupe les échecs par sujet : combien, le dernier jour, et dans quels modules. */
function regrouperParSujet(echecs) {
  const groupes = new Map();
  for (const { sujet, module, jour } of echecs) {
    const groupe = groupes.get(sujet) ?? { sujet, nombre: 0, dernierJour: jour, modules: new Set() };
    groupe.nombre += 1;
    groupe.dernierJour = jour > groupe.dernierJour ? jour : groupe.dernierJour;
    groupe.modules.add(module);
    groupes.set(sujet, groupe);
  }
  return [...groupes.values()];
}

/** Les plus ratés d'abord ; à égalité, l'ordre alphabétique garde un résultat stable. */
function trierParEchecs(groupes) {
  return groupes.sort((a, b) => b.nombre - a.nombre || a.sujet.localeCompare(b.sujet, 'fr'));
}

/** Vrai si le jour est l'un des `nombreDeJours` derniers jours, aujourd'hui compris (jamais dans le futur). */
function estDansLesDerniersJours(jour, jourCourant, nombreDeJours) {
  const ecart = ecartEnJours(jour, jourCourant);
  return ecart >= 0 && ecart < nombreDeJours;
}

// --- Compétences à retravailler ---

/** Pour chaque sujet, le dernier jour où un item de ce sujet a été réussi (d'après la répétition espacée). */
function derniereReussiteParSujet(repetition, competencesParItem) {
  const reussites = new Map();
  for (const [idItem, entree] of Object.entries(repetition)) {
    if (entree.boite === BOITE_APRES_ECHEC || !Object.hasOwn(competencesParItem, idItem)) {
      continue;
    }
    for (const sujet of competencesParItem[idItem].map(libelleCompetence).filter(Boolean)) {
      if (entree.dernierJour > (reussites.get(sujet) ?? '')) {
        reussites.set(sujet, entree.dernierJour);
      }
    }
  }
  return reussites;
}

/**
 * Sujets ratés au moins `ECHECS_A_RETRAVAILLER` fois sur les `JOURS_A_RETRAVAILLER` derniers jours,
 * sans réussite mesurée depuis leur dernier échec. Le compteur cumulé `carnet.competencesRatees`
 * ne baisse jamais : il n'est pas utilisé ici. Liste complète, du plus raté au moins raté : les filtres
 * (progrès) et le plafond de `NOMBRE_MAX_SUJETS` sont appliqués par `preparerCarnet`.
 */
function sujetsARetravailler(activite, donnees, competencesParItem) {
  const { echecs, jourCourant } = activite;
  const reussites = derniereReussiteParSujet(donnees.repetition, competencesParItem);
  const recents = echecs.filter((echec) => estDansLesDerniersJours(echec.jour, jourCourant, JOURS_A_RETRAVAILLER));
  const aRetravailler = regrouperParSujet(recents).filter(
    (groupe) => groupe.nombre >= ECHECS_A_RETRAVAILLER && (reussites.get(groupe.sujet) ?? '') <= groupe.dernierJour,
  );
  return trierParEchecs(aRetravailler).map((groupe) => groupe.sujet);
}

// --- Progrès récents ---

/**
 * Sujets en progrès sur les `jours` derniers jours : ratés au moins `ECHECS_AVANT_PROGRES` fois avant,
 * plus ratés depuis, alors qu'une séance d'un de leurs modules a été jouée depuis.
 * C'est une estimation : aucune réussite par compétence n'est enregistrée.
 */
function sujetsEnProgres(activite, jours) {
  const { echecs, historique, jourCourant } = activite;
  const estRecent = (jour) => estDansLesDerniersJours(jour, jourCourant, jours);
  const sujetsRatesDepuis = new Set(echecs.filter((echec) => estRecent(echec.jour)).map((echec) => echec.sujet));
  const modulesJouesDepuis = new Set(historique.filter((seance) => estRecent(seance.date)).map((seance) => seance.module));
  const avant = echecs.filter((echec) => ecartEnJours(echec.jour, jourCourant) >= jours);
  const enProgres = regrouperParSujet(avant).filter(
    (groupe) =>
      groupe.nombre >= ECHECS_AVANT_PROGRES &&
      !sujetsRatesDepuis.has(groupe.sujet) &&
      [...groupe.modules].some((module) => modulesJouesDepuis.has(module)),
  );
  return trierParEchecs(enProgres).slice(0, NOMBRE_MAX_SUJETS).map((groupe) => groupe.sujet);
}

/** Les progrès sur deux semaines, sinon sur la semaine, sinon rien. */
function chercherLesProgres(activite) {
  const surDeuxSemaines = sujetsEnProgres(activite, JOURS_PROGRES);
  if (surDeuxSemaines.length > 0) {
    return { periode: PERIODE_DEUX_SEMAINES, sujets: surDeuxSemaines };
  }
  const surLaSemaine = sujetsEnProgres(activite, JOURS_PROGRES_SECOURS);
  if (surLaSemaine.length > 0) {
    return { periode: PERIODE_SEMAINE, sujets: surLaSemaine };
  }
  return { periode: PERIODE_AUCUNE, sujets: [] };
}

// --- Phrases ---

/** « a », « a et b », « a, b et c ». */
function listeEnFrancais(elements) {
  if (elements.length <= 1) {
    return elements.join('');
  }
  return `${elements.slice(0, -1).join(', ')} et ${elements.at(-1)}`;
}

function texteJours(nombre) {
  return `${nombre} ${nombre > 1 ? 'jours' : 'jour'}`;
}

function phraseSemaine(nombreDeJours) {
  return nombreDeJours === 0 ? PHRASE_PAS_DE_SEANCE_SEMAINE : `Cette semaine, ${texteJours(nombreDeJours)} d'entraînement.`;
}

function phraseMois(nombreDeJours) {
  return nombreDeJours === 0 ? PHRASE_PAS_DE_SEANCE_MOIS : `Ce mois-ci, ${texteJours(nombreDeJours)} d'entraînement.`;
}

/**
 * La phrase des progrès récents.
 * @param {{periode: string, sujets: string[]}} progres Voir `PERIODE_*`.
 * @param {number} nombreDeJoursSemaine Jours d'entraînement de la semaine (choisit le message quand il n'y a aucun progrès).
 * @returns {string}
 */
export function phraseProgres({ periode, sujets }, nombreDeJoursSemaine) {
  if (periode === PERIODE_DEUX_SEMAINES) {
    return `Ces deux dernières semaines, tu progresses sur ${listeEnFrancais(sujets)}.`;
  }
  if (periode === PERIODE_SEMAINE) {
    return `Cette semaine, tu progresses sur ${listeEnFrancais(sujets)}.`;
  }
  return nombreDeJoursSemaine === 0 ? PHRASE_PAS_DE_SEANCE_SEMAINE : PHRASE_PATIENCE;
}

/**
 * La phrase des compétences à retravailler.
 * @param {string[]} sujets Libellés, 3 au plus.
 * @returns {string}
 */
export function phraseARetravailler(sujets) {
  return sujets.length === 0 ? PHRASE_RIEN_A_RETRAVAILLER : `On s'entraîne encore sur ${listeEnFrancais(sujets)}.`;
}

// --- Jours d'entraînement ---

/** Les sept jours de la semaine (lundi à dimanche) qui contient `date`, chacun avec son texte lisible. */
function joursDeLaSemaine(donnees, date) {
  const entraines = new Set(joursEntrainementSemaine(donnees, date));
  const aujourdhui = versJour(date);
  const joursDepuisLundi = (date.getDay() + JOURS_PAR_SEMAINE - 1) % JOURS_PAR_SEMAINE;
  return NOMS_DES_JOURS.map((nom, rang) => {
    const jour = versJour(new Date(date.getFullYear(), date.getMonth(), date.getDate() - joursDepuisLundi + rang));
    const entraine = entraines.has(jour);
    return {
      nom,
      initiale: nom[0].toUpperCase(),
      jour,
      entraine,
      estAujourdhui: jour === aujourdhui,
      description: entraine ? `${nom}, jour d'entraînement` : `${nom}, pas d'entraînement`,
    };
  });
}

/**
 * Titre du carnet : « Carnet de <prénom> », ou « Ton carnet » si le prénom est vide.
 * @param {import('./stockage.js').DonneesLexia} donnees
 * @returns {string}
 */
export function titreDuCarnet(donnees) {
  const prenom = donnees.profil.prenom.trim();
  return prenom === '' ? TITRE_SANS_PRENOM : `Carnet de ${prenom}`;
}

/**
 * Prépare tout ce que l'écran du Carnet affiche.
 * @param {import('./stockage.js').DonneesLexia} donnees
 * @param {Object<string, string[]>} competencesParItem Voir `creerTableCompetences`.
 * @param {Date} date Date du jour (injectée).
 * @returns {Object} Voir la forme décrite en tête de fichier.
 */
export function preparerCarnet(donnees, competencesParItem, date) {
  const activite = { echecs: listerLesEchecs(donnees.historique), historique: donnees.historique, jourCourant: versJour(date) };
  const jours = joursDeLaSemaine(donnees, date);
  const nombreDeJoursSemaine = jours.filter((jour) => jour.entraine).length;
  const nombreDeJoursMois = joursEntrainementMois(donnees, date).length;
  const progres = chercherLesProgres(activite);
  // Un sujet en progrès n'est pas redonné à retravailler : le Carnet ne dit pas les deux à la fois.
  const aRetravailler = sujetsARetravailler(activite, donnees, competencesParItem)
    .filter((sujet) => !progres.sujets.includes(sujet))
    .slice(0, NOMBRE_MAX_SUJETS);
  return {
    titre: titreDuCarnet(donnees),
    semaine: { jours, nombreDeJours: nombreDeJoursSemaine, phrase: phraseSemaine(nombreDeJoursSemaine) },
    mois: { nombreDeJours: nombreDeJoursMois, phrase: phraseMois(nombreDeJoursMois) },
    progres: { ...progres, phrase: phraseProgres(progres, nombreDeJoursSemaine) },
    aRetravailler: { sujets: aRetravailler, phrase: phraseARetravailler(aRetravailler) },
    badges: badgesAffiches(donnees),
  };
}
