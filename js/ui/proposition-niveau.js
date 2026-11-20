// Proposition douce de changement de niveau, affichée sur l'écran d'accueil d'un module.
// Rien n'est imposé : l'élève répond par un bouton, et son choix est enregistré en une seule écriture.

import { accepterProposition, proposerChangementDeNiveau, refuserProposition } from '../coeur/niveaux-adaptatifs.js';
import { niveauModule } from '../coeur/progression.js';
import { chargerFeuille } from '../coeur/styles.js';
import { creer, creerBouton } from './dom.js';

const FEUILLE_PROPOSITION = new URL('../../css/composants/proposition-niveau.css', import.meta.url);
const ID_TITRE = 'proposition-niveau-titre';

/**
 * Les textes à montrer, selon le sens de la proposition. Aucun pourcentage, aucun mot qui juge.
 * @param {import('../coeur/niveaux-adaptatifs.js').Proposition} proposition
 * @param {number} niveauActuel
 */
function textesDe(proposition, niveauActuel) {
  const propose = proposition.niveau;
  if (proposition.sens === 'monter') {
    return {
      titre: `Prêt pour le niveau ${propose} ?`,
      corps: `Tes dernières séances se sont bien passées. Tu peux essayer le niveau ${propose}, ou rester ici.`,
      oui: `Essayer le niveau ${propose}`,
      non: `Rester au niveau ${niveauActuel}`,
    };
  }
  return {
    titre: 'Un niveau plus doux ?',
    corps: `Ces dernières séances étaient difficiles. Tu peux passer au niveau ${propose} pour reprendre confiance, `
      + `ou garder le niveau ${niveauActuel}.`,
    oui: `Passer au niveau ${propose}`,
    non: `Garder le niveau ${niveauActuel}`,
  };
}

/** Remplace la proposition par un message de confirmation, qui reprend le focus des boutons disparus. */
function confirmer(section, message) {
  const confirmation = creer('p', 'proposition-niveau__confirmation', message);
  confirmation.setAttribute('role', 'status');
  confirmation.tabIndex = -1;
  section.replaceWith(confirmation);
  confirmation.focus();
}

function construireSection(textes, actions) {
  const section = creer('section', 'proposition-niveau');
  section.setAttribute('aria-labelledby', ID_TITRE);
  const titre = creer('h2', 'proposition-niveau__titre', textes.titre);
  titre.id = ID_TITRE;
  const boutons = creer('div', 'proposition-niveau__actions');
  boutons.append(
    creerBouton(textes.oui, 'bouton--principal', actions.accepter),
    creerBouton(textes.non, 'bouton--secondaire', actions.refuser),
  );
  section.append(titre, creer('p', 'proposition-niveau__texte', textes.corps), boutons);
  return section;
}

/**
 * Affiche la proposition de niveau du module, s'il y en a une, juste sous la ligne « Ton niveau ».
 * Sans proposition, la page n'est pas touchée. Le focus n'est pas déplacé à l'arrivée.
 * @param {HTMLElement} page Le hub du module, qui contient `.hub__niveau`.
 * @param {{ stockage: { lire: function(): Object, ecrire: function(Object): void } }} contexte
 * @param {string} module Clé du module (`orthographe`, `grammaire`…).
 * @returns {Promise<void>}
 */
export async function monterPropositionNiveau(page, contexte, module) {
  const { stockage } = contexte;
  const donnees = stockage.lire();
  const proposition = proposerChangementDeNiveau(donnees, module);
  if (proposition === null) {
    return;
  }
  await chargerFeuille(FEUILLE_PROPOSITION);
  const ligneNiveau = page.querySelector('.hub__niveau');
  if (ligneNiveau === null) {
    throw new Error("proposition-niveau : la page n'a pas de ligne .hub__niveau");
  }
  const niveauActuel = niveauModule(donnees, module);
  const section = construireSection(textesDe(proposition, niveauActuel), {
    accepter: () => {
      // Relire : une séance a pu s'écrire entre-temps.
      stockage.ecrire(accepterProposition(stockage.lire(), module, proposition));
      ligneNiveau.textContent = `Ton niveau : ${proposition.niveau}`;
      confirmer(section, `C'est noté : tu es au niveau ${proposition.niveau}.`);
    },
    refuser: () => {
      stockage.ecrire(refuserProposition(stockage.lire(), module));
      confirmer(section, `D'accord, on garde le niveau ${niveauActuel}.`);
    },
  });
  ligneNiveau.after(section);
}
