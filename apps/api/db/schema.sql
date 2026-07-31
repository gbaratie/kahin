-- Schéma Postgres pour les quiz Kahin (banque de questions + QCM).
-- Idempotent : peut être rejoué sur une base existante (migration inclusive).

CREATE TABLE IF NOT EXISTS quizzes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS themes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- Création initiale (bases neuves). Sur une base legacy, la table existe déjà
-- avec quiz_id NOT NULL ; les ALTER / migration ci-dessous s’en chargent.
CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  timer_seconds INTEGER DEFAULT 10,
  question_type TEXT NOT NULL DEFAULT 'qcm',
  theme_id TEXT REFERENCES themes(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS choices (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- Colonnes ajoutées au fil des versions (bases déjà créées)
ALTER TABLE questions ADD COLUMN IF NOT EXISTS timer_seconds INTEGER DEFAULT 10;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS question_type TEXT NOT NULL DEFAULT 'qcm';
ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS correct_choice_id TEXT REFERENCES choices(id) ON DELETE SET NULL;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS theme_id TEXT REFERENCES themes(id) ON DELETE SET NULL;
ALTER TABLE choices ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

-- Liaison N:M : une question peut appartenir à plusieurs QCM, avec un ordre par QCM
CREATE TABLE IF NOT EXISTS quiz_questions (
  quiz_id TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (quiz_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz_sort
  ON quiz_questions (quiz_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_questions_theme
  ON questions (theme_id);

-- Migration legacy : questions.quiz_id + sort_order → quiz_questions (sans perte)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'questions'
      AND column_name = 'quiz_id'
  ) THEN
    -- Assurer sort_order pour l’ordre de migration
    ALTER TABLE questions ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

    INSERT INTO quiz_questions (quiz_id, question_id, sort_order)
    SELECT q.quiz_id, q.id, COALESCE(q.sort_order, 0)
    FROM questions q
    WHERE q.quiz_id IS NOT NULL
    ON CONFLICT (quiz_id, question_id) DO NOTHING;

    ALTER TABLE questions ALTER COLUMN quiz_id DROP NOT NULL;
    ALTER TABLE questions DROP COLUMN quiz_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'questions'
      AND column_name = 'sort_order'
  ) THEN
    ALTER TABLE questions DROP COLUMN sort_order;
  END IF;
END $$;

-- Liste des élèves (début d'année) : les participants choisissent parmi ces noms
-- (legacy ; migré automatiquement vers `classes` / `class_roster_names`)
CREATE TABLE IF NOT EXISTS roster_names (
  name TEXT PRIMARY KEY,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- Multi-classes : une session peut être liée à une classe, ou aucune (inscription libre)
CREATE TABLE IF NOT EXISTS classes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS class_roster_names (
  class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (class_id, name)
);
