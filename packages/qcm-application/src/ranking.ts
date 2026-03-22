import type { Question, Quiz, Session } from '@kahin/qcm-domain';

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
  const timestamps = session.questionShownAtTimestamps ?? [];
  for (let i = 0; i < upToQuestionIndex; i++) {
    const question = quiz.questions[i];
    const correctChoiceId = question.correctChoiceId;
    if (correctChoiceId == null) continue;
    const timerSeconds = question.timerSeconds ?? 10;
    const shownAtMs = toMs(timestamps[i] as Date | string | null | undefined);
    for (const answer of session.answers) {
      if (answer.questionId !== question.id) continue;
      if (answer.choiceId === correctChoiceId) {
        const current = scoreByParticipant.get(answer.participantId) ?? 0;
        const answeredAtMs = toMs(answer.answeredAt);
        let points = POINTS_PER_QUESTION;
        if (shownAtMs != null && answeredAtMs != null) {
          const timeTakenSeconds = (answeredAtMs - shownAtMs) / 1000;
          points = weightedPoints(Math.max(0, timeTakenSeconds), timerSeconds);
        }
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
  if (!choiceId || question.correctChoiceId == null) return 0;
  if (choiceId !== question.correctChoiceId) return 0;
  const timerSeconds = question.timerSeconds ?? 10;
  const timestamps = session.questionShownAtTimestamps ?? [];
  const shownAtMs = toMs(
    timestamps[questionIndex] as Date | string | null | undefined
  );
  const answeredAtMs = toMs(answeredAt);
  let points = POINTS_PER_QUESTION;
  if (shownAtMs != null && answeredAtMs != null) {
    const timeTakenSeconds = (answeredAtMs - shownAtMs) / 1000;
    points = weightedPoints(Math.max(0, timeTakenSeconds), timerSeconds);
  }
  return points;
}
