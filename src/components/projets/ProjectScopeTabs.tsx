import { Tabs, Tab, Box } from '@mui/material';

export type ProjectScope = 'pro' | 'side';

const SCOPES: { value: ProjectScope; label: string }[] = [
  { value: 'pro', label: 'Professionnels' },
  { value: 'side', label: 'Side projects' },
];

function isProjectScope(v: string | number): v is ProjectScope {
  return typeof v === 'string' && (v === 'pro' || v === 'side');
}

const tabsSx = {
  minHeight: 36,
  '& .MuiTab-root': {
    minHeight: 36,
    textTransform: 'none',
    fontWeight: 600,
    opacity: 0.7,
  },
  '& .Mui-selected': { opacity: 1 },
} as const;

export interface ProjectScopeTabsProps {
  value: ProjectScope;
  onChange: (scope: ProjectScope) => void;
}

export function ProjectScopeTabs({ value, onChange }: ProjectScopeTabsProps) {
  return (
    <Box sx={{ mb: 4 }}>
      <Tabs
        value={value}
        onChange={(_, v) => {
          if (isProjectScope(v)) onChange(v);
        }}
        textColor="inherit"
        indicatorColor="primary"
        aria-label="Type de projets"
        sx={tabsSx}
      >
        {SCOPES.map(({ value: tabValue, label }) => (
          <Tab key={tabValue} value={tabValue} label={label} />
        ))}
      </Tabs>
    </Box>
  );
}
