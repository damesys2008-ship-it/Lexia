/**
 * Catalogue de la garde-robe : 61 accessoires, 9 emplacements, 16 ensembles.
 * Données pures, copiées de la planche « La collection » : le site ne lit jamais `maquettes/`.
 * Les prix sont en étoiles. Les pièces d'un ensemble se retrouvent par le champ `ensemble` des accessoires.
 */

/**
 * @typedef {Object} Accessoire
 * @property {string} id Identifiant stable, utilisé dans les données enregistrées.
 * @property {string} nom Nom affiché dans la garde-robe.
 * @property {string} emplacement Un des `EMPLACEMENTS` : un seul accessoire par emplacement.
 * @property {number} prix Prix en étoiles.
 * @property {string} rarete Une des `RARETES`.
 * @property {string} ensemble Identifiant de l'ensemble auquel appartient l'accessoire.
 */

/**
 * @typedef {Object} Ensemble
 * @property {string} id
 * @property {string} nom
 * @property {string} rarete Une des `RARETES`.
 * @property {string} description
 */

export const EMPLACEMENTS = ['tete', 'pompons', 'visage', 'col', 'corps', 'dos', 'main', 'queue', 'pieds'];

export const RARETES = ['commun', 'rare', 'epique', 'legendaire'];

/** @type {Accessoire[]} */
export const ACCESSOIRES = [
  { id: 'beret', nom: "Béret d'écrivain", emplacement: 'tete', prix: 12, rarete: 'commun', ensemble: 'petit-ecrivain' },
  { id: 'echarpe', nom: 'Écharpe rayée', emplacement: 'col', prix: 15, rarete: 'commun', ensemble: 'petit-ecrivain' },
  { id: 'plume', nom: "Plume d'écriture", emplacement: 'main', prix: 10, rarete: 'commun', ensemble: 'petit-ecrivain' },
  { id: 'lunettes', nom: 'Lunettes rondes', emplacement: 'visage', prix: 10, rarete: 'commun', ensemble: 'bibliothecaire' },
  { id: 'gilet', nom: 'Gilet douillet', emplacement: 'corps', prix: 18, rarete: 'commun', ensemble: 'bibliothecaire' },
  { id: 'livre', nom: 'Livre', emplacement: 'main', prix: 10, rarete: 'commun', ensemble: 'bibliothecaire' },
  { id: 'jardin', nom: 'Chapeau de jardinier', emplacement: 'tete', prix: 12, rarete: 'commun', ensemble: 'jardinier' },
  { id: 'salopette', nom: 'Salopette', emplacement: 'corps', prix: 18, rarete: 'commun', ensemble: 'jardinier' },
  { id: 'arrosoir', nom: 'Arrosoir', emplacement: 'main', prix: 12, rarete: 'commun', ensemble: 'jardinier' },
  { id: 'bottespluie', nom: 'Bottes de pluie', emplacement: 'pieds', prix: 12, rarete: 'commun', ensemble: 'jardinier' },
  { id: 'bonnet', nom: 'Bonnet à pompon', emplacement: 'tete', prix: 15, rarete: 'rare', ensemble: 'hiver-douillet' },
  { id: 'cache', nom: 'Cache-pompons en laine', emplacement: 'pompons', prix: 15, rarete: 'rare', ensemble: 'hiver-douillet' },
  { id: 'moufles', nom: 'Moufles', emplacement: 'main', prix: 15, rarete: 'rare', ensemble: 'hiver-douillet' },
  { id: 'bottes', nom: 'Bottes fourrées', emplacement: 'pieds', prix: 20, rarete: 'rare', ensemble: 'hiver-douillet' },
  { id: 'paille', nom: 'Chapeau de paille', emplacement: 'tete', prix: 15, rarete: 'rare', ensemble: 'plage' },
  { id: 'soleil', nom: 'Lunettes étoile', emplacement: 'visage', prix: 25, rarete: 'rare', ensemble: 'plage' },
  { id: 'bouee', nom: 'Bouée canard', emplacement: 'corps', prix: 20, rarete: 'rare', ensemble: 'plage' },
  { id: 'tongs', nom: 'Tongs', emplacement: 'pieds', prix: 10, rarete: 'rare', ensemble: 'plage' },
  { id: 'fete', nom: 'Chapeau de fête', emplacement: 'tete', prix: 15, rarete: 'rare', ensemble: 'anniversaire' },
  { id: 'noeuds', nom: 'Rubans sur les tiges', emplacement: 'pompons', prix: 12, rarete: 'rare', ensemble: 'anniversaire' },
  { id: 'ballon', nom: 'Ballon de fête', emplacement: 'main', prix: 15, rarete: 'rare', ensemble: 'anniversaire' },
  { id: 'noeudqueue', nom: 'Grand nœud de queue', emplacement: 'queue', prix: 10, rarete: 'rare', ensemble: 'anniversaire' },
  { id: 'nuit', nom: 'Bonnet de nuit', emplacement: 'tete', prix: 15, rarete: 'rare', ensemble: 'pyjama' },
  { id: 'pyjama', nom: 'Pyjama étoilé', emplacement: 'corps', prix: 25, rarete: 'rare', ensemble: 'pyjama' },
  { id: 'doudou', nom: 'Doudou étoile', emplacement: 'main', prix: 15, rarete: 'rare', ensemble: 'pyjama' },
  { id: 'chaussons', nom: 'Chaussons pompons', emplacement: 'pieds', prix: 15, rarete: 'rare', ensemble: 'pyjama' },
  { id: 'bandeau', nom: 'Bandeau de sport', emplacement: 'tete', prix: 10, rarete: 'rare', ensemble: 'sportif' },
  { id: 'maillot', nom: 'Maillot', emplacement: 'corps', prix: 20, rarete: 'rare', ensemble: 'sportif' },
  { id: 'foot', nom: 'Ballon de foot', emplacement: 'main', prix: 15, rarete: 'rare', ensemble: 'sportif' },
  { id: 'baskets', nom: 'Baskets', emplacement: 'pieds', prix: 20, rarete: 'rare', ensemble: 'sportif' },
  { id: 'toque', nom: 'Toque de chef', emplacement: 'tete', prix: 20, rarete: 'rare', ensemble: 'chef-cuisinier' },
  { id: 'tablier', nom: 'Tablier', emplacement: 'corps', prix: 15, rarete: 'rare', ensemble: 'chef-cuisinier' },
  { id: 'cuillere', nom: 'Cuillère en bois', emplacement: 'main', prix: 10, rarete: 'rare', ensemble: 'chef-cuisinier' },
  { id: 'tricorne', nom: 'Tricorne', emplacement: 'tete', prix: 25, rarete: 'epique', ensemble: 'pirate' },
  { id: 'cacheoeil', nom: 'Cache-œil', emplacement: 'visage', prix: 15, rarete: 'epique', ensemble: 'pirate' },
  { id: 'foulard', nom: 'Foulard de pirate', emplacement: 'col', prix: 15, rarete: 'epique', ensemble: 'pirate' },
  { id: 'longuevue', nom: 'Longue-vue', emplacement: 'main', prix: 20, rarete: 'epique', ensemble: 'pirate' },
  { id: 'casquette', nom: 'Casquette de détective', emplacement: 'tete', prix: 20, rarete: 'epique', ensemble: 'detective' },
  { id: 'monocle', nom: 'Monocle', emplacement: 'visage', prix: 15, rarete: 'epique', ensemble: 'detective' },
  { id: 'impermeable', nom: 'Imperméable', emplacement: 'corps', prix: 30, rarete: 'epique', ensemble: 'detective' },
  { id: 'loupe', nom: 'Loupe', emplacement: 'main', prix: 15, rarete: 'epique', ensemble: 'detective' },
  { id: 'masque', nom: 'Masque de héros', emplacement: 'visage', prix: 15, rarete: 'epique', ensemble: 'super-heros' },
  { id: 'cape', nom: 'Cape de héros', emplacement: 'dos', prix: 30, rarete: 'epique', ensemble: 'super-heros' },
  { id: 'ceinture', nom: 'Ceinture de héros', emplacement: 'corps', prix: 20, rarete: 'epique', ensemble: 'super-heros' },
  { id: 'medaille', nom: 'Médaille étoile', emplacement: 'col', prix: 15, rarete: 'epique', ensemble: 'super-heros' },
  { id: 'fleurs', nom: 'Couronne de fleurs', emplacement: 'tete', prix: 20, rarete: 'epique', ensemble: 'fee-des-mots' },
  { id: 'fleurp', nom: 'Fleurs de pompons', emplacement: 'pompons', prix: 10, rarete: 'epique', ensemble: 'fee-des-mots' },
  { id: 'ailes', nom: 'Ailes de fée', emplacement: 'dos', prix: 50, rarete: 'epique', ensemble: 'fee-des-mots' },
  { id: 'baguette', nom: 'Baguette étoile', emplacement: 'main', prix: 25, rarete: 'epique', ensemble: 'fee-des-mots' },
  { id: 'casque', nom: 'Casque bulle', emplacement: 'tete', prix: 50, rarete: 'legendaire', ensemble: 'astronaute' },
  { id: 'combi', nom: "Combinaison d'astronaute", emplacement: 'corps', prix: 50, rarete: 'legendaire', ensemble: 'astronaute' },
  { id: 'drapeau', nom: 'Drapeau étoile', emplacement: 'main', prix: 15, rarete: 'legendaire', ensemble: 'astronaute' },
  { id: 'sacados', nom: 'Sac à dos', emplacement: 'dos', prix: 25, rarete: 'legendaire', ensemble: 'astronaute' },
  { id: 'haut', nom: 'Haut-de-forme', emplacement: 'tete', prix: 30, rarete: 'legendaire', ensemble: 'magicien' },
  { id: 'capeetoile', nom: 'Cape étoilée', emplacement: 'dos', prix: 40, rarete: 'legendaire', ensemble: 'magicien' },
  { id: 'papillon', nom: 'Nœud papillon', emplacement: 'col', prix: 10, rarete: 'legendaire', ensemble: 'magicien' },
  { id: 'etoiles', nom: 'Pompons étoilés', emplacement: 'pompons', prix: 20, rarete: 'legendaire', ensemble: 'magicien' },
  { id: 'couronne', nom: "Couronne d'or", emplacement: 'tete', prix: 100, rarete: 'legendaire', ensemble: 'royal' },
  { id: 'caperoyale', nom: 'Cape royale', emplacement: 'dos', prix: 100, rarete: 'legendaire', ensemble: 'royal' },
  { id: 'sceptre', nom: 'Sceptre', emplacement: 'main', prix: 80, rarete: 'legendaire', ensemble: 'royal' },
  { id: 'etoilequeue', nom: 'Étoile de queue', emplacement: 'queue', prix: 20, rarete: 'legendaire', ensemble: 'royal' },
];

/** @type {Ensemble[]} */
export const ENSEMBLES = [
  { id: 'petit-ecrivain', nom: 'Petit écrivain', rarete: 'commun', description: 'Le look du français : il écrit, il lit, il rêve.' },
  { id: 'bibliothecaire', nom: 'Bibliothécaire', rarete: 'commun', description: 'Pour les séries de lecture.' },
  { id: 'jardinier', nom: 'Jardinier', rarete: 'commun', description: 'Les mots poussent quand on les arrose.' },
  { id: 'hiver-douillet', nom: 'Hiver douillet', rarete: 'rare', description: 'Bonnet, moufles, bottes : prêt pour la neige.' },
  { id: 'plage', nom: 'Plage', rarete: 'rare', description: "Les vacances d'été." },
  { id: 'anniversaire', nom: 'Anniversaire', rarete: 'rare', description: 'Débloqué quand tous les accessoires sont achetés.' },
  { id: 'pyjama', nom: 'Pyjama', rarete: 'rare', description: "Pour l'expression « Dodo »." },
  { id: 'sportif', nom: 'Sportif', rarete: 'rare', description: 'Pour les séries de 5 bonnes réponses.' },
  { id: 'chef-cuisinier', nom: 'Chef cuisinier', rarete: 'rare', description: 'Une recette de mots.' },
  { id: 'pirate', nom: 'Pirate', rarete: 'epique', description: "À l'abordage des fautes d'orthographe !" },
  { id: 'detective', nom: 'Détective', rarete: 'epique', description: 'Il enquête sur les homophones.' },
  { id: 'super-heros', nom: 'Super-héros', rarete: 'epique', description: 'Pour les défis du jour.' },
  { id: 'fee-des-mots', nom: 'Fée des mots', rarete: 'epique', description: 'Une baguette pour accorder les verbes.' },
  { id: 'astronaute', nom: 'Astronaute', rarete: 'legendaire', description: 'Débloqué quand tous les accessoires sont achetés.' },
  { id: 'magicien', nom: 'Magicien', rarete: 'legendaire', description: 'Abracadabra, la conjugaison !' },
  { id: 'royal', nom: 'Royal', rarete: 'legendaire', description: 'La récompense ultime.' },
];

/**
 * Anciens accessoires (garde-robe à 16 pièces) dont l'identifiant a changé dans le nouveau catalogue.
 * Les identifiants restés identiques (echarpe, beret, casquette, couronne) n'ont pas besoin d'être listés.
 * Les anciens accessoires absents d'ici et du nouveau catalogue ne sont pas repris : nœud, bandana,
 * casque audio, cache-oreilles, collier de perles, sweat à capuche, lunettes de soleil.
 */
export const NOUVEAUX_IDENTIFIANTS = {
  'lunettes-rondes': 'lunettes',
  'lunettes-etoile': 'soleil',
  'chapeau-paille': 'paille',
  'noeud-papillon': 'papillon',
  'cape-super-heros': 'cape',
};
