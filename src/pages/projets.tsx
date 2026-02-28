import Head from 'next/head';
import { useState, useMemo } from 'react';
import { Grid, Typography, Box } from '@mui/material';
import Layout from '@/src/components/Layout';
import ClientLogosCarousel from '@/src/components/ClientLogosCarousel';
import {
  ProjectScopeTabs,
  type ProjectScope,
} from '@/src/components/projets/ProjectScopeTabs';
import ProjectCard from '@/src/components/projets/ProjectCard';
import { projects } from '@/src/data/projects';
import { siteName } from '@/src/config/site';

/**
 * Page Projets : onglets Pro / Side projects, deux sections avec défilement par ancre.
 */
export default function Projets() {
  const [scope, setScope] = useState<ProjectScope>('pro');

  const proProjects = useMemo(
    () => projects.filter((p) => p.category === 'pro'),
    []
  );
  const sideProjects = useMemo(
    () => projects.filter((p) => p.category === 'side'),
    []
  );

  const handleScopeChange = (newScope: ProjectScope) => {
    setScope(newScope);
    document.getElementById(newScope)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <Layout>
      <Head>
        <title>{`Projets – ${siteName}`}</title>
        <meta
          name="description"
          content="Découvrez mes projets professionnels et side projects : blockchain, IA, conseil."
        />
      </Head>

      <Typography variant="h2" component="h1" gutterBottom>
        Projets
      </Typography>

      <ProjectScopeTabs value={scope} onChange={handleScopeChange} />

      {/* Section 1 : Projets professionnels */}
      <Box component="section" id="pro" sx={{ mt: 6, scrollMarginTop: 80 }}>
        <Typography variant="h3" component="h2" gutterBottom>
          Projets professionnels
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Réalisations en entreprise : agents conversationnels, blockchain,
          GenAI.
        </Typography>
        {proProjects.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Aucun projet pro pour le moment.
          </Typography>
        ) : (
          <Grid container spacing={3}>
            {proProjects.map((project) => (
              <Grid item xs={12} sm={6} md={4} key={project.id}>
                <ProjectCard project={project} />
              </Grid>
            ))}
          </Grid>
        )}

        <ClientLogosCarousel />
      </Box>

      {/* Section 2 : Projets personnels (side projects) */}
      <Box component="section" id="side" sx={{ mt: 8, scrollMarginTop: 80 }}>
        <Typography variant="h3" component="h2" gutterBottom>
          Side projects
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Projets personnels et expérimentations.
        </Typography>
        {sideProjects.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Aucun side project pour le moment.
          </Typography>
        ) : (
          <Grid container spacing={3}>
            {sideProjects.map((project) => (
              <Grid item xs={12} sm={6} md={4} key={project.id}>
                <ProjectCard project={project} />
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    </Layout>
  );
}
