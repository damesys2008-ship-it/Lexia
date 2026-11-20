// Validation du type `fonctions` (chasse aux fonctions) de `grammaire.json`.
// Contrat : .equipe/ressources/schemas-grammaire.md §4

import { estListeDeTextes, estObjet } from './contenu-outils.js';
import { reglesMotsEgalPhrase } from './contenu-grammaire-outils.js';

/** Les fonctions possibles, dans l'ordre de la légende. */
export const FONCTIONS = ['verbe', 'sujet', 'cod', 'coi', 'cc'];

const FONCTIONS_PAR_NIVEAU = {
  1: { obligatoires: ['verbe', 'sujet'], parmi: [], interdites: ['cod', 'coi', 'cc'] },
  2: { obligatoires: ['verbe', 'sujet'], parmi: ['cod', 'cc'], interdites: ['coi'] },
  3: { obligatoires: ['verbe', 'sujet', 'coi'], parmi: ['cod', 'cc'], interdites: [] },
};
const OCCURRENCES_MAX = { verbe: 1, sujet: 1, cod: 1, coi: 1, cc: 2 };

function estEntierNaturel(valeur) {
  return Number.isInteger(valeur) && valeur >= 0;
}

// --- Demandées ---

function sontDansLOrdre(demandees) {
  const positions = demandees.map((fonction) => FONCTIONS.indexOf(fonction));
  return positions.every((position, index) => position >= 0 && (index === 0 || position > positions[index - 1]));
}

function reglesNiveauDesDemandees(demandees, niveau) {
  const attendues = FONCTIONS_PAR_NIVEAU[niveau];
  if (attendues === undefined) {
    return [];
  }
  const regles = [];
  attendues.obligatoires
    .filter((fonction) => !demandees.includes(fonction))
    .forEach((fonction) => regles.push(`demandees au niveau ${niveau} doit contenir « ${fonction} »`));
  attendues.interdites
    .filter((fonction) => demandees.includes(fonction))
    .forEach((fonction) => regles.push(`demandees au niveau ${niveau} ne doit pas contenir « ${fonction} »`));
  if (attendues.parmi.length > 0 && !attendues.parmi.some((fonction) => demandees.includes(fonction))) {
    regles.push(`demandees au niveau ${niveau} doit contenir « cod » et/ou « cc »`);
  }
  return regles;
}

function reglesDemandees(item) {
  const { demandees } = item;
  if (!Array.isArray(demandees) || demandees.length === 0) {
    return ['demandees doit être une liste non vide de fonctions'];
  }
  if (!sontDansLOrdre(demandees)) {
    return [`demandees doit être un sous-ensemble sans doublon de ${FONCTIONS.join(', ')}, dans cet ordre`];
  }
  return reglesNiveauDesDemandees(demandees, item.niveau);
}

// --- Groupes ---

function reglesBornes(groupe, nombreDeMots, lieu) {
  if (!estEntierNaturel(groupe.debut) || !estEntierNaturel(groupe.fin)) {
    return [`${lieu} : debut et fin doivent être des entiers naturels (0, 1, 2…)`];
  }
  if (groupe.debut > groupe.fin || groupe.fin >= nombreDeMots) {
    return [`${lieu} : il faut 0 <= debut <= fin < ${nombreDeMots}`];
  }
  return [];
}

function reglesGroupe(groupe, position, item) {
  const lieu = `groupes[${position}]`;
  if (!estObjet(groupe)) {
    return [`${lieu} doit être un objet`];
  }
  const regles = reglesBornes(groupe, item.mots.length, lieu);
  if (!FONCTIONS.includes(groupe.fonction)) {
    regles.push(`${lieu} : fonction doit être l'une de ${FONCTIONS.join(', ')}`);
  } else if (!item.demandees.includes(groupe.fonction)) {
    regles.push(`${lieu} : la fonction « ${groupe.fonction} » n'est pas dans demandees`);
  }
  return regles;
}

function reglesOrdreDesGroupes(groupes) {
  const regles = [];
  groupes.slice(1).forEach((groupe, index) => {
    const precedent = groupes[index];
    if (groupe.debut <= precedent.fin) {
      regles.push(`groupes[${index + 1}] : doit commencer après la fin du groupe précédent (groupes triés, sans chevauchement)`);
    }
  });
  return regles;
}

function reglesOccurrences(item) {
  const regles = [];
  for (const fonction of item.demandees) {
    const occurrences = item.groupes.filter((groupe) => groupe.fonction === fonction).length;
    if (occurrences === 0) {
      regles.push(`groupes doit contenir la fonction demandée « ${fonction} »`);
    } else if (occurrences > OCCURRENCES_MAX[fonction]) {
      regles.push(`groupes : « ${fonction} » apparaît ${occurrences} fois (au plus ${OCCURRENCES_MAX[fonction]})`);
    }
  }
  return regles;
}

function reglesGroupes(item) {
  if (!Array.isArray(item.groupes) || item.groupes.length === 0) {
    return ['groupes doit être une liste non vide'];
  }
  const regles = item.groupes.flatMap((groupe, position) => reglesGroupe(groupe, position, item));
  if (regles.length > 0) {
    return regles;
  }
  return [...reglesOrdreDesGroupes(item.groupes), ...reglesOccurrences(item)];
}

// --- Point d'entrée ---

/**
 * Règles propres au type `fonctions`.
 * @param {*} item
 * @returns {string[]}
 */
export function reglesFonctions(item) {
  if (!estListeDeTextes(item.mots) || item.mots.length === 0) {
    return ['mots doit être une liste non vide de textes non vides'];
  }
  const reglesDeDemandees = reglesDemandees(item);
  const demandeesUtilisables = reglesDeDemandees.length === 0;
  return [
    ...reglesMotsEgalPhrase(item, item.mots),
    ...reglesDeDemandees,
    ...(demandeesUtilisables ? reglesGroupes(item) : []),
  ];
}
