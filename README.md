# Kahin — QCM interactif

Monorepo pour créer des sondages QCM et faire participer l’audience en temps réel. Trois déploiements possibles :

- **UI Admin** (création, lancement, vue animateur)
- **UI Participant** (rejoindre une session, répondre aux questions)
- **API** (backend Node/Express pour Render)

Construit avec **Next.js 14**, **React 18**, **TypeScript**, **MUI** et une architecture hexagonale (domaine partagé dans `packages/`).

## Structure du monorepo

```
kahin/
├── apps/
│   ├── admin/          # Next.js — créer QCM, lancer session, vue host (port 3000)
│   ├── participant/     # Next.js — rejoindre session, vue participant (port 3001)
│   └── api/             # Express — REST API pour Render (port 4000)
├── packages/
│   ├── qcm-domain/      # Entités + ports (partagé)
│   ├── qcm-application/ # Cas d’usage (partagé)
│   └── qcm-infrastructure/ # Repos in-memory + MockRealtimeTransport
├── docs/
│   └── ARCHITECTURE.md  # Principes SOLID et déploiement
├── package.json        # Workspaces npm
└── tsconfig.base.json
```

## Quick Start

```bash
npm install
# Build des packages partagés (nécessaire avant de lancer les apps)
npm run build -w @kahin/qcm-domain && npm run build -w @kahin/qcm-application && npm run build -w @kahin/qcm-infrastructure
```

### Lancer une app

| App         | Commande                  | URL                   |
| ----------- | ------------------------- | --------------------- |
| Admin       | `npm run dev:admin`       | http://localhost:3000 |
| Participant | `npm run dev:participant` | http://localhost:3001 |
| API         | `npm run dev:api`         | http://localhost:4000 |

**Pour que « rejoindre une partie » fonctionne** (participant qui rejoint une session lancée par l’admin), il faut que les deux apps partagent le même état via l’API :

1. Démarrer l’API : `npm run dev:api`
2. Dans `apps/admin/.env` et `apps/participant/.env` (ou `.env.local`), définir :  
   `NEXT_PUBLIC_API_URL=http://localhost:4000`
3. **Redémarrer** les serveurs dev admin et participant après toute modification des variables d’environnement (les variables `NEXT_PUBLIC_*` sont prises au démarrage).
4. Démarrer l’admin et le participant. Créer un QCM et lancer une session depuis l’admin, puis rejoindre avec le code depuis le participant.

Sans `NEXT_PUBLIC_API_URL`, chaque app utilise son propre stockage **in-memory** (sessions créées côté admin invisibles côté participant). En haut de chaque interface, un indicateur affiche **Mode local** ou **API … — OK** / **Injoignable** pour vérifier que le front envoie bien les requêtes vers le back.

## Scripts racine

| Commande                    | Description                                                                            |
| --------------------------- | -------------------------------------------------------------------------------------- |
| `npm run build`             | Build tous les packages puis admin, participant et api (ordre de dépendances respecté) |
| `npm run build:admin`       | Build packages + app admin uniquement                                                  |
| `npm run build:participant` | Build packages + app participant uniquement                                            |
| `npm run build:api`         | Build packages + app API uniquement                                                    |
| `npm run dev:admin`         | Dev app admin (Next.js, port 3000)                                                     |
| `npm run dev:participant`   | Dev app participant (Next.js, port 3001)                                               |
| `npm run dev:api`           | Dev API (tsx watch, port 4000)                                                         |
| `npm run format`            | Formatage Prettier                                                                     |
| `npm run format:check`      | Vérification Prettier                                                                  |

## Déploiement

- **UI Admin** : build → `apps/admin/out` (export statique). Déployable sur GitHub Pages, Vercel, etc.
- **UI Participant** : build → `apps/participant/out`. Idem, déploiement séparé possible.
- **API** : build → `apps/api/dist`, puis `node dist/index.js`. Déployable sur Render (Web Service).

Pour GitHub Pages, le workflow dans `.github/workflows/deploy.yml` build admin et participant puis déploie le dossier `deploy/`. **Base path** : si la variable de dépôt `NEXT_PUBLIC_BASE_PATH` n’est pas définie, elle est fixée par défaut à `/<nom-du-repo>` (ex. `/kahin`), afin que les liens et assets fonctionnent correctement sous `https://<user>.github.io/<repo>/`. Variables optionnelles : `NEXT_PUBLIC_BASE_PATH`, `NEXT_PUBLIC_SITE_NAME`.

## Configuration

- Chaque app a son `next.config.js` (admin, participant) ou point d’entrée (api).
- `NEXT_PUBLIC_BASE_PATH` : base path pour les assets et la navigation (ex. `/kahin` sur GitHub Pages). En CI, par défaut = `/<nom-du-repo>` si non défini.
- `NEXT_PUBLIC_SITE_NAME` : titre du site.
- `NEXT_PUBLIC_API_URL` : URL de l’API (ex. `http://localhost:4000`). Si défini, admin et participant utilisent l’API pour quiz/sessions (nécessaire pour rejoindre une partie entre les deux apps).
- API : `PORT` (défaut 4000), `QUIZ_JSON_PATH` (optionnel, défaut `data/quizzes.json`).

**Persistance des données** : l’API enregistre les **quiz** dans un fichier JSON (`apps/api/data/quizzes.json` par défaut). Les **sessions** et réponses sont en mémoire : elles disparaissent au redémarrage de l’API. Pour une persistance des sessions, il faudrait ajouter un stockage (fichier ou base) côté API.

## Prérequis

- Node.js 18+ (recommandé : 20)
- npm

## Documentation

- [Architecture et SOLID](docs/ARCHITECTURE.md) : structure des packages, principes SOLID, proposition de déploiement.

## Licence

MIT (voir [LICENSE](LICENSE)).
