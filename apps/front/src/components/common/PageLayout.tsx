import { Box } from '@mui/material';
import Layout from '@/components/Layout';
import { layout } from '@/config/layout';

type PageLayoutProps = {
  children: React.ReactNode;
};

export default function PageLayout({ children }: PageLayoutProps) {
  return (
    <Layout>
      <Box sx={layout.pagePaddingAuto}>{children}</Box>
    </Layout>
  );
}
