'use client';

import Tooltip from '../Tooltip';

interface InfoTooltipProps {
  text: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

export default function InfoTooltip({ text, placement = 'top' }: InfoTooltipProps) {
  return (
    <Tooltip text={text} placement={placement}>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '14px',
          height: '14px',
          borderRadius: '50%',
          border: '1px solid #475569',
          color: '#64748b',
          fontSize: '10px',
          cursor: 'help',
          fontWeight: 600,
          lineHeight: '1',
          userSelect: 'none',
          flexShrink: 0,
        }}
      >
        ?
      </span>
    </Tooltip>
  );
}
