// Petits constructeurs d'éléments partagés par les écrans.
// Le texte passe toujours par `textContent` : jamais de HTML construit à partir de données.

/**
 * Crée un élément avec une classe et un texte.
 * @param {string} balise Nom de la balise (`div`, `p`, `h2`…).
 * @param {string} classe Valeur de l'attribut `class` (peut contenir plusieurs classes).
 * @param {string} [texte] Texte de l'élément, vide par défaut.
 * @returns {HTMLElement}
 */
export function creer(balise, classe, texte = '') {
  const element = globalThis.document.createElement(balise);
  element.className = classe;
  element.textContent = texte;
  return element;
}

/**
 * Crée un bouton d'action du design (`bouton` + une variante).
 * @param {string} texte Libellé du bouton.
 * @param {string} variante Classe de variante : `bouton--principal`, `bouton--secondaire`…
 * @param {function(): void} action Appelée au clic.
 * @returns {HTMLButtonElement}
 */
export function creerBouton(texte, variante, action) {
  const bouton = creer('button', `bouton ${variante}`, texte);
  bouton.type = 'button';
  bouton.addEventListener('click', action);
  return bouton;
}
