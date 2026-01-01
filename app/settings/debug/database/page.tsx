'use client';

import DatabaseViewer from '@/app/components/DatabaseViewer';

export default function DatabasePage() {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <h2 style={{
        fontSize: '24px',
        fontWeight: 'bold',
        marginBottom: '16px',
        marginTop: 0,
        color: '#f1f5f9'
      }}>
        Database Viewer
      </h2>
      <div style={{ flex: 1, minHeight: 0 }}>
        <DatabaseViewer />
      </div>
    </div>
  );
}
