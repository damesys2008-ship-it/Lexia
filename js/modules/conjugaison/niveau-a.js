// Niveau A : relier chaque pronom à sa forme conjuguée (cahier §7.2).
//
// Les formes sont mélangées sans qu'aucune soit en face de sa réponse. « Vérifier » devient actif
// quand tout est relié ; les traits faux se retentent avec « Corriger », les traits justes restent figés.

import { chargerFeuille } from '../../coeur/styles.js';
import { creerRelier } from '../../ui/relier.js';
import { melangerSansAlignement } from '../../ui/relier-logique.js';
import { creerBouton, jouerSon, monterConjugaison, terminerExercice } from './ecran.js';
import { construireColonnesARelier, resultatsDesTraits } from './logique.js';

const FEUILLE_NIVEAU_A = new URL('../../../css/modules/conjugaison-a.css', import.meta.url);
const INSTRUCTION = 'Relie chaque pronom à la bonne forme du verbe.';
const GRAINE_MAXIMALE = 2 ** 32;

/** Le résultat du premier essai : les traits justes du premier coup, le reste est à revoir. */
export function resultatDuPremierEssai(item, resultats) {
  const total = Object.keys(resultats).length;
  const reussis = Object.values(resultats).filter((etat) => etat === 'juste').length;
  return { reussis, total, competencesRatees: reussis < total ? [item.competence] : [], reussi: reussis === total };
}

function creerColonnesMelangees(item) {
  const colonnes = construireColonnesARelier(item);
  const graine = Math.floor(Math.random() * GRAINE_MAXIMALE);
  const melange = melangerSansAlignement(colonnes.gauche, colonnes.droite, graine);
  return { cartes: colonnes.droite, gauche: melange.gauche, droite: melange.droite };
}

/**
 * Les deux boutons du niveau A : « Vérifier » (actif quand tout est relié) et « Corriger » (traits faux).
 * @returns {{boutonVerifier: HTMLButtonElement, activerSiTousRelies: function(boolean): void}}
 */
function creerActions(exercice, relier, cartes) {
  const { item, carte } = exercice;
  let premierEssai = null;
  const boutonVerifier = creerBouton('Vérifier', 'bouton--principal', () => verifier());
  const boutonCorriger = creerBouton('Corriger', 'bouton--secondaire', () => corriger());
  boutonVerifier.disabled = true;

  function verifier() {
    const resultats = resultatsDesTraits(relier.lireTraits(), cartes);
    relier.marquerResultats(resultats);
    premierEssai ??= resultatDuPremierEssai(item, resultats);
    const fauxRestants = Object.values(resultats).includes('faux');
    jouerSon(exercice, fauxRestants ? 'faux' : 'juste');
    if (!fauxRestants) {
      relier.detruire();
      terminerExercice(exercice, premierEssai)
        .catch((erreur) => exercice.contexte.signaler('Fin de séance impossible', erreur));
      return;
    }
    carte.zoneRetour.textContent = 'Presque ! Les traits marqués ✗ ne sont pas encore bons. Appuie sur « Corriger » pour les refaire.';
    carte.zoneRetour.classList.add('presque');
    carte.zoneActions.replaceChildren(boutonCorriger);
  }

  function corriger() {
    relier.reinitialiserFaux();
    carte.zoneRetour.textContent = '';
    carte.zoneRetour.classList.remove('presque');
    boutonVerifier.disabled = true;
    carte.zoneActions.replaceChildren(boutonVerifier);
  }

  return {
    boutonVerifier,
    activerSiTousRelies: (tousRelies) => {
      boutonVerifier.disabled = !tousRelies;
    },
  };
}

/**
 * Joue le niveau A.
 * @param {Object} exercice Fourni par `monterConjugaison`.
 * @returns {Promise<void>}
 */
async function jouerRelier(exercice) {
  await chargerFeuille(FEUILLE_NIVEAU_A);
  const colonnes = creerColonnesMelangees(exercice.item);
  let actions = null;
  const relier = await creerRelier({
    gauche: colonnes.gauche,
    droite: colonnes.droite,
    onChange: ({ tousRelies }) => actions?.activerSiTousRelies(tousRelies),
  });
  actions = creerActions(exercice, relier, colonnes.cartes);
  exercice.carte.zoneExercice.append(relier.racine);
  exercice.carte.zoneActions.append(actions.boutonVerifier);
}

/**
 * Monte l'écran du niveau A.
 * @param {HTMLElement} conteneur
 * @param {Object} contexte Contexte de l'application.
 * @returns {Promise<void>}
 */
export function monter(conteneur, contexte) {
  return monterConjugaison(conteneur, contexte, { mode: 'a', instruction: INSTRUCTION, jouer: jouerRelier });
}
