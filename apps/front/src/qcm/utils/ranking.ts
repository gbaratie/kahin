import type { Quiz, Session } from '@kahin/qcm-domain';

export const POINTS_PER_QUESTION = 10;

export type RankEntry = {
  participantId: string;
  participantName: string;
  score: number;
};

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
    const correctChoiceId = question.correctChoiceId;
    if (correctChoiceId == null) continue;
    for (const answer of session.answers) {
      if (answer.questionId !== question.id) continue;
      if (answer.choiceId === correctChoiceId) {
        const current = scoreByParticipant.get(answer.participantId) ?? 0;
        scoreByParticipant.set(
          answer.participantId,
          current + POINTS_PER_QUESTION
        );
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
