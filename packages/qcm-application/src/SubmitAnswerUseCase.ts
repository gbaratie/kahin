import { isWordCloudQuestion, type Answer } from '@kahin/qcm-domain';
import type {
  SessionRepository,
  RealtimeTransport,
  QuizRepository,
} from '@kahin/qcm-domain';

export type SubmitAnswerInput = {
  sessionId: string;
  participantId: string;
  questionId: string;
  choiceId?: string;
  word?: string;
};

export class SubmitAnswerUseCase {
  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly quizRepository: QuizRepository,
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
    if (session.showingResult === true) {
      throw new Error('Session is not accepting answers');
    }

    const quiz = await this.quizRepository.getById(session.quizId);
    if (!quiz) throw new Error('Quiz not found');
    const currentQuestion = quiz.questions[session.currentQuestionIndex];
    if (!currentQuestion || currentQuestion.id !== input.questionId) {
      throw new Error('Question not found or not current');
    }

    const isWordCloud = isWordCloudQuestion(currentQuestion);

    if (isWordCloud) {
      if (typeof input.word !== 'string' || !input.word.trim()) {
        throw new Error('word required for word cloud question');
      }
      const trimmedWord = input.word.trim();
      const existingIndex = session.answers.findIndex(
        (a) =>
          a.participantId === input.participantId &&
          a.questionId === input.questionId
      );
      const updatedWords = [
        ...(existingIndex >= 0
          ? (session.answers[existingIndex].words ?? [])
          : []),
        trimmedWord,
      ];
      const answer: Answer = {
        participantId: input.participantId,
        questionId: input.questionId,
        words: updatedWords,
        answeredAt: new Date(),
      };
      const answers =
        existingIndex >= 0
          ? session.answers.map((a, i) => (i === existingIndex ? answer : a))
          : [...session.answers, answer];
      const updatedSession = { ...session, answers };
      await this.sessionRepository.save(updatedSession);
      await this.realtimeTransport.joinChannel?.(input.sessionId);
      await this.realtimeTransport.publish('answer_submitted', {
        sessionId: input.sessionId,
        participantId: input.participantId,
        questionId: input.questionId,
        word: trimmedWord,
      });
      return;
    }

    if (typeof input.choiceId !== 'string' || !input.choiceId) {
      throw new Error('choiceId required for QCM question');
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
