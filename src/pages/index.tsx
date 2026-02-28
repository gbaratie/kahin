import Head from 'next/head';
import {
  Box,
  Button,
  Typography,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import Link from 'next/link';
import GitHubIcon from '@mui/icons-material/GitHub';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import Layout from '@/src/components/Layout';
import { siteName } from '@/src/config/site';
import { profile } from '@/src/data/profile';

const GITHUB_URL = 'https://github.com/gbaratie';
const LINKEDIN_URL = 'https://www.linkedin.com/in/gbaratier/';

/**
 * Page d’accueil : section hero (titre, bio, CTA), puis section Découvrir avec deux teasers (Projets, Mes coups de cœur).
 */
export default function Home() {
  return (
    <Layout>
      <Head>
        <title>{`Accueil – ${siteName}`}</title>
        <meta
          name="description"
          content={`${profile.headline}. ${profile.bio.slice(0, 120)}…`}
        />
      </Head>

      {/* Section hero (titre, bio, CTA) */}
      <Box
        sx={{ textAlign: { xs: 'center', md: 'left' }, mb: { xs: 6, md: 10 } }}
      >
        <Typography variant="h1" component="h1" gutterBottom>
          {profile.name}
        </Typography>
        <Typography variant="h5" color="primary" gutterBottom>
          {profile.headline}
        </Typography>
        <Typography
          variant="body1"
          color="text.secondary"
          paragraph
          sx={{ maxWidth: 560 }}
        >
          {profile.bio}
        </Typography>
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: { xs: 'center', md: 'flex-start' },
          }}
        >
          <Button
            variant="outlined"
            color="primary"
            component="a"
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            size="large"
            startIcon={<GitHubIcon />}
          >
            GitHub
          </Button>
          <Button
            variant="outlined"
            color="primary"
            component="a"
            href={LINKEDIN_URL}
            target="_blank"
            rel="noopener noreferrer"
            size="large"
            startIcon={<LinkedInIcon />}
          >
            LinkedIn
          </Button>
        </Box>
      </Box>

      {/* Section Découvrir (teasers Projets / Coups de cœur) */}
      <Typography
        variant="h2"
        component="h2"
        gutterBottom
        sx={{ mb: 4, mt: 1 }}
      >
        Découvrir
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ py: 3, '&:last-child': { pb: 3 } }}>
              <Typography variant="h6" gutterBottom>
                Projets
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Projets professionnels et side projects : Conseil en nouvelles
                technologies et projets personnels.
              </Typography>
              <Link href="/projets" passHref legacyBehavior>
                <Button
                  variant="outlined"
                  color="primary"
                  component="a"
                  size="small"
                >
                  Voir les projets
                </Button>
              </Link>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ py: 3, '&:last-child': { pb: 3 } }}>
              <Typography variant="h6" gutterBottom>
                Mes coups de cœur
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Initiatives inspirantes et projets de mes amis
              </Typography>
              <Link href="/coups-de-coeur" passHref legacyBehavior>
                <Button
                  variant="outlined"
                  color="primary"
                  component="a"
                  size="small"
                >
                  Voir mes coups de cœur
                </Button>
              </Link>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Layout>
  );
}
