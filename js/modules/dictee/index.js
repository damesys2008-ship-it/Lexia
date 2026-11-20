// Hub « Dictée » (route '#/dictee') : deux façons de s'entraîner, la dictée audio et le détective.
// Quand la voix n'est pas utilisable (aucune voix française, ou voix réseau hors ligne), la carte
// audio le dit et le détective, qui marche sans voix, est proposé à la place (cahier §4.3).

import { RAISON_RESEAU_HORS_LIGNE } from '../../coeur/voix.js';
import { creer } from '../../ui/dom.js';
import { creerHubMatiere } from '../../ui/hub-matiere.js';

const MODULE = 'dictee';

const MESSAGE_HORS_LIGNE =
  "La voix de cet appareil a besoin d'Internet, et tu es hors ligne. Le détective des fautes marche sans voix.";
const MESSAGE_SANS_VOIX =
  "Cet appareil n'a pas de voix française pour la dictée. Le détective des fautes marche sans voix.";

/**
 * Message à afficher quand la voix est indisponible.
 * @param {string} raison Raison donnée par `voix.etat()` (constantes `RAISON_*` de voix.js).
 * @returns {string}
 */
function messageVoixIndisponible(raison) {
  return raison === RAISON_RESEAU_HORS_LIGNE ? MESSAGE_HORS_LIGNE : MESSAGE_SANS_VOIX;
}

/** Met la carte audio hors service et explique pourquoi, sans bloquer le reste du hub. */
function marquerAudioIndisponible(carteAudio, zoneMessage, raison) {
  carteAudio.removeAttribute('href');
  carteAudio.setAttribute('aria-disabled', 'true');
  carteAudio.classList.add('carte-lien--inactive');
  zoneMessage.textContent = messageVoixIndisponible(raison);
}

/** Les deux jeux du hub, dans l'ordre d'affichage. */
const JEUX = [
  { mode: 'audio', href: '#/dictee/audio', titre: 'Dictée audio', description: 'Écoute la phrase et écris-la.' },
  {
    mode: 'detective',
    href: '#/dictee/detective',
    titre: 'Détective des fautes',
    description: 'Relis le texte et retrouve les fautes cachées.',
  },
];

/**
 * Monte le hub Dictée.
 * @param {HTMLElement} conteneur
 * @param {Object} contexte Contexte de l'application.
 * @returns {Promise<void>}
 */
export async function monter(conteneur, contexte) {
  const { page, grille, cartes } = await creerHubMatiere(contexte, { module: MODULE, titre: 'Dictée', jeux: JEUX });
  const [carteAudio] = cartes;
  const message = creer('p', 'hub__message');

  message.setAttribute('role', 'status');
  grille.after(message);
  conteneur.replaceChildren(page);

  // La liste des voix peut arriver après le premier affichage : on met la carte à jour ensuite.
  try {
    const etat = await contexte.voix.etat();
    if (!etat.disponible) {
      marquerAudioIndisponible(carteAudio, message, etat.raison);
    }
  } catch (erreur) {
    contexte.signaler('État de la voix inconnu', erreur);
  }
}
