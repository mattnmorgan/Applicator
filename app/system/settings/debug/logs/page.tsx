'use client';

import LoggingViewer from '@/lib/components/LoggingViewer';

export default function LogsPage() {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, minHeight: 0 }}>
        <LoggingViewer />
      </div>
    </div>
  );
}
