// Chargement des feuilles de style à la demande : chaque composant ou module charge la sienne.

/**
 * Cherche une feuille déjà ajoutée à la page.
 * @param {Document} document Document de la page.
 * @param {string} adresse Adresse absolue de la feuille.
 * @returns {HTMLLinkElement|null}
 */
function trouverLien(document, adresse) {
  const liens = document.querySelectorAll('link[rel="stylesheet"]');
  return Array.from(liens).find((lien) => lien.href === adresse) ?? null;
}

/**
 * Attend qu'un lien soit chargé, ou échoue avec une erreur claire.
 * @param {HTMLLinkElement} lien Lien de feuille de style.
 * @returns {Promise<void>}
 */
function attendreChargement(lien) {
  return new Promise((resolve, reject) => {
    lien.addEventListener('load', () => resolve(), { once: true });
    lien.addEventListener(
      'error',
      () => {
        // Un lien en échec garde une feuille vide : on le retire pour que le prochain essai échoue aussi.
        lien.remove();
        reject(new Error(`Impossible de charger la feuille de style : ${lien.href}`));
      },
      { once: true },
    );
  });
}

/**
 * Ajoute une feuille de style à la page, une seule fois.
 * @param {string|URL} adresse Adresse de la feuille, souvent `new URL('../../css/x.css', import.meta.url)`.
 * @param {Document} [document] Document cible (injectable pour les tests).
 * @returns {Promise<void>} Résolue quand la feuille est chargée, rejetée si le chargement échoue.
 */
export function chargerFeuille(adresse, document = globalThis.document) {
  const adresseAbsolue = new URL(adresse, document.baseURI).href;
  const existant = trouverLien(document, adresseAbsolue);
  if (existant) {
    return existant.sheet ? Promise.resolve() : attendreChargement(existant);
  }
  const lien = document.createElement('link');
  lien.rel = 'stylesheet';
  lien.href = adresseAbsolue;
  const chargement = attendreChargement(lien);
  document.head.append(lien);
  return chargement;
}
