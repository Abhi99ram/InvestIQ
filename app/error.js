'use client';

export default function Error({ error, reset }) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      background: '#020617',
      color: '#e2e8f0',
      fontFamily: 'Inter, system-ui, sans-serif',
      textAlign: 'center',
    }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: 8 }}>Something went wrong</h1>
      <p style={{ color: '#94a3b8', marginBottom: 24, maxWidth: 400 }}>
        {error?.message || 'The app hit an error. Reload to continue.'}
      </p>
      <button
        type="button"
        onClick={() => reset()}
        style={{
          padding: '12px 28px',
          borderRadius: 8,
          border: 'none',
          background: '#38bdf8',
          color: '#0f172a',
          fontWeight: 700,
          cursor: 'pointer',
          marginRight: 8,
        }}
      >
        Try again
      </button>
      <button
        type="button"
        onClick={() => window.location.reload()}
        style={{
          padding: '12px 28px',
          borderRadius: 8,
          border: '1px solid #334155',
          background: 'transparent',
          color: '#e2e8f0',
          cursor: 'pointer',
        }}
      >
        Reload page
      </button>
    </div>
  );
}
