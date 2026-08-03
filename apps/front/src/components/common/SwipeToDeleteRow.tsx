import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Button } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

const ACTION_WIDTH = 80;
const OPEN_THRESHOLD = 36;
const DIRECTION_LOCK_PX = 8;

type SwipeToDeleteRowProps = {
  children: React.ReactNode;
  onDelete: () => void;
  /** Identifiant de la ligne ouverte (une seule à la fois). */
  openId: string | null;
  rowId: string;
  onOpenChange: (rowId: string | null) => void;
  enabled?: boolean;
  deleteLabel?: string;
};

/**
 * Ligne avec geste « glisser vers la gauche » pour révéler une action Supprimer.
 * Sur desktop / sans tactile, le contenu reste normal (boutons externes inchangés).
 */
export default function SwipeToDeleteRow({
  children,
  onDelete,
  openId,
  rowId,
  onOpenChange,
  enabled = true,
  deleteLabel = 'Supprimer',
}: SwipeToDeleteRowProps) {
  const [offset, setOffset] = useState(0);
  const offsetRef = useRef(0);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const startOffsetRef = useRef(0);
  const trackingRef = useRef(false);
  const axisRef = useRef<'undecided' | 'horizontal' | 'vertical'>('undecided');
  const [dragging, setDragging] = useState(false);
  const frontRef = useRef<HTMLDivElement | null>(null);

  const setOffsetBoth = useCallback((value: number) => {
    const clamped = Math.max(-ACTION_WIDTH, Math.min(0, value));
    offsetRef.current = clamped;
    setOffset(clamped);
  }, []);

  useEffect(() => {
    if (openId !== rowId && offsetRef.current !== 0) {
      setOffsetBoth(0);
    }
  }, [openId, rowId, setOffsetBoth]);

  const endGesture = useCallback(() => {
    if (!trackingRef.current) return;
    trackingRef.current = false;
    setDragging(false);
    axisRef.current = 'undecided';

    const next = offsetRef.current <= -OPEN_THRESHOLD ? -ACTION_WIDTH : 0;
    setOffsetBoth(next);
    onOpenChange(next < 0 ? rowId : null);
  }, [onOpenChange, rowId, setOffsetBoth]);

  useEffect(() => {
    const el = frontRef.current;
    if (!el || !enabled) return;

    const onTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      trackingRef.current = true;
      axisRef.current = 'undecided';
      startXRef.current = touch.clientX;
      startYRef.current = touch.clientY;
      startOffsetRef.current = offsetRef.current;
      setDragging(true);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!trackingRef.current) return;
      const touch = e.touches[0];
      if (!touch) return;
      const dx = touch.clientX - startXRef.current;
      const dy = touch.clientY - startYRef.current;

      if (axisRef.current === 'undecided') {
        if (
          Math.abs(dx) < DIRECTION_LOCK_PX &&
          Math.abs(dy) < DIRECTION_LOCK_PX
        ) {
          return;
        }
        axisRef.current =
          Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical';
        if (axisRef.current === 'vertical') {
          trackingRef.current = false;
          setDragging(false);
          return;
        }
        // Une seule ligne ouverte à la fois
        onOpenChange(rowId);
      }

      if (axisRef.current !== 'horizontal') return;
      e.preventDefault();
      setOffsetBoth(startOffsetRef.current + dx);
    };

    const onTouchEnd = () => {
      endGesture();
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);
    el.addEventListener('touchcancel', onTouchEnd);

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [enabled, endGesture, onOpenChange, rowId, setOffsetBoth]);

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOffsetBoth(0);
    onOpenChange(null);
    onDelete();
  };

  const handleFrontClick = () => {
    if (offsetRef.current < 0) {
      setOffsetBoth(0);
      onOpenChange(null);
    }
  };

  return (
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        borderBottom: 1,
        borderColor: 'divider',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'stretch',
          bgcolor: 'error.main',
          zIndex: 0,
        }}
        aria-hidden={offset === 0}
      >
        <Button
          color="inherit"
          onClick={handleDeleteClick}
          aria-label={deleteLabel}
          sx={{
            width: ACTION_WIDTH,
            minWidth: ACTION_WIDTH,
            borderRadius: 0,
            color: 'error.contrastText',
            flexDirection: 'column',
            gap: 0.25,
            py: 1,
            fontSize: '0.7rem',
            '&:hover': { bgcolor: 'error.dark' },
          }}
        >
          <DeleteIcon fontSize="small" />
          {deleteLabel}
        </Button>
      </Box>
      <Box
        ref={frontRef}
        onClick={handleFrontClick}
        sx={{
          position: 'relative',
          zIndex: 1,
          bgcolor: 'background.default',
          transform: `translateX(${offset}px)`,
          transition: dragging ? 'none' : 'transform 0.2s ease-out',
          touchAction: enabled ? 'pan-y' : undefined,
          willChange: 'transform',
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
