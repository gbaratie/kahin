import React, { useState, useEffect } from 'react';
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
  CircularProgress,
  Alert,
  Checkbox,
  Tooltip,
} from '@mui/material';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import Link from 'next/link';
import Layout from '@/components/Layout';
import { useUpdateQuiz } from '@/qcm/hooks/useUpdateQuiz';
import { apiGetQuiz } from '@/qcm/apiClient';
import type { Quiz } from '@kahin/qcm-domain';

type QuestionDraft = {
  label: string;
  choices: string[];
  correctChoiceIndex?: number;
};
const initialQuestion: QuestionDraft = { label: '', choices: ['', ''] };

function quizToDraft(quiz: Quiz): QuestionDraft[] {
  return quiz.questions.map((q) => {
    const choices = q.choices.length > 0 ? q.choices.map((c) => c.label) : ['', ''];
    const correctChoiceIndex =
      q.correctChoiceId != null
        ? q.choices.findIndex((c) => c.id === q.correctChoiceId)
        : undefined;
    return {
      label: q.label,
      choices,
      correctChoiceIndex:
        correctChoiceIndex !== undefined && correctChoiceIndex >= 0
          ? correctChoiceIndex
          : undefined,
    };
  });
}

export default function QcmEditPage() {
  const router = useRouter();
  const { quizId } = router.query;
  const { execute: updateQuiz, loading, error } = useUpdateQuiz();
  const [fetchStatus, setFetchStatus] = useState<'loading' | 'ready' | 'not_found' | 'error'>('loading');
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState<QuestionDraft[]>([
    { ...initialQuestion },
  ]);

  useEffect(() => {
    if (typeof quizId !== 'string') return;
    setFetchStatus('loading');
    apiGetQuiz
      .execute(quizId)
      .then((quiz) => {
        if (!quiz) {
          setFetchStatus('not_found');
          return;
        }
        setTitle(quiz.title);
        setQuestions(
          quiz.questions.length > 0 ? quizToDraft(quiz) : [{ ...initialQuestion }]
        );
        setFetchStatus('ready');
      })
      .catch(() => setFetchStatus('error'));
  }, [quizId]);

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
      q.map((item, i) => {
        if (i !== qIndex) return item;
        const nextChoices = item.choices.filter((_, j) => j !== cIndex);
        let nextCorrect: number | undefined = item.correctChoiceIndex;
        if (nextCorrect !== undefined) {
          if (nextCorrect === cIndex) nextCorrect = undefined;
          else if (nextCorrect > cIndex) nextCorrect = nextCorrect - 1;
        }
        return { ...item, choices: nextChoices, correctChoiceIndex: nextCorrect };
      })
    );

  const setCorrectChoiceIndex = (qIndex: number, choiceIndex: number | undefined) =>
    setQuestions((q) =>
      q.map((item, i) =>
        i === qIndex ? { ...item, correctChoiceIndex: choiceIndex } : item
      )
    );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof quizId !== 'string') return;
    const quiz = await updateQuiz(quizId, {
      title: title.trim() || 'Sans titre',
      questions: questions
        .filter((q) => q.label.trim())
        .map((q) => {
          const trimmedChoices = q.choices
            .filter((c) => c.trim())
            .map((c) => ({ label: c.trim() }));
          const submittedCorrectIndex =
            q.correctChoiceIndex != null &&
            q.choices[q.correctChoiceIndex]?.trim()
              ? (() => {
                  const idx = trimmedChoices.findIndex(
                    (c) => c.label === q.choices[q.correctChoiceIndex!].trim()
                  );
                  return idx >= 0 ? idx : undefined;
                })()
              : undefined;
          return {
            label: q.label.trim(),
            choices: trimmedChoices,
            correctChoiceIndex: submittedCorrectIndex,
          };
        }),
    });
    if (quiz) router.push(`/qcm/launch?quizId=${quiz.id}`);
  };

  if (fetchStatus === 'loading') {
    return (
      <Layout>
        <Head>
          <title>Modifier le QCM</title>
        </Head>
        <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  if (fetchStatus === 'not_found' || fetchStatus === 'error') {
    return (
      <Layout>
        <Head>
          <title>QCM introuvable</title>
        </Head>
        <Box sx={{ py: 4, px: 2, maxWidth: 480, mx: 'auto' }}>
          <Alert severity={fetchStatus === 'not_found' ? 'warning' : 'error'}>
            {fetchStatus === 'not_found'
              ? 'Ce QCM est introuvable ou a été supprimé.'
              : 'Erreur lors du chargement du QCM.'}
          </Alert>
          <Button component={Link} href="/" sx={{ mt: 2 }}>
            Retour à l&apos;accueil
          </Button>
        </Box>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>Modifier le QCM</title>
      </Head>
      <Box sx={{ py: 4, px: 2, maxWidth: 640, mx: 'auto' }}>
        <Typography variant="h4" gutterBottom>
          Modifier le QCM
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
                  <CloseIcon />
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
                  <Tooltip title="Bonne réponse">
                    <Checkbox
                      size="small"
                      icon={<CheckBoxOutlineBlankIcon />}
                      checkedIcon={<CheckBoxIcon color="success" />}
                      checked={q.correctChoiceIndex === cIndex}
                      onChange={() =>
                        setCorrectChoiceIndex(
                          qIndex,
                          q.correctChoiceIndex === cIndex ? undefined : cIndex
                        )
                      }
                      sx={{
                        color: 'action.disabled',
                        '&.Mui-checked': { color: 'success.main' },
                        p: 0.5,
                        borderRadius: 0,
                        '& .MuiSvgIcon-root': { borderRadius: 0 },
                      }}
                    />
                  </Tooltip>
                  <IconButton
                    size="small"
                    onClick={() => removeChoice(qIndex, cIndex)}
                    disabled={q.choices.length <= 2}
                  >
                    <CloseIcon fontSize="small" />
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
          <Stack spacing={2} sx={{ mt: 2 }}>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={addQuestion}
            >
              Ajouter une question
            </Button>
            <Stack direction="row" spacing={2}>
              <Button type="submit" variant="contained" disabled={loading}>
                {loading ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
              <Button
                variant="text"
                onClick={() => router.push('/')}
              >
                Annuler
              </Button>
            </Stack>
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
