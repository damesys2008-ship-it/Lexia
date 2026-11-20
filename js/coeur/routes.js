// Table des routes du site. Chaque route charge son écran à la demande avec `import()`.
//
// Une route : { chemin, titre, charger, parametres?, sansProfil? }
//   chemin      chemin sans « #/ », par exemple 'dictee/audio'
//   titre       titre de l'onglet et de l'écran (le routeur ajoute le nom du site)
//   charger     fonction qui renvoie le module de l'écran (contrat : voir routeur.js)
//   parametres  vrai si le chemin accepte des segments en plus : '#/bientot/carnet'
//               monte la route 'bientot' avec le paramètre ['carnet']
//   sansProfil  vrai si l'écran s'ouvre même avant le premier lancement (pages de compte)

export const ROUTE_ACCUEIL = 'accueil';
export const ROUTE_PREMIER_LANCEMENT = 'premier-lancement';

/** @type {Array<{chemin: string, titre: string, charger: function(): Promise<Object>, parametres?: boolean}>} */
export const ROUTES = [
  { chemin: ROUTE_ACCUEIL, titre: 'Accueil', charger: () => import('../modules/accueil/index.js') },
  {
    chemin: ROUTE_PREMIER_LANCEMENT,
    titre: 'Premier lancement',
    charger: () => import('../modules/premier-lancement/index.js'),
  },
  { chemin: 'defi', titre: 'Défi du jour', charger: () => import('../modules/defi/index.js') },
  { chemin: 'dictee', titre: 'Dictée', charger: () => import('../modules/dictee/index.js') },
  { chemin: 'dictee/audio', titre: 'Dictée audio', charger: () => import('../modules/dictee/audio.js') },
  {
    chemin: 'dictee/detective',
    titre: 'Détective des fautes',
    charger: () => import('../modules/dictee/detective.js'),
  },
  { chemin: 'conjugaison', titre: 'Conjugaison', charger: () => import('../modules/conjugaison/index.js') },
  {
    chemin: 'conjugaison/a',
    titre: 'Conjugaison : relier',
    charger: () => import('../modules/conjugaison/niveau-a.js'),
  },
  {
    chemin: 'conjugaison/b',
    titre: 'Conjugaison : compléter',
    charger: () => import('../modules/conjugaison/niveau-b.js'),
  },
  {
    chemin: 'conjugaison/c',
    titre: 'Conjugaison : écrire le tableau',
    charger: () => import('../modules/conjugaison/niveau-c.js'),
  },
  { chemin: 'orthographe', titre: 'Orthographe', charger: () => import('../modules/orthographe/index.js') },
  {
    chemin: 'orthographe/homophones',
    titre: 'Le pont des homophones',
    charger: () => import('../modules/orthographe/homophones.js'),
  },
  {
    chemin: 'orthographe/accords',
    titre: 'Les accords dans le groupe nominal',
    charger: () => import('../modules/orthographe/accords.js'),
  },
  {
    chemin: 'orthographe/invariables',
    titre: 'Mots à retenir',
    charger: () => import('../modules/orthographe/invariables.js'),
  },
  {
    chemin: 'orthographe/muettes',
    titre: 'Lettres muettes',
    charger: () => import('../modules/orthographe/muettes.js'),
  },
  { chemin: 'grammaire', titre: 'Grammaire', charger: () => import('../modules/grammaire/index.js') },
  { chemin: 'grammaire/tri', titre: 'Le tri des mots', charger: () => import('../modules/grammaire/tri.js') },
  {
    chemin: 'grammaire/fonctions',
    titre: 'La chasse aux fonctions',
    charger: () => import('../modules/grammaire/fonctions.js'),
  },
  {
    chemin: 'grammaire/etiquettes',
    titre: 'Les phrases en étiquettes',
    charger: () => import('../modules/grammaire/etiquettes.js'),
  },
  {
    chemin: 'grammaire/transformations',
    titre: 'Les transformations',
    charger: () => import('../modules/grammaire/transformations.js'),
  },
  { chemin: 'vocabulaire', titre: 'Vocabulaire', charger: () => import('../modules/vocabulaire/index.js') },
  {
    chemin: 'vocabulaire/synonymes',
    titre: 'Synonymes et contraires',
    charger: () => import('../modules/vocabulaire/synonymes.js'),
  },
  {
    chemin: 'vocabulaire/familles',
    titre: 'Les familles de mots',
    charger: () => import('../modules/vocabulaire/familles.js'),
  },
  {
    chemin: 'vocabulaire/affixes',
    titre: 'Préfixes et suffixes',
    charger: () => import('../modules/vocabulaire/affixes.js'),
  },
  {
    chemin: 'vocabulaire/sens',
    titre: 'Un mot, plusieurs sens',
    charger: () => import('../modules/vocabulaire/sens.js'),
  },
  { chemin: 'lecture', titre: 'Lecture', charger: () => import('../modules/lecture/index.js') },
  {
    chemin: 'lecture/comprehension',
    titre: 'Questions sur un texte',
    charger: () => import('../modules/lecture/comprehension.js'),
  },
  { chemin: 'lecture/ordre', titre: "Remets dans l'ordre", charger: () => import('../modules/lecture/ordre.js') },
  { chemin: 'lecture/flash', titre: 'Lecture flash', charger: () => import('../modules/lecture/flash.js') },
  { chemin: 'test-depart', titre: 'La grande aventure', charger: () => import('../modules/test-depart/index.js') },
  { chemin: 'garde-robe', titre: 'Garde-robe', charger: () => import('../modules/garde-robe/index.js') },
  { chemin: 'badges', titre: 'Mes badges', charger: () => import('../modules/badges/index.js') },
  { chemin: 'carnet', titre: 'Carnet', charger: () => import('../modules/carnet/index.js') },
  { chemin: 'reglages', titre: 'Réglages', charger: () => import('../modules/reglages/index.js') },
  {
    chemin: 'bientot',
    titre: 'Bientôt disponible',
    parametres: true,
    charger: () => import('../modules/bientot/index.js'),
  },
  // Pages de compte : elles s'ouvrent avant le premier lancement (on peut jouer sans compte).
  {
    chemin: 'connexion',
    titre: 'Se connecter',
    sansProfil: true,
    charger: () => import('../modules/connexion/connexion.js'),
  },
  {
    chemin: 'inscription',
    titre: 'Créer un compte',
    sansProfil: true,
    charger: () => import('../modules/connexion/inscription.js'),
  },
  {
    chemin: 'verifie-ta-boite-mail',
    titre: 'Vérifie ta boîte mail',
    sansProfil: true,
    charger: () => import('../modules/connexion/verifie-ta-boite-mail.js'),
  },
  {
    chemin: 'mot-de-passe-oublie',
    titre: 'Mot de passe oublié',
    sansProfil: true,
    charger: () => import('../modules/connexion/mot-de-passe-oublie.js'),
  },
  {
    chemin: 'reinitialiser',
    titre: 'Nouveau mot de passe',
    sansProfil: true,
    charger: () => import('../modules/connexion/reinitialiser.js'),
  },
  {
    chemin: 'lien-invalide',
    titre: 'Lien invalide',
    sansProfil: true,
    charger: () => import('../modules/connexion/lien-invalide.js'),
  },
  {
    chemin: 'lien-de-mail',
    titre: 'Confirmer le lien',
    sansProfil: true,
    charger: () => import('../modules/connexion/lien-de-mail.js'),
  },
  {
    chemin: 'compte',
    titre: 'Mon compte',
    sansProfil: true,
    charger: () => import('../modules/compte/index.js'),
  },
  {
    chemin: 'compte/choix',
    titre: 'Quelle progression garder ?',
    sansProfil: true,
    charger: () => import('../modules/compte/choix.js'),
  },
];
