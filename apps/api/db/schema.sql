-- Schéma Postgres pour les quiz Kahin.

CREATE TABLE IF NOT EXISTS quizzes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  quiz_id TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  timer_seconds INTEGER DEFAULT 10,
  question_type TEXT NOT NULL DEFAULT 'qcm',
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS choices (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- Migration: ajouter timer_seconds aux tables existantes (Postgres 9.5+)
ALTER TABLE questions ADD COLUMN IF NOT EXISTS timer_seconds INTEGER DEFAULT 10;

-- Migration: type de question (qcm / word_cloud) pour le nuage de mots en prod
ALTER TABLE questions ADD COLUMN IF NOT EXISTS question_type TEXT NOT NULL DEFAULT 'qcm';

-- Bonne réponse QCM (remplie après insertion des lignes choices)
ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS correct_choice_id TEXT REFERENCES choices(id) ON DELETE SET NULL;

-- Ordre d'affichage (ordre de création / édition, indépendant des UUID)
ALTER TABLE questions ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE choices ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;
