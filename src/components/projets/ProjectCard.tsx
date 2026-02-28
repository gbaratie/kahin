import React from 'react';
import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  Chip,
  Stack,
  Box,
} from '@mui/material';
import type { Project } from '@/src/data/types';

export interface ProjectCardProps {
  project: Project;
}

/**
 * Carte projet : titre, description, clients (style distinct), technos, image optionnelle et liens.
 */
const ProjectCard: React.FC<ProjectCardProps> = ({ project }) => {
  const { title, description, clients, tags, links, image } = project;

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {image && (
        <Box
          sx={{
            height: 180,
            backgroundColor: image.background ?? 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            p: image.background ? 1 : 0,
          }}
        >
          <CardMedia
            component="img"
            height="100%"
            image={image.src}
            alt={image.alt}
            sx={{
              objectFit: image.background ? 'contain' : 'cover',
              maxHeight: 180,
            }}
          />
        </Box>
      )}
      <CardContent
        sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}
      >
        <Stack
          direction="row"
          spacing={1}
          sx={{ mb: 1 }}
          flexWrap="wrap"
          useFlexGap
        >
          {clients?.map((client) => (
            <Chip
              key={client}
              label={client}
              size="small"
              variant="outlined"
              color="primary"
              sx={{ fontSize: '0.75rem' }}
            />
          ))}
          {tags.slice(0, 4).map((tag) => (
            <Chip key={tag} label={tag} size="small" variant="outlined" />
          ))}
        </Stack>
        <Typography gutterBottom variant="h6" component="div">
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
          {description}
        </Typography>
        {links && links.length > 0 && (
          <Stack direction="row" spacing={1} sx={{ mt: 2 }} flexWrap="wrap">
            {links.map((link) => (
              <Box
                key={link.label}
                component="a"
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  fontSize: '0.875rem',
                  color: 'primary.main',
                  textDecoration: 'none',
                  '&:hover': { textDecoration: 'underline' },
                }}
              >
                {link.label} →
              </Box>
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
};

export default ProjectCard;
