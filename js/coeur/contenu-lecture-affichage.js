// Garde des textes affichés à l'élève : refuse les échappements d'espace insécable cassés
// (« groupe00a0: » apparaît tel quel à l'écran) et les caractères invisibles.
// La règle est partagée : le contenu du test de départ s'en sert aussi.

import { textesDe } from './contenu-outils.js';

const REGLES_AFFICHAGE = [
  {
    motif: /[\p{L}\p{P}]00a0|00a0[\p{L}\p{P}]/iu,
    message: 'la séquence « 00a0 » collée à une lettre ou à une ponctuation (espace insécable cassée)',
  },
  { motif: /\\u[0-9a-f]{4}/i, message: 'échappement « \\uXXXX » écrit dans le texte' },
  { motif: /&nbsp;/i, message: '« &nbsp; » écrit dans le texte (écrire U+00A0)' },
  { motif: /\p{Cc}/u, message: 'caractère de contrôle (retour à la ligne, tabulation…) interdit' },
];

/**
 * Règles violées par les textes affichés d'un item (titre, paragraphes, questions, choix, indices,
 * explications, cibles, leurres…) : tout texte de l'item sauf son identifiant.
 * @param {Object} item
 * @returns {string[]} une phrase par règle violée, sans l'id (à préfixer avec `decrire`)
 */
export function reglesTextesAffiches(item) {
  const textes = textesDe({ ...item, id: undefined });
  return REGLES_AFFICHAGE
    .filter(({ motif }) => textes.some((texte) => motif.test(texte)))
    .map(({ message }) => `texte affiché : ${message}`);
}
