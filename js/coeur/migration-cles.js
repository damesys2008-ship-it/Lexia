/**
 * Changement de nom d'une clé de stockage sans perdre les données de l'élève :
 * on copie la valeur, on relit la copie, et seulement ensuite on supprime l'ancienne clé.
 */

/**
 * Déplace la valeur de `ancienneCle` vers `nouvelleCle`, une seule fois.
 * - `nouvelleCle` absente : copie, relecture, puis suppression de l'ancienne.
 * - `nouvelleCle` déjà présente : elle gagne et n'est jamais écrasée ; l'ancienne est supprimée.
 * Ne lève jamais d'exception : si le stockage est bloqué ou plein, rien n'est supprimé.
 *
 * @param {{getItem: Function, setItem: Function, removeItem: Function}} support localStorage ou un faux support.
 * @param {string} ancienneCle
 * @param {string} nouvelleCle
 * @returns {string} La clé à lire ensuite : `nouvelleCle`, ou `ancienneCle` si la copie n'a pas pu se faire.
 */
export function migrerCle(support, ancienneCle, nouvelleCle) {
  try {
    const ancienneValeur = support.getItem(ancienneCle);
    if (ancienneValeur === null) {
      return nouvelleCle;
    }
    const nouvelleCleAbsente = support.getItem(nouvelleCle) === null;
    if (nouvelleCleAbsente && !copierEtVerifier(support, nouvelleCle, ancienneValeur)) {
      return ancienneCle;
    }
  } catch {
    // Stockage bloqué ou plein : on ne supprime rien, les données restent sous l'ancienne clé.
    return ancienneCle;
  }
  supprimerSansBloquer(support, ancienneCle);
  return nouvelleCle;
}

/** Écrit la valeur puis la relit. Si la copie n'est pas identique, elle est retirée : une copie fausse ne doit jamais gagner. */
function copierEtVerifier(support, cle, valeur) {
  support.setItem(cle, valeur);
  if (support.getItem(cle) === valeur) {
    return true;
  }
  support.removeItem(cle);
  return false;
}

function supprimerSansBloquer(support, cle) {
  try {
    support.removeItem(cle);
  } catch {
    // La copie est bonne : l'ancienne clé restante est sans effet (la nouvelle gagne) et sera retentée au prochain chargement.
  }
}
