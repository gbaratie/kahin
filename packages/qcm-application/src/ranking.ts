import {
  defaultClosestScoringRange,
  isClosestQuestion,
  isCoursePlayMode,
  type Question,
  type Quiz,
  type Session,
} from '@kahin/qcm-domain';

export const POINTS_PER_QUESTION = 1000;

export type RankEntry = {
  participantId: string;
  participantName: string;
  score: number;
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

export function computeRanking(
  session: Session,
  quiz: Quiz,
  upToQuestionIndex: number
): RankEntry[] {
  if (upToQuestionIndex <= 0) return [];
  const scoreByParticipant = new Map<string, number>();
  for (const p of session.participants) {
    scoreByParticipant.set(p.id, 0);
  }
  for (let i = 0; i < upToQuestionIndex; i++) {
    const question = quiz.questions[i];
    // Les questions « cours » ne participent pas à la gamification.
    if (isCoursePlayMode(question)) continue;
    for (const answer of session.answers) {
      if (answer.questionId !== question.id) continue;
      const current = scoreByParticipant.get(answer.participantId) ?? 0;
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
        scoreByParticipant.set(answer.participantId, current + points);
      }
    }
  }
  const nameById = new Map(session.participants.map((p) => [p.id, p.name]));
  const entries: RankEntry[] = [];
  scoreByParticipant.forEach((score, participantId) => {
    entries.push({
      participantId,
      participantName: nameById.get(participantId) ?? 'Participant',
      score,
    });
  });
  entries.sort((a, b) => b.score - a.score);
  return entries;
}

/** Points attribués pour une réponse QCM (0 si faux ou pas de bonne réponse définie). */
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
