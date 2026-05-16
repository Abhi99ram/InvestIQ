export default function Support() {
  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <div className="section-header">
        <h1 className="section-title">🎧 Support & Helpdesk</h1>
      </div>

      <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
        <h2 style={{ marginBottom: '15px' }}>Need Help?</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '30px', lineHeight: '1.6' }}>
          If you have any queries, feature requests, or are experiencing issues with your account, please reach out to our dedicated support team.
        </p>
        
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{ background: 'rgba(56, 189, 248, 0.1)', padding: '20px', borderRadius: '12px', flex: 1, minWidth: '250px' }}>
            <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: 'var(--text-muted)' }}>Email us directly at:</p>
            <a 
              href="mailto:investiq.helpdesk@gmail.com" 
              style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--accent-cyan)', textDecoration: 'none' }}
            >
              investiq.helpdesk@gmail.com
            </a>
          </div>

          <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '20px', borderRadius: '12px', flex: 1, minWidth: '250px' }}>
            <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: 'var(--text-muted)' }}>Talk to an Expert on WhatsApp:</p>
            <a 
              href="https://api.whatsapp.com/send?phone=919059204355&text=Hi,+I+need+help+with+InvestIQ+AI" 
              target="_blank" rel="noreferrer"
              style={{ fontSize: '20px', fontWeight: 'bold', color: '#22c55e', textDecoration: 'none' }}
            >
              Start Chat 💬
            </a>
          </div>
        </div>
        
        <p style={{ marginTop: '30px', fontSize: '12px', color: 'var(--text-muted)' }}>
          We typically respond within 24 hours.
        </p>
      </div>
    </div>
  );
}
