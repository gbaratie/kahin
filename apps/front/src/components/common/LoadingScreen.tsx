import { Box, CircularProgress, Typography } from '@mui/material';
import Layout from '@/components/Layout';
import { layout } from '@/config/layout';

type LoadingScreenProps = {
  title?: string;
};

export default function LoadingScreen({ title }: LoadingScreenProps) {
  return (
    <Layout>
      {title && (
        <Box component="header" sx={{ ...layout.pagePaddingAuto, pb: 0 }}>
          <Typography variant="h5">{title}</Typography>
        </Box>
      )}
      <Box
        sx={{
          ...layout.pagePadding,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <CircularProgress />
      </Box>
    </Layout>
  );
}
