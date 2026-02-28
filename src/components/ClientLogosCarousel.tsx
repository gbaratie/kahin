import React from 'react';
import { keyframes } from '@emotion/react';
import { Box, Typography } from '@mui/material';
import { clientLogos } from '@/src/data/client-logos';
import type { ClientLogo } from '@/src/data/types';

const scrollLogos = keyframes`
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
`;

export interface ClientLogosCarouselProps {
  /** Titre affiché au-dessus du bandeau (défaut : « Quelques clients »). */
  title?: string;
  /** Liste des logos à afficher (défaut : clientLogos du module data). */
  logos?: ClientLogo[];
}

/**
 * Bandeau défilant des logos clients (carousel infini).
 */
const ClientLogosCarousel: React.FC<ClientLogosCarouselProps> = ({
  title = 'Quelques clients',
  logos = clientLogos,
}) => {
  if (logos.length === 0) return null;

  return (
    <Box sx={{ mt: 6 }}>
      <Typography
        variant="subtitle2"
        color="text.secondary"
        sx={{
          textAlign: 'center',
          mb: 2,
          textTransform: 'uppercase',
          letterSpacing: 1,
        }}
      >
        {title}
      </Typography>
      <Box
        sx={{
          overflow: 'hidden',
          width: '100%',
          py: 2,
          borderTop: 1,
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'background.logoStrip',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            width: 'max-content',
            animation: `${scrollLogos} 40s linear infinite`,
          }}
        >
          {[...logos, ...logos].map((logo, index) => (
            <Box
              key={`${logo.alt}-${index}`}
              sx={{
                flex: '0 0 auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 140,
                height: 64,
                mx: 3,
                '& img': {
                  maxHeight: 48,
                  maxWidth: 120,
                  width: 'auto',
                  height: 'auto',
                  objectFit: 'contain',
                },
              }}
            >
              <img src={logo.src} alt={logo.alt} loading="lazy" />
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default ClientLogosCarousel;
