import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Quiz, Session } from '@kahin/qcm-domain';
import {
  buildClassGradesCsv,
  buildSessionResultsCsv,
} from './sessionResultsCsv.js';

describe('exports CSV', () => {
  it('met les élèves en lignes et les questions en colonnes (session)', () => {
    const quiz: Quiz = {
      id: 'q1',
      title: 'Chapitre',
      questions: [
        {
          id: 'qd',
          label: 'Découverte',
          type: 'qcm',
          playMode: 'discovery',
          correctChoiceId: 'a',
          choices: [
            { id: 'a', label: 'A' },
            { id: 'b', label: 'B' },
          ],
        },
        {
          id: 'qc',
          label: 'Cours',
          type: 'qcm',
          playMode: 'course',
          correctChoiceId: 'c',
          choices: [
            { id: 'c', label: 'Oui' },
            { id: 'd', label: 'Non' },
          ],
        },
      ],
    };
    const shownAt = new Date('2026-01-01T00:00:00.000Z');
    const session: Session = {
      id: 's1',
      quizId: 'q1',
      code: 'ABC123',
      status: 'finished',
      currentQuestionIndex: 1,
      questionShownAtTimestamps: [shownAt, shownAt],
      participants: [
        { id: 'p2', name: 'Bob', joinedAt: shownAt },
        { id: 'p1', name: 'Alice', joinedAt: shownAt },
      ],
      answers: [
        {
          participantId: 'p1',
          questionId: 'qd',
          choiceId: 'a',
          answeredAt: shownAt,
        },
        {
          participantId: 'p1',
          questionId: 'qc',
          choiceId: 'c',
          answeredAt: shownAt,
        },
        {
          participantId: 'p2',
          questionId: 'qc',
          choiceId: 'd',
          answeredAt: shownAt,
        },
      ],
    };

    const csv = buildSessionResultsCsv(session, quiz);
    const lines = csv.replace(/^\uFEFF/, '').trim().split(/\r\n/);
    assert.ok(lines[0].includes('Titre du quiz'));
    assert.equal(
      lines[3],
      'Élève;Découverte [découverte];Cours [cours];Total note;Total gamification'
    );
    assert.ok(lines[4].startsWith('Alice;'));
    assert.ok(lines[5].startsWith('Bob;'));
    assert.ok(lines[4].includes(';1;1000'));
  });

  it('exporte les notes de classe élèves × QCM', () => {
    const csv = buildClassGradesCsv({
      className: '3A',
      students: ['Bob', 'Alice'],
      quizzes: [
        {
          quizTitle: 'Chapitre 1',
          coefficient: 2,
          scoresByStudent: {
            Alice: { courseCorrect: 1, courseTotal: 1, ratio: 1 },
            Bob: { courseCorrect: 0, courseTotal: 1, ratio: 0 },
          },
        },
      ],
      averagesByStudent: { Alice: 1, Bob: 0 },
    });
    const lines = csv.replace(/^\uFEFF/, '').trim().split(/\r\n/);
    assert.equal(lines[0], 'Classe;3A');
    assert.equal(lines[2], 'Élève;Chapitre 1 (coef. 2);Moyenne');
    assert.equal(lines[3], 'Alice;1/1;100 %');
    assert.equal(lines[4], 'Bob;0/1;0 %');
  });
});
