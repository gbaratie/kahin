import React from 'react';
import { Box, Paper, Stack, Typography } from '@mui/material';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import ExploreOutlinedIcon from '@mui/icons-material/ExploreOutlined';
import { layout } from '@/config/layout';

function ModeCard({
  variant,
  label,
  title,
  children,
}: {
  variant: 'course' | 'discovery';
  label: string;
  title: string;
  children: React.ReactNode;
}) {
  const course = variant === 'course';
  const accent = course ? 'warning.main' : 'primary.main';
  const softBg = course
    ? (t: { palette: { mode: string } }) =>
        t.palette.mode === 'dark'
          ? 'rgba(237, 108, 2, 0.14)'
          : 'rgba(237, 108, 2, 0.08)'
    : (t: { palette: { mode: string } }) =>
        t.palette.mode === 'dark'
          ? 'rgba(124, 156, 224, 0.14)'
          : 'rgba(61, 90, 158, 0.08)';

  return (
    <Paper
      variant="outlined"
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        borderColor: accent,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'stretch',
          bgcolor: softBg,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Box aria-hidden sx={{ width: 6, flexShrink: 0, bgcolor: accent }} />
        <Stack
          direction="row"
          alignItems="center"
          spacing={1.5}
          sx={{ px: 2, py: 1.5, minWidth: 0 }}
        >
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
              bgcolor: accent,
              color: course ? 'warning.contrastText' : 'primary.contrastText',
            }}
          >
            {course ? (
              <SchoolOutlinedIcon fontSize="small" />
            ) : (
              <ExploreOutlinedIcon fontSize="small" />
            )}
          </Box>
          <Typography
            sx={{
              fontWeight: 800,
              fontSize: '1.05rem',
              color: course ? 'warning.dark' : 'primary.main',
              lineHeight: 1.2,
            }}
          >
            {label}
          </Typography>
        </Stack>
      </Box>
      <Box sx={{ p: { xs: 1.75, sm: 2 }, display: 'flex', flexDirection: 'column', gap: 1.25, flex: 1 }}>
        <Typography variant="body2" sx={{ lineHeight: 1.45, fontWeight: 500 }}>
          {title}
        </Typography>
        <Typography
          component="ul"
          variant="body2"
          sx={{
            m: 0,
            pl: 2.25,
            color: 'text.secondary',
            lineHeight: 1.45,
            '& li + li': { mt: 0.35 },
          }}
        >
          {children}
        </Typography>
      </Box>
    </Paper>
  );
}

function TypeCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 1.5, sm: 2 },
        height: '100%',
        width: '100%',
        minWidth: 0,
      }}
    >
      <Typography
        variant="subtitle2"
        sx={{ fontWeight: 700, mb: 0.75, fontSize: '0.95rem' }}
      >
        {title}
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ lineHeight: 1.45, fontSize: '0.88rem' }}
      >
        {children}
      </Typography>
    </Paper>
  );
}

/** Page pédagogique : modes (découverte / cours) et types de questions. */
export default function RulesContent() {
  return (
    <Box
      sx={{
        ...layout.pagePaddingAuto,
        py: { xs: 2, sm: 3 },
        minHeight: {
          xs: 'auto',
          md: 'calc(100dvh - 72px)',
        },
        display: 'flex',
        flexDirection: 'column',
        gap: { xs: 2, sm: 2.5 },
      }}
    >
      <Box sx={{ flexShrink: 0 }}>
        <Typography
          variant="h4"
          sx={{
            fontSize: { xs: '1.4rem', sm: '1.85rem' },
            fontWeight: 700,
            mb: 0.5,
          }}
        >
          Règles du jeu
        </Typography>
        <Typography
          color="text.secondary"
          variant="body2"
          sx={{ maxWidth: 720, lineHeight: 1.45 }}
        >
          Comment reconnaître une question notée, et comment répondre selon le
          type.
        </Typography>
      </Box>

      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.25 }}>
          Deux modes de questions
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            gap: 2,
            width: '100%',
          }}
        >
          <ModeCard
            variant="course"
            label="Mode cours — question notée"
            title="Ces questions comptent dans la note."
          >
            <li>1 point par bonne réponse (0 sinon)</li>
            <li>La vitesse ne change pas la note</li>
            <li>Les nuages de mots ne sont jamais notés</li>
          </ModeCard>

          <ModeCard
            variant="discovery"
            label="Mode découverte — s’entraîner"
            title="Participation et entraînement, hors note du cours."
          >
            <li>Points « fun » : vitesse + juste = plus de points</li>
            <li>Utile pour le classement de session</li>
          </ModeCard>
        </Box>
      </Box>

      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.25 }}>
          Types de questions
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(3, minmax(0, 1fr))',
            },
            gap: 2,
            width: '100%',
          }}
        >
          <TypeCard title="QCM">
            Plusieurs propositions, une seule bonne réponse. Choisissez avant
            la fin du chrono.
          </TypeCard>
          <TypeCard title="Nuage de mots">
            Saisissez librement un ou plusieurs mots. Jamais comptabilisé dans
            la note.
          </TypeCard>
          <TypeCard title="Au plus proche">
            Entrez un nombre. Découverte : points selon la distance. Cours : 1
            point dans la plage, 0 sinon.
          </TypeCard>
        </Box>
      </Box>

      <Paper
        variant="outlined"
        sx={{
          px: { xs: 2, sm: 2.5 },
          py: 1.5,
          bgcolor: (t) =>
            t.palette.mode === 'dark'
              ? 'rgba(124,156,224,0.08)'
              : 'rgba(61,90,158,0.06)',
        }}
      >
        <Typography
          variant="subtitle2"
          sx={{ fontWeight: 700, mb: 0.75, fontSize: '0.9rem' }}
        >
          En résumé
        </Typography>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={{ xs: 0.75, sm: 3 }}
          flexWrap="wrap"
          useFlexGap
        >
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ fontSize: '0.9rem' }}
          >
            <Box
              component="span"
              sx={{ color: 'warning.dark', fontWeight: 700 }}
            >
              Orange
            </Box>{' '}
            = mode cours = note
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ fontSize: '0.9rem' }}
          >
            <Box
              component="span"
              sx={{ color: 'primary.main', fontWeight: 700 }}
            >
              Bleu
            </Box>{' '}
            = découverte = entraînement
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ fontSize: '0.9rem' }}
          >
            Lisez toujours le bandeau avant de répondre
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
}
