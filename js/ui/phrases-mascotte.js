/**
 * Ce que dit la mascotte. Ton complice, court, jamais bébé (cahier §3.4).
 * Règles de rédaction : pas de « !!! », au plus un « ! » par phrase, aucune faute reprochée à l'élève,
 * espace insécable (U+00A0) avant `? ! : ;`.
 */

/** Les phrases par situation. Au moins 3 par situation pour éviter les répétitions. */
export const BANQUES = {
  reussite: [
    'Propre.',
    'Rien à redire.',
    'Tu progresses, ça se voit.',
    'Net et précis.',
    'Celle-là, tu la tiens.',
    'Exactement.',
    'Joli. On continue.',
    "Voilà, c'est ça.",
  ],
  erreur: [
    'Presque. Regarde de plus près.',
    'Piège classique, on le retient.',
    'Pas loin. Relis doucement.',
    "Celle-là est vicieuse, même les grands s'y trompent.",
    'On corrige, on retient, on avance.',
    'Ce mot-là aime tendre des pièges.',
    "Une erreur, c'est une information.",
    'Respire. On regarde ça ensemble.',
  ],
  encouragement: [
    'On y va doucement, un mot après l\'autre.',
    'Tu as déjà fait le plus dur.',
    'Prends ton temps, je ne bouge pas.',
    'Chaque exercice compte.',
    'Tu peux le faire.',
    "Un petit effort et c'est plié.",
    'Courage, la suite est à ta portée.',
  ],
  finDefi: [
    'Défi terminé. Beau travail.',
    'Et voilà. Une séance de plus dans la poche.',
    'Bien joué. Reviens demain pour la suite.',
    'Séance bouclée. Tu peux souffler.',
    'Dix minutes bien employées.',
    'Voilà qui fait avancer.',
  ],
  deblocage: [
    'Nouvel accessoire débloqué. Ça te va bien.',
    'Regarde ce que tu as gagné.',
    'Une nouveauté dans la garde-robe !',
    'Style validé.',
    'Tu viens de gagner un accessoire, essaie-le.',
    "Ça, c'est du style.",
  ],
};

export const SITUATIONS = Object.keys(BANQUES);

/**
 * Crée un parleur qui ne répète jamais deux fois de suite la même phrase pour une situation.
 * @param {Object} [options]
 * @param {function(): number} [options.aleatoire] Renvoie un nombre dans [0, 1) ; injectable pour les tests.
 * @returns {{dire: function(string): string}}
 */
export function creerParleur({ aleatoire = Math.random } = {}) {
  const dernieres = {};

  /**
   * Choisit une phrase pour la situation.
   * @param {string} situation Une des `SITUATIONS`.
   * @returns {string}
   * @throws {RangeError} Si la situation est inconnue.
   */
  function dire(situation) {
    const banque = BANQUES[situation];
    if (!banque) {
      throw new RangeError(`Situation inconnue : ${situation}`);
    }
    const autres = banque.filter((phrase) => phrase !== dernieres[situation]);
    // Une banque d'une seule phrase n'a pas d'autre choix que de la répéter.
    const candidates = autres.length > 0 ? autres : banque;
    const choisie = candidates[Math.floor(aleatoire() * candidates.length)];
    dernieres[situation] = choisie;
    return choisie;
  }

  return { dire };
}
