import {
  isWordCloudQuestion,
  isClosestQuestion,
  isCoursePlayMode,
  type Quiz,
  type Session,
} from '@kahin/qcm-domain';
import {
  computeRanking,
  pointsForQcmAnswer,
  pointsForClosestAnswer,
} from './ranking';
import { coursePointsForAnswer } from './courseScoring';

/** Séparateur point-virgule pour Excel (locale FR). */
export const CSV_SEP = ';';

export function escapeCsvField(value: string): string {
  if (/[";\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function csvRow(values: string[]): string {
  if (values.length === 0) return '\r\n';
  return `${values.map(escapeCsvField).join(CSV_SEP)}\r\n`;
}

export function slugifyForFilename(title: string): string {
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

function dateStamp(exportedAt: Date = new Date()): string {
  const y = exportedAt.getFullYear();
  const m = String(exportedAt.getMonth() + 1).padStart(2, '0');
  const d = String(exportedAt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Nom de fichier : `qcm-{titre}-{YYYY-MM-DD}.csv` (caractères sûrs pour le disque). */
export function buildResultsCsvFilename(
  quiz: Quiz,
  exportedAt: Date = new Date()
): string {
  return `qcm-${slugifyForFilename(quiz.title)}-${dateStamp(exportedAt)}.csv`;
}

export function buildClassGradesCsvFilename(
  className: string,
  exportedAt: Date = new Date()
): string {
  return `notes-${slugifyForFilename(className)}-${dateStamp(exportedAt)}.csv`;
}

/**
 * Export session : élèves en lignes, questions / totaux en colonnes.
 */
export function buildSessionResultsCsv(session: Session, quiz: Quiz): string {
  const lines: string[] = [];
  lines.push(csvRow(['Titre du quiz', quiz.title]));
  lines.push(csvRow(['Code session', session.code]));
  lines.push(csvRow([]));

  const participants = [...session.participants].sort((a, b) =>
    a.name.localeCompare(b.name, 'fr')
  );
  const ranking = computeRanking(session, quiz, quiz.questions.length);
  const rankById = new Map(ranking.map((e) => [e.participantId, e]));

  const scoredQuestions = quiz.questions
    .map((question, questionIndex) => ({ question, questionIndex }))
    .filter(({ question }) => !isWordCloudQuestion(question));

  const header = [
    'Élève',
    ...scoredQuestions.map(({ question }) => {
      const modeLabel = isCoursePlayMode(question) ? ' [cours]' : ' [découverte]';
      return `${question.label}${modeLabel}`;
    }),
    'Total note',
    'Total gamification',
  ];
  lines.push(csvRow(header));

  for (const p of participants) {
    const rank = rankById.get(p.id);
    const row: string[] = [p.name];
    for (const { question, questionIndex } of scoredQuestions) {
      const answer = session.answers.find(
        (a) => a.participantId === p.id && a.questionId === question.id
      );
      let pts = 0;
      if (isCoursePlayMode(question)) {
        pts = coursePointsForAnswer(question, answer).points;
      } else if (answer) {
        if (isClosestQuestion(question)) {
          pts = pointsForClosestAnswer(question, answer.numberValue);
        } else {
          pts = pointsForQcmAnswer(
            session,
            questionIndex,
            question,
            answer.choiceId,
            answer.answeredAt
          );
        }
      }
      row.push(String(pts));
    }
    row.push(String(rank?.courseCorrect ?? 0));
    row.push(String(rank?.score ?? 0));
    lines.push(csvRow(row));
  }

  return `\uFEFF${lines.join('')}`;
}

export type ClassGradesCsvInput = {
  className: string;
  students: string[];
  quizzes: Array<{
    quizTitle: string;
    coefficient: number;
    scoresByStudent: Record<
      string,
      { courseCorrect: number; courseTotal: number; ratio: number }
    >;
  }>;
  averagesByStudent: Record<string, number | null>;
};

/**
 * Export notes classe : élèves en lignes, QCM / moyenne en colonnes.
 */
export function buildClassGradesCsv(input: ClassGradesCsvInput): string {
  const lines: string[] = [];
  lines.push(csvRow(['Classe', input.className]));
  lines.push(csvRow([]));

  const header = [
    'Élève',
    ...input.quizzes.map(
      (q) => `${q.quizTitle} (coef. ${q.coefficient})`
    ),
    'Moyenne',
  ];
  lines.push(csvRow(header));

  const students = [...input.students].sort((a, b) => a.localeCompare(b, 'fr'));
  for (const student of students) {
    const row: string[] = [student];
    for (const q of input.quizzes) {
      const score = q.scoresByStudent[student];
      row.push(
        score ? `${score.courseCorrect}/${score.courseTotal}` : ''
      );
    }
    const avg = input.averagesByStudent[student];
    row.push(
      avg == null || Number.isNaN(avg)
        ? ''
        : `${Math.round(avg * 1000) / 10} %`.replace('.', ',')
    );
    lines.push(csvRow(row));
  }

  return `\uFEFF${lines.join('')}`;
}
