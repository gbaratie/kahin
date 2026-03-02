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
  Checkbox,
} from '@mui/material';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import Layout from '@/components/Layout';
import { useCreateQuiz } from '@/qcm/hooks/useCreateQuiz';

type QuestionDraft = {
  label: string;
  choices: string[];
  correctChoiceIndex?: number;
};
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
    const quiz = await createQuiz({
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
                    titleAccess="Bonne réponse"
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
