import { useState } from 'react';

export default function MyAccount({ user, onUpdateUser, onLogout }) {
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [mobile, setMobile] = useState(user?.mobile || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const res = await fetch('/api/user/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetEmail: user.email,
          name,
          email,
          mobile
        })
      });

      const data = await res.json();
      if (data.success) {
        setMessage('Profile updated successfully!');
        
        // Migrate localStorage keys if email changed
        if (email.toLowerCase() !== user.email.toLowerCase()) {
          const oldSuffix = `_${user.email}`;
          const newSuffix = `_${email.toLowerCase()}`;
          const keysToMigrate = ['iq_watchlist', 'iq_alerts', 'iq_sector_alerts', 'iq_news_alerts'];
          
          keysToMigrate.forEach(key => {
            const oldData = localStorage.getItem(key + oldSuffix);
            if (oldData) {
              localStorage.setItem(key + newSuffix, oldData);
              localStorage.removeItem(key + oldSuffix);
            }
          });
        }

        // Notify parent to update global state and user localStorage
        onUpdateUser(data.user);
      } else {
        setError(data.error || 'Failed to update profile');
      }
    } catch (err) {
      setError('A network error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('Are you absolutely sure you want to delete your account? This action cannot be undone and you will lose all saved alerts and watchlists.')) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/user/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetEmail: user.email })
      });
      const data = await res.json();
      if (data.success) {
        // Clean up local storage
        const suffix = `_${user.email}`;
        ['iq_watchlist', 'iq_alerts', 'iq_sector_alerts', 'iq_news_alerts'].forEach(key => {
          localStorage.removeItem(key + suffix);
        });
        alert('Your account has been deleted.');
        onLogout();
      } else {
        setError(data.error || 'Failed to delete account');
        setLoading(false);
      }
    } catch (err) {
      setError('A network error occurred while deleting account.');
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <div className="section-header">
        <h1 className="section-title">👤 My Account</h1>
      </div>

      <div className="card">
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input 
              className="form-input" 
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="Your Name" 
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input 
              className="form-input" 
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required 
            />
          </div>

          <div className="form-group">
            <label className="form-label">Mobile Number</label>
            <input 
              className="form-input" 
              type="text" 
              value={mobile} 
              onChange={e => setMobile(e.target.value)} 
              required 
            />
          </div>

          {error && <div style={{ color: 'var(--accent-red)', marginBottom: '15px' }}>{error}</div>}
          {message && <div style={{ color: 'var(--accent-cyan)', marginBottom: '15px' }}>{message}</div>}

          <div style={{ display: 'flex', gap: 10, marginTop: 15 }}>
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={loading}
              style={{ flex: 1 }}
            >
              {loading ? 'Processing...' : 'Save Changes'}
            </button>
            <button 
              type="button" 
              className="btn" 
              disabled={loading}
              onClick={handleDeleteAccount}
              style={{ background: 'rgba(248,113,113,0.15)', color: 'var(--accent-red)', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              Delete Account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
