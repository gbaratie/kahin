import React from 'react';
import Head from 'next/head';
import Layout from '@/components/Layout';
import JoinSessionForm from '@/components/join/JoinSessionForm';

export default function JoinPage() {
  return (
    <Layout>
      <Head>
        <title>Rejoindre une session</title>
      </Head>
      <JoinSessionForm />
    </Layout>
  );
}
