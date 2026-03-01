import type { Answer } from '@kahin/qcm-domain';
import type { SessionRepository, RealtimeTransport } from '@kahin/qcm-domain';

export type SubmitAnswerInput = {
  sessionId: string;
  participantId: string;
  questionId: string;
  choiceId: string;
};

export class SubmitAnswerUseCase {
  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly realtimeTransport: RealtimeTransport
  ) {}

  async execute(input: SubmitAnswerInput): Promise<void> {
    const session = await this.sessionRepository.getById(input.sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    if (session.status !== 'in_progress') {
      throw new Error('Session is not accepting answers');
    }

    const existingIndex = session.answers.findIndex(
      (a) =>
        a.participantId === input.participantId &&
        a.questionId === input.questionId
    );
    const answers =
      existingIndex >= 0
        ? session.answers.map((a, i) =>
            i === existingIndex
              ? {
                  ...a,
                  choiceId: input.choiceId,
                  answeredAt: new Date(),
                }
              : a
          )
        : [
            ...session.answers,
            {
              participantId: input.participantId,
              questionId: input.questionId,
              choiceId: input.choiceId,
              answeredAt: new Date(),
            } as Answer,
          ];

    const updatedSession = {
      ...session,
      answers,
    };

    await this.sessionRepository.save(updatedSession);

    await this.realtimeTransport.joinChannel?.(input.sessionId);
    await this.realtimeTransport.publish('answer_submitted', {
      sessionId: input.sessionId,
      participantId: input.participantId,
      questionId: input.questionId,
      choiceId: input.choiceId,
    });
  }
}
