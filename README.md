# Kahin — QCM interactif

Monorepo pour créer des sondages QCM et faire participer l’audience en temps réel. Deux déploiements :

- **Front** (Next.js) : création de QCM (questions QCM ou nuage de mots), lancement de session (vue animateur), rejoindre une session (vue participant) — une seule app avec toutes les pages.
- **API** (Express) : backend REST pour Render.

Construit avec **Next.js 14**, **React 18**, **TypeScript**, **MUI** et une architecture hexagonale (domaine partagé dans `packages/`).

## Structure du monorepo

```
kahin/
├── apps/
│   ├── front/           # Next.js — accueil, créer QCM, lancer session, rejoindre, participer (port 3000)
│   └── api/             # Express — REST API pour Render (port 4000)
├── packages/
│   ├── qcm-domain/      # Entités + ports (partagé)
│   ├── qcm-application/ # Cas d’usage (partagé)
│   ├── qcm-infrastructure/ # Repos in-memory + MockRealtimeTransport
│   └── shared-utils/    # Utilitaires partagés (getErrorMessage, toError)
├── docs/
│   └── ARCHITECTURE.md  # Principes SOLID, déploiement et diagrammes de séquence
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
4. Démarrer le front. Depuis l’accueil : créer un QCM et lancer une session, ou rejoindre avec le code depuis la même interface.

Sans `NEXT_PUBLIC_API_URL`, le front utilise un stockage **in-memory** local (sessions créées invisibles pour d’autres onglets). En haut de l’interface, un indicateur affiche **Mode local** ou **API … — OK** / **Injoignable** pour vérifier la connexion au back.

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
- **API** : build → `apps/api/dist`, puis `node dist/index.js`. Déployable sur Render (Web Service). Un fichier **`render.yaml`** à la racine définit le service (build : `npm ci && npm run build:api`, start : `npm run start -w api`). Sur Render, configurer les variables d’environnement (ex. `DATABASE_URL` pour Postgres en production, voir `apps/api/README.md`).

**Base path** : si la variable de dépôt `NEXT_PUBLIC_BASE_PATH` n’est pas définie, elle est fixée par défaut à `/<nom-du-repo>` (ex. `/kahin`) pour que les liens et assets fonctionnent sous `https://<user>.github.io/<repo>/`. Variables optionnelles : `NEXT_PUBLIC_BASE_PATH`, `NEXT_PUBLIC_SITE_NAME`, `NEXT_PUBLIC_API_URL`.

## Configuration

- Le front a son `next.config.js` (export statique, basePath). L’API a son point d’entrée dans `apps/api`.
- `NEXT_PUBLIC_BASE_PATH` : base path pour les assets et la navigation (ex. `/kahin` sur GitHub Pages). En CI, par défaut = `/<nom-du-repo>` si non défini.
- `NEXT_PUBLIC_SITE_NAME` : titre du site.
- `NEXT_PUBLIC_API_URL` : URL de l’API (ex. `http://localhost:4000`). Si défini, le front utilise l’API pour quiz/sessions (nécessaire pour rejoindre une partie en mode déployé).
- API : `PORT` (défaut 4000, fourni par Render en prod), `NODE_ENV`, `QUIZ_JSON_PATH` (optionnel), `DATABASE_URL` (optionnel, pour Postgres en production). Voir `apps/api/README.md` et `render.yaml` pour le déploiement sur Render.

**Persistance des données** : l’API enregistre les **quiz** dans un fichier JSON (`apps/api/data/quizzes.json` par défaut). Les **sessions** et réponses sont en mémoire : elles disparaissent au redémarrage de l’API. Pour une persistance des sessions, il faudrait ajouter un stockage (fichier ou base) côté API.

## Prérequis

- Node.js 18+ (recommandé : 20)
- npm

## Documentation

- [Architecture et SOLID](docs/ARCHITECTURE.md) : structure des packages, principes SOLID, déploiement, et **diagrammes de séquence** des flux métier (créer QCM, lancer session, rejoindre, répondre, question suivante).

## Licence

MIT (voir [LICENSE](LICENSE)).
