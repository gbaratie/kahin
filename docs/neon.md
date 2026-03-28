# Base Postgres sur Neon (Kahin)

L’API Kahin (`apps/api`) utilise **`DATABASE_URL`** pour se connecter à Postgres en production. La base managée recommandée est **[Neon](https://neon.tech)** (serverless Postgres, URI en général **IPv4-friendly**, ce qui évite les soucis de connectivité avec des hébergeurs comme Render). L’hébergement de l’API (ex. **Render**) reste indépendant : seule l’URI de connexion change.

## 1. Créer le projet et le schéma

1. Crée un projet sur [Neon](https://neon.tech) et note les identifiants (utilisateur, mot de passe, hôte) ou copie directement la **connection string** dans le tableau de bord.
2. Dans la console Neon : **SQL Editor** → nouvelle requête.
3. Colle tout le contenu de [`apps/api/db/schema.sql`](../apps/api/db/schema.sql) et exécute.
4. Vérifie que les tables `quizzes`, `questions` et `choices` existent (onglet **Tables** ou requête `\dt` selon l’outil).

## 2. Choisir l’URI de connexion

Dans le projet Neon : **Connection details** (ou équivalent).

- **Connexion directe** : adaptée à une API Node longue durée (ex. Web Service Render) avec un pool `pg`.
- **Connexion pooled** (souvent hôte `*.pooler.neon.tech` ou paramètre dédié) : utile si Neon te la propose pour beaucoup de connexions courtes ; pour un seul processus API avec pool, la connexion **directe** suffit en général.

Remplace les placeholders du mot de passe si nécessaire. L’API active TLS pour les bases managées (voir `PostgresQuizRepository` dans `qcm-infrastructure`).

## 3. Configurer l’API en production (Render)

Sur le **Web Service** qui exécute l’API :

- `NODE_ENV` = `production`
- `DATABASE_URL` = l’URI complète fournie par Neon (ne jamais la commiter dans le dépôt).

Les variables animateur (`ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_AUTH_SECRET`) se configurent de la même façon. Voir [`apps/api/README.md`](../apps/api/README.md) et [`docs/render-config.md`](render-config.md).

## 4. Importer des quiz depuis le JSON (optionnel)

Si tu as encore les quiz dans `apps/api/data/quizzes.json` (ou un chemin via `QUIZ_JSON_PATH`) :

```bash
export DATABASE_URL="postgresql://..."
npm run db:import-quizzes -w api
```

Le script [`apps/api/scripts/import-quizzes-to-postgres.ts`](../apps/api/scripts/import-quizzes-to-postgres.ts) lit le fichier JSON et appelle le même repository Postgres que l’API.

## 5. Développement local avec Postgres

Tu peux définir `DATABASE_URL` dans `apps/api/.env` pour pointer vers Neon ou une autre instance Postgres. Pour **forcer** le fichier JSON en local, ne définis pas `DATABASE_URL` **ou** garde `NODE_ENV` différent de `production` (comportement décrit dans [`apps/api/src/container.ts`](../apps/api/src/container.ts)).

Pour désactiver explicitement SSL côté client (rare, ex. Postgres local sans TLS), tu peux utiliser `PGSSLMODE=disable` — voir le code du pool dans `PostgresQuizRepository`.

## 6. Vérification

- Créer ou modifier un quiz via l’UI animateur en production.
- Contrôler les lignes dans la console Neon (SQL ou explorateur de tables).

Pour le détail des chaînes de connexion et du pooler, voir la [documentation Neon](https://neon.tech/docs/connect/connect-from-any-app).
