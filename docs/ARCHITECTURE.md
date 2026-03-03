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
    ├── qcm-infrastructure/ # Repositories in-memory + MockRealtimeTransport (dépend de qcm-domain)
    └── shared-utils/    # Utilitaires partagés (ex. getErrorMessage, toError) — utilisé par front et api
```

L’app **front** contient la **couche présentation** (context, hooks, composants) pour l’admin (création, lancement, vue animateur) et le participant (rejoindre, répondre). Elle dépend des packages `@kahin/qcm-domain`, `@kahin/qcm-application`, `@kahin/qcm-infrastructure`, `@kahin/shared-utils`. L’architecture reste **hexagonale** (ports & adapters) au niveau des packages.

**Côté API** : `apps/api/src` contient `routes/`, `middleware/` (gestion d’erreur centralisée, wrapper `handleAsync`), `validation/` (ex. body quiz pour POST/PUT).

**Côté front** : `apps/front/src` contient `components/common/` (LoadingScreen, ErrorAlert, PageLayout), `hooks/useAsyncCall.ts`, `config/layout.ts` pour les constantes de mise en page.

---

## 2. En quoi ça répond aux principes SOLID

### **S – Single Responsibility (Responsabilité unique)**

- **Entités** : ne portent que les données et invariants métier (ex. `Session`, `Quiz`).
- **Use cases** : un cas d’usage = une action métier (ex. `CreateQuizUseCase` ne fait que créer un quiz).
- **Repositories / Transport** : une seule raison de changer (persistance quiz, persistance session, temps réel).
- **Middleware d’erreur** : une seule responsabilité — transformer les erreurs en réponses HTTP (code + message).
- **Validation** : la validation du body (ex. `validateQuizBody`) est centralisée dans un module dédié, réutilisée par les routes POST et PUT.

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
- L’injection se fait dans `QcmDependenciesContext` (front) et dans `container.ts` (API) : les use cases reçoivent des repositories et un transport via leur constructeur.

### Gestion des erreurs et handlers async (API)

- Les routes ne contiennent plus de `try/catch` : un **wrapper** `handleAsync(fn)` exécute le handler et transmet toute exception au **middleware d’erreur** global.
- Le middleware mappe les messages métier (ex. « Quiz not found », « Session not found ») vers les codes HTTP (404, 400, 500) et utilise `getErrorMessage` de `@kahin/shared-utils` pour le corps de la réponse.

---

## 3. Déploiement : un front + un back

- **Front** (Next.js) : une seule app avec toutes les pages (accueil, créer QCM, lancer session, rejoindre, participer). Déployable sur GitHub Pages.
- **Backend** (Render) : API REST, persistance quiz en JSON ou Postgres, sessions en mémoire.

---

## 4. Monorepo avec `apps/` et `packages/`

```
kahin/
├── apps/
│   ├── front/                 # UI unifiée (Next.js) — admin + participant
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   ├── components/    # Layout, ApiStatus
│   │   │   ├── components/common/  # LoadingScreen, ErrorAlert, PageLayout
│   │   │   ├── config/        # theme, site, layout
│   │   │   ├── hooks/         # useAsyncCall
│   │   │   └── qcm/           # apiClient, hooks, components, QcmDependenciesContext
│   │   ├── package.json
│   │   └── next.config.js
│   │
│   └── api/                   # Backend (Node/Express) → Render
│       ├── src/
│       │   ├── routes/        # quiz, session
│       │   ├── middleware/    # errorHandler, handleAsync
│       │   ├── validation/    # quizBody
│       │   └── container.js
│       ├── package.json
│       └── ...
│
├── packages/
│   ├── qcm-domain/
│   ├── qcm-application/
│   ├── qcm-infrastructure/
│   └── shared-utils/          # errorUtils (getErrorMessage, toError)
│
├── package.json               # Workspace root (npm workspaces)
└── docs/
```

### Intérêt de cette séparation

| Besoin                       | Réponse                                                                                                                                 |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Déployer le **front**        | Une seule app Next.js (export statique) déployable sur GitHub Pages, avec toutes les pages (admin + participant).                       |
| Backend sur **Render**       | `apps/api` est une app Node déployable seule (REST).                                                                                    |
| Réutiliser la logique métier | `qcm-domain` et `qcm-application` sont des packages utilisés par l’API et par le front (typage, validation, use cases en mode “local”). |
| Éviter la duplication        | Entités, ports, cas d’usage et utilitaires (shared-utils) vivent dans des packages à la racine.                                         |

---

## 5. Diagrammes de séquence

Les flux ci-dessous décrivent les interactions entre le client (navigateur), le front Next.js, l’API Express et les use cases / repositories.

### 5.1 Créer un QCM

L’utilisateur soumet le formulaire de création. Le front envoie une requête POST à l’API avec le titre et les questions. La route valide le body via `validateQuizBody`, appelle `CreateQuizUseCase`, qui persiste le quiz via le `QuizRepository` (fichier JSON ou Postgres).

```mermaid
sequenceDiagram
  participant Client
  participant Front
  participant API
  participant CreateQuizUseCase
  participant QuizRepository

  Client->>Front: Soumet formulaire (titre, questions)
  Front->>API: POST /api/quiz
  API->>API: validateQuizBody(body)
  API->>CreateQuizUseCase: execute(input)
  CreateQuizUseCase->>QuizRepository: save(quiz)
  QuizRepository-->>CreateQuizUseCase: quiz
  CreateQuizUseCase-->>API: quiz
  API-->>Front: 201 + quiz
  Front-->>Client: Redirection ou affichage
```

### 5.2 Lancer une session

L’animateur choisit un quiz et lance une session. Le front envoie POST `/api/quiz/:quizId/launch`. L’API charge le quiz, crée une session (code, état), la sauvegarde en mémoire et notifie via le transport temps réel (mock ou WebSocket). La réponse contient la session (id, code).

```mermaid
sequenceDiagram
  participant Animateur
  participant Front
  participant API
  participant LaunchSessionUseCase
  participant QuizRepository
  participant SessionRepository
  participant RealtimeTransport

  Animateur->>Front: Clique "Lancer"
  Front->>API: POST /api/quiz/:quizId/launch
  API->>LaunchSessionUseCase: execute(quizId)
  LaunchSessionUseCase->>QuizRepository: getById(quizId)
  QuizRepository-->>LaunchSessionUseCase: quiz
  LaunchSessionUseCase->>SessionRepository: save(session)
  LaunchSessionUseCase->>RealtimeTransport: publish("session_created", ...)
  LaunchSessionUseCase-->>API: session
  API-->>Front: 201 + session
  Front-->>Animateur: Vue animateur (code, contrôles)
```

### 5.3 Rejoindre une session

Le participant saisit le code et son nom. Le front envoie POST `/api/session/join`. L’API récupère la session par code, enregistre le participant, notifie le transport et renvoie la session et l’id du participant.

```mermaid
sequenceDiagram
  participant Participant
  participant Front
  participant API
  participant JoinSessionUseCase
  participant SessionRepository
  participant RealtimeTransport

  Participant->>Front: Code + nom
  Front->>API: POST /api/session/join { code, participantName }
  API->>JoinSessionUseCase: execute({ code, participantName })
  JoinSessionUseCase->>SessionRepository: getByCode(code)
  SessionRepository-->>JoinSessionUseCase: session
  JoinSessionUseCase->>SessionRepository: save(session avec nouveau participant)
  JoinSessionUseCase->>RealtimeTransport: publish("participant_joined", ...)
  JoinSessionUseCase-->>API: { session, participant }
  API-->>Front: 201 + { session, participant }
  Front-->>Participant: Redirection vers /session/:id?participantId=...
```

### 5.4 Soumettre une réponse

Le participant choisit une réponse pendant une question. Le front envoie POST `/api/session/:id/answer` avec participantId, questionId, choiceId. L’API met à jour la session (enregistrement de la réponse) et notifie le transport. Réponse 204.

```mermaid
sequenceDiagram
  participant Participant
  participant Front
  participant API
  participant SubmitAnswerUseCase
  participant SessionRepository
  participant RealtimeTransport

  Participant->>Front: Sélectionne une réponse
  Front->>API: POST /api/session/:id/answer { participantId, questionId, choiceId }
  API->>SubmitAnswerUseCase: execute({ sessionId, participantId, questionId, choiceId })
  SubmitAnswerUseCase->>SessionRepository: getById(sessionId)
  SessionRepository-->>SubmitAnswerUseCase: session
  SubmitAnswerUseCase->>SessionRepository: save(session avec answer)
  SubmitAnswerUseCase->>RealtimeTransport: publish("answer_submitted", ...)
  SubmitAnswerUseCase-->>API: void
  API-->>Front: 204
  Front-->>Participant: Mise à jour UI
```

### 5.5 Question suivante (animateur)

L’animateur passe à la question suivante. Le front envoie POST `/api/session/:id/next`. L’API met à jour l’index de la question courante (ou marque la session comme terminée), notifie le transport et renvoie l’état (ex. finished, currentQuestionIndex).

```mermaid
sequenceDiagram
  participant Animateur
  participant Front
  participant API
  participant NextQuestionUseCase
  participant SessionRepository
  participant RealtimeTransport

  Animateur->>Front: Clique "Question suivante"
  Front->>API: POST /api/session/:id/next
  API->>NextQuestionUseCase: execute(sessionId)
  NextQuestionUseCase->>SessionRepository: getById(sessionId)
  SessionRepository-->>NextQuestionUseCase: session
  NextQuestionUseCase->>SessionRepository: save(session mis à jour)
  NextQuestionUseCase->>RealtimeTransport: publish(question_show ou session_finished, ...)
  NextQuestionUseCase-->>API: { finished, currentQuestionIndex, ... }
  API-->>Front: 200 + résultat
  Front-->>Animateur: Mise à jour vue (question ou fin)
```

---

## 6. Résumé

- La structure **`apps/front/src/qcm/`** et **`apps/api/src/`** (routes, middleware, validation) respecte les **principes SOLID** et une architecture hexagonale.
- **Un front unifié** (`apps/front`) et **une API** (`apps/api`) avec les **packages partagés** (`qcm-domain`, `qcm-application`, `qcm-infrastructure`, `shared-utils`) permettent une seule base de code, un déploiement front sur GitHub Pages et l’API sur Render.
- Les **diagrammes de séquence** ci-dessus décrivent les flux métier principaux (création QCM, lancement session, rejoindre, répondre, question suivante).
