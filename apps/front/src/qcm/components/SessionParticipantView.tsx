import React from 'react';
import {
  Box,
  Typography,
  Button,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormControl,
  Alert,
} from '@mui/material';
import { useSessionStream } from '../hooks/useSessionStream';
import { useSubmitAnswer } from '../hooks/useSubmitAnswer';

type SessionParticipantViewProps = {
  sessionId: string;
  participantId: string;
};

export function SessionParticipantView({
  sessionId,
  participantId,
}: SessionParticipantViewProps) {
  const { currentQuestion, sessionFinished } = useSessionStream(sessionId);
  const { execute: submitAnswer, loading, error } = useSubmitAnswer();
  const [selectedChoiceId, setSelectedChoiceId] =
    React.useState<string | null>(null);
  const [hasAnsweredCurrentQuestion, setHasAnsweredCurrentQuestion] =
    React.useState(false);

  // Réinitialiser "a répondu" quand la question affichée change
  const currentQuestionId = currentQuestion?.question.id;
  React.useEffect(() => {
    setHasAnsweredCurrentQuestion(false);
  }, [currentQuestionId]);

  const handleSubmit = async () => {
    if (!currentQuestion || !selectedChoiceId) return;
    try {
      await submitAnswer({
        sessionId,
        participantId,
        questionId: currentQuestion.question.id,
        choiceId: selectedChoiceId,
      });
      setSelectedChoiceId(null);
      setHasAnsweredCurrentQuestion(true);
    } catch {
      // L'erreur est déjà affichée par useSubmitAnswer
    }
  };

  if (sessionFinished) {
    return (
      <Box sx={{ p: 2, maxWidth: 600, mx: 'auto' }}>
        <Alert severity="info">
          Le QCM est terminé. Merci de votre participation.
        </Alert>
      </Box>
    );
  }

  if (!currentQuestion) {
    return (
      <Box sx={{ p: 2, maxWidth: 600, mx: 'auto' }}>
        <Typography color="text.secondary">
          En attente de la prochaine question…
        </Typography>
      </Box>
    );
  }

  // Le participant a déjà répondu à cette question : page d'attente
  if (hasAnsweredCurrentQuestion) {
    return (
      <Box sx={{ p: 2, maxWidth: 600, mx: 'auto' }}>
        <Alert severity="success" icon={false}>
          <Typography variant="body1" fontWeight={500}>
            Merci d&apos;avoir répondu à cette question.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            En attente de la prochaine question…
          </Typography>
        </Alert>
      </Box>
    );
  }

  const question = currentQuestion.question;

  return (
    <Box sx={{ p: 2, maxWidth: 600, mx: 'auto' }}>
      <Typography variant="h6" gutterBottom>
        {question.label}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error.message}
        </Alert>
      )}

      <FormControl component="fieldset" fullWidth sx={{ mb: 2 }}>
        <RadioGroup
          value={selectedChoiceId ?? ''}
          onChange={(_, value) => setSelectedChoiceId(value)}
        >
          {question.choices.map((choice) => (
            <FormControlLabel
              key={choice.id}
              value={choice.id}
              control={<Radio />}
              label={choice.label}
            />
          ))}
        </RadioGroup>
      </FormControl>

      <Button
        variant="contained"
        onClick={handleSubmit}
        disabled={!selectedChoiceId || loading}
      >
        {loading ? 'Envoi…' : 'Valider'}
      </Button>
    </Box>
  );
}
