### API Kahin – Configuration des environnements

#### Authentification animateur

Pour que le front (avec `NEXT_PUBLIC_API_URL`) puisse gérer les quiz et piloter les sessions, définir :

- **`ADMIN_USERNAME`** et **`ADMIN_PASSWORD`** : identifiants de la modale « Connexion animateur ».
- **`ADMIN_AUTH_SECRET`** : secret utilisé pour signer les jetons (valeur aléatoire longue, ne jamais commiter).

Route : `POST /api/auth/login` avec le corps JSON `{ "username", "password" }` → réponse `{ "token", "expiresIn" }`. Les en-têtes `Authorization: Bearer <token>` sont requis sur les routes quiz et sur `POST /api/session/:id/next`.

`GET /api/session/:id/quiz` (sans auth) renvoie le quiz de la session avec les bonnes réponses masquées tant que la question est en cours de réponse (participants). `POST /api/session/:id/advance-if-time-up` est public : le serveur n’avance que si le timer est réellement dépassé.

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
