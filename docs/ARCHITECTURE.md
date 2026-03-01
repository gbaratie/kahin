# Architecture et principes SOLID

## 1. Structure du monorepo (implémentée)

Le code est organisé en **monorepo** avec des packages partagés et trois applications déployables :

```
kahin/
├── apps/
│   ├── admin/           # Next.js — créer QCM, lancer session, vue animateur
│   ├── participant/      # Next.js — rejoindre session, vue participant
│   └── api/             # Express — REST API (Render)
└── packages/
    ├── qcm-domain/      # Entités + ports (cœur métier, aucune dépendance externe)
    ├── qcm-application/ # Cas d’usage (dépend de qcm-domain)
    └── qcm-infrastructure/ # Repositories in-memory + MockRealtimeTransport (dépend de qcm-domain)
```

Chaque app (admin, participant) contient sa propre **couche présentation** (context, hooks, composants) et dépend des packages `@kahin/qcm-domain`, `@kahin/qcm-application`, `@kahin/qcm-infrastructure`. L’architecture reste **hexagonale** (ports & adapters) au niveau des packages.

---

## 2. En quoi ça répond aux principes SOLID

### **S – Single Responsibility (Responsabilité unique)**

- **Entités** : ne portent que les données et invariants métier (ex. `Session`, `Quiz`).
- **Use cases** : un cas d’usage = une action métier (ex. `CreateQuizUseCase` ne fait que créer un quiz).
- **Repositories / Transport** : une seule raison de changer (persistance quiz, persistance session, temps réel).

### **O – Open/Closed (Ouvert à l’extension, fermé à la modification)**

- Les **ports** (interfaces) permettent d’ajouter de nouvelles implémentations sans toucher au domaine ni aux use cases.
- Ex. : remplacer `InMemoryQuizRepository` par `HttpQuizRepository` ou `PostgresQuizRepository` sans modifier `CreateQuizUseCase`.

### **L – Liskov Substitution (Substitution de Liskov)**

- Toute implémentation d’un port peut remplacer une autre : `InMemorySessionRepository` et un futur `ApiSessionRepository` sont interchangeables pour les use cases qui dépendent de `SessionRepository`.

### **I – Interface Segregation (Ségrégation des interfaces)**

- Les ports sont **fins et focalisés** :
  - `QuizRepository` : `save`, `getById`
  - `SessionRepository` : `save`, `getByCode`, `getById`
  - `RealtimeTransport` : `publish`, `subscribe`, optionnellement `joinChannel` / `leaveChannel`
- Les use cases ne dépendent que des méthodes dont ils ont besoin.

### **D – Dependency Inversion (Inversion de dépendances)**

- La **couche application** dépend des **abstractions** (ports), pas des détails (infra).
- L’injection se fait dans `QcmDependenciesContext` : les use cases reçoivent des repositories et un transport via leur constructeur, ce qui permet de brancher en dev du in-memory et en prod une API réelle.

---

## 3. Déploiement : deux fronts + un back

Objectif :

- **UI Création / Admin** : créer un QCM, lancer une session, vue animateur (host).
- **UI Participant** : rejoindre une session, répondre aux questions (vue participant).
- **Backend** (Render) : API REST + temps réel (WebSocket ou équivalent), persistance réelle.

Aujourd’hui tout est dans **une seule app Next.js** à la racine : pages admin et participant mélangées, pas de backend, tout en mémoire côté client. Pour déployer deux fronts et un back séparément, une **meilleure séparation du code** est utile.

---

## 4. Proposition : monorepo avec `apps/` et `packages/`

Séparer en **applications déployables** et **packages partagés** :

```
kahin/
├── apps/
│   ├── admin/                 # UI Création / Admin (Next.js)
│   │   ├── src/
│   │   │   ├── pages/         # create, launch, session/[id] (host only)
│   │   │   ├── components/    # Layout, etc.
│   │   │   └── ...
│   │   ├── package.json
│   │   └── next.config.js
│   │
│   ├── participant/           # UI Participant (Next.js)
│   │   ├── src/
│   │   │   ├── pages/         # join, session/[id]?participantId=...
│   │   │   ├── components/
│   │   │   └── ...
│   │   ├── package.json
│   │   └── next.config.js
│   │
│   └── api/                   # Backend (Node/Express ou autre) → Render
│       ├── src/
│       │   ├── routes/        # REST (quiz, sessions, answers)
│       │   ├── realtime/      # WebSocket / SSE
│       │   └── ...
│       ├── package.json
│       └── ...
│
├── packages/
│   ├── qcm-domain/            # Entités + ports (partagé front + back)
│   │   ├── src/
│   │   │   ├── entities/
│   │   │   └── ports/
│   │   └── package.json
│   │
│   ├── qcm-application/       # Use cases (partagés back ; optionnellement front pour offline/mock)
│   │   ├── src/
│   │   │   └── use-cases/
│   │   └── package.json
│   │
│   └── qcm-infrastructure/     # Implémentations côté back (repos DB, transport WebSocket)
│       ├── src/
│       │   ├── repositories/
│       │   └── realtime/
│       └── package.json
│
├── package.json               # Workspace root (npm workspaces ou pnpm/yarn)
├── pnpm-workspace.yaml        # ou équivalent
└── docs/
```

### Intérêt de cette séparation

| Besoin                                           | Réponse                                                                                                                                                                  |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Déployer **Admin** et **Participant** séparément | Chaque app dans `apps/` a son propre build et son propre déploiement (ex. deux sites GitHub Pages ou deux services Render/Vercel).                                       |
| Backend sur **Render**                           | `apps/api` est une app Node déployable seule (REST + WebSocket).                                                                                                         |
| Réutiliser la logique métier                     | `qcm-domain` et `qcm-application` sont des packages utilisés par l’API et, si besoin, par les fronts (ex. typage, validation, ou use cases en mode “local” pour le dev). |
| Éviter la duplication                            | Entités, ports et cas d’usage vivent dans des packages à la racine (`packages/`), pas éparpillés dans chaque app.                                                        |

### Ce qui reste “à la racine”

- **Config monorepo** : `package.json` (workspaces), `pnpm-workspace.yaml` (ou `npm workspaces`), éventuellement `tsconfig.base.json`.
- **Outillage partagé** : ESLint, Prettier, TypeScript de base (souvent dans `packages/` ou à la racine).
- **CI/CD** : un workflow par app (build + deploy admin, build + deploy participant, build + deploy api) ou un workflow unique qui build/déploie les trois.

Ainsi, la “plein de choses à la racine” se limite à la **configuration du monorepo** et au **versioning partagé** ; le code métier et les trois déploiements sont clairement séparés dans `apps/` et `packages/`.

---

## 5. Résumé

- La structure actuelle **`src/qcm/`** (domain → application → infrastructure → presentation) respecte bien les **principes SOLID** et une architecture hexagonale.
- Pour **deux fronts (Admin + Participant) et un back sur Render**, une organisation en **monorepo** avec **`apps/admin`**, **`apps/participant`**, **`apps/api`** et des **packages partagés** (`qcm-domain`, `qcm-application`, `qcm-infrastructure`) permet de garder une seule base de code tout en déployant chaque partie indépendamment et en réutilisant le domaine et les use cases.
