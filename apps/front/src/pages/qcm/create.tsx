import React, { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import { useCreateQuiz } from '@/qcm/hooks/useCreateQuiz';
import QcmForm, {
  initialQuestion,
  draftToPayload,
} from '@/qcm/components/QcmForm';

export default function QcmCreatePage() {
  const router = useRouter();
  const { execute: createQuiz, loading, error } = useCreateQuiz();
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState([{ ...initialQuestion }]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const quiz = await createQuiz(draftToPayload(title, questions));
    if (quiz) router.push('/');
  };

  const handleSaveAndLaunch = async (e: React.FormEvent) => {
    e.preventDefault();
    const quiz = await createQuiz(draftToPayload(title, questions));
    if (quiz) router.push(`/qcm/launch?quizId=${quiz.id}`);
  };

  return (
    <Layout>
      <Head>
        <title>Créer un QCM</title>
      </Head>
      <QcmForm
        pageTitle="Créer un QCM"
        title={title}
        onTitleChange={setTitle}
        questions={questions}
        setQuestions={setQuestions}
        onSubmit={handleSave}
        loading={loading}
        submitLabel={loading ? 'Enregistrement…' : 'Enregistrer'}
        secondarySubmitLabel={
          loading ? 'Enregistrement…' : 'Enregistrer et lancer'
        }
        onSecondarySubmit={handleSaveAndLaunch}
        error={error}
      />
    </Layout>
  );
}
