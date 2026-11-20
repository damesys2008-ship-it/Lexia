// Le défi qui garde la section « Pour les grands » des Réglages : une opération à résoudre pour entrer.
// Rien n'est mémorisé ici : c'est l'écran qui retient « déverrouillé » le temps d'un montage.

import { estBonneReponse, tirerOperation } from '../../coeur/verrou-grands.js';
import { creer } from '../../ui/dom.js';

const MESSAGE_REPONSE_VIDE = 'Écris ta réponse avant de valider.';
const MESSAGE_MAUVAISE_REPONSE = "Ce n'est pas la bonne réponse. Essaie celle-ci.";

/** Un champ pour un nombre entier : clavier numérique, aucune aide à la frappe. */
function creerChampReponse() {
  const champ = creer('input', 'reglages__reponse');
  champ.type = 'text';
  champ.inputMode = 'numeric';
  champ.setAttribute('aria-label', 'Ta réponse');
  champ.setAttribute('autocomplete', 'off');
  champ.setAttribute('autocorrect', 'off');
  champ.setAttribute('autocapitalize', 'off');
  champ.setAttribute('spellcheck', 'false');
  return champ;
}

function creerBoutonEntrer() {
  const bouton = creer('button', 'bouton bouton--principal', 'Entrer');
  bouton.type = 'submit';
  return bouton;
}

/**
 * Valide la réponse saisie. Bonne : le défi est réussi. Vide : on dit ce qu'il manque.
 * Fausse : message gentil, champ vidé et une autre opération.
 * @param {{operation: Object, enonce: HTMLElement, champ: HTMLInputElement, message: HTMLElement, auSucces: function(): void}} defi
 */
function validerLaReponse(defi) {
  const { champ, message } = defi;
  if (estBonneReponse(defi.operation, champ.value)) {
    defi.auSucces();
    return;
  }
  if (champ.value.trim() === '') {
    message.textContent = MESSAGE_REPONSE_VIDE;
  } else {
    defi.operation = tirerOperation(Math.random, defi.operation);
    defi.enonce.textContent = defi.operation.enonce;
    message.textContent = MESSAGE_MAUVAISE_REPONSE;
    champ.value = '';
  }
  champ.focus();
}

function creerFormulaire(champ, auEnvoi) {
  const formulaire = creer('form', 'reglages__defi');
  formulaire.noValidate = true;
  formulaire.append(champ, creerBoutonEntrer());
  formulaire.addEventListener('submit', (evenement) => {
    evenement.preventDefault();
    auEnvoi();
  });
  return formulaire;
}

/**
 * Construit le défi : l'opération, le champ de réponse et le bouton « Entrer ».
 * @param {function(): void} auSucces Appelée une seule fois, après la bonne réponse.
 * @returns {HTMLElement}
 */
export function creerDefi(auSucces) {
  const operation = tirerOperation();
  const message = creer('p', 'reglages__message');
  message.setAttribute('role', 'alert');
  const defi = { operation, enonce: creer('p', 'reglages__operation', operation.enonce), champ: creerChampReponse(), message, auSucces };

  const racine = creer('div', 'reglages__bloc');
  racine.append(
    creer('p', 'reglages__aide', 'Cette partie est réservée aux grands. Résous cette opération pour entrer.'),
    defi.enonce,
    creerFormulaire(defi.champ, () => validerLaReponse(defi)),
    message,
  );
  return racine;
}
