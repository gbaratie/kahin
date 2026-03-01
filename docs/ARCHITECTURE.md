# Architecture et principes SOLID

## 1. Structure du monorepo (implémentée)

Le code est organisé en **monorepo** avec des packages partagés et deux applications déployables :

```
kahin/
├── apps/
│   ├── front/           # Next.js — accueil, créer QCM, lancer session, rejoindre, participer
│   └── api/             # Express — REST API (Render)
└── packages/
    ├── qcm-domain/      # Entités + ports (cœur métier, aucune dépendance externe)
    ├── qcm-application/ # Cas d’usage (dépend de qcm-domain)
    └── qcm-infrastructure/ # Repositories in-memory + MockRealtimeTransport (dépend de qcm-domain)
```

L’app **front** contient la **couche présentation** (context, hooks, composants) pour l’admin (création, lancement, vue animateur) et le participant (rejoindre, répondre). Elle dépend des packages `@kahin/qcm-domain`, `@kahin/qcm-application`, `@kahin/qcm-infrastructure`. L’architecture reste **hexagonale** (ports & adapters) au niveau des packages.

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

## 3. Déploiement : un front + un back

- **Front** (Next.js) : une seule app avec toutes les pages (accueil, créer QCM, lancer session, rejoindre, participer). Déployable sur GitHub Pages.
- **Backend** (Render) : API REST + temps réel (WebSocket ou équivalent à venir), persistance quiz en JSON, sessions en mémoire.

---

## 4. Monorepo avec `apps/` et `packages/`

```
kahin/
├── apps/
│   ├── front/                 # UI unifiée (Next.js) — admin + participant
│   │   ├── src/
│   │   │   ├── pages/         # index, qcm/create, qcm/launch, qcm/session/[id], join, session/[id]
│   │   │   ├── components/
│   │   │   └── ...
│   │   ├── package.json
│   │   └── next.config.js
│   │
│   └── api/                   # Backend (Node/Express) → Render
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

| Besoin                       | Réponse                                                                                                                                  |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Déployer le **front**        | Une seule app Next.js (export statique) déployable sur GitHub Pages, avec toutes les pages (admin + participant).                         |
| Backend sur **Render**      | `apps/api` est une app Node déployable seule (REST).                                                                                      |
| Réutiliser la logique métier | `qcm-domain` et `qcm-application` sont des packages utilisés par l’API et par le front (typage, validation, use cases en mode “local”).  |
| Éviter la duplication       | Entités, ports et cas d’usage vivent dans des packages à la racine (`packages/`), pas éparpillés dans les apps.                           |

### Ce qui reste “à la racine”

- **Config monorepo** : `package.json` (workspaces), `tsconfig.base.json`.
- **Outillage partagé** : ESLint, Prettier, TypeScript de base.
- **CI/CD** : un workflow (build front + deploy GitHub Pages) et la config Render pour l’API.

---

## 5. Résumé

- La structure **`apps/front/src/qcm/`** (domain → application → infrastructure → presentation) respecte les **principes SOLID** et une architecture hexagonale.
- **Un front unifié** (`apps/front`) et **une API** (`apps/api`) avec des **packages partagés** (`qcm-domain`, `qcm-application`, `qcm-infrastructure`) permettent une seule base de code, un déploiement front sur GitHub Pages et l’API sur Render.
