# Migration : banque de questions partagée + thématiques

## Objectif

Passer d’un modèle **1 QCM → N questions exclusives** à :

- une **banque de questions** autonomes ;
- des **thématiques** optionnelles ;
- des **QCM** qui référencent des questions (N:M), avec un **ordre propre à chaque QCM**.

Une même question peut ainsi figurer dans plusieurs QCM ; la retirer d’un QCM ne la supprime pas de la banque.

## Ancien modèle

```
quizzes (1) ──< questions (N) ──< choices (N)
                  quiz_id, sort_order
```

## Nouveau modèle

```
themes (1) ──< questions (N) ──< choices (N)
                    │
quizzes (N) <───────┴───────> quiz_questions (sort_order par QCM)
```

| Table | Rôle |
|-------|------|
| `themes` | Thématiques (`id`, `name`, `sort_order`) |
| `questions` | Banque (plus de `quiz_id` / `sort_order` global) ; `theme_id` nullable |
| `choices` | Inchangé (lié à `question_id`) |
| `quiz_questions` | Liaison N:M + `sort_order` dans le QCM |
| `quizzes` | Inchangé (`id`, `title`) |

## Procédure Postgres (Neon)

1. **Sauvegarde** : snapshot Neon ou `pg_dump` avant toute exécution.
2. Ouvrir le **SQL Editor** Neon.
3. Exécuter entièrement [`apps/api/db/schema.sql`](../apps/api/db/schema.sql) (script **idempotent**).
4. Vérifier :

```sql
SELECT COUNT(*) FROM quizzes;
SELECT COUNT(*) FROM questions;
SELECT COUNT(*) FROM quiz_questions;
SELECT COUNT(*) FROM themes;

-- Chaque ancienne question liée à un QCM doit avoir une ligne de liaison
SELECT q.id, q.title, COUNT(qq.question_id) AS n
FROM quizzes q
LEFT JOIN quiz_questions qq ON qq.quiz_id = q.id
GROUP BY q.id, q.title
ORDER BY q.title;
```

5. Redéployer l’API (le code lit `quiz_questions`, plus `questions.quiz_id`).

### Étapes SQL détaillées (déjà dans `schema.sql`)

1. Créer `themes` et `quiz_questions`.
2. Ajouter `theme_id` sur `questions`.
3. `INSERT INTO quiz_questions … SELECT quiz_id, id, sort_order FROM questions WHERE quiz_id IS NOT NULL` (`ON CONFLICT DO NOTHING`).
4. Rendre `quiz_id` nullable puis `DROP COLUMN quiz_id` et `DROP COLUMN sort_order` sur `questions`.

**Aucune question ni choix n’est supprimé** : seuls le lien et l’ordre sont déplacés vers `quiz_questions`.

## Stockage JSON (dev local)

Ancien fichier : `{ "quizzes": { "<id>": { id, title, questions: [...] } } }`.

Nouveau fichier (écrit automatiquement au prochain save) :

```json
{
  "themes": {},
  "questions": { "<id>": { "id": "...", "label": "...", "choices": [], "themeId": null } },
  "quizzes": { "<id>": { "id": "...", "title": "...", "questionIds": ["..."] } }
}
```

À la lecture, si l’ancien format est détecté, les questions imbriquées sont **extraites dans la banque** et `questionIds` est dérivé **sans perte**.

## Compatibilité API

- `GET /api/quiz/:id` continue de renvoyer un `Quiz` avec `questions[]` ordonnées (hydratation via la liaison).
- `POST/PUT /api/quiz` acceptent des questions avec `id` optionnel :
  - **avec `id`** : réutilise / met à jour la question en banque et la lie au QCM ;
  - **sans `id`** : crée une nouvelle question en banque puis la lie.
- Nouvelles routes : `/api/themes`, `/api/questions` (CRUD banque + thématiques).

## Rollback (urgence)

1. Restaurer le snapshot Neon / dump.
2. Redéployer la version API précédente.

Un rollback SQL manuel après `DROP COLUMN quiz_id` n’est pas trivial : **privilégier la restauration de snapshot**.

## Checklist post-migration

- [ ] Compteurs `questions` / `quiz_questions` cohérents avec l’existant
- [ ] Ouvrir un QCM existant dans l’UI : titre + questions + ordre OK
- [ ] Lancer une session sur un QCM migré
- [ ] Ajouter la même question à deux QCM
- [ ] Réordonner par glisser-déposer et recharger
