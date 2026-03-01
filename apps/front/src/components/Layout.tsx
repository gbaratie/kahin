import React, { useState } from 'react';
import {
  Box,
  IconButton,
  Link as MuiLink,
  Stack,
  Typography,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { siteName, navItems } from '@/config/site';
import ApiStatus from '@/components/ApiStatus';

type LayoutProps = { children: React.ReactNode };

export default function Layout({ children }: LayoutProps) {
  const router = useRouter();
  const pathname = router.pathname;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const navLinks = (
    <>
      {navItems.map((item) => (
        <MuiLink
          key={item.href}
          component={Link}
          href={item.href}
          underline="none"
          color="text.primary"
          sx={{
            textTransform: 'uppercase',
            fontSize: '0.875rem',
            letterSpacing: '0.05em',
            color: 'text.secondary',
            borderBottom: isActive(item.href)
              ? 2
              : 0,
            borderColor: 'primary.main',
            borderRadius: 0,
            pb: 0.5,
            '&:hover': { color: 'text.primary' },
          }}
        >
          {item.label}
        </MuiLink>
      ))}
    </>
  );

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Box
        component="header"
        sx={{
          py: 2,
          px: 2,
          borderBottom: 1,
          borderColor: 'divider',
        }}
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

          {/* Desktop : boutons de navigation horizontaux */}
          <Stack
            direction="row"
            spacing={3}
            sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center' }}
          >
            {navLinks}
          </Stack>

          {/* Mobile : bouton burger */}
          <IconButton
            color="inherit"
            aria-label="Ouvrir le menu"
            onClick={() => setMobileMenuOpen(true)}
            sx={{ display: { xs: 'inline-flex', md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
        </Stack>
      </Box>

      {/* Drawer menu mobile */}
      <Drawer
        anchor="right"
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        PaperProps={{
          sx: { minWidth: 240 },
        }}
      >
        <Box sx={{ py: 2, px: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ px: 2 }}>
            Menu
          </Typography>
          <List disablePadding>
            {navItems.map((item) => (
              <ListItem key={item.href} disablePadding>
                <ListItemButton
                  component={Link}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  selected={isActive(item.href)}
                >
                  <ListItemText primary={item.label} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>

      <Box component="main" sx={{ flex: 1 }}>
        {children}
      </Box>
    </Box>
  );
}
