# Proposition aboutie — design unifié

Document de **proposition** (pas encore d’implémentation). Objectif : un produit **professionnel**, une **harmonie forte** entre mobile / desktop / projection, en s’appuyant sur **MUI**, sans changer le nom affiché pour l’instant.

Complète l’[audit initial](./etude-interfaces-ux.md).

---

## 1. Principes

1. **Un seul système** — mêmes couleurs, typo, composants. Les contextes ne changent que la **densité** et l’**échelle**.
2. **Professionnel avant ludique** — clarté type Slido / Mentimeter, pas Kahoot.
3. **Framework** — industrialiser **MUI** (déjà en place), pas de migration de kit UI.
4. **Nom affiché** — rester sur **QCM** (`NEXT_PUBLIC_SITE_NAME` / défaut actuel). Le renommage produit est **reporté** ; aucune marque inventée sur les interfaces.
5. **Données réelles uniquement** — pas de faux utilisateurs, fausses listes de QCM, faux domaines. URL de jointure : `https://gbaratie.github.io/kahin/join`.
6. **Viewport first** — les écrans critiques (rejoindre, question live, classement) doivent tenir dans la fenêtre **sans scroll** dans le cas d’usage nominal.

---

## 2. Identité affichée (pour l’instant)

| Élément | Décision |
| --- | --- |
| Nom UI | **QCM** uniquement |
| Renommage (Questa, Quorum, …) | Reporté — shortlist archivée en annexe, hors interfaces |
| URL rejoindre | `https://gbaratie.github.io/kahin/join` (code en query si fourni : `?code=`) |
| Données dans maquettes / démos | Libellés UI réels du produit, états vides réels, pas de jeux de données fictifs |

---

## 3. Design system unique (MUI + palette actuelle)

### 3.1 Stack

| Option | Verdict |
| --- | --- |
| **MUI 5 (déjà en place)** | **Recommandé** — thème tokenisé + composants métier |
| shadcn / Chakra / Ant | Non — coût de migration injustifié |

### 3.2 Palette — rester fidèle à l’existant

Reprendre les tokens déjà dans `apps/front/src/config/theme.ts` (pas de bascule teal) :

| Token | Clair | Sombre |
| --- | --- | --- |
| `primary` | `#3d5a9e` | `#7c9ce0` |
| `secondary` | `#5a6b8c` | `#a8b8e0` |
| `background.default` | `#f4f6fa` | `#0f1116` |
| `background.paper` | `#ffffff` | `#161a22` |
| `text.primary` | `#1a1d26` | `#e8eaef` |
| `text.secondary` | `#5c6578` | `#a0a8b8` |

Évolutions **légères** autorisées (sans changer l’identité couleur) :

- états sémantiques (success / warning mode cours) dérivés de cette base ;
- typo display plus soignée (ex. Plus Jakarta Sans) **optionnelle** — Roboto peut rester en phase 1 ;
- accent timer = `warning` MUI ou primary, pas une nouvelle marque couleur.

### 3.3 Typographie & forme

- Une famille pour toute l’app ; mono uniquement pour le **code session**.
- `shape.borderRadius: 8` (déjà en place) — conserver.
- Projection = **même thème sombre**, échelle typo/spacing ×1.5–2 (`density: present`).

### 3.4 Composants partagés

| Brique | Rôle |
| --- | --- |
| `AppShell` | Header unique (participant / admin / présentateur) |
| `SessionCode` | Saisie 6 cases (join) / affichage XXL (hôte) |
| `AnswerOption` | Rangée mobile = tuile grille hôte (même style) |
| `TimerBar` | Une seule barre de temps |
| `ModeChip` | Mode découverte / cours (remplace Alert pleine largeur quand possible) |
| `RankList` | Classement **viewport-fit** (voir §4) |

### 3.5 Densités

```text
compact      → admin
comfortable  → participant
present      → hôte projecté
```

---

## 4. Contrainte majeure : tenir dans l’écran (anti-scroll)

Les vues suivantes sont conçues pour **éviter le scroll** dans le cas nominal (smartphone courant ~640–850 px de haut utile, ou 1080p projeté).

| Vue | Règles de layout |
| --- | --- |
| **Rejoindre** | Header compact ; titre court ; code + CTA dans le premier écran ; pas de long paragraphe au-dessus. Lien règles en secondaire / footer. |
| **Question (participant)** | Zone question limitée (2–3 lignes max visibles + ellipsis si besoin) ; timer fin ; choix en flex qui **se partagent la hauteur restante** ; pas de bouton Valider séparé si 1-tap. |
| **Question (hôte)** | Chrome réduit ; question + grille 2×2 + timer/compteur dans le viewport ; contrôles hôte en barre fine bas ou raccourci clavier. |
| **Classement (participant)** | Rang hero compact + **top N adapté à la hauteur** (ex. top 5 sur mobile, pas top 10 obligé) ; pas de liste longue scrollable par défaut. |
| **Classement (hôte)** | Graphique / liste avec hauteur max = viewport − chrome ; densifier les barres plutôt que scroller ; au-delà d’un seuil, pagination ou « top 10 + vous ». |
| **Lobby hôte** | Code + QR + compteur sur une seule vue 16:9 / plein écran ; liste détaillée des noms **optionnelle** (tiroir), pas obligatoire au centre. |

Techniquement :

- shells en `min-height: 100dvh` + flex column ;
- zones milieu en `flex: 1; min-height: 0` ;
- listes longues : fenêtre bornée **ou** réduction du nombre d’items affichés selon `vh` ;
- projection : `overflow: hidden` sur la scène présentateur.

---

## 5. Parcours (libellés réels, FR actuel)

### Rejoindre

1. Titre **QCM** / « Rejoindre une session »  
2. Code session (6 caractères)  
3. Continuer → identité (liste classe ou nom libre) — états déjà prévus dans le code  
4. URL publique : `https://gbaratie.github.io/kahin/join`

### Session live

Même langage visuel participant / hôte ; densité seule différente. Modes : libellés existants (« Mode découverte », « Mode cours »).

### Admin

Sidebar ou nav groupée ; liste QCM = données **API réelles** (ou état vide déjà copyé : *Aucun QCM pour le moment…*).

---

## 6. Plan d’implémentation (après validation layout)

| Étape | Contenu |
| --- | --- |
| **B. Thème** | Tokens MUI fidèles à la palette actuelle + overrides densités |
| **C. AppShell** | Header unifié ; masquer chrome superflu en session hôte |
| **D. Session UI** | Join / AnswerOption / Timer / Rank **viewport-fit** |
| **E. Present** | Fullscreen + scale ; lobby URL réelle + QR |
| **F. Admin** | Harmoniser navigations sans fausses données |

Le renommage produit (annexe) reste **hors** de ces étapes.

---

## 7. Rendus mis à jour

Galerie : [galerie-unifiee.html](./galerie-unifiee.html)

| Écran | Fichier |
| --- | --- |
| Rejoindre | [rendus/qcm-join.png](./rendus/qcm-join.png) |
| Lobby hôte | [rendus/qcm-presenter-lobby.png](./rendus/qcm-presenter-lobby.png) |
| Question hôte | [rendus/qcm-presenter-question.png](./rendus/qcm-presenter-question.png) |
| Question participant | [rendus/qcm-participant-answer.png](./rendus/qcm-participant-answer.png) |
| Classement participant | [rendus/qcm-participant-ranking.png](./rendus/qcm-participant-ranking.png) |
| Admin (état vide réel) | [rendus/qcm-admin-empty.png](./rendus/qcm-admin-empty.png) |

Les anciennes images `quorum-*.png` sont obsolètes (mauvaise marque / palette / données fictives).

---

## 8. Décisions restantes avant code

1. **Réponse 1-tap** vs bouton Valider (impact anti-scroll mobile)  
2. **Classement** : top 5 mobile / top 10 desktop, ou adaptatif selon `vh` ?  
3. **Liste des participants** en lobby : tiroir secondaire OK ?  
4. Go pour implémenter étapes **B → E** avec palette actuelle + nom **QCM** ?

---

## Annexe — shortlist de noms (reportée, hors UI)

Questa · Querio · Qast · Quizora · Optio · Askora · Quorum / Qorum · Forma · …

Aucun de ces noms n’apparaît dans les interfaces tant que le renommage n’est pas décidé.
