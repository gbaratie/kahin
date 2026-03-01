import type { Participant } from './Participant';
import type { Answer } from './Answer';

export type SessionStatus = 'waiting' | 'in_progress' | 'finished';

export type Session = {
  id: string;
  quizId: string;
  code: string;
  status: SessionStatus;
  currentQuestionIndex: number;
  participants: Participant[];
  answers: Answer[];
};
