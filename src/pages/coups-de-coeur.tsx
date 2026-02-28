import Head from 'next/head';
import { Grid, Typography, Box } from '@mui/material';
import Layout from '@/src/components/Layout';
import LinkCard from '@/src/components/coups-de-coeur/LinkCard';
import { selectionItems } from '@/src/data/selection';
import { amisItems } from '@/src/data/amis';
import { siteName } from '@/src/config/site';

/**
 * Page Mes coups de cœur : deux sections (Initiatives inspirantes, Projets de mes amis).
 */
export default function CoupsDeCoeur() {
  return (
    <Layout>
      <Head>
        <title>{`Mes coups de cœur – ${siteName}`}</title>
        <meta
          name="description"
          content="Initiatives inspirantes et projets de mes amis : Enerfip, Coral Gardeners, Colco, Chalong Bay, Saneha…"
        />
      </Head>

      <Typography variant="h2" component="h1" gutterBottom>
        Mes coups de cœur
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Initiatives et projets auxquels je prête attention ou que j’aime mettre
        en avant.
      </Typography>

      {/* Section 1 : Initiatives inspirantes */}
      <Box component="section" sx={{ mt: 6 }}>
        <Typography variant="h3" component="h2" gutterBottom>
          Initiatives inspirantes
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Plateformes et initiatives que je soutiens : impact, énergie,
          solidarité.
        </Typography>
        <Grid container spacing={3}>
          {selectionItems.map((item) => (
            <Grid item xs={12} sm={6} md={4} key={item.id}>
              <LinkCard item={item} />
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Section 2 : Projet de mes amis */}
      <Box component="section" sx={{ mt: 8 }}>
        <Typography variant="h3" component="h2" gutterBottom>
          Projets de mes amis
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Projets de mes amis et ma famille : A consommer sans modération
        </Typography>
        <Grid container spacing={3}>
          {amisItems.map((item) => (
            <Grid item xs={12} sm={6} md={4} key={item.id}>
              <LinkCard item={item} />
            </Grid>
          ))}
        </Grid>
      </Box>
    </Layout>
  );
}
