# Proposition aboutie — design unifié & identité

Document de **proposition** (pas encore d’implémentation). Objectif : un produit **professionnel**, une **harmonie forte** entre mobile / desktop / projection, en s’appuyant sur la stack déjà en place (**MUI + Emotion + Next.js**), et une identité qui dépasse le nom temporaire « Kahin ».

Complète l’[audit initial](./etude-interfaces-ux.md).

---

## 1. Principes de la proposition

1. **Un seul système** — mêmes couleurs, typo, composants, rayons, espacements. Les contextes ne changent que la **densité** et l’**échelle**, jamais le style.
2. **Professionnel avant ludique** — inspiré des outils type Slido / Mentimeter / Linear (clarté, calme), pas Kahoot (couleurs saturées, gamification agressive).
3. **Framework existant** — on ne réécrit pas l’UI from scratch : on **industrialise MUI** avec un thème tokenisé (proche Material Design 3).
4. **Marque internationale** — nom court, prononçable FR/EN, crédible en amphi **et** en réunion pro.

---

## 2. Pistes de nom (remplacer Kahin)

Contraintes : étudiants + contexte pro international, facile à dire, domaine / marque imaginable, neutre culturellement.

### Shortlist recommandée

| Nom | Prononciation | Pourquoi | Risques |
| --- | --- | --- | --- |
| **Quorum** | FR *kwo-rom* / EN *ˈkwɔːrəm* | Consensus, vote, assemblée — parfait salle de classe **et** boardroom. Sérieux, mémorable. | Mot anglais courant (SEO un peu générique) |
| **Klaro** | *kla-ro* | « Clair » (écho esperanto) — international, court, moderne, connoté clarté des réponses. | Marque à vérifier (homonymes possibles) |
| **Voxa** | *vok-sa* | « Voix » de la salle — brandable, tech, court. | Peut sonner « startup gadget » |
| **Atrium** | *a-tri-om* | Lieu de rassemblement, élégant, pro. | Un peu architectural / immobilier |
| **Chorus** | *ko-rus* | Réponses collectives — poétique et clair. | Connotation musicale |
| **Relay** | *ri-lay* | Relayer questions/réponses — simple EN, OK international. | Très générique |

### Recommandation

**1er choix : Quorum** — le plus crédible en contexte pro international tout en restant naturel pour des étudiants (vote, consensus, participation).

**2e choix : Klaro** — si vous voulez un nom **inventé** plus « produit » et plus facile à protéger / à domainer.

Les rendus ci-dessous utilisent **Quorum** comme hypothèse de travail (remplaçable sans changer le système visuel).

### Signature produit (tagline)

À trancher avec le nom :

- EN : *Live questions. Clear answers.*
- FR : *Questions en direct. Réponses claires.*
- Alt. : *Engage every room.* / *Chaque salle a une voix.*

---

## 3. Design system unique (s’appuyer sur MUI)

### 3.1 Pourquoi MUI (et pas un autre framework)

| Option | Verdict |
| --- | --- |
| **MUI 5 (déjà en place)** | **Recommandé** — garder les composants, remplacer le thème « défaut Roboto » par un thème produit. Moins de régression, plus rapide. |
| MUI + idées **Material Design 3** | Tokens (primary, surface, on-surface), états focus/hover, densités — sans migrer tout le kit M3. |
| shadcn/ui / Radix | Beau et moderne, mais **réécriture lourde** ; hors scope tant que MUI couvre les besoins. |
| Chakra / Ant Design | Changement de stack injustifié. |

**Décision proposée** : rester sur **MUI**, créer `createAppTheme()` riche (tokens + overrides composants), et une couche de **composants métier** (`SessionCode`, `AnswerOption`, `PresenterStage`, `AppShell`) qui encapsulent MUI pour garantir l’harmonie.

### 3.2 Fondations — une seule palette

Palette **cool professionnelle** (ni violet AI, ni crème/terracotta, ni néon) :

| Token | Valeur | Usage |
| --- | --- | --- |
| `primary` | `#0F766E` (teal profond) | CTA, liens actifs, focus |
| `primary.dark` | `#0D5C56` | Hover / projection |
| `accent` | `#C2410C` (corail maîtrisé) | Timer, urgence, mode « noté » uniquement |
| `neutral.900` | `#0F172A` | Texte principal |
| `neutral.600` | `#475569` | Texte secondaire |
| `neutral.100` | `#F1F5F9` | Fond app |
| `surface` | `#FFFFFF` | Panneaux |
| `surface.muted` | `#F8FAFC` | Zones secondaires |
| `success` / `error` | Teal / rouge sobres | Feedback réponses |

**Thème sombre** = mêmes tokens inversés (pas un second univers). Projection : forcer le thème sombre **du même système** pour le contraste salle.

### 3.3 Typographie — une famille partout

| Rôle | Police | Remarque |
| --- | --- | --- |
| UI + titres | **Plus Jakarta Sans** (via `next/font`) | Moderne, pro, lisible FR/EN |
| Code session | **IBM Plex Mono** | Chiffres/lettres du code PIN |

Échelle unique (`display` → `caption`). En projection, on multiplie la **même échelle** (`fontSize * 1.5–2`), on n’invente pas une autre typo.

### 3.4 Composants partagés (harmonie)

Tous les écrans réutilisent les **mêmes briques** :

| Brique | Mobile | Desktop admin | Projection |
| --- | --- | --- | --- |
| `AppShell` | Header compact + drawer | Header + nav latérale | Header minimal / masquable |
| `BrandMark` | Logo + nom | Idem | Idem (plus discret en live) |
| `PrimaryButton` | Pleine largeur | Auto width | Large, bas d’écran ou barre hôte |
| `SessionCode` | Saisie 6 cases | Affichage mono | Affichage XXL mono |
| `AnswerOption` | Rangée A–D | Idem | Tuile grille 2×2 (même style, plus grand) |
| `TimerBar` | Fine sous header | Idem | Plus épaisse / circulaire, **mêmes couleurs** |
| `ModeChip` | Pastille « Practice / Graded » | Idem | Idem |
| `Surface` | Fond légèrement bordé | Idem | Idem, plus d’air |
| `EmptyState` | Illustration + CTA | Idem | Rare |

Règle d’or : **si un écran a besoin d’un nouveau look, c’est que le système est incomplet** — on étend le token/composant, on ne crée pas un style local.

### 3.5 Densités (pas des styles)

```text
density: "compact"   → admin (tableaux, formulaires)
density: "comfortable" → participant mobile
density: "present"   → hôte projecté (scale typo/spacing)
```

Implémentation MUI : `theme.spacing` + variants `size` + classe `.density-present` sur le shell hôte.

### 3.6 Layouts = même chrome

```text
┌─────────────────────────────────────────┐
│  Brand     nav / status      actions    │  ← même AppBar
├─────────────────────────────────────────┤
│                                         │
│           contenu (Surface)             │  ← mêmes surfaces
│                                         │
└─────────────────────────────────────────┘
```

- Participant : AppBar légère, contenu centré `max-width: 480`.
- Admin : AppBar + **sidebar** (mêmes items, même icônes).
- Présentateur : AppBar ultra-fine ou masquée ; contenu full-bleed ; **barre de contrôle** hôte (même `PrimaryButton`).

---

## 4. Direction UX par parcours (toujours le même langage)

### 4.1 Rejoindre (mobile / desktop)

1. Marque + titre court  
2. Code 6 caractères (cases)  
3. CTA unique **Continue** / **Continuer**  
4. Identité (liste ou nom) — grandes lignes, même `Surface`  
5. Confirmation  

Bilingue ready : libellés courts, i18n préparable (`next-intl` plus tard si besoin).

### 4.2 Session live

| Moment | Participant | Présentateur |
| --- | --- | --- |
| Attente | « Waiting for host… » + identité | Code + QR + compteur (mêmes tokens) |
| Question | TimerBar + ModeChip + AnswerOptions | Même question + grille A–D scale present |
| Après réponse | État succès calme (pas confettis) | Compteur réponses |
| Feedback | Outcome perso + détail | Distribution + bonne réponse |
| Classement | Rang + liste | Graph / podium — **mêmes couleurs de barre** |

### 4.3 Admin

Sidebar structurée :

- **Prepare** — Questions, Quizzes  
- **People** — Classes  
- **Results** — Grades  
- **Session** — Join / Launch  

Accueil = liste de quizzes + CTA **Launch** (primary) ; Edit/Delete en secondary icon buttons — même pattern que partout.

---

## 5. Stack technique proposée (sans coder encore)

| Couche | Choix |
| --- | --- |
| UI kit | **MUI 5** + overrides thème |
| Tokens | `theme.ts` (palette, typography, shape, densités) |
| Fonts | `next/font` → Plus Jakarta Sans + IBM Plex Mono |
| Icons | `@mui/icons-material` (déjà là) — set limité, traits cohérents |
| Charts | **Recharts** (déjà là) — couleurs branchées sur `theme.palette` |
| Motion | Transitions CSS Emotion + `prefers-reduced-motion` |
| i18n (phase suivante) | Clés EN par défaut produit international, FR pack |

Hors scope immédiat : migration shadcn, refonte API, PWA.

---

## 6. Critères d’acceptation « harmonie »

Une UI est acceptée seulement si :

- [ ] Elle n’introduit **aucune** couleur hors tokens  
- [ ] Boutons / champs / surfaces viennent des composants partagés  
- [ ] La projection n’est qu’une **échelle** du même écran hôte  
- [ ] Mobile et desktop partagent header + patterns de CTA  
- [ ] Clair et sombre restent la même marque  

---

## 7. Plan d’implémentation (après validation)

| Étape | Contenu | Livrable |
| --- | --- | --- |
| **A. Décision marque** | Choisir Quorum / Klaro / autre | Nom + tagline + `NEXT_PUBLIC_SITE_NAME` |
| **B. Thème MUI** | Tokens, fonts, overrides Button/Paper/AppBar | Theme unique, 0 changement de parcours |
| **C. AppShell unifié** | Header/nav densités | Harmonie chrome |
| **D. Session components** | SessionCode, AnswerOption, TimerBar, ModeChip | Join + participant + host branchés |
| **E. Present density** | Fullscreen + scale | Lisibilité salle |
| **F. Admin shell** | Sidebar + home list | Même langage côté back-office |

Ordre volontaire : **marque + thème d’abord**, puis composants session (là où l’harmonie se voit le plus).

---

## 8. Rendus (même système)

Galerie : [galerie-unifiee.html](./galerie-unifiee.html)

| Écran | Fichier |
| --- | --- |
| Rejoindre | [rendus/quorum-join.png](./rendus/quorum-join.png) |
| Lobby présentation | [rendus/quorum-presenter-lobby.png](./rendus/quorum-presenter-lobby.png) |
| Question live (présentateur) | [rendus/quorum-presenter-question.png](./rendus/quorum-presenter-question.png) |
| Réponse participant | [rendus/quorum-participant-answer.png](./rendus/quorum-participant-answer.png) |
| Admin | [rendus/quorum-admin.png](./rendus/quorum-admin.png) |

Ces visuels partagent volontairement : teal `#0F766E`, surfaces blanches/slate, Plus Jakarta–like, boutons identiques, ModeChip / TimerBar cohérents.

---

## 9. Décisions à valider avant code

1. **Nom** : Quorum (reco) · Klaro · autre de la shortlist · suggestion maison ?  
2. **Accent timer** : corail `#C2410C` OK, ou uniquement teal monochrome + ambre ?  
3. **Langue UI par défaut** : EN (produit international) avec FR, ou FR d’abord ?  
4. **Réponse 1-tap** vs confirmer : défaut proposé = **1-tap** en session, option animateur « require confirmation ».  
5. **OK pour rester 100 % MUI** (thème + composants métier) ?

Dès ces points tranchés, on pourra implémenter l’étape **B (thème)** sans ambiguïté.
