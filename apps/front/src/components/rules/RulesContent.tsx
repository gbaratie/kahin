import React from 'react';
import {
  Alert,
  Box,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import { layout } from '@/config/layout';

function RuleSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
        {title}
      </Typography>
      {children}
    </Box>
  );
}

function TypeBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Box sx={{ mb: 2.5 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
        {title}
      </Typography>
      <Typography color="text.secondary" component="div">
        {children}
      </Typography>
    </Box>
  );
}

/** Page pédagogique : modes (découverte / cours) et types de questions. */
export default function RulesContent() {
  return (
    <Box sx={{ ...layout.pagePaddingAuto, py: { xs: 2, sm: 4 }, maxWidth: 720 }}>
      <Typography
        variant="h4"
        gutterBottom
        sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' }, fontWeight: 700 }}
      >
        Règles du jeu
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        À lire en début d’année (et avant chaque session) : comment
        reconnaître une question notée, et comment répondre selon le type.
      </Typography>

      <RuleSection title="Deux modes de questions">
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Chaque question d’un QCM est soit en <strong>mode découverte</strong>
          , soit en <strong>mode cours</strong>. Un bandeau coloré s’affiche
          dès le lancement pour indiquer le mode.
        </Typography>

        <Stack spacing={2} sx={{ mb: 1 }}>
          <Alert
            severity="warning"
            variant="filled"
            sx={{
              fontWeight: 700,
              bgcolor: 'warning.dark',
              color: 'warning.contrastText',
              '& .MuiAlert-icon': { color: 'inherit' },
            }}
          >
            Mode cours — question notée
          </Alert>
          <Box sx={{ pl: { sm: 1 } }}>
            <Typography paragraph sx={{ mb: 1 }}>
              Ces questions <strong>comptent dans la note</strong>. Soyez
              attentifs : le bandeau orange signale clairement qu’il ne
              s’agit pas d’un simple entraînement.
            </Typography>
            <Typography component="ul" sx={{ m: 0, pl: 2.5, color: 'text.secondary' }}>
              <li>1 point par bonne réponse (0 sinon)</li>
              <li>La vitesse ne change pas la note : juste ou faux</li>
              <li>Les nuages de mots ne sont jamais notés, même en mode cours</li>
            </Typography>
          </Box>

          <Divider />

          <Alert severity="info" variant="filled" sx={{ fontWeight: 500 }}>
            Mode découverte — s’entraîner
          </Alert>
          <Box sx={{ pl: { sm: 1 } }}>
            <Typography paragraph sx={{ mb: 1 }}>
              Ces questions servent à <strong>participer et s’entraîner</strong>
              . Elles n’entrent pas dans la note du cours.
            </Typography>
            <Typography component="ul" sx={{ m: 0, pl: 2.5, color: 'text.secondary' }}>
              <li>
                Points « fun » : plus vous répondez vite (et juste), plus vous
                gagnez de points
              </li>
              <li>Utile pour le classement de session, pas pour la moyenne</li>
            </Typography>
          </Box>
        </Stack>
      </RuleSection>

      <RuleSection title="Types de questions">
        <TypeBlock title="QCM">
          Plusieurs propositions, une seule bonne réponse. Choisissez l’option
          qui vous semble correcte avant la fin du chrono.
        </TypeBlock>

        <TypeBlock title="Nuage de mots">
          Saisissez un ou plusieurs mots librement. Il n’y a pas de « bonne »
          réponse unique : les contributions forment un nuage collectif. Ce
          type n’est jamais comptabilisé dans la note.
        </TypeBlock>

        <TypeBlock title="Au plus proche">
          Entrez un nombre. Plus votre réponse est proche de la valeur
          attendue, mieux c’est.
          <Typography component="ul" sx={{ mt: 1, mb: 0, pl: 2.5 }}>
            <li>
              <strong>Découverte</strong> : les points dépendent de la distance
              à la bonne valeur
            </li>
            <li>
              <strong>Cours</strong> : 1 point si vous êtes dans la plage
              acceptée, 0 sinon
            </li>
          </Typography>
        </TypeBlock>
      </RuleSection>

      <RuleSection title="En résumé">
        <Typography component="ul" sx={{ m: 0, pl: 2.5, color: 'text.secondary' }}>
          <li>
            Bandeau <strong>orange</strong> = mode cours ={' '}
            <strong>ça compte pour la note</strong>
          </li>
          <li>
            Bandeau <strong>bleu</strong> = mode découverte = entraînement /
            points de participation
          </li>
          <li>Lisez toujours le bandeau avant de répondre</li>
        </Typography>
      </RuleSection>
    </Box>
  );
}
