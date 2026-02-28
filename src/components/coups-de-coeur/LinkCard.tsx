import React from 'react';
import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  Button,
  Chip,
  Stack,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import type { LinkItem } from '@/src/data/types';

export interface LinkCardProps {
  item: LinkItem;
}

/**
 * Carte pour un lien externe (Sélection / Amis) : titre, description, tags, bouton vers l’URL.
 */
const LinkCard: React.FC<LinkCardProps> = ({ item }) => {
  const { title, description, tags, url, buyUrl, image } = item;

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {image && (
        <CardMedia
          component="img"
          height="160"
          image={image.src}
          alt={image.alt}
          sx={{ objectFit: 'cover' }}
        />
      )}
      <CardContent
        sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}
      >
        <Stack direction="row" spacing={1} sx={{ mb: 1 }} flexWrap="wrap">
          {tags.map((tag) => (
            <Chip key={tag} label={tag} size="small" variant="outlined" />
          ))}
        </Stack>
        <Typography gutterBottom variant="h6" component="div">
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
          {description}
        </Typography>
        <Stack direction="row" spacing={1} sx={{ mt: 2 }} flexWrap="wrap">
          <Button
            component="a"
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            variant="outlined"
            color="primary"
            endIcon={<OpenInNewIcon />}
          >
            Visiter
          </Button>
          {buyUrl && (
            <Button
              component="a"
              href={buyUrl}
              target="_blank"
              rel="noopener noreferrer"
              variant="outlined"
              color="primary"
              endIcon={<ShoppingCartIcon />}
            >
              Acheter
            </Button>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};

export default LinkCard;
