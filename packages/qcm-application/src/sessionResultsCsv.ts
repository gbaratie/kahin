import {
  isWordCloudQuestion,
  type Quiz,
  type Session,
} from '@kahin/qcm-domain';
import { computeRanking, pointsForQcmAnswer } from './ranking';

/** Séparateur point-virgule pour Excel (locale FR). */
const CSV_SEP = ';';

export function escapeCsvField(value: string): string {
  if (/[";\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function csvRow(values: string[]): string {
  if (values.length === 0) return '\r\n';
  return `${values.map(escapeCsvField).join(CSV_SEP)}\r\n`;
}

function slugifyForFilename(title: string): string {
  const base = title.trim() || 'sans-titre';
  const slug = base
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return slug || 'sans-titre';
}

/** Nom de fichier : `qcm-{titre}-{YYYY-MM-DD}.csv` (caractères sûrs pour le disque). */
export function buildResultsCsvFilename(
  quiz: Quiz,
  exportedAt: Date = new Date()
): string {
  const y = exportedAt.getFullYear();
  const m = String(exportedAt.getMonth() + 1).padStart(2, '0');
  const d = String(exportedAt.getDate()).padStart(2, '0');
  return `qcm-${slugifyForFilename(quiz.title)}-${y}-${m}-${d}.csv`;
}

function isSimpleScoringQuiz(quiz: Quiz): boolean {
  return !quiz.questions.some((q) => isWordCloudQuestion(q));
}

export function buildSessionResultsCsv(session: Session, quiz: Quiz): string {
  const lines: string[] = [];
  lines.push(csvRow(['Titre du quiz', quiz.title]));
  lines.push(csvRow(['Code session', session.code]));
  lines.push(csvRow([]));

  const participants = session.participants;
  const headerRow = ['Participants', ...participants.map((p) => p.name)];
  lines.push(csvRow(headerRow));

  const ranking = computeRanking(session, quiz, quiz.questions.length);
  const totalByParticipantId = new Map(
    ranking.map((e) => [e.participantId, String(e.score)])
  );

  const simple = isSimpleScoringQuiz(quiz);

  if (simple) {
    quiz.questions.forEach((question, questionIndex) => {
      const row: string[] = [question.label];
      for (const p of participants) {
        const answer = session.answers.find(
          (a) => a.participantId === p.id && a.questionId === question.id
        );
        const pts = answer
          ? pointsForQcmAnswer(
              session,
              questionIndex,
              question,
              answer.choiceId,
              answer.answeredAt
            )
          : 0;
        row.push(String(pts));
      }
      lines.push(csvRow(row));
    });
  }

  const totalRow = [
    'Total',
    ...participants.map((p) => totalByParticipantId.get(p.id) ?? '0'),
  ];
  lines.push(csvRow(totalRow));

  return `\uFEFF${lines.join('')}`;
}
