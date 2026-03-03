import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Box, Button, Alert } from '@mui/material';
import Link from 'next/link';
import Layout from '@/components/Layout';
import LoadingScreen from '@/components/common/LoadingScreen';
import { useUpdateQuiz } from '@/qcm/hooks/useUpdateQuiz';
import { apiGetQuiz } from '@/qcm/apiClient';
import QcmForm, {
  initialQuestion,
  quizToDraft,
  draftToPayload,
} from '@/qcm/components/QcmForm';
import { layout } from '@/config/layout';

export default function QcmEditPage() {
  const router = useRouter();
  const { quizId } = router.query;
  const { execute: updateQuiz, loading, error } = useUpdateQuiz();
  const [fetchStatus, setFetchStatus] = useState<
    'loading' | 'ready' | 'not_found' | 'error'
  >('loading');
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState([{ ...initialQuestion }]);

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
          quiz.questions.length > 0
            ? quizToDraft(quiz)
            : [{ ...initialQuestion }]
        );
        setFetchStatus('ready');
      })
      .catch(() => setFetchStatus('error'));
  }, [quizId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof quizId !== 'string') return;
    const quiz = await updateQuiz(quizId, draftToPayload(title, questions));
    if (quiz) router.push(`/qcm/launch?quizId=${quiz.id}`);
  };

  if (fetchStatus === 'loading') {
    return <LoadingScreen title="Modifier le QCM" />;
  }

  if (fetchStatus === 'not_found' || fetchStatus === 'error') {
    return (
      <Layout>
        <Head>
          <title>QCM introuvable</title>
        </Head>
        <Box sx={{ ...layout.pagePaddingAuto }}>
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
      <QcmForm
        pageTitle="Modifier le QCM"
        title={title}
        onTitleChange={setTitle}
        questions={questions}
        setQuestions={setQuestions}
        onSubmit={handleSubmit}
        loading={loading}
        submitLabel={loading ? 'Enregistrement…' : 'Enregistrer'}
        error={error}
        cancelButton={{
          label: 'Annuler',
          onClick: () => router.push('/'),
        }}
      />
    </Layout>
  );
}
