import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Quiz, Session } from '@kahin/qcm-domain';
import {
  computeRanking,
  formatRankEntryScore,
  POINTS_PER_QUESTION,
} from './ranking.js';
import { coursePointsForAnswer } from './courseScoring.js';

const quiz: Quiz = {
  id: 'quiz-1',
  title: 'Test',
  coefficient: 2,
  questions: [
    {
      id: 'q-discovery',
      label: 'Découverte',
      type: 'qcm',
      playMode: 'discovery',
      correctChoiceId: 'c1',
      timerSeconds: 10,
      choices: [
        { id: 'c1', label: 'A' },
        { id: 'c2', label: 'B' },
      ],
    },
    {
      id: 'q-course',
      label: 'Cours',
      type: 'qcm',
      playMode: 'course',
      correctChoiceId: 'c3',
      timerSeconds: 10,
      choices: [
        { id: 'c3', label: 'Oui' },
        { id: 'c4', label: 'Non' },
      ],
    },
  ],
};

function baseSession(): Session {
  const shownAt = new Date('2026-01-01T00:00:00.000Z');
  return {
    id: 's1',
    quizId: quiz.id,
    code: 'ABC123',
    status: 'finished',
    classId: 'class-1',
    currentQuestionIndex: 1,
    showingResult: true,
    showingCumulativeRanking: true,
    questionShownAtTimestamps: [shownAt, shownAt],
    participants: [
      { id: 'p1', name: 'Alice', joinedAt: shownAt },
      { id: 'p2', name: 'Bob', joinedAt: shownAt },
    ],
    answers: [
      {
        participantId: 'p1',
        questionId: 'q-discovery',
        choiceId: 'c1',
        answeredAt: shownAt,
      },
      {
        participantId: 'p1',
        questionId: 'q-course',
        choiceId: 'c3',
        answeredAt: shownAt,
      },
      {
        participantId: 'p2',
        questionId: 'q-discovery',
        choiceId: 'c2',
        answeredAt: shownAt,
      },
      {
        participantId: 'p2',
        questionId: 'q-course',
        choiceId: 'c4',
        answeredAt: shownAt,
      },
    ],
  };
}

describe('computeRanking playMode', () => {
  it('compte découverte et cours, et trie d’abord par note cours', () => {
    const ranking = computeRanking(baseSession(), quiz, 2);
    const alice = ranking.find((r) => r.participantId === 'p1');
    const bob = ranking.find((r) => r.participantId === 'p2');
    assert.ok(alice);
    assert.ok(bob);
    assert.equal(alice.score, POINTS_PER_QUESTION);
    assert.equal(alice.courseCorrect, 1);
    assert.equal(alice.courseTotal, 1);
    assert.equal(bob.score, 0);
    assert.equal(bob.courseCorrect, 0);
    assert.equal(ranking[0].participantId, 'p1');
    assert.equal(
      formatRankEntryScore(alice),
      `1/1 note · ${POINTS_PER_QUESTION} pts`
    );
  });

  it('affiche la note seule quand il n’y a que des questions cours', () => {
    const ranking = computeRanking(baseSession(), quiz, 2);
    // Fenêtre uniquement sur la question cours (index 1 inclus → upTo=2 but we can filter conceptually)
    // Simule un quiz 100 % cours
    const courseOnlyQuiz: Quiz = {
      ...quiz,
      questions: [quiz.questions[1]],
    };
    const session = baseSession();
    session.answers = session.answers.filter((a) => a.questionId === 'q-course');
    const rankingCourse = computeRanking(session, courseOnlyQuiz, 1);
    assert.equal(rankingCourse[0].courseCorrect, 1);
    assert.equal(rankingCourse[0].score, 0);
    assert.equal(formatRankEntryScore(rankingCourse[0]), '1/1 note');
    // silence unused
    assert.ok(ranking.length >= 1);
  });
});

describe('coursePointsForAnswer', () => {
  it('donne 1 pt pour une bonne réponse cours', () => {
    const result = coursePointsForAnswer(quiz.questions[1], {
      participantId: 'p1',
      questionId: 'q-course',
      choiceId: 'c3',
      answeredAt: new Date(),
    });
    assert.deepEqual(result, { isCorrect: true, points: 1 });
  });

  it('donne 0 pt pour une mauvaise réponse cours', () => {
    const result = coursePointsForAnswer(quiz.questions[1], {
      participantId: 'p2',
      questionId: 'q-course',
      choiceId: 'c4',
      answeredAt: new Date(),
    });
    assert.deepEqual(result, { isCorrect: false, points: 0 });
  });
});
