import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../services/api';
import { FaEnvelope, FaLock, FaShieldAlt, FaArrowLeft, FaEye, FaEyeSlash } from 'react-icons/fa';
import './Login.css';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [step, setStep] = useState('credentials'); // credentials | 2fa | forgot | reset
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMsg, setResendMsg] = useState('');
  const [pendingUser, setPendingUser] = useState(null);
  const otpRefs = useRef([]);

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState(['', '', '', '', '', '']);
  const [resetPassword, setResetPassword] = useState('');
  const [resetConfirm, setResetConfirm] = useState('');
  const [showResetPw, setShowResetPw] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [forgotMsg, setForgotMsg] = useState('');
  const forgotOtpRefs = useRef([]);

  const pwRules = [
    { label: 'At least 8 characters', test: (p) => p.length >= 8 },
    { label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
    { label: 'One lowercase letter', test: (p) => /[a-z]/.test(p) },
    { label: 'One number', test: (p) => /[0-9]/.test(p) },
    { label: 'One symbol (!@#$…)', test: (p) => /[^a-zA-Z0-9]/.test(p) },
  ];

  /* ── Login submit ─────────────────────── */
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await authApi.login({ email, password });

      if (data.requires_2fa) {
        setPendingUser({ ...data, rememberMe });
        setStep('2fa');
      } else if (data.user && data.user.user_type) {
        login(data.user, data.token, rememberMe);
        navigateByRole(data.user.user_type);
      } else {
        setError('Login response was incomplete. Please try again.');
      }
    } catch (err) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  /* ── 2FA submit ───────────────────────── */
  const handleVerify2FA = async () => {
    const code = otp.join('');
    if (code.length < 6) return;

    setError('');
    setLoading(true);

    try {
      const data = await authApi.verify2FA({
        user_id: pendingUser.user_id,
        otp_code: code,
      });
      login(data.user, data.token, pendingUser.rememberMe);
      navigateByRole(data.user.user_type);
    } catch (err) {
      setError(err.message || 'Invalid verification code.');
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  /* ── OTP input handler ────────────────── */
  const handleOtpChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...otp];
    next[index] = value;
    setOtp(next);

    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  /* ── Forgot password: send code ──────── */
  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authApi.forgotPassword({ email: forgotEmail });
      setForgotMsg('');
      setStep('reset');
    } catch (err) {
      setError(err.message || 'Failed to send reset code.');
    } finally {
      setLoading(false);
    }
  };

  /* ── Forgot OTP input ─────────────────── */
  const handleForgotOtpChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...forgotOtp];
    next[index] = value;
    setForgotOtp(next);
    if (value && index < 5) forgotOtpRefs.current[index + 1]?.focus();
  };

  const handleForgotOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !forgotOtp[index] && index > 0) {
      forgotOtpRefs.current[index - 1]?.focus();
    }
  };

  /* ── Reset password: submit ───────────── */
  const handleResetSubmit = async () => {
    const code = forgotOtp.join('');
    if (code.length < 6) { setError('Please enter the 6-digit code.'); return; }
    if (!pwRules.every(r => r.test(resetPassword))) { setError('Password does not meet the requirements.'); return; }
    if (resetPassword !== resetConfirm) { setError('Passwords do not match.'); return; }

    setError('');
    setLoading(true);
    try {
      await authApi.resetPassword({ email: forgotEmail, otp_code: code, new_password: resetPassword });
      setForgotMsg('Password reset successfully! You can now sign in.');
      setStep('credentials');
      setForgotEmail('');
      setForgotOtp(['', '', '', '', '', '']);
      setResetPassword('');
      setResetConfirm('');
    } catch (err) {
      setError(err.message || 'Invalid or expired code.');
    } finally {
      setLoading(false);
    }
  };

  /* ── Resend OTP ───────────────────────── */
  const handleResend = async () => {
    setResendMsg('');
    setResendLoading(true);
    try {
      await authApi.resend2FA({ user_id: pendingUser.user_id });
      setResendMsg('A new code has been sent to your email.');
    } catch (err) {
      setResendMsg(err.message || 'Failed to resend code. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  const navigateByRole = (userType) => {
    const routes = {
      admin: '/admin/dashboard',
      supervisor: '/supervisor/dashboard',
      intern: '/intern/dashboard',
    };
    navigate(routes[userType] || '/login');
  };

  /* ── Credentials Form ─────────────────── */
  const renderCredentials = () => (
    <form className="login__form" onSubmit={handleLogin} id="login-form">
      {error && <div className="login__error" id="login-error">{error}</div>}

      <div className="form-group">
        <label className="form-group__label" htmlFor="login-email">Email Address</label>
        <div className="login__input-wrapper">
          <span className="login__input-icon"><FaEnvelope /></span>
          <input
            id="login-email"
            type="email"
            className="input"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-group__label" htmlFor="login-password">Password</label>
        <div className="login__input-wrapper">
          <span className="login__input-icon"><FaLock /></span>
          <input
            id="login-password"
            type={showPassword ? "text" : "password"}
            className="input input--with-toggle"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
          <button
            type="button"
            className="login__password-toggle"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <FaEyeSlash /> : <FaEye />}
          </button>
        </div>
      </div>

      <div className="login__form-options">
        <label className="login__remember">
          <input
            type="checkbox"
            id="remember-me"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
          />
          Remember me
        </label>
        <a href="#" className="login__forgot" id="forgot-password" onClick={e => { e.preventDefault(); setError(''); setForgotEmail(email); setStep('forgot'); }}>Forgot password?</a>
      </div>

      <button
        type="submit"
        className="btn btn--primary login__submit"
        disabled={loading}
        id="login-submit"
      >
        {loading ? (
          <>
            <span className="spinner spinner--sm" /> Signing in…
          </>
        ) : (
          'Sign In'
        )}
      </button>

    </form>
  );

  /* ── Forgot Password Form ─────────────── */
  const renderForgot = () => (
    <form className="login__form" onSubmit={handleForgotSubmit}>
      {error && <div className="login__error">{error}</div>}
      <div className="login__2fa-icon" style={{ marginLeft: '46%', marginBottom: 0, marginTop: 0 }}><FaEnvelope /></div>
      <h2 className="login__2fa-title" style={{ marginBottom: 0, marginTop: 0 }}>Forgot Password</h2>
      <p className="login__2fa-text" style={{ marginBottom: 0, marginTop: 0 }}>
        Enter your registered email and we'll send you a 6-digit reset code.
      </p>
      <div className="form-group" style={{ marginTop: 'var(--space-4)', marginBottom: 0 }}>
        <label className="form-group__label">Email Address</label>
        <div className="login__input-wrapper">
          <span className="login__input-icon"><FaEnvelope /></span>
          <input
            type="email"
            className="input"
            placeholder="Enter your email"
            value={forgotEmail}
            onChange={e => setForgotEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
      </div>
      <button type="submit" className="btn btn--primary login__submit" disabled={loading} style={{ marginTop: 'var(--space-4)' }}>
        {loading ? <><span className="spinner spinner--sm" /> Sending…</> : 'Send Reset Code'}
      </button>
      <button type="button" className="login__2fa-back" onClick={() => { setStep('credentials'); setError(''); }}>
        <FaArrowLeft /> Back to login
      </button>
    </form>
  );

  /* ── Reset Password Form ───────────────── */
  const renderReset = () => (
    <div className="login__2fa">
      <div className="login__2fa-icon"><FaShieldAlt /></div>
      <h2 className="login__2fa-title">Reset Password</h2>
      <p className="login__2fa-text">
        Enter the 6-digit code sent to <strong>{forgotEmail}</strong> and choose a new password.
      </p>
      {error && <div className="login__error" style={{ marginBottom: 'var(--space-4)' }}>{error}</div>}

      <div className="login__otp-inputs" style={{ marginBottom: 'var(--space-5)' }}>
        {forgotOtp.map((digit, i) => (
          <input
            key={i}
            ref={el => (forgotOtpRefs.current[i] = el)}
            type="text"
            inputMode="numeric"
            maxLength="1"
            className="login__otp-input"
            value={digit}
            onChange={e => handleForgotOtpChange(i, e.target.value)}
            onKeyDown={e => handleForgotOtpKeyDown(i, e)}
          />
        ))}
      </div>

      <div className="form-group" style={{ textAlign: 'left' }}>
        <label className="form-group__label">New Password</label>
        <div className="login__input-wrapper">
          <input
            className="input input--with-toggle"
            type={showResetPw ? 'text' : 'password'}
            placeholder="New password"
            value={resetPassword}
            onChange={e => setResetPassword(e.target.value)}
          />
          <button type="button" className="login__password-toggle" onClick={() => setShowResetPw(v => !v)}>
            {showResetPw ? <FaEyeSlash /> : <FaEye />}
          </button>
        </div>
        {resetPassword && (
          <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
            {pwRules.map(rule => {
              const ok = rule.test(resetPassword);
              return (
                <div key={rule.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                  <span style={{ color: ok ? 'var(--color-success)' : 'var(--color-error)', fontWeight: 700 }}>{ok ? '✓' : '✗'}</span>
                  <span style={{ color: ok ? 'var(--color-success)' : 'var(--color-on-surface-variant)' }}>{rule.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="form-group" style={{ textAlign: 'left', marginTop: 'var(--space-3)' }}>
        <label className="form-group__label">Confirm Password</label>
        <div className="login__input-wrapper">
          <input
            className="input input--with-toggle"
            type={showResetConfirm ? 'text' : 'password'}
            placeholder="Confirm new password"
            value={resetConfirm}
            onChange={e => setResetConfirm(e.target.value)}
          />
          <button type="button" className="login__password-toggle" onClick={() => setShowResetConfirm(v => !v)}>
            {showResetConfirm ? <FaEyeSlash /> : <FaEye />}
          </button>
        </div>
      </div>

      <button
        className="btn btn--primary login__submit"
        style={{ marginTop: 'var(--space-4)' }}
        onClick={handleResetSubmit}
        disabled={loading || forgotOtp.join('').length < 6}
      >
        {loading ? <><span className="spinner spinner--sm" /> Resetting…</> : 'Reset Password'}
      </button>

      <button type="button" className="login__2fa-back" onClick={() => { setStep('forgot'); setError(''); setForgotOtp(['', '', '', '', '', '']); }}>
        <FaArrowLeft /> Change email
      </button>
    </div>
  );

  /* ── 2FA Form ──────────────────────────── */
  const render2FA = () => (
    <div className="login__2fa" id="login-2fa">
      <div className="login__2fa-icon"><FaShieldAlt /></div>
      <h2 className="login__2fa-title">Two-Factor Verification</h2>
      <p className="login__2fa-text">
        We've sent a 6-digit code to your email.
        <br />
        Enter it below to continue.
      </p>

      {error && <div className="login__error" style={{ marginBottom: 'var(--space-4)' }}>{error}</div>}

      <div className="login__otp-inputs">
        {otp.map((digit, i) => (
          <input
            key={i}
            ref={(el) => (otpRefs.current[i] = el)}
            type="text"
            inputMode="numeric"
            maxLength="1"
            className="login__otp-input"
            value={digit}
            onChange={(e) => handleOtpChange(i, e.target.value)}
            onKeyDown={(e) => handleOtpKeyDown(i, e)}
            id={`otp-input-${i}`}
          />
        ))}
      </div>

      <button
        className="btn btn--primary login__submit"
        onClick={handleVerify2FA}
        disabled={loading || otp.join('').length < 6}
        id="verify-2fa-submit"
      >
        {loading ? (
          <>
            <span className="spinner spinner--sm" /> Verifying…
          </>
        ) : (
          'Verify & Sign In'
        )}
      </button>

      <div className="login__2fa-resend">
        {resendMsg ? (
          <span style={{ fontSize: '0.85rem', color: resendMsg.includes('sent') ? 'var(--color-success)' : 'var(--color-error)' }}>
            {resendMsg}
          </span>
        ) : (
          <>Didn't receive the code?{' '}
            <button id="resend-otp" onClick={handleResend} disabled={resendLoading}>
              {resendLoading ? 'Sending…' : 'Resend'}
            </button>
          </>
        )}
      </div>

      <button
        className="login__2fa-back"
        onClick={() => { setStep('credentials'); setError(''); }}
        id="back-to-login"
      >
        <FaArrowLeft /> Back to login
      </button>
    </div>
  );

  return (
    <div className="login" id="login-page">
      {/* Left Hero */}
      <div className="login__hero">
        <div className="login__hero-content">
          <div className="login__hero-badge">🏛️ City of Mandaluyong</div>
          <h1 className="login__hero-title">
            OJT <span>Monitoring</span> System
          </h1>
          <p className="login__hero-text">
            Streamline your On-the-Job Training program with a comprehensive
            monitoring platform built for Local Government Units.
          </p>
          <p className="login__hero-footer">© 2026 City Government of Mandaluyong</p>
        </div>
      </div>

      {/* Right Form */}
      <div className="login__form-panel">
        <div className="login__form-wrapper">
          <div className="login__logo-row">
            <div className="login__logo-icon">LGU</div>
            <span className="login__logo-text">OJT Monitor</span>
          </div>

          {step === 'credentials' && (
            <>
              <h2 className="login__form-title">Welcome Back</h2>
              <p className="login__form-subtitle">Sign in to access your dashboard.</p>
              {forgotMsg && <div className="login__error" style={{ background: 'var(--color-success-container)', color: 'var(--color-success)', borderColor: 'var(--color-success)', marginBottom: 'var(--space-3)' }}>{forgotMsg}</div>}
              {renderCredentials()}
            </>
          )}
          {step === '2fa' && render2FA()}
          {step === 'forgot' && renderForgot()}
          {step === 'reset' && renderReset()}
        </div>
      </div>
    </div>
  );
}
