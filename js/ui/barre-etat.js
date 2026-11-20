// Barre d'état de l'en-tête : le total d'étoiles, mis à jour à chaque changement d'écran.

/** Événement à envoyer sur la fenêtre quand les données changent sans changer d'écran (import, réinitialisation). */
export const EVENEMENT_DONNEES_CHANGEES = 'lexia:donnees-changees';

function motEtoile(nombre) {
  return nombre > 1 ? 'étoiles' : 'étoile';
}

/**
 * Texte lu par les lecteurs d'écran : « 0 étoile », « 1 étoile », « 12 étoiles ».
 * @param {number} nombre
 * @returns {string}
 */
export function libelleEtoiles(nombre) {
  return `${nombre} ${motEtoile(nombre)}`;
}

function creerElement(document, balise, classe, texte) {
  const element = document.createElement(balise);
  element.className = classe;
  element.textContent = texte;
  return element;
}

/**
 * Le chip d'étoiles : un lien vers la garde-robe. L'étoile est dessinée par le CSS (décorative),
 * le libellé complet est porté par `aria-label`.
 */
function creerBadgeEtoiles(document, nombre) {
  const badge = creerElement(document, 'a', 'etoiles', '');
  badge.setAttribute('href', '#/garde-robe');
  badge.setAttribute('aria-label', `Mes étoiles : ${nombre}. Aller à la garde-robe`);
  const symbole = creerElement(document, 'span', 'etoiles__symbole', '');
  symbole.setAttribute('aria-hidden', 'true');
  badge.append(symbole, creerElement(document, 'span', 'etoiles__nombre', String(nombre)));
  return badge;
}

/**
 * Affiche les étoiles dans la barre d'état et les remet à jour au changement de route
 * et à chaque `EVENEMENT_DONNEES_CHANGEES`.
 * @param {Object} options
 * @param {HTMLElement} options.conteneur Élément `#barre-etat`.
 * @param {function(): number} options.lireEtoiles Renvoie le total d'étoiles courant.
 * @param {Window} [options.fenetre]
 * @returns {{rafraichir: function(): void}}
 */
export function brancherBarreEtat({ conteneur, lireEtoiles, fenetre = globalThis.window }) {
  function rafraichir() {
    conteneur.replaceChildren(creerBadgeEtoiles(fenetre.document, lireEtoiles()));
  }
  fenetre.addEventListener('hashchange', rafraichir);
  fenetre.addEventListener(EVENEMENT_DONNEES_CHANGEES, rafraichir);
  rafraichir();
  return { rafraichir };
}
