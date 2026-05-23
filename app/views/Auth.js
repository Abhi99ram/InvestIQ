'use client';
import { useState } from 'react';

export default function Auth({ onLogin }) {
  const [mode, setMode] = useState('login'); // 'login' | 'signup' | 'forgot' | 'otp' | 'reset'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [identifier, setIdentifier] = useState(''); // Used for both signup mobile AND forgot password (email or mobile)
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setError('');
    setSuccess('');
    setPassword('');
    setConfirmPassword('');
    setOtp('');
    setNewPassword('');
  };

  async function handleLoginSignup(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    if (mode === 'signup') {
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        setLoading(false);
        return;
      }
      if (!/^[0-9]{10}$/.test(identifier)) {
        setError('Please enter a valid 10-digit mobile number');
        setLoading(false);
        return;
      }
    }

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: mode,
          name: mode === 'signup' ? name : undefined,
          email,
          password,
          mobile: mode === 'signup' ? identifier : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Authentication failed');
      onLogin(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSendOtp(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send-otp', identifier }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send OTP');
      setSuccess(`✅ OTP sent to ${identifier}. Check your inbox/SMS.`);
      setMode('otp');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // Verify OTP server-side
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify-otp', identifier, password: otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'OTP verification failed');
      setSuccess('✅ OTP verified! Set your new password below.');
      setMode('reset');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    setError('');
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset-password', identifier, password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset password');
      setSuccess('✅ Password reset successfully! You can now login.');
      setMode('login');
      resetForm();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '11px 14px',
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.05)',
    color: '#fff',
    fontSize: '0.95rem',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
      <div className="card" style={{ maxWidth: '420px', width: '100%', padding: '36px 32px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>
            {mode === 'login' && '🔐'}
            {mode === 'signup' && '✨'}
            {mode === 'forgot' && '📱'}
            {mode === 'otp' && '🔑'}
            {mode === 'reset' && '🔒'}
          </div>
          <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, color: '#fff' }}>
            {mode === 'login' && 'Login to InvestIQ AI'}
            {mode === 'signup' && 'Create an Account'}
            {mode === 'forgot' && 'Reset Password'}
            {mode === 'otp' && 'Enter OTP'}
            {mode === 'reset' && 'New Password'}
          </h2>
          {mode === 'forgot' && (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 6 }}>
              Enter your registered email to receive a 6-digit OTP
            </p>
          )}
          {mode === 'otp' && (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 6 }}>
              We sent a 6-digit code to <strong style={{ color: '#38bdf8' }}>{identifier}</strong>
            </p>
          )}
        </div>

        {/* Error/Success messages */}
        {error && (
          <div style={{ color: '#ef4444', marginBottom: 15, padding: '10px 14px', background: 'rgba(239,68,68,0.1)', borderRadius: 8, fontSize: '0.875rem', border: '1px solid rgba(239,68,68,0.2)' }}>
            ⚠️ {error}
          </div>
        )}
        {success && (
          <div style={{ color: '#10b981', marginBottom: 15, padding: '10px 14px', background: 'rgba(16,185,129,0.1)', borderRadius: 8, fontSize: '0.875rem', border: '1px solid rgba(16,185,129,0.2)' }}>
            {success}
          </div>
        )}

        {/* LOGIN / SIGNUP FORM */}
        {(mode === 'login' || mode === 'signup') && (
          <form onSubmit={handleLoginSignup} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {mode === 'signup' && (
              <div>
                <label className="form-label">Full Name</label>
                <input type="text" style={inputStyle} value={name} onChange={e => setName(e.target.value)} required placeholder="John Doe" />
              </div>
            )}
            <div>
              <label className="form-label">Email Address</label>
              <input type="email" style={inputStyle} value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" />
            </div>

            {mode === 'signup' && (
              <div>
                <label className="form-label">Mobile Number</label>
                <input type="tel" pattern="[0-9]{10}" style={inputStyle} value={identifier} onChange={e => setIdentifier(e.target.value)} required placeholder="10-digit mobile number" />
              </div>
            )}

            <div>
              <label className="form-label">Password</label>
              <input type="password" style={inputStyle} value={password} onChange={e => setPassword(e.target.value)} required placeholder="Min. 6 characters" minLength={6} />
            </div>

            {mode === 'signup' && (
              <div>
                <label className="form-label">Confirm Password</label>
                <input type="password" style={inputStyle} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required placeholder="Min. 6 characters" minLength={6} />
              </div>
            )}

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 4, padding: '12px' }} disabled={loading}>
              {loading ? '⏳ Processing...' : (mode === 'login' ? '🔐 Login' : '✨ Create Account')}
            </button>

            {mode === 'login' && (
              <button type="button" onClick={() => { setMode('forgot'); resetForm(); }}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'underline' }}>
                Forgot Password?
              </button>
            )}
          </form>
        )}

        {/* FORGOT PASSWORD — Enter Email */}
        {mode === 'forgot' && (
          <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label className="form-label">Registered Email</label>
              <input type="email" style={inputStyle} value={identifier} onChange={e => setIdentifier(e.target.value)}
                required placeholder="you@example.com" />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px' }} disabled={loading}>
              {loading ? '⏳ Sending OTP...' : '🚀 Send OTP'}
            </button>
          </form>
        )}

        {/* OTP VERIFICATION */}
        {mode === 'otp' && (
          <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label className="form-label">6-Digit OTP</label>
              <input
                type="text"
                style={{ ...inputStyle, letterSpacing: '0.6rem', textAlign: 'center', fontSize: '1.5rem', fontWeight: 700 }}
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                placeholder="------"
                maxLength={6}
                inputMode="numeric"
              />
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4, textAlign: 'center' }}>
                OTP valid for 10 minutes
              </div>
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px' }} disabled={loading || otp.length < 6}>
              {loading ? '⏳ Verifying...' : '✅ Verify OTP'}
            </button>
            <button type="button" onClick={handleSendOtp}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'underline' }}>
              Resend OTP
            </button>
          </form>
        )}

        {/* RESET PASSWORD */}
        {mode === 'reset' && (
          <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label className="form-label">New Password</label>
              <input type="password" style={inputStyle} value={newPassword} onChange={e => setNewPassword(e.target.value)}
                required placeholder="Min. 6 characters" />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px' }} disabled={loading}>
              {loading ? '⏳ Updating...' : '🔒 Update Password'}
            </button>
          </form>
        )}

        {/* Footer links */}
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          {(mode === 'login' || mode === 'signup') ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
              <button type="button"
                onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); resetForm(); }}
                style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.875rem' }}>
                {mode === 'login' ? 'Sign up' : 'Login'}
              </button>
            </p>
          ) : (
            <button type="button"
              onClick={() => { setMode('login'); resetForm(); setIdentifier(''); }}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.85rem' }}>
              ← Back to Login
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
