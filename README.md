# Kahin — QCM interactif

Monorepo pour créer des sondages QCM et faire participer l’audience en temps réel. Deux déploiements :

- **Front** (Next.js) : création de QCM (questions QCM ou nuage de mots), lancement de session (vue animateur), rejoindre une session (vue participant) — une seule app avec toutes les pages.
- **API** (Express) : backend REST (déployable sur Render ou autre) ; les quiz en production sont stockés dans **Postgres** (ex. **Neon**) via `DATABASE_URL`.

Construit avec **Next.js 14**, **React 18**, **TypeScript**, **MUI** et une architecture hexagonale (domaine partagé dans `packages/`).

## Structure du monorepo

```
kahin/
├── apps/
│   ├── front/           # Next.js — accueil, créer QCM, lancer session, rejoindre, participer (port 3000)
│   └── api/             # Express — REST API (port 4000), souvent hébergée sur Render
├── packages/
│   ├── qcm-domain/      # Entités + ports (partagé)
│   ├── qcm-application/ # Cas d’usage (partagé)
│   ├── qcm-infrastructure/ # Adapters : PostgresQuizRepository, JsonFileQuizRepository, InMemoryQuizRepository, InMemorySessionRepository, MockRealtimeTransport
│   └── shared-utils/    # Utilitaires partagés (getErrorMessage, toError)
├── docs/
│   ├── ARCHITECTURE.md  # Principes SOLID, déploiement et diagrammes de séquence
│   ├── neon.md          # Postgres managé (Neon) : schéma, URI, Render
│   └── render-config.md # Détails de configuration Render (optionnel)
├── package.json         # Workspaces npm
└── tsconfig.base.json
```

Le front factorise les états de chargement et d’erreur via le hook **`useAsyncCall`** et les composants **LoadingScreen**, **ErrorAlert** et **PageLayout** (`src/components/common/`, `src/config/layout.ts`).

## Quick Start

```bash
npm install
# Build des packages partagés (nécessaire avant de lancer les apps)
npm run build -w @kahin/qcm-domain && npm run build -w @kahin/qcm-application && npm run build -w @kahin/qcm-infrastructure && npm run build -w @kahin/shared-utils
```

### Lancer une app

| App   | Commande            | URL                   |
| ----- | ------------------- | --------------------- |
| Front | `npm run dev:front` | http://localhost:3000 |
| API   | `npm run dev:api`   | http://localhost:4000 |

**Pour que « rejoindre une partie » fonctionne** (participant qui rejoint une session lancée par l’animateur), il faut que le front et l’API partagent le même état :

1. Démarrer l’API : `npm run dev:api`
2. Dans `apps/front/.env` (ou `.env.local`), définir :  
   `NEXT_PUBLIC_API_URL=http://localhost:4000`
3. **Redémarrer** le serveur dev front après toute modification des variables d’environnement (les variables `NEXT_PUBLIC_*` sont prises au démarrage).
4. Configurer l’**authentification animateur** sur l’API (obligatoire si le front pointe vers l’API) : voir [Connexion animateur](#connexion-animateur-admin) ci-dessous.
5. Démarrer le front. L’**accueil** affiche par défaut uniquement le formulaire **Rejoindre une session** ; l’animateur ouvre la **connexion** via l’icône de cadenas en haut à droite, puis peut créer et lancer des QCM.

Sans `NEXT_PUBLIC_API_URL`, le front utilise un stockage **in-memory** local (sessions créées invisibles pour d’autres onglets). En haut de l’interface, un indicateur affiche **Mode local** ou **API … — OK** / **Injoignable** pour vérifier la connexion au back. Dans ce mode, l’accès aux pages animateur est **fermé** sauf si vous définissez `NEXT_PUBLIC_BYPASS_ADMIN_AUTH=true` (réservé au développement, non sécurisé).

## Scripts racine

| Commande               | Description                               |
| ---------------------- | ----------------------------------------- |
| `npm run build`        | Build tous les packages puis front et api |
| `npm run build:front`  | Build packages + app front uniquement     |
| `npm run build:api`    | Build packages + app API uniquement       |
| `npm run dev:front`    | Dev app front (Next.js, port 3000)        |
| `npm run dev:api`      | Dev API (tsx watch, port 4000)            |
| `npm run format`       | Formatage Prettier                        |
| `npm run format:check` | Vérification Prettier                     |

## Déploiement

- **Front** : build → `apps/front/out` (export statique). Déployable sur GitHub Pages, Vercel, etc. Le workflow `.github/workflows/deploy.yml` build le front et déploie `apps/front/out` vers GitHub Pages.
- **API** : build → `apps/api/dist`, puis `node dist/index.js`. Déployable sur Render (Web Service). Un fichier **`render.yaml`** à la racine définit le service (build : `npm ci && npm run build:api`, start : `npm run start -w api`). En production, définir **`DATABASE_URL`** vers un projet **Neon** (Postgres) — voir [`docs/neon.md`](docs/neon.md) et [`apps/api/README.md`](apps/api/README.md).

**Base path** : si la variable de dépôt `NEXT_PUBLIC_BASE_PATH` n’est pas définie, elle est fixée par défaut à `/<nom-du-repo>` (ex. `/kahin`) pour que les liens et assets fonctionnent sous `https://<user>.github.io/<repo>/`. Variables optionnelles : `NEXT_PUBLIC_BASE_PATH`, `NEXT_PUBLIC_SITE_NAME`, `NEXT_PUBLIC_API_URL`.

## Configuration

- Le front a son `next.config.js` (export statique, basePath). L’API a son point d’entrée dans `apps/api`.
- `NEXT_PUBLIC_BASE_PATH` : base path pour les assets et la navigation (ex. `/kahin` sur GitHub Pages). En CI, par défaut = `/<nom-du-repo>` si non défini.
- `NEXT_PUBLIC_SITE_NAME` : titre du site.
- `NEXT_PUBLIC_API_URL` : URL de l’API (ex. `http://localhost:4000`). Si défini, le front utilise l’API pour quiz/sessions (nécessaire pour rejoindre une partie en mode déployé).
- `NEXT_PUBLIC_BYPASS_ADMIN_AUTH` : si `true`, débloque l’UI animateur **sans** API (développement uniquement ; ne remplace pas une vraie authentification).
- API : `PORT` (défaut 4000 ; souvent fourni par la plateforme en prod), `NODE_ENV`, `QUIZ_JSON_PATH` (optionnel, dev / sans `DATABASE_URL`), `DATABASE_URL` (Postgres Neon en prod). Voir [`apps/api/README.md`](apps/api/README.md), [`docs/neon.md`](docs/neon.md) et `render.yaml`.

### Connexion animateur (admin)

Dès que le front utilise l’API (`NEXT_PUBLIC_API_URL`), les routes **quiz** (liste, CRUD, lancement) et les actions **question suivante / avancer si temps écoulé** exigent un jeton obtenu par `POST /api/auth/login`.

Sur l’**API**, définir :

| Variable            | Rôle                                                                                     |
| ------------------- | ---------------------------------------------------------------------------------------- |
| `ADMIN_USERNAME`    | Identifiant animateur                                                                    |
| `ADMIN_PASSWORD`    | Mot de passe (choisir une valeur forte en production)                                    |
| `ADMIN_AUTH_SECRET` | Secret pour signer les jetons (chaîne longue aléatoire, ex. 32+ octets en hex ou base64) |

Sans ces variables, la connexion et les opérations animateur renvoient une erreur de configuration (`503`). Les participants utilisent **sans** jeton : `POST /api/session/join`, `GET /api/session/:id`, `GET /api/session/:id/quiz` (quiz sans réponses encore secrètes), `POST /api/session/:id/answer` et `POST /api/session/:id/advance-if-time-up` (le serveur vérifie que le temps est écoulé).

Sur **Render**, ajouter manuellement ces trois variables dans l’environnement du service API (elles ne sont pas dans `render.yaml` pour éviter de commiter des secrets).

**Persistance des données** : en **production** (`NODE_ENV=production` et `DATABASE_URL` définie), les **quiz** sont en **Postgres** (ex. Neon). En **développement** ou sans `DATABASE_URL`, ils sont dans un fichier JSON (`apps/api/data/quizzes.json` par défaut). Les **sessions** et réponses restent en mémoire : elles disparaissent au redémarrage de l’API. Pour les persister, il faudrait un stockage dédié côté API.

## Prérequis

- Node.js 18+ (recommandé : 20)
- npm

## Documentation

- [Architecture et SOLID](docs/ARCHITECTURE.md) : structure des packages, principes SOLID, déploiement, et **diagrammes de séquence** des flux métier (créer QCM, lancer session, rejoindre, répondre, question suivante, résultat par question).
- [Postgres sur Neon](docs/neon.md) : schéma SQL, URI de connexion, variables sur Render, import depuis JSON.
- [Configuration Render](docs/render-config.md) : complément pratique pour l’API hébergée sur Render.

## Licence

MIT (voir [LICENSE](LICENSE)).
