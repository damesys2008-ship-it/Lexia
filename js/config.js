// Réglages généraux du site. Les réglages par défaut de l'élève vivent dans stockage.js
// (une seule source) : on les ré-exporte ici pour que les écrans les trouvent avec le reste.

import { creerDonneesParDefaut } from './coeur/stockage.js';

export const NOM_SITE = 'Lexia';
export const VERSION_SITE = '1.0.0';

/** Réglages d'un nouvel utilisateur : volume, voix, texte plus grand, animations réduites… */
export const REGLAGES_PAR_DEFAUT = Object.freeze(creerDonneesParDefaut().reglages);

const HOTES_DE_DEVELOPPEMENT = ['localhost', '127.0.0.1', '[::1]'];

/**
 * Indique si le site tourne en développement : un item de contenu invalide y
 * déclenche alors une erreur bruyante, alors qu'il est ignoré en production.
 * @param {string} nomHote Nom d'hôte de la page (`location.hostname`).
 * @returns {boolean}
 */
export function estModeDeveloppement(nomHote) {
  return HOTES_DE_DEVELOPPEMENT.includes(nomHote);
}
