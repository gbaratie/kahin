### API Kahin – Configuration des environnements

#### Variables d’environnement en local

- **PORT** : port HTTP de l’API (par défaut `4000`), défini dans `.env`.
- **QUIZ_JSON_PATH** (optionnelle) : chemin du fichier JSON utilisé pour stocker les quiz.
  - Par défaut : `apps/api/data/quizzes.json`.
  - Ce fichier est ignoré par Git via l’entrée `apps/api/data/` dans `.gitignore`.
- **DATABASE_URL** : **ne pas** la définir en local si tu veux rester en mode fichier JSON.
  - Tant que `NODE_ENV` n’est pas `production` ou que `DATABASE_URL` est absente, l’API utilise uniquement le fichier JSON.

#### Variables d’environnement en production (Render)

Sur le service Render qui héberge l’API :

- Ajouter `NODE_ENV=production`.
- Ajouter `DATABASE_URL` :
  - Copier l’`External Database URL` de ta base Postgres Render (celle qui commence par `postgres://` ou `postgresql://`).
  - La coller comme valeur de `DATABASE_URL` dans l’onglet **Environment** de ton service API (pas sur la base).
- Optionnel : définir `PORT` si nécessaire (Render fournit en général sa propre variable de port).

Avec cette configuration :

- En **production** (`NODE_ENV=production` et `DATABASE_URL` définie), l’API utilise Postgres via `PostgresQuizRepository`.
- En **local/dev** (ou si `DATABASE_URL` est absente), l’API persiste les quiz dans le fichier JSON `QUIZ_JSON_PATH` / `data/quizzes.json`.
