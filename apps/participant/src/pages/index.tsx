import Head from 'next/head';
import { Box, Typography, Button } from '@mui/material';
import Link from 'next/link';
import Layout from '@/components/Layout';
import { siteName } from '@/config/site';

export default function ParticipantHomePage() {
  return (
    <Layout>
      <Head>
        <title>{siteName}</title>
        <meta name="description" content="Rejoignez une session QCM." />
      </Head>
      <Box sx={{ py: 4, px: 2, maxWidth: 480, mx: 'auto' }}>
        <Typography variant="h4" gutterBottom>
          {siteName}
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Saisissez le code communiqué par l&apos;animateur pour rejoindre la
          session.
        </Typography>
        <Button
          component={Link}
          href="/join"
          variant="contained"
          size="large"
          fullWidth
        >
          Rejoindre une session
        </Button>
      </Box>
    </Layout>
  );
}
