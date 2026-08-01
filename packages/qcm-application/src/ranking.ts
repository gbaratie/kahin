import {
  defaultClosestScoringRange,
  isClosestQuestion,
  isCoursePlayMode,
  type Question,
  type Quiz,
  type Session,
} from '@kahin/qcm-domain';
import {
  coursePointsForAnswer,
  isGradableCourseQuestion,
} from './courseScoring';

export const POINTS_PER_QUESTION = 1000;

export type RankEntry = {
  participantId: string;
  participantName: string;
  /** Points gamification (questions découverte). */
  score: number;
  /** Bonnes réponses cours cumulées. */
  courseCorrect: number;
  /** Nombre de questions cours notées dans la fenêtre. */
  courseTotal: number;
};

function toMs(value: Date | string | null | undefined): number | null {
  if (value == null) return null;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'string') return new Date(value).getTime();
  return null;
}

/** Score pondéré : plus la réponse est rapide, plus la note est élevée (100 % à t=0, 50 % à t=timerSeconds). */
function weightedPoints(
  timeTakenSeconds: number,
  timerSeconds: number
): number {
  if (timerSeconds <= 0) return POINTS_PER_QUESTION;
  const factor = Math.max(0, 1 - 0.5 * (timeTakenSeconds / timerSeconds));
  return Math.round(POINTS_PER_QUESTION * factor);
}

function timeWeightedCap(
  session: Session,
  questionIndex: number,
  question: Question,
  answeredAt: Date | string | undefined
): number {
  const timerSeconds = question.timerSeconds ?? 10;
  const timestamps = session.questionShownAtTimestamps ?? [];
  const shownAtMs = toMs(
    timestamps[questionIndex] as Date | string | null | undefined
  );
  const answeredAtMs = toMs(answeredAt);
  if (shownAtMs != null && answeredAtMs != null) {
    const timeTakenSeconds = (answeredAtMs - shownAtMs) / 1000;
    return weightedPoints(Math.max(0, timeTakenSeconds), timerSeconds);
  }
  return POINTS_PER_QUESTION;
}

/**
 * Points pour une réponse « au plus proche » :
 * 100 % à distance 0, 0 % à distance >= scoringRange (défaut max(|attendu|, 1)).
 * Pas de pondération vitesse — seul l’écart compte.
 */
export function pointsForClosestAnswer(
  question: Question,
  numberValue: number | undefined
): number {
  if (typeof numberValue !== 'number' || !Number.isFinite(numberValue)) {
    return 0;
  }
  if (
    typeof question.expectedNumber !== 'number' ||
    !Number.isFinite(question.expectedNumber)
  ) {
    return 0;
  }
  const range =
    typeof question.scoringRange === 'number' && question.scoringRange > 0
      ? question.scoringRange
      : defaultClosestScoringRange(question.expectedNumber);
  const distance = Math.abs(numberValue - question.expectedNumber);
  const distanceFactor = Math.max(0, 1 - distance / range);
  if (distanceFactor <= 0) return 0;
  return Math.round(POINTS_PER_QUESTION * distanceFactor);
}

export function formatRankEntryScore(entry: RankEntry): string {
  const parts: string[] = [];
  if (entry.courseTotal > 0) {
    parts.push(`${entry.courseCorrect}/${entry.courseTotal} note`);
  }
  if (entry.score > 0 || entry.courseTotal === 0) {
    parts.push(`${entry.score} pt${entry.score !== 1 ? 's' : ''}`);
  }
  return parts.join(' · ') || '0 pts';
}

/** Valeur utilisée pour la longueur de barre (échelle homogène selon le contenu). */
export function rankEntryBarValue(entry: RankEntry): number {
  if (entry.courseTotal > 0 && entry.score === 0) {
    // Session (ou fenêtre) uniquement / surtout notée : la barre suit la note.
    return entry.courseCorrect;
  }
  // Sinon la barre suit la gamification ; la note reste dans le libellé.
  return entry.score;
}

export function computeRanking(
  session: Session,
  quiz: Quiz,
  upToQuestionIndex: number
): RankEntry[] {
  if (upToQuestionIndex <= 0) return [];

  const discoveryByParticipant = new Map<string, number>();
  const courseCorrectByParticipant = new Map<string, number>();
  for (const p of session.participants) {
    discoveryByParticipant.set(p.id, 0);
    courseCorrectByParticipant.set(p.id, 0);
  }

  let courseTotal = 0;
  for (let i = 0; i < upToQuestionIndex; i++) {
    const question = quiz.questions[i];
    if (isGradableCourseQuestion(question)) {
      courseTotal += 1;
      for (const p of session.participants) {
        const answer = session.answers.find(
          (a) => a.participantId === p.id && a.questionId === question.id
        );
        const { points } = coursePointsForAnswer(question, answer);
        if (points > 0) {
          courseCorrectByParticipant.set(
            p.id,
            (courseCorrectByParticipant.get(p.id) ?? 0) + points
          );
        }
      }
      continue;
    }

    // Découverte : scoring gamifié
    for (const answer of session.answers) {
      if (answer.questionId !== question.id) continue;
      const current = discoveryByParticipant.get(answer.participantId) ?? 0;
      let points = 0;
      if (isClosestQuestion(question)) {
        points = pointsForClosestAnswer(question, answer.numberValue);
      } else if (question.correctChoiceId != null) {
        if (answer.choiceId === question.correctChoiceId) {
          points = timeWeightedCap(
            session,
            i,
            question,
            answer.answeredAt
          );
        }
      }
      if (points > 0) {
        discoveryByParticipant.set(answer.participantId, current + points);
      }
    }
  }

  const nameById = new Map(session.participants.map((p) => [p.id, p.name]));
  const entries: RankEntry[] = session.participants.map((p) => ({
    participantId: p.id,
    participantName: nameById.get(p.id) ?? 'Participant',
    score: discoveryByParticipant.get(p.id) ?? 0,
    courseCorrect: courseCorrectByParticipant.get(p.id) ?? 0,
    courseTotal,
  }));

  entries.sort((a, b) => {
    if (b.courseCorrect !== a.courseCorrect) {
      return b.courseCorrect - a.courseCorrect;
    }
    return b.score - a.score;
  });
  return entries;
}

/** Points gamification pour une réponse QCM (0 si cours, faux, ou pas de bonne réponse). */
export function pointsForQcmAnswer(
  session: Session,
  questionIndex: number,
  question: Question,
  choiceId: string | undefined,
  answeredAt: Date | string | undefined
): number {
  if (isCoursePlayMode(question)) return 0;
  if (!choiceId || question.correctChoiceId == null) return 0;
  if (choiceId !== question.correctChoiceId) return 0;
  return timeWeightedCap(session, questionIndex, question, answeredAt);
}
