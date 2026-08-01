import React from 'react';
import Head from 'next/head';
import Layout from '@/components/Layout';
import RulesContent from '@/components/rules/RulesContent';
import { siteName } from '@/config/site';

export default function RulesPage() {
  return (
    <Layout>
      <Head>
        <title>Règles — {siteName}</title>
        <meta
          name="description"
          content="Modes découverte et cours, types de questions : les règles pour les étudiants."
        />
      </Head>
      <RulesContent />
    </Layout>
  );
}
