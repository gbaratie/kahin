import React from 'react';
import { Box, Link as MuiLink, Stack, Typography } from '@mui/material';
import Link from 'next/link';
import { siteName, navItems } from '@/config/site';
import ApiStatus from '@/components/ApiStatus';

type LayoutProps = { children: React.ReactNode };

export default function Layout({ children }: LayoutProps) {
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Box
        component="header"
        sx={{ py: 2, px: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ maxWidth: 960, mx: 'auto' }}
        >
          <Stack direction="row" alignItems="center" spacing={2}>
            <Typography
              component={Link}
              href="/"
              variant="h6"
              sx={{ textDecoration: 'none', color: 'inherit', fontWeight: 600 }}
            >
              {siteName}
            </Typography>
            <ApiStatus />
          </Stack>
          <Stack direction="row" spacing={2}>
            {navItems.map((item) => (
              <MuiLink
                key={item.href}
                component={Link}
                href={item.href}
                underline="hover"
                color="text.primary"
              >
                {item.label}
              </MuiLink>
            ))}
          </Stack>
        </Stack>
      </Box>
      <Box component="main" sx={{ flex: 1 }}>
        {children}
      </Box>
    </Box>
  );
}
