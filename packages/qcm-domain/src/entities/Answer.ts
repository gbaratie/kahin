export type Answer = {
  participantId: string;
  questionId: string;
  /** Pour une question QCM : id du choix sélectionné. */
  choiceId?: string;
  /** Pour une question nuage de mots : liste des mots soumis (plusieurs par participant). */
  words?: string[];
  answeredAt: Date;
};
