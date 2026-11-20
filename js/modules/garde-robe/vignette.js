// Vignette d'un accessoire : Pompon portant la pièce, cadré sur la zone concernée.
// Elle réutilise la mascotte : un seul dessin, donc la vignette montre exactement ce que verra l'élève.

import { creerMascotte } from '../../ui/mascotte.js';

/** Cadrage (attribut viewBox) par emplacement. Le dessin entier de Pompon est « 0 6 240 290 ». */
const CADRAGE = {
  tete: '56 70 128 110',
  pompons: '56 70 128 110',
  visage: '66 150 108 72',
  col: '56 186 128 80',
  corps: '24 120 192 170',
  dos: '24 120 192 170',
  main: '90 140 150 120',
  queue: '100 195 100 85',
  pieds: '56 225 128 62',
};

async function chargerTexte(adresse) {
  const reponse = await fetch(adresse);
  if (!reponse.ok) {
    throw new Error(`Impossible de charger ${adresse.href} (HTTP ${reponse.status})`);
  }
  return reponse.text();
}

/**
 * Un chargeur de SVG qui ne télécharge chaque fichier qu'une fois : les 61 vignettes partagent le dessin de Pompon.
 * @returns {function(URL): Promise<string>}
 */
export function creerChargeurAvecCache() {
  const textes = new Map();
  return (adresse) => {
    if (!textes.has(adresse.href)) {
      textes.set(adresse.href, chargerTexte(adresse));
    }
    return textes.get(adresse.href);
  };
}

/**
 * @param {{id: string, emplacement: string}} accessoire
 * @param {function(URL): Promise<string>} chargerSvg Le chargeur partagé (voir `creerChargeurAvecCache`).
 * @returns {Promise<SVGSVGElement>} Un Pompon cadré, décoratif (caché des lecteurs d'écran).
 *   Si le calque de l'accessoire manque, Pompon apparaît sans lui.
 */
export async function creerVignette(accessoire, chargerSvg) {
  const mascotte = await creerMascotte({
    accessoiresEquipes: { [accessoire.emplacement]: accessoire.id },
    chargerSvg,
  });
  mascotte.element.setAttribute('viewBox', CADRAGE[accessoire.emplacement]);
  mascotte.element.setAttribute('aria-hidden', 'true');
  return mascotte.element;
}
