# Lexia

Lexia est un site d'entraînement au français pour le CM2. Il propose des exercices courts et ludiques, avec une mascotte qui encourage l'élève.

Le site fonctionne sans connexion une fois chargé, s'installe comme une application sur PC et tablette, et ne demande aucun compte pour jouer.

## Ce qu'on y trouve

Six matières, chacune avec plusieurs types d'exercices :

- **Dictée** : dictée audio et détective des fautes.
- **Conjugaison** : relier, compléter, écrire le tableau.
- **Orthographe** : homophones, accords dans le groupe nominal, mots à retenir, lettres muettes.
- **Grammaire** : tri des mots, fonctions dans la phrase, phrases en étiquettes, transformations.
- **Vocabulaire** : synonymes et contraires, familles de mots, préfixes et suffixes, mots à plusieurs sens.
- **Lecture** : questions sur un texte, remise en ordre, lecture flash.

Autour des exercices :

- un test de départ (« La grande aventure ») et un défi du jour ;
- des badges, une garde-robe pour habiller la mascotte et un carnet de progression ;
- des réglages (volume, voix, texte plus grand, animations réduites) ;
- l'export et l'import de la progression, par fichier ou par code.

Le contenu des exercices est dans des fichiers JSON du dossier `data/`.

## Hors connexion et comptes

- Le service worker (`sw.js`) met tout le site en cache au premier chargement, puis le sert depuis le cache. Une nouvelle version n'est activée que quand l'élève l'accepte.
- Le site est installable grâce à `manifest.webmanifest`.
- Les comptes sont facultatifs. Sans compte, la progression reste dans le navigateur. Avec un compte, la progression est aussi sauvegardée en ligne (service Supabase), ce qui permet de la retrouver sur un autre appareil.

## Lancer en local

Il n'y a rien à installer ni à compiler. Il suffit d'un serveur statique lancé depuis la racine du dépôt, par exemple :

```
python -m http.server 5173
```

Puis ouvrir `http://localhost:5173`. Le service worker n'est actif que sur `localhost` ou en `https`, donc ouvrir `index.html` directement depuis le disque ne convient pas.

## Héberger

Lexia est un site statique : n'importe quel hébergeur de fichiers convient. Avec Cloudflare Pages, relier le dépôt, laisser la commande de build vide et mettre `/` comme dossier de sortie.

Si les comptes sont utilisés, il faut aussi déclarer l'adresse du site dans Supabase (Authentication, URL Configuration : Site URL et Redirect URLs). Sans cela, les liens reçus par mail ne ramènent pas au site.

Le service worker garde une liste des fichiers à mettre en cache (`FICHIERS_A_PRECACHER` dans `sw.js`). Quand on ajoute, retire ou modifie un fichier du site, cette liste et le nom de version du cache doivent être régénérés, sinon les appareils déjà installés gardent l'ancienne version. Le script de génération (`outils/generer-precache.mjs`) n'est pas dans ce dépôt ; ne modifie pas la liste à la main.

## Structure du dépôt

```
index.html              page unique du site
manifest.webmanifest    description de l'application installable
sw.js                   service worker (cache, hors connexion)
css/                    styles (composants/ et modules/)
js/
  app.js, config.js     démarrage et réglages généraux
  coeur/                logique commune : stockage, progression, comptes, synchro, voix, routes
  modules/              un dossier par écran ou matière
  ui/                   composants d'interface réutilisables
data/                   contenu des exercices (JSON)
assets/                 icônes, mascotte et polices
```

## Données et vie privée

- La progression de l'élève est stockée dans le navigateur (`localStorage`), sous la clé `lexia:v1`. Rien n'est envoyé en ligne tant qu'aucun compte n'est connecté.
- Avec un compte, l'adresse mail et le mot de passe sont envoyés à Supabase pour l'inscription et la connexion, et la progression est sauvegardée dans une table Supabase. La session est gardée dans le navigateur (clé `lexia:session`), à part de la progression.
- La lecture à voix haute (dictée audio notamment) utilise la synthèse vocale du navigateur (`js/coeur/voix.js`). Hors connexion, seules les voix installées sur l'appareil sont utilisées. En ligne, le site choisit en priorité la voix « Google français » si le navigateur la propose (c'est le cas de Chrome) : cette voix passe par le réseau, donc le texte lu est envoyé aux serveurs de Google par le navigateur, qu'il y ait un compte ou non. Choisir dans les réglages une voix installée sur l'appareil évite cela.

## Licences

Les polices Fredoka et Lexend sont sous licence SIL Open Font License : voir `assets/polices/OFL-Fredoka.txt` et `assets/polices/OFL-Lexend.txt`.
