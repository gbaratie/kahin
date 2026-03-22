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
  question_type TEXT NOT NULL DEFAULT 'qcm'
);

CREATE TABLE IF NOT EXISTS choices (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  label TEXT NOT NULL
);

-- Migration: ajouter timer_seconds aux tables existantes (Postgres 9.5+)
ALTER TABLE questions ADD COLUMN IF NOT EXISTS timer_seconds INTEGER DEFAULT 10;

-- Migration: type de question (qcm / word_cloud) pour le nuage de mots en prod
ALTER TABLE questions ADD COLUMN IF NOT EXISTS question_type TEXT NOT NULL DEFAULT 'qcm';

-- Bonne réponse QCM (remplie après insertion des lignes choices)
ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS correct_choice_id TEXT REFERENCES choices(id) ON DELETE SET NULL;

