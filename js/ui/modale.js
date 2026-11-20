// Fenêtre modale basée sur <dialog> : focus piégé, Échap, retour du focus, promesse du bouton choisi.

import { chargerFeuille } from '../coeur/styles.js';

const FEUILLE_MODALE = new URL('../../css/composants/modale.css', import.meta.url);

function creerBoutons(boutons, dialog) {
  const zone = document.createElement('div');
  zone.className = 'modale__actions';
  for (const { id, libelle, variante = 'secondaire' } of boutons) {
    const bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.className = `bouton bouton--${variante}`;
    bouton.textContent = libelle;
    bouton.addEventListener('click', () => dialog.close(id));
    zone.append(bouton);
  }
  return zone;
}

function construireDialog({ titre, contenu, boutons }) {
  const dialog = document.createElement('dialog');
  dialog.className = 'modale';
  const titreElement = document.createElement('h2');
  titreElement.className = 'modale__titre';
  titreElement.textContent = titre;
  const corps = document.createElement('div');
  corps.className = 'modale__corps';
  corps.append(contenu);
  dialog.setAttribute('aria-label', titre);
  dialog.append(titreElement, corps, creerBoutons(boutons, dialog));
  return dialog;
}

/**
 * Ouvre une modale et attend le choix de l'élève.
 * `showModal` piège le focus et gère Échap ; le focus revient à l'élément d'origine à la fermeture.
 * @param {{ titre: string, contenu: string|Node,
 *   boutons: { id: string, libelle: string, variante?: 'principal'|'secondaire'|'discret' }[] }} options
 * @returns {Promise<string|null>} L'`id` du bouton choisi, ou `null` si la modale est fermée par Échap.
 */
export async function ouvrirModale(options) {
  if (options.boutons.length === 0) {
    throw new Error("ouvrirModale : il faut au moins un bouton, sinon la modale ne peut pas se fermer.");
  }
  await chargerFeuille(FEUILLE_MODALE);
  const origine = document.activeElement;
  const dialog = construireDialog(options);
  const zone = document.getElementById('zone-modale') ?? document.body;
  zone.append(dialog);
  return new Promise((resolve) => {
    dialog.addEventListener('close', () => {
      const choix = dialog.returnValue === '' ? null : dialog.returnValue;
      dialog.remove();
      origine?.focus();
      resolve(choix);
    });
    dialog.showModal();
  });
}
