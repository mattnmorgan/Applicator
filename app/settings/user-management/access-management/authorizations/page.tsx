export default function AuthorizationsPage() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '400px',
    }}>
      <div style={{
        textAlign: 'center',
        maxWidth: '500px',
      }}>
        <h1 style={{
          fontSize: '28px',
          fontWeight: 'bold',
          marginBottom: '12px',
          color: '#f1f5f9'
        }}>
          Authorizations
        </h1>
        <p style={{
          color: '#94a3b8',
          fontSize: '16px',
          lineHeight: '1.6'
        }}>
          This page will contain authorization management features for fine-grained access control.
        </p>
      </div>
    </div>
  );
}
