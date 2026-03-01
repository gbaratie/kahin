import React, { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Box,
  Typography,
  TextField,
  Button,
  Stack,
  IconButton,
  Paper,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import Layout from '@/components/Layout';
import { useCreateQuiz } from '@/qcm/hooks/useCreateQuiz';

type QuestionDraft = { label: string; choices: string[] };
const initialQuestion: QuestionDraft = { label: '', choices: ['', ''] };

export default function QcmCreatePage() {
  const router = useRouter();
  const { execute: createQuiz, loading, error } = useCreateQuiz();
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState<QuestionDraft[]>([
    { ...initialQuestion },
  ]);

  const addQuestion = () => setQuestions((q) => [...q, { ...initialQuestion }]);
  const removeQuestion = (index: number) =>
    setQuestions((q) => q.filter((_, i) => i !== index));
  const updateQuestion = (index: number, label: string) =>
    setQuestions((q) =>
      q.map((item, i) => (i === index ? { ...item, label } : item))
    );
  const updateChoice = (qIndex: number, cIndex: number, value: string) =>
    setQuestions((q) =>
      q.map((item, i) =>
        i === qIndex
          ? {
              ...item,
              choices: item.choices.map((c, j) => (j === cIndex ? value : c)),
            }
          : item
      )
    );
  const addChoice = (qIndex: number) =>
    setQuestions((q) =>
      q.map((item, i) =>
        i === qIndex ? { ...item, choices: [...item.choices, ''] } : item
      )
    );
  const removeChoice = (qIndex: number, cIndex: number) =>
    setQuestions((q) =>
      q.map((item, i) =>
        i === qIndex
          ? { ...item, choices: item.choices.filter((_, j) => j !== cIndex) }
          : item
      )
    );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const quiz = await createQuiz({
      title: title.trim() || 'Sans titre',
      questions: questions
        .filter((q) => q.label.trim())
        .map((q) => ({
          label: q.label.trim(),
          choices: q.choices
            .filter((c) => c.trim())
            .map((c) => ({ label: c.trim() })),
        })),
    });
    if (quiz) router.push(`/qcm/launch?quizId=${quiz.id}`);
  };

  return (
    <Layout>
      <Head>
        <title>Créer un QCM</title>
      </Head>
      <Box sx={{ py: 4, px: 2, maxWidth: 640, mx: 'auto' }}>
        <Typography variant="h4" gutterBottom>
          Créer un QCM
        </Typography>
        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Titre du QCM"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            sx={{ mb: 3 }}
          />
          {questions.map((q, qIndex) => (
            <Paper key={qIndex} sx={{ p: 2, mb: 2 }}>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ mb: 1 }}
              >
                <Typography variant="subtitle2">
                  Question {qIndex + 1}
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => removeQuestion(qIndex)}
                  disabled={questions.length <= 1}
                >
                  <DeleteIcon />
                </IconButton>
              </Stack>
              <TextField
                fullWidth
                label="Énoncé"
                value={q.label}
                onChange={(e) => updateQuestion(qIndex, e.target.value)}
                sx={{ mb: 2 }}
              />
              {q.choices.map((choice, cIndex) => (
                <Stack
                  key={cIndex}
                  direction="row"
                  alignItems="center"
                  spacing={1}
                  sx={{ mb: 1 }}
                >
                  <TextField
                    size="small"
                    fullWidth
                    label={`Choix ${cIndex + 1}`}
                    value={choice}
                    onChange={(e) =>
                      updateChoice(qIndex, cIndex, e.target.value)
                    }
                  />
                  <IconButton
                    size="small"
                    onClick={() => removeChoice(qIndex, cIndex)}
                    disabled={q.choices.length <= 2}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Stack>
              ))}
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={() => addChoice(qIndex)}
              >
                Ajouter un choix
              </Button>
            </Paper>
          ))}
          <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={addQuestion}
            >
              Ajouter une question
            </Button>
            <Button type="submit" variant="contained" disabled={loading}>
              {loading ? 'Création…' : 'Créer et lancer'}
            </Button>
          </Stack>
        </form>
        {error && (
          <Typography color="error" sx={{ mt: 2 }}>
            {error.message}
          </Typography>
        )}
      </Box>
    </Layout>
  );
}
