/**
 * Réglages PUBLICS du compte (Supabase). Ces valeurs peuvent figurer dans le dépôt :
 * la clé « publishable » n'ouvre que ce que les règles de la base autorisent.
 * Jamais de clé secrète ici, ni nulle part dans le dépôt.
 */

export const URL_PROJET = 'https://uzpfsifwjosipxfohkoi.supabase.co';
export const CLE_PUBLIQUE = 'sb_publishable_cIsoLgpuK2PA_75ZJwJ9CA_0h6cX5gl';

/** Clé de la session dans le stockage local : distincte de `lexia:v1` (la progression), jamais exportée. */
export const CLE_SESSION = 'lexia:session';
/** Nom de la clé quand le site s'appelait Plume : déplacée vers `CLE_SESSION`, pour qu'un élève connecté le reste. */
export const ANCIENNE_CLE_SESSION = 'plume:session';

/** Ce que reçoit le code qui parle au serveur (synchronisation) : seulement des valeurs publiques. */
export const CONFIG_COMPTE = Object.freeze({ urlProjet: URL_PROJET, clePublique: CLE_PUBLIQUE });
