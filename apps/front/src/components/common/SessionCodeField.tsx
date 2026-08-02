import React, { useRef } from 'react';
import { Box, OutlinedInput } from '@mui/material';

const CODE_LENGTH = 6;

type SessionCodeFieldProps = {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  'aria-label'?: string;
};

/**
 * Saisie compacte du code session (6 caractères), une seule zone
 * pour rester accessible et tenir dans le viewport.
 */
export default function SessionCodeField({
  value,
  onChange,
  disabled = false,
  autoFocus = false,
  'aria-label': ariaLabel = 'Code session',
}: SessionCodeFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const normalized = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LENGTH);

  return (
    <Box>
      <OutlinedInput
        inputRef={inputRef}
        fullWidth
        autoFocus={autoFocus}
        disabled={disabled}
        value={normalized}
        onChange={(e) =>
          onChange(
            e.target.value
              .toUpperCase()
              .replace(/[^A-Z0-9]/g, '')
              .slice(0, CODE_LENGTH)
          )
        }
        inputProps={{
          maxLength: CODE_LENGTH,
          'aria-label': ariaLabel,
          autoCapitalize: 'characters',
          autoCorrect: 'off',
          spellCheck: false,
          inputMode: 'text',
          style: {
            textAlign: 'center',
            letterSpacing: '0.35em',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: '1.5rem',
            fontWeight: 600,
            paddingTop: 14,
            paddingBottom: 14,
          },
        }}
        placeholder={'——————'}
      />
    </Box>
  );
}
