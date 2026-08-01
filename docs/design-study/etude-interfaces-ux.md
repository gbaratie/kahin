# Étude de design — audit initial (QCM interactif)

> **Suite** : la proposition aboutie (design system unique + pistes de nom) est dans
> [proposition-design-unifie.md](./proposition-design-unifie.md). Ce document reste l’audit de départ.

Document d’audit UX/UI des interfaces existantes, propositions d’amélioration (produit + technique), plan de mise en œuvre, et direction visuelle illustrée par des rendus conceptuels.

**Périmètre** : application front Next.js (`apps/front`), usages **mobile** (élèves), **ordinateur** (animateur / admin), **projection** (écran hôte en classe).

**Date** : août 2026 · Branche : `cursor/design-study-ux-26a9`

---

## 1. Synthèse

Kahin fonctionne déjà bien comme outil pédagogique temps réel (rejoindre par code/QR, modes cours/découverte, types de questions, classement). Le design actuel reste toutefois **fonctionnel / générique MUI** : typographie Roboto, fonds plats, cartes Paper empilées, peu de hiérarchie pour la lecture à distance, et peu de différenciation selon le contexte d’usage (téléphone vs vidéoprojecteur).

**Verdict** : prioriser une refonte par **contextes d’usage** (participant mobile, hôte projection, admin desktop) plutôt qu’un simple « relooking » global. Les gains les plus visibles se situent sur l’écran **lobby/question hôte** (lisibilité projetée) et le parcours **rejoindre / répondre** (fluidité mobile).

---

## 2. Cartographie des interfaces actuelles

### 2.1 Personas & contextes

| Persona | Contexte | Écrans clés |
| --- | --- | --- |
| Élève | Smartphone, souvent en Wi‑Fi école, une main | Accueil → Rejoindre → Identité → Session (répondre / attente / feedback / classement) · Règles |
| Animateur | Ordinateur + vidéoprojecteur | Connexion · Accueil QCM · Banque · Création/édition · Classes · Lancement · **Vue hôte** (attente, question, feedback, classement) · Notes |
| Observateur / classe | Écran projeté (loin, luminosité variable) | Même vue hôte — priorité lisibilité & contraste |

### 2.2 Inventaire des écrans

| Zone | Route / composant | Rôle |
| --- | --- | --- |
| Shell | `Layout.tsx` | Header, nav, thème, login animateur, drawer mobile |
| Accueil élève | `pages/index.tsx` + `JoinSessionForm` | Entrée principale = rejoindre |
| Accueil animateur | `pages/index.tsx` | Raccourcis + liste des QCM |
| Rejoindre | `/join`, formulaire multi-étapes | Code → identité (liste / libre) → confirm |
| Règles | `/rules` | Pédagogie modes & types |
| Admin | `/qcm/*` | Questions, créer, classes, notes, lancer, éditer |
| Hôte | `SessionHostView` | Lobby QR/code, question live, feedback, classement, CSV |
| Participant | `SessionParticipantView` | Réponse, attente, feedback, classement perso |
| Thème | `config/theme.ts` + `ColorModeContext` | Clair / sombre / système |

### 2.3 Forces actuelles

- Parcours rejoindre **en étapes** (code → nom) clair et déjà pensé mobile.
- **QR + code** côté hôte pour l’entrée en salle.
- Modes **cours / découverte** visibles via bandeau (`QuestionPlayModeBanner`).
- Thème clair/sombre avec préférence persistée.
- Responsive basique déjà présent (breakpoints MUI, drawer burger, boutons pleine largeur côté participant).
- Classement hôte avec graphique Recharts adapté aux gros effectifs (scroll, densité).

### 2.4 Limites UX / UI observées

#### Identité & marque

- Nom affiché par défaut « QCM » (`NEXT_PUBLIC_SITE_NAME`) — marque **Kahin** peu portée dans l’UI.
- Police **Roboto** + palette bleu-gris générique → produit peu mémorable.
- Fonds plats (`#f4f6fa` / `#0f1116`) sans atmosphère ni ancrage visuel pédagogique.

#### Shell & navigation

- Nav animateur dense (Accueil, Règles, Questions, Créer, Classes, Notes, Rejoindre) — surcharge cognitive sur desktop, drawer long sur mobile.
- `ApiStatus` dans le header utile au debug, bruitant en session projetée.
- Header + contrôles (thème, cadenas) restent visibles pendant une session hôte — moins immersif en projection.

#### Accueil / admin

- Accueil animateur = grille de boutons + liste Paper : efficace mais « outil interne », pas tableau de bord.
- Actions Lancer / Éditer / Supprimer peu hiérarchisées visuellement.
- Pas de statut de session récente, pas de « reprendre », pas d’aperçu du QCM.

#### Rejoindre (mobile)

- Saisie code classique `TextField` (pas d’OTP 6 cases, pas de clavier optimisé).
- Liste de noms scrollable correcte, mais peu « app-like » (pas de grandes zones tactiles premium).
- Description longue + lien règles au-dessus du CTA principal.

#### Vue hôte (projection — point faible majeur)

- `maxWidth: 960` + typo `h4`/`body1` : **trop petit** pour une salle.
- Lobby : code et QR corrects, mais participants en liste à puces peu spectaculaire.
- Pendant la question : empilement Paper (participants, timer, question, bouton) — hiérarchie faible ; le bouton « Voir les résultats » peut polluer la projection.
- Choix affichés en liste, pas en grille lisible à distance (A/B/C/D).
- Pas de mode « présentation / zen » (masquer chrome UI, plein écran).

#### Vue participant (mobile)

- Réponses QCM : sélection puis **Valider** (2 taps) — friction vs apps type Kahoot (1 tap).
- Après réponse : écran minimaliste « Merci… » — moment mort peu engageant.
- Classement : bon focus « Mon classement », mais liste top 10 basique.
- Timer + bandeau mode + question + choix : densité textuelle élevée sur petit écran.

#### Feedback & classement

- Feedback hôte riche (barres / graphiques) mais même wrapping Paper que le reste.
- Peu de dramaturgie (révélation progressive, podium, animations intentionnelles).

#### Accessibilité & multi-supports

- Contrastes globalement OK en thème sombre ; timer/urgence peu différenciée.
- Pas de `prefers-reduced-motion`.
- Pas de breakpoints dédiés **projection** (`xl` / hauteur viewport / mode plein écran).
- Zones tactiles variables ; certains `IconButton` petits pour doigts.

---

## 3. Direction produit proposée

### 3.1 Principes

1. **Un contexte = une UI** — layouts distincts : `ParticipantShell`, `PresenterShell`, `AdminShell`.
2. **Lisibilité avant décor** — en projection : typo XXL, contraste, peu d’éléments.
3. **Une action dominante** — chaque écran a un CTA ou un geste principal évident.
4. **Marque Kahin** — signal de marque fort sur les écrans d’entrée ; discret en session live.
5. **Motion utile** — 2–3 animations (entrée question, validation, podium), pas de bruit.
6. **Cohérence sans cartes partout** — Cards uniquement quand elles structurent une interaction.

### 3.2 Direction visuelle (tokens)

| Token | Proposition |
| --- | --- |
| Palette | Teal profond `#0B3D3A` → `#145C56`, accent ambre/corail `#F0A04B`, texte crème `#F4EFE6` |
| Fond | Dégradés / motifs géométriques légers (salle / grille), jamais plat unique |
| Typo display | Famille géométrique expressive (ex. **Sora** ou **Outfit**) — éviter Roboto/Inter/Arial |
| Typo UI | Même famille en poids 400–600 pour l’interface |
| Code session | Mono large, tracking généreux (ex. JetBrains Mono / IBM Plex Mono) |
| Forme | Rayons modérés (10–14px), pas de pills « full » systématiques |
| Modes | Cours = ambre saturé ; Découverte = teal calme (pas seulement Alert MUI) |

Éviter volontairement : thème violet générique, crème + terracotta cliché, layout « journal », dark + glow néon.

---

## 4. Propositions par interface

### 4.1 Mobile participant

| Écran | Amélioration |
| --- | --- |
| Rejoindre | Hero marque + saisie code 6 cases + CTA unique ; étape identité en grandes lignes tactiles |
| Question | Timer compact ; choix A–D pleine largeur ; **tap = envoi** (ou option « confirmation ») |
| Attente | Mini animation / score provisoire / « X ont déjà répondu » si dispo |
| Feedback | Résultat perso immédiatement lisible (bon/faux) puis détail |
| Classement | Rang hero + liste podium stylisée |

### 4.2 Projection hôte

| Écran | Amélioration |
| --- | --- |
| Lobby | Plein viewport : code XXL + QR large + compteur participants ; chrome UI réduit |
| Question | Question dominante ; grille 2×2 des choix ; timer circulaire/bandeau fort ; compteur réponses |
| Feedback | Révélation de la bonne réponse ; barres distribution |
| Classement | Podium top 3 + liste ; mode sombre forcé optionnel pour projecteur |

Contrôles animateur (Continuer, CSV) : **barre flottante discrète** ou panneau latéral, pas au milieu du contenu projeté.

### 4.3 Desktop admin

| Zone | Amélioration |
| --- | --- |
| Navigation | Sidebar ou groupes (Préparer / Animer / Suivre) |
| Accueil | « Lancer rapidement » + liste QCM avec métadonnées (nb questions, thématiques) |
| Banque / édition | Conserver densité outil, mais hiérarchie titres + états vides illustrés |
| Lancement | Récap QCM + choix classe en une carte de confirmation claire |

---

## 5. Propositions techniques

### 5.1 Front / design system

| Proposition | Détail |
| --- | --- |
| Design tokens | Étendre `theme.ts` : couleurs sémantiques (`presenter`, `successQuiz`, `courseMode`), échelles type `display` / `projector` |
| Fonts | `next/font` (Google) pour display + mono ; retirer dépendance visuelle à Roboto |
| Shells | 3 layouts : participant (minimal), presenter (chrome off / fullscreen API), admin (nav structurée) |
| Composants | `SessionCodeInput`, `AnswerOption`, `PresenterTimer`, `JoinHero`, `RankPodium` |
| Breakpoints | Ajouter helpers `usePresenterMode` (fullscreen + large type scale) |
| Motion | CSS/`@emotion` transitions + `prefers-reduced-motion` |
| Densité | Props `density="comfortable \| compact \| projector"` sur composants session |

### 5.2 UX comportementale

| Proposition | Détail |
| --- | --- |
| 1-tap answer | Option session ou défaut participant : sélection = soumission (avec undo court 1–2 s) |
| Host controls | Raccourcis clavier (Espace = suivant, F = fullscreen) |
| Fullscreen | Bouton « Mode projecteur » → `element.requestFullscreen()` + classe CSS |
| Hiding chrome | Masquer `Layout` header / `ApiStatus` sur routes session hôte |
| Deep link QR | Déjà en place — conserver ; préremplir code (OK) |

### 5.3 Performance & temps réel

| Proposition | Détail |
| --- | --- |
| Polling | Déjà présent ; envisager SSE/WebSocket pour réduire latence ressentie (classement / compteur) |
| Word cloud | Limiter, déjà memoïsé — OK |
| Images / assets | Pas d’images produit aujourd’hui ; si ajout, formats modernes + lazy |
| Bundle | Extraire Recharts / wordcloud (déjà `dynamic` pour QR) — étendre si besoin |

### 5.4 Accessibilité & qualité

| Proposition | Détail |
| --- | --- |
| a11y | Focus visible, labels, contrastes WCAG AA, annonces live region pour « temps écoulé » |
| Tests visuels | Storybook ou pages de preview pour shells (optionnel phase 2) |
| i18n | UI déjà FR — garder libellés courts en projection |
| PWA légère | `manifest` + icônes pour « Ajouter à l’écran d’accueil » élèves (phase 2) |

### 5.5 Hors scope UI mais impact UX

- Persistance sessions (aujourd’hui en mémoire API) → reprise après refresh / crash.
- Indicateur connexion participant plus clair (reconnect).
- Mode « télécommande » : téléphone animateur contrôle, ordi projette (phase 3).

---

## 6. Plan de mise en œuvre UX

Approche incrémentale, livrable par PR, sans big-bang.

### Phase 0 — Fondations (design system)

- Tokens couleur / typo / spacing projection
- Fonts + thème MUI étendu
- Découpage shells (sans changer tous les écrans)

**Critère de done** : thème Kahin appliqué globalement, aucune régression fonctionnelle.

### Phase 1 — Impact salle (hôte projection)

- Mode projecteur (fullscreen + typo XXL)
- Lobby redesign (code + QR + compteur)
- Question live en grille A–D
- Contrôles animateur séparés du contenu projeté

**Critère de done** : lisible à ~5–8 m sur vidéoprojecteur standard.

### Phase 2 — Impact poche (participant)

- Join hero + code 6 cases
- Réponse 1-tap + états attente/feedback plus riches
- Classement perso type podium

**Critère de done** : parcours rejoindre → répondre en ≤ 3 gestes après saisie code.

### Phase 3 — Admin & polish

- Restructuration nav / dashboard animateur
- États vides, micro-copy, motion
- Option PWA / télécommande (si priorisé)

### Ordre de valeur

```text
Fondations thème
    → Presenter shell (lobby + question)
        → Participant join + answer
            → Feedback / ranking polish
                → Admin IA
```

---

## 7. Rendus conceptuels

Ces visuels sont des **propositions de direction**, pas des maquettes pixel-perfect liées au code actuel.

| Rendu | Fichier | Intention |
| --- | --- | --- |
| Rejoindre (mobile) | [rendus/kahin-join-mobile.png](./rendus/kahin-join-mobile.png) | Marque hero, code, CTA unique |
| Lobby hôte (projection) | [rendus/kahin-host-lobby-projection.png](./rendus/kahin-host-lobby-projection.png) | Code XXL + QR + compteur |
| Question hôte (projection) | [rendus/kahin-host-question-projection.png](./rendus/kahin-host-question-projection.png) | Grille A–D lisible à distance |
| Réponse élève (mobile) | [rendus/kahin-participant-answer-mobile.png](./rendus/kahin-participant-answer-mobile.png) | Choix tactiles + timer |
| Classement perso (mobile) | [rendus/kahin-participant-ranking-mobile.png](./rendus/kahin-participant-ranking-mobile.png) | Rang hero + top liste |
| Admin desktop | [rendus/kahin-admin-desktop.png](./rendus/kahin-admin-desktop.png) | Sidebar + lancement rapide |

Galerie HTML : [galerie.html](./galerie.html)

---

## 8. Matrice de priorisation

| Id | Amélioration | Impact UX | Effort | Phase |
| --- | --- | --- | --- | --- |
| P1 | Mode projecteur hôte (fullscreen + scale) | Très haut | Moyen | 1 |
| P2 | Lobby code/QR plein écran | Très haut | Moyen | 1 |
| P3 | Question projetée grille A–D | Haut | Moyen | 1 |
| P4 | Tokens + fonts Kahin | Haut | Faible–moyen | 0 |
| P5 | Join mobile (6 cases + hero) | Haut | Moyen | 2 |
| P6 | Réponse 1-tap | Haut | Faible | 2 |
| P7 | Masquer chrome sur session hôte | Moyen | Faible | 1 |
| P8 | Classement / podium animé | Moyen | Moyen | 2–3 |
| P9 | Sidebar admin | Moyen | Moyen | 3 |
| P10 | Raccourcis clavier hôte | Moyen | Faible | 1 |
| P11 | PWA élève | Moyen | Moyen | 3 |
| P12 | SSE/WebSocket | Moyen (latence) | Élevé | plus tard |

---

## 9. Prochaines étapes suggérées

1. Valider la **direction visuelle** (teal + ambre, shells séparés) avec les parties prenantes.
2. Choisir le premier chantier d’implémentation : **Phase 0 + Phase 1** (salle) recommandé.
3. Transformer 1–2 rendus en composants React/MUI (tokens d’abord).
4. Tester en conditions réelles : smartphone élève + vidéoprojecteur classe.

---

## Annexe A — Fichiers sources audités

- `apps/front/src/config/theme.ts`, `layout.ts`, `site.ts`
- `apps/front/src/components/Layout.tsx`
- `apps/front/src/pages/index.tsx`, `join.tsx`, `rules.tsx`
- `apps/front/src/components/join/JoinSessionForm.tsx`
- `apps/front/src/qcm/components/SessionHostView.tsx`
- `apps/front/src/qcm/components/SessionParticipantView.tsx`
- `apps/front/src/qcm/components/SessionHostDisplayedQuestion.tsx`
- `apps/front/src/qcm/components/SessionHostRankingChart.tsx`
- `apps/front/src/qcm/components/QuestionPlayModeBanner.tsx`
