// Alignement mot à mot entre une saisie et un texte attendu.

const COUT_AJOUT_OU_RETRAIT = 100;
const COUT_SUBSTITUTION_MIN = 100;
// Le surcoût reste sous COUT_SUBSTITUTION_MIN : remplacer un mot coûte
// toujours moins qu'un retrait plus un ajout (150 contre 200).
const SURCOUT_SUBSTITUTION_MAX = 50;

/**
 * @typedef {Object} OperationAlignement
 * @property {'juste'|'faux'|'manquant'|'enTrop'} type
 * @property {number|null} indiceAttendu  index dans les mots attendus (null si « enTrop »)
 * @property {number|null} indiceSaisi    index dans les mots saisis (null si « manquant »)
 * @property {string|null} attendu        mot attendu (null si « enTrop »)
 * @property {string|null} saisi          mot saisi (null si « manquant »)
 */

/**
 * Distance d'édition entre deux mots, lettre par lettre.
 * @param {string} motA
 * @param {string} motB
 * @returns {number}
 */
export function distanceLettres(motA, motB) {
  let ligne = Array.from({ length: motB.length + 1 }, (_, colonne) => colonne);
  for (let i = 1; i <= motA.length; i++) {
    const nouvelleLigne = [i];
    for (let j = 1; j <= motB.length; j++) {
      const cout = motA[i - 1] === motB[j - 1] ? 0 : 1;
      nouvelleLigne[j] = Math.min(
        ligne[j] + 1,
        nouvelleLigne[j - 1] + 1,
        ligne[j - 1] + cout,
      );
    }
    ligne = nouvelleLigne;
  }
  return ligne[motB.length];
}

/**
 * Coût de la mise en correspondance de deux mots : 0 s'ils sont égaux,
 * sinon entre 100 et 150 selon leur ressemblance. Ce léger écart sert à
 * départager deux alignements de même coût : on associe les mots qui se
 * ressemblent.
 *
 * @param {string} attendu
 * @param {string} saisi
 * @returns {number}
 */
function coutSubstitution(attendu, saisi) {
  if (attendu === saisi) {
    return 0;
  }
  const longueurMax = Math.max(attendu.length, saisi.length);
  const dissemblance = distanceLettres(attendu, saisi) / longueurMax;
  return COUT_SUBSTITUTION_MIN + Math.round(SURCOUT_SUBSTITUTION_MAX * dissemblance);
}

/**
 * Remplit le tableau des coûts minimaux : couts[i][j] est le coût pour
 * aligner les i premiers mots attendus et les j premiers mots saisis.
 *
 * @param {string[]} motsAttendus
 * @param {string[]} motsSaisis
 * @returns {number[][]}
 */
function calculerCouts(motsAttendus, motsSaisis) {
  const couts = Array.from({ length: motsAttendus.length + 1 }, () =>
    new Array(motsSaisis.length + 1).fill(0),
  );
  for (let i = 1; i <= motsAttendus.length; i++) {
    couts[i][0] = i * COUT_AJOUT_OU_RETRAIT;
  }
  for (let j = 1; j <= motsSaisis.length; j++) {
    couts[0][j] = j * COUT_AJOUT_OU_RETRAIT;
  }
  for (let i = 1; i <= motsAttendus.length; i++) {
    for (let j = 1; j <= motsSaisis.length; j++) {
      couts[i][j] = Math.min(
        couts[i - 1][j - 1] + coutSubstitution(motsAttendus[i - 1], motsSaisis[j - 1]),
        couts[i - 1][j] + COUT_AJOUT_OU_RETRAIT,
        couts[i][j - 1] + COUT_AJOUT_OU_RETRAIT,
      );
    }
  }
  return couts;
}

/**
 * Construit une opération d'alignement à partir des indices (null = absent).
 * Un mot présent des deux côtés est « juste » s'il est identique, « faux » sinon.
 */
function operation(indiceAttendu, indiceSaisi, motsAttendus, motsSaisis) {
  const attendu = indiceAttendu === null ? null : motsAttendus[indiceAttendu];
  const saisi = indiceSaisi === null ? null : motsSaisis[indiceSaisi];
  let type = 'faux';
  if (saisi === null) {
    type = 'manquant';
  } else if (attendu === null) {
    type = 'enTrop';
  } else if (attendu === saisi) {
    type = 'juste';
  }
  return { type, indiceAttendu, indiceSaisi, attendu, saisi };
}

/**
 * Remonte le tableau des coûts depuis la fin. À coût égal on préfère,
 * dans cet ordre : associer deux mots, signaler un mot manquant, puis
 * un mot en trop.
 */
function remonterOperations(couts, motsAttendus, motsSaisis) {
  const operations = [];
  let i = motsAttendus.length;
  let j = motsSaisis.length;
  while (i > 0 || j > 0) {
    const coutAssociation = i > 0 && j > 0
      ? couts[i - 1][j - 1] + coutSubstitution(motsAttendus[i - 1], motsSaisis[j - 1])
      : null;
    if (couts[i][j] === coutAssociation) {
      operations.push(operation(i - 1, j - 1, motsAttendus, motsSaisis));
      i--;
      j--;
    } else if (i > 0 && couts[i][j] === couts[i - 1][j] + COUT_AJOUT_OU_RETRAIT) {
      operations.push(operation(i - 1, null, motsAttendus, motsSaisis));
      i--;
    } else {
      operations.push(operation(null, j - 1, motsAttendus, motsSaisis));
      j--;
    }
  }
  return operations.reverse();
}

/**
 * Aligne mot à mot les mots saisis sur les mots attendus (distance
 * d'édition sur les mots). La comparaison est exacte : majuscules,
 * accents et ponctuation collée au mot comptent.
 *
 * @param {string[]} motsAttendus
 * @param {string[]} motsSaisis
 * @returns {OperationAlignement[]} opérations dans l'ordre de lecture
 */
export function alignerMots(motsAttendus, motsSaisis) {
  const couts = calculerCouts(motsAttendus, motsSaisis);
  return remonterOperations(couts, motsAttendus, motsSaisis);
}
