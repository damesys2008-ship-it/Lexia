// Logique pure du composant « relier » : l'état des traits et le mélange des colonnes.
// Aucun accès au DOM : tout est testable dans Node.
//
// Vocabulaire : un « trait » relie un élément de la colonne de gauche à un élément de la colonne de droite.
// Un trait est un objet `{ gaucheId, droiteId }`. Les listes de traits ne sont jamais modifiées sur place.

const MAX_ESSAIS_DE_MELANGE = 200;

/**
 * Ajoute un trait. Un nouveau trait depuis (ou vers) une pastille déjà reliée remplace l'ancien.
 * @param {{ gaucheId: string, droiteId: string }[]} traits Traits actuels.
 * @param {string} gaucheId Élément de gauche.
 * @param {string} droiteId Élément de droite.
 * @returns {{ gaucheId: string, droiteId: string }[]} Nouvelle liste.
 */
export function ajouterTrait(traits, gaucheId, droiteId) {
  const restants = traits.filter((trait) => trait.gaucheId !== gaucheId && trait.droiteId !== droiteId);
  return [...restants, { gaucheId, droiteId }];
}

/**
 * Supprime le trait qui part d'un élément de gauche.
 * @param {{ gaucheId: string, droiteId: string }[]} traits
 * @param {string} gaucheId
 * @returns {{ gaucheId: string, droiteId: string }[]}
 */
export function supprimerTrait(traits, gaucheId) {
  return traits.filter((trait) => trait.gaucheId !== gaucheId);
}

/**
 * Indique si chaque élément de gauche a son trait.
 * @param {{ gaucheId: string, droiteId: string }[]} traits
 * @param {{ id: string }[]} gauche Éléments de la colonne de gauche.
 * @returns {boolean} `false` pour une colonne vide : il n'y a rien à vérifier.
 */
export function toutEstRelie(traits, gauche) {
  if (gauche.length === 0) {
    return false;
  }
  return gauche.every((element) => traits.some((trait) => trait.gaucheId === element.id));
}

/**
 * Générateur pseudo-aléatoire déterministe (mulberry32) : même graine, même suite.
 * @param {number} graine Entier.
 * @returns {() => number} Fonction qui renvoie un nombre dans [0, 1).
 */
export function creerAleatoire(graine) {
  let etat = graine >>> 0;
  return () => {
    etat = (etat + 0x6d2b79f5) >>> 0;
    let valeur = etat;
    valeur = Math.imul(valeur ^ (valeur >>> 15), valeur | 1);
    valeur ^= valeur + Math.imul(valeur ^ (valeur >>> 7), valeur | 61);
    return ((valeur ^ (valeur >>> 14)) >>> 0) / 4294967296;
  };
}

function melanger(liste, aleatoire) {
  const copie = [...liste];
  for (let i = copie.length - 1; i > 0; i -= 1) {
    const j = Math.floor(aleatoire() * (i + 1));
    [copie[i], copie[j]] = [copie[j], copie[i]];
  }
  return copie;
}

/**
 * Compte les lignes où l'élément de droite est une bonne réponse pour l'élément de gauche en face.
 * @param {{ id: string }[]} gauche
 * @param {{ correspond: string[] }[]} droite
 * @returns {number}
 */
export function compterAlignements(gauche, droite) {
  return gauche.filter((element, position) => droite[position].correspond.includes(element.id)).length;
}

/**
 * Mélange les deux colonnes de façon reproductible, sans qu'aucune ligne soit en face de sa réponse.
 *
 * Chaque élément de droite liste les éléments de gauche auxquels il répond (`correspond`). Quand deux
 * formes sont identiques (« je mange » et « il mange »), la même carte répond à plusieurs éléments de
 * gauche : toutes ces réponses sont évitées en face de chacun.
 * Si c'est impossible (un seul élément, ou toutes les cartes répondent à tous les éléments), le
 * mélange le moins aligné est renvoyé et `alignementsInevitables` dit combien de lignes restent alignées.
 *
 * @param {{ id: string, texte: string }[]} gauche
 * @param {{ id: string, texte: string, correspond: string[] }[]} droite
 * @param {number} graine Entier : la même graine donne toujours le même mélange.
 * @returns {{ gauche: object[], droite: object[], alignementsInevitables: number }}
 */
export function melangerSansAlignement(gauche, droite, graine) {
  const aleatoire = creerAleatoire(graine);
  const gaucheMelangee = melanger(gauche, aleatoire);
  let meilleure = null;
  for (let essai = 0; essai < MAX_ESSAIS_DE_MELANGE; essai += 1) {
    const candidate = melanger(droite, aleatoire);
    const alignements = compterAlignements(gaucheMelangee, candidate);
    if (meilleure === null || alignements < meilleure.alignements) {
      meilleure = { droite: candidate, alignements };
    }
    if (alignements === 0) {
      break;
    }
  }
  return { gauche: gaucheMelangee, droite: meilleure.droite, alignementsInevitables: meilleure.alignements };
}

/**
 * Retire les traits qui partent des éléments de gauche donnés (par exemple les traits faux).
 * @param {{ gaucheId: string, droiteId: string }[]} traits
 * @param {string[]} gaucheIds
 * @returns {{ gaucheId: string, droiteId: string }[]}
 */
export function retirerTraits(traits, gaucheIds) {
  return traits.filter((trait) => !gaucheIds.includes(trait.gaucheId));
}
