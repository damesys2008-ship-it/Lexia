// Les textes de la page « Confirmer un lien de mail » : ce que l'élève lit avant de se laisser connecter.
// Pas de réseau, jamais de jeton (la page ne reçoit que la nature du lien et deux adresses).

import { ESPACE_INSECABLE } from './formulaire-logique.js';

/**
 * Ce que la page écrit pour un lien qui attend sa confirmation.
 * @param {{nature: string, email: string, emailSessionActuelle: string|null}} lien Ce que rend `lireLienEnAttente()`.
 * @returns {{titre: string, introduction: string, avertissement: string|null}}
 *   `avertissement` : à montrer seulement si le lien remplacerait un autre compte déjà connecté.
 */
export function decrireLien({ nature, email, emailSessionActuelle }) {
  const pourUnMotDePasse = nature === 'recovery';
  const objet = pourUnMotDePasse ? 'choisir un nouveau mot de passe pour' : 'ouvrir';
  return {
    titre: pourUnMotDePasse
      ? `Un nouveau mot de passe${ESPACE_INSECABLE}?`
      : `C'est bien ton compte${ESPACE_INSECABLE}?`,
    introduction: `Ce lien veut ${objet} le compte${ESPACE_INSECABLE}:`,
    avertissement: decrireLeRemplacement(email, emailSessionActuelle),
  };
}

/** Une phrase si un autre compte est déjà connecté sur cet appareil ; sinon rien. */
function decrireLeRemplacement(email, emailSessionActuelle) {
  if (emailSessionActuelle === null || emailSessionActuelle === email) {
    return null;
  }
  return `Cet appareil est connecté au compte ${emailSessionActuelle}${ESPACE_INSECABLE}: `
    + 'si tu confirmes, ce compte sera remplacé.';
}
