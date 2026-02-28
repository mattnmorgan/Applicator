'use client';

import React, { useState, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right';

interface TooltipProps {
  text: string;
  placement?: TooltipPlacement;
  children: React.ReactNode;
}

export default function Tooltip({ text, placement = 'bottom', children }: TooltipProps) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; visible: boolean }>({
    top: 0,
    left: 0,
    visible: false,
  });
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

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
        setPos({ top: 0, left: 0, visible: false });
        setShow(true);
      }}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={tooltipRef}
            style={{
              position: 'fixed',
              top: pos.top,
              left: pos.left,
              visibility: pos.visible ? 'visible' : 'hidden',
              background: '#1e293b',
              color: '#f1f5f9',
              padding: '6px 12px',
              borderRadius: '4px',
              fontSize: '12px',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              zIndex: 99999,
              border: '1px solid #334155',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
            }}
          >
            {text}
          </div>,
          document.body,
        )}
    </span>
  );
}
