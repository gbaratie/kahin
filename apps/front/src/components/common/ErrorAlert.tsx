import { Alert, Box, Button } from '@mui/material';
import { layout } from '@/config/layout';

type ErrorAlertProps = {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
};

export default function ErrorAlert({
  message,
  onRetry,
  retryLabel = 'Réessayer',
}: ErrorAlertProps) {
  return (
    <Box sx={{ ...layout.pagePaddingAuto }}>
      <Alert severity="error" sx={{ mb: 2 }}>
        {message}
      </Alert>
      {onRetry && (
        <Button variant="outlined" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </Box>
  );
}
