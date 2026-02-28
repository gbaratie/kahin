import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Toolbar,
  Tabs,
  Tab,
  Typography,
  Container,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { siteName, navItems } from '@/src/config/site';

export interface LayoutProps {
  children: React.ReactNode;
}

function getTabValueFromPath(pathname: string): number {
  const index = navItems.findIndex((item) => item.href === pathname);
  return index >= 0 ? index : 0;
}

/**
 * Layout principal : barre de navigation persistante et conteneur. En mobile : menu burger ; en desktop : onglets.
 */
const Layout: React.FC<LayoutProps> = ({ children }) => {
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [tabValue, setTabValue] = useState<number>(() =>
    getTabValueFromPath(router.pathname)
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setTabValue(getTabValueFromPath(router.pathname));
  }, [router.pathname]);

  const handleCloseMobileMenu = () => setMobileMenuOpen(false);

  return (
    <>
      <AppBar
        position="fixed"
        color="primary"
        elevation={0}
        sx={{ borderBottom: '1px solid', borderColor: 'divider' }}
      >
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {siteName}
          </Typography>
          {isMobile && (
            <IconButton
              color="inherit"
              aria-label="ouvrir le menu"
              edge="end"
              onClick={() => setMobileMenuOpen(true)}
            >
              <MenuIcon />
            </IconButton>
          )}
          {!isMobile && (
            <Tabs
              value={tabValue}
              onChange={(_, newValue) => setTabValue(newValue)}
              textColor="inherit"
              indicatorColor="secondary"
            >
              {navItems.map((item) => (
                <Link key={item.href} href={item.href} passHref legacyBehavior>
                  <Tab label={item.label} component="a" />
                </Link>
              ))}
            </Tabs>
          )}
        </Toolbar>
      </AppBar>

      <Drawer
        anchor="right"
        open={mobileMenuOpen}
        onClose={handleCloseMobileMenu}
        ModalProps={{ keepMounted: true }}
        PaperProps={{
          sx: { minWidth: 240, pt: 2 },
        }}
      >
        <List>
          {navItems.map((item) => (
            <ListItem key={item.href} disablePadding>
              <Link href={item.href} passHref legacyBehavior>
                <ListItemButton
                  component="a"
                  selected={router.pathname === item.href}
                  onClick={handleCloseMobileMenu}
                  sx={{ py: 1.5 }}
                >
                  <ListItemText primary={item.label} />
                </ListItemButton>
              </Link>
            </ListItem>
          ))}
        </List>
      </Drawer>

      <Toolbar />
      <Container
        maxWidth="lg"
        sx={{
          pt: { xs: 5, sm: 8 },
          pb: { xs: 5, sm: 8 },
          minHeight: 'calc(100vh - 64px)',
          bgcolor: 'background.default',
        }}
      >
        {children}
      </Container>
    </>
  );
};

export default Layout;
