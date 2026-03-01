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

type SessionParticipantViewProps = { sessionId: string; participantId: string };

export function SessionParticipantView({
  sessionId,
  participantId,
}: SessionParticipantViewProps) {
  const { currentQuestion, sessionFinished } = useSessionStream(sessionId);
  const { execute: submitAnswer, loading, error } = useSubmitAnswer();
  const [selectedChoiceId, setSelectedChoiceId] = React.useState<string | null>(
    null
  );

  const handleSubmit = () => {
    if (!currentQuestion || !selectedChoiceId) return;
    submitAnswer({
      sessionId,
      participantId,
      questionId: currentQuestion.question.id,
      choiceId: selectedChoiceId,
    });
    setSelectedChoiceId(null);
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
