'use client';
import { useState } from 'react';
import { ShieldCheck, Lock, Zap } from 'lucide-react';

const HEADINGS = {
  login: { title: 'Welcome Back', sub: 'Log in to your intelligence dashboard' },
  signup: { title: 'Create Account', sub: 'Join InvestIQ AI — free access to every feature' },
  forgot: { title: 'Reset Password', sub: 'Enter your registered email to receive a 6-digit OTP' },
  otp: { title: 'Enter OTP', sub: null },
  reset: { title: 'New Password', sub: 'Choose a strong password for your account' },
};

// `mode` / `onModeChange` are optional — when provided the parent (landing page) controls which form shows.
export default function Auth({ onLogin, mode: controlledMode, onModeChange }) {
  const [localMode, setLocalMode] = useState('login'); // 'login' | 'signup' | 'forgot' | 'otp' | 'reset'
  const mode = controlledMode ?? localMode;
  const setMode = onModeChange ?? setLocalMode;
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
      setSuccess(`OTP sent to ${identifier}. Check your inbox.`);
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
      setSuccess('OTP verified! Set your new password below.');
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
      setMode('login');
      resetForm();
      setSuccess('Password reset successfully! You can now log in.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const switchMode = (next) => { setMode(next); resetForm(); };
  const head = HEADINGS[mode] || HEADINGS.login;

  return (
    <div className="lp-auth" id="lp-auth">
      <div className="lp-auth-inner">
        <div className="lp-auth-head">
          <h2>{head.title}</h2>
          {mode === 'otp'
            ? <p>We sent a 6-digit code to <strong>{identifier}</strong></p>
            : <p>{head.sub}</p>}
        </div>

        {error && <div className="lp-msg lp-msg-err" role="alert">{error}</div>}
        {success && <div className="lp-msg lp-msg-ok" role="status">{success}</div>}

        {/* LOGIN / SIGNUP FORM */}
        {(mode === 'login' || mode === 'signup') && (
          <form onSubmit={handleLoginSignup} className="lp-form">
            {mode === 'signup' && (
              <div className="lp-field">
                <label htmlFor="lp-name">Full Name</label>
                <input id="lp-name" type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="John Doe" autoComplete="name" />
              </div>
            )}
            <div className="lp-field">
              <label htmlFor="lp-email">Email Address</label>
              <input id="lp-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="name@company.com" autoComplete="email" />
            </div>

            {mode === 'signup' && (
              <div className="lp-field">
                <label htmlFor="lp-mobile">Mobile Number</label>
                <input id="lp-mobile" type="tel" pattern="[0-9]{10}" value={identifier} onChange={e => setIdentifier(e.target.value)} required placeholder="10-digit mobile number" autoComplete="tel" />
              </div>
            )}

            <div className={mode === 'signup' ? 'lp-form-row' : undefined}>
              <div className="lp-field">
                <label htmlFor="lp-password">Password</label>
                <input id="lp-password" type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Min. 6 characters" minLength={6} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
              </div>
              {mode === 'signup' && (
                <div className="lp-field">
                  <label htmlFor="lp-confirm">Confirm Password</label>
                  <input id="lp-confirm" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required placeholder="Repeat password" minLength={6} autoComplete="new-password" />
                </div>
              )}
            </div>

            <button type="submit" className="lp-btn lp-btn-primary" disabled={loading}>
              {loading ? 'Processing…' : (mode === 'login' ? 'Log In' : 'Create Account')}
            </button>

            {mode === 'login' && (
              <div style={{ textAlign: 'center' }}>
                <button type="button" className="lp-link lp-link-muted" style={{ fontSize: '0.84rem' }} onClick={() => switchMode('forgot')}>
                  Forgot password?
                </button>
              </div>
            )}
          </form>
        )}

        {/* FORGOT PASSWORD — Enter Email */}
        {mode === 'forgot' && (
          <form onSubmit={handleSendOtp} className="lp-form">
            <div className="lp-field">
              <label htmlFor="lp-identifier">Registered Email</label>
              <input id="lp-identifier" type="email" value={identifier} onChange={e => setIdentifier(e.target.value)} required placeholder="name@company.com" autoComplete="email" />
            </div>
            <button type="submit" className="lp-btn lp-btn-primary" disabled={loading}>
              {loading ? 'Sending OTP…' : 'Send OTP'}
            </button>
          </form>
        )}

        {/* OTP VERIFICATION */}
        {mode === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="lp-form">
            <div className="lp-field">
              <label htmlFor="lp-otp">6-Digit OTP</label>
              <input
                id="lp-otp"
                type="text"
                className="lp-otp-input"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                placeholder="------"
                maxLength={6}
                inputMode="numeric"
                autoComplete="one-time-code"
              />
              <div className="lp-hint">OTP valid for 10 minutes</div>
            </div>
            <button type="submit" className="lp-btn lp-btn-primary" disabled={loading || otp.length < 6}>
              {loading ? 'Verifying…' : 'Verify OTP'}
            </button>
            <div style={{ textAlign: 'center' }}>
              <button type="button" className="lp-link lp-link-muted" style={{ fontSize: '0.84rem' }} onClick={handleSendOtp}>
                Resend OTP
              </button>
            </div>
          </form>
        )}

        {/* RESET PASSWORD */}
        {mode === 'reset' && (
          <form onSubmit={handleResetPassword} className="lp-form">
            <div className="lp-field">
              <label htmlFor="lp-newpass">New Password</label>
              <input id="lp-newpass" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required placeholder="Min. 6 characters" autoComplete="new-password" />
            </div>
            <button type="submit" className="lp-btn lp-btn-primary" disabled={loading}>
              {loading ? 'Updating…' : 'Update Password'}
            </button>
          </form>
        )}

        {/* Footer links */}
        <div className="lp-auth-foot">
          {mode === 'login' && <>Don&apos;t have an account? <button type="button" className="lp-link" onClick={() => switchMode('signup')}>Sign up</button></>}
          {mode === 'signup' && <>Already have an account? <button type="button" className="lp-link" onClick={() => switchMode('login')}>Log in</button></>}
          {mode !== 'login' && mode !== 'signup' && (
            <button type="button" className="lp-link lp-link-muted" onClick={() => { switchMode('login'); setIdentifier(''); }}>
              ← Back to login
            </button>
          )}
        </div>

        <div className="lp-divider">SECURE ACCESS</div>
        <div className="lp-trust">
          <span><ShieldCheck size={13} /> No card required</span>
          <span><Lock size={13} /> OTP account recovery</span>
          <span><Zap size={13} /> Instant access</span>
        </div>
      </div>
    </div>
  );
}
