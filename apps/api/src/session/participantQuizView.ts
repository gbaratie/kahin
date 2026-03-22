import type { Quiz, Question, Session } from '@kahin/qcm-domain';

function withoutCorrectChoice(q: Question): Question {
  const copy = { ...q };
  delete copy.correctChoiceId;
  return copy;
}

/**
 * Masque correctChoiceId pour les questions dont la bonne réponse ne doit pas
 * encore être connue (question en cours en phase réponse, ou questions futures).
 */
export function redactQuizForParticipant(session: Session, quiz: Quiz): Quiz {
  const idx = session.currentQuestionIndex;
  const showingResult = Boolean(session.showingResult);
  const finished = session.status === 'finished';

  return {
    ...quiz,
    questions: quiz.questions.map((q, questionIndex) => {
      if (finished) {
        return q;
      }
      if (questionIndex > idx) {
        return withoutCorrectChoice(q);
      }
      if (questionIndex < idx) {
        return q;
      }
      if (idx < 0) {
        return withoutCorrectChoice(q);
      }
      if (showingResult) {
        return q;
      }
      return withoutCorrectChoice(q);
    }),
  };
}
