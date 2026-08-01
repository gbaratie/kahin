import {
  isClosestQuestion,
  isWordCloudQuestion,
  isCoursePlayMode,
  type Answer,
  type Question,
} from '@kahin/qcm-domain';
import { pointsForClosestAnswer } from './ranking';

/** Questions « cours » notées (hors nuage de mots). */
export function isGradableCourseQuestion(question: Question): boolean {
  return isCoursePlayMode(question) && !isWordCloudQuestion(question);
}

/**
 * Note binaire cours : 1 pt si bonne réponse, 0 sinon.
 * - QCM : choix correct
 * - Closest : score distance > 0 (dans la plage)
 */
export function coursePointsForAnswer(
  question: Question,
  answer: Answer | undefined
): { isCorrect: boolean; points: number } {
  if (!isGradableCourseQuestion(question)) {
    return { isCorrect: false, points: 0 };
  }
  if (!answer) {
    return { isCorrect: false, points: 0 };
  }
  if (isClosestQuestion(question)) {
    const pts = pointsForClosestAnswer(question, answer.numberValue);
    const ok = pts > 0;
    return { isCorrect: ok, points: ok ? 1 : 0 };
  }
  if (question.correctChoiceId == null) {
    return { isCorrect: false, points: 0 };
  }
  const ok = answer.choiceId === question.correctChoiceId;
  return { isCorrect: ok, points: ok ? 1 : 0 };
}
