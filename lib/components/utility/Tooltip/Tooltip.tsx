'use client';

import React, { useState, useLayoutEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';

export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right';

interface TooltipProps {
  text?: string;
  render?: () => React.ReactNode;
  placement?: TooltipPlacement;
  children: React.ReactNode;
}

export default function Tooltip({ text, render, placement = 'bottom', children }: TooltipProps) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; visible: boolean }>({
    top: 0,
    left: 0,
    visible: false,
  });
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isCustom = !!render;

  const scheduleHide = useCallback(() => {
    hideTimeoutRef.current = setTimeout(() => setShow(false), 100);
  }, []);

  const cancelHide = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  React.useEffect(() => {
    if (!show) return;
    const hide = () => setShow(false);
    window.addEventListener('scroll', hide, { capture: true, passive: true });
    return () => window.removeEventListener('scroll', hide, { capture: true });
  }, [show]);

  useLayoutEffect(() => {
    if (!show || !triggerRef.current || !tooltipRef.current) return;

    const tr = triggerRef.current.getBoundingClientRect();
    const tip = tooltipRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const GAP = 8;
    const PAD = 8;

    // Flip placement if it would go off-screen
    let p = placement;
    if (p === 'bottom' && tr.bottom + GAP + tip.height > vh - PAD) p = 'top';
    else if (p === 'top' && tr.top - GAP - tip.height < PAD) p = 'bottom';
    else if (p === 'right' && tr.right + GAP + tip.width > vw - PAD) p = 'left';
    else if (p === 'left' && tr.left - GAP - tip.width < PAD) p = 'right';

    let top: number;
    let left: number;
    switch (p) {
      case 'top':
        top = tr.top - GAP - tip.height;
        left = tr.left + tr.width / 2 - tip.width / 2;
        break;
      case 'bottom':
        top = tr.bottom + GAP;
        left = tr.left + tr.width / 2 - tip.width / 2;
        break;
      case 'left':
        top = tr.top + tr.height / 2 - tip.height / 2;
        left = tr.left - GAP - tip.width;
        break;
      case 'right':
        top = tr.top + tr.height / 2 - tip.height / 2;
        left = tr.right + GAP;
        break;
      default:
        top = tr.bottom + GAP;
        left = tr.left + tr.width / 2 - tip.width / 2;
    }

    // Clamp to viewport
    left = Math.max(PAD, Math.min(left, vw - tip.width - PAD));
    top = Math.max(PAD, Math.min(top, vh - tip.height - PAD));

    setPos({ top, left, visible: true });
  }, [show, placement]);

  return (
    <span
      ref={triggerRef}
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
      onMouseEnter={() => {
        cancelHide();
        setPos({ top: 0, left: 0, visible: false });
        setShow(true);
      }}
      onMouseLeave={isCustom ? scheduleHide : () => setShow(false)}
    >
      {children}
      {show && typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={tooltipRef}
            onMouseEnter={isCustom ? cancelHide : undefined}
            onMouseLeave={isCustom ? scheduleHide : undefined}
            style={{
              position: 'fixed',
              top: pos.top,
              left: pos.left,
              visibility: pos.visible ? 'visible' : 'hidden',
              background: '#1e293b',
              color: '#f1f5f9',
              padding: isCustom ? '10px 12px' : '6px 12px',
              borderRadius: isCustom ? '6px' : '4px',
              fontSize: '12px',
              whiteSpace: isCustom ? 'normal' : 'nowrap',
              pointerEvents: isCustom ? 'auto' : 'none',
              zIndex: 99999,
              border: '1px solid #334155',
              boxShadow: isCustom ? '0 4px 12px rgba(0, 0, 0, 0.4)' : '0 2px 8px rgba(0, 0, 0, 0.3)',
              minWidth: isCustom ? '220px' : undefined,
              maxWidth: isCustom ? '320px' : undefined,
            }}
          >
            {render ? render() : text}
          </div>,
          document.body,
        )}
    </span>
  );
}
