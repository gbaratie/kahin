import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { PostgresQuizRepository } from '@kahin/qcm-infrastructure/node';
import type { Quiz } from '@kahin/qcm-domain';

type JsonFileShape = {
  quizzes?: Record<string, Quiz>;
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultJsonPath = path.join(__dirname, '..', 'data', 'quizzes.json');
const quizJsonPath = process.env.QUIZ_JSON_PATH ?? defaultJsonPath;

async function main() {
  const raw = await fs.readFile(quizJsonPath, 'utf-8');
  const parsed = JSON.parse(raw) as JsonFileShape;
  const quizzes = parsed.quizzes ?? {};

  const repo = new PostgresQuizRepository();

  const all = Object.values(quizzes);
  if (all.length === 0) {
    console.log('Aucun quiz à importer depuis le fichier JSON.');
    return;
  }

  for (const quiz of all) {
    await repo.save(quiz);
    console.log(`Importé quiz ${quiz.id} – ${quiz.title}`);
  }

  console.log('Import terminé.');
}

main().catch((err) => {
  console.error('Erreur lors de l’import des quiz vers Postgres:', err);
  process.exit(1);
});

