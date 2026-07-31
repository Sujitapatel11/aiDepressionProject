import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getApiUrl } from '../services/api';
import '../styles/auth.css';

// ─── Constants ────────────────────────────────────────────────────────────────
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

// ─── localStorage helpers (sc_* keys only, soulcare_* duplicated per original) ─
function setAuthData(data) {
  localStorage.setItem('sc_token',    data.token);
  localStorage.setItem('sc_refresh',  data.refresh || '');
  localStorage.setItem('sc_uid',      String(data.user_id));
  localStorage.setItem('sc_username', data.username);
  // original backend also writes soulcare_* duplicates
  localStorage.setItem('soulcare_token',    data.token);
  localStorage.setItem('soulcare_refresh',  data.refresh || '');
  localStorage.setItem('soulcare_user_id',  String(data.user_id));
  localStorage.setItem('soulcare_username', data.username);
}

// ─── Password strength (mirrors checkPasswordStrength in login.html) ───────────
function getStrengthClass(val) {
  if (!val) return '';
  if (val.length < 6) return 'weak';
  if (val.length < 10 || !/\d/.test(val)) return 'medium';
  return 'strong';
}

// ─── Hero Illustration SVG (copied verbatim from login.html) ──────────────────
function HeroIllustration() {
  return (
    <svg className="auth-hero-illustration-svg" viewBox="0 0 400 220" fill="none">
      <defs>
        <linearGradient id="auth-skyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#DDD6FE" />
          <stop offset="50%"  stopColor="#F3E8FF" />
          <stop offset="100%" stopColor="#FED7AA" />
        </linearGradient>
        <linearGradient id="auth-sunGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#FEF08A" />
          <stop offset="100%" stopColor="#FDBA74" />
        </linearGradient>
        <linearGradient id="auth-hillGrad1" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor="#A78BFA" />
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>
        <linearGradient id="auth-hillGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor="#C4B5FD" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
        <filter id="auth-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      <rect width="400" height="220" rx="32" fill="url(#auth-skyGrad)" />
      <circle cx="270" cy="90" r="45" fill="url(#auth-sunGrad)" opacity="0.85" filter="url(#auth-glow)" />
      <path d="M0 160 Q100 110 230 150 T400 140 V220 H0 Z" fill="url(#auth-hillGrad2)" opacity="0.5" />
      <path d="M0 180 Q140 140 280 175 T400 165 V220 H0 Z" fill="url(#auth-hillGrad1)" opacity="0.85" />
      <g transform="translate(210, 85)">
        <circle cx="42" cy="30" r="13" fill="#374151" />
        <circle cx="45" cy="24" r="8"  fill="#374151" />
        <circle cx="46" cy="32" r="5"  fill="#FDBA74" />
        <path d="M28 42 C28 36 34 35 42 35 C50 35 56 36 56 42 L52 65 C45 66 35 66 28 65 Z" fill="#C4B5FD" />
        <rect x="22" y="48" width="16" height="14" rx="2" fill="#FFFFFF" transform="rotate(-15 22 48)" />
      </g>
      <g transform="translate(285, 125)" filter="url(#auth-glow)">
        <rect x="0" y="10" width="28" height="26" rx="13" fill="#FEF08A" />
        <path d="M14 10 C14 2 8 0 8 0 C8 0 12 6 14 10 Z" fill="#34D399" />
        <circle cx="9"  cy="20" r="1.8" fill="#4B5563" />
        <circle cx="19" cy="20" r="1.8" fill="#4B5563" />
      </g>
    </svg>
  );
}

// ─── Floating Decorative SVGs (copied verbatim from login.html) ───────────────
function FloatingDecor() {
  return (
    <>
      <svg className="auth-floating-decor auth-decor-leaf-1" viewBox="0 0 50 50" fill="none">
        <path d="M25 5C15 15 5 35 25 45C45 35 35 15 25 5Z" fill="#C4B5FD" fillOpacity="0.5" />
        <path d="M25 5V45" stroke="#A78BFA" strokeWidth="2" />
      </svg>
      <svg className="auth-floating-decor auth-decor-leaf-2" viewBox="0 0 50 50" fill="none">
        <path d="M25 5C15 15 5 35 25 45C45 35 35 15 25 5Z" fill="#A7F3D0" fillOpacity="0.6" />
      </svg>
      <svg className="auth-floating-decor auth-decor-star-1" viewBox="0 0 24 24" fill="none">
        <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" fill="#FDE047" fillOpacity="0.8" />
      </svg>
    </>
  );
}

// ─── Alert Icon SVG ────────────────────────────────────────────────────────────
function AlertIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

// ─── Google SVG Logo ───────────────────────────────────────────────────────────
function GoogleLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
    </svg>
  );
}

// ─── Eye Icons for password toggle (copied verbatim from login.html) ──────────
const EYE_OPEN_PATH  = '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle>';
const EYE_CLOSE_PATH = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>';

function EyeIcon({ visible }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2"
      dangerouslySetInnerHTML={{ __html: visible ? EYE_OPEN_PATH : EYE_CLOSE_PATH }}
    />
  );
}

// ─── ForgotPasswordModal ───────────────────────────────────────────────────────
// Mirrors #forgotPasswordModal in login.html exactly.
// Step 1: email → POST /api/auth/password/reset/
// Step 2: uid + token + new_password → POST /api/auth/password/reset/confirm/
function ForgotPasswordModal({ isOpen, onClose, onResetSuccess }) {
  const [step, setStep]               = useState(1); // 1 = email form, 2 = confirm form
  const [modalAlert, setModalAlert]   = useState({ msg: '', type: '' }); // type: 'error'|'success'|''
  const [loading, setLoading]         = useState(false);

  // Step 1 fields
  const [forgotEmail, setForgotEmail] = useState('');

  // Step 2 fields
  const [resetUid,      setResetUid]      = useState('');
  const [resetToken,    setResetToken]    = useState('');
  const [newPassword,   setNewPassword]   = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Reset internal state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setModalAlert({ msg: '', type: '' });
      setForgotEmail('');
      setResetUid('');
      setResetToken('');
      setNewPassword('');
      setConfirmPassword('');
      setLoading(false);
    }
  }, [isOpen]);

  function showModalAlert(msg, isSuccess = false) {
    setModalAlert({ msg, type: isSuccess ? 'success' : 'error' });
  }

  function hideModalAlert() {
    setModalAlert({ msg: '', type: '' });
  }

  async function handleForgotPasswordSubmit(e) {
    e.preventDefault();
    hideModalAlert();

    if (!forgotEmail.trim()) {
      showModalAlert('Please enter your email address.');
      return;
    }

    setLoading(true);
    try {
      const res  = await fetch(getApiUrl('/auth/password/reset/'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });
      const data = await res.json();
      showModalAlert(
        data.detail || 'If an account exists for that email, a reset token has been sent.',
        true
      );
      // After 1500ms → switch to step 2 (mirrors original setTimeout)
      setTimeout(() => {
        setStep(2);
        hideModalAlert();
      }, 1500);
    } catch {
      showModalAlert('Could not send reset request. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResetConfirmSubmit(e) {
    e.preventDefault();
    hideModalAlert();

    if (!resetUid.trim() || !resetToken.trim() || !newPassword || !confirmPassword) {
      showModalAlert('Please complete all reset fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      showModalAlert('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res  = await fetch(getApiUrl('/auth/password/reset/confirm/'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid:              resetUid.trim(),
          token:            resetToken.trim(),
          new_password:     newPassword,
          confirm_password: confirmPassword,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showModalAlert(data.detail || 'Password updated successfully!', true);
        // After 1200ms → close modal, notify parent (mirrors original)
        setTimeout(() => {
          onClose();
          onResetSuccess(data.detail || 'Password reset successful. Please sign in with your new password.');
        }, 1200);
      } else {
        showModalAlert(data.detail || 'Invalid or expired token. Reset failed.');
      }
    } catch {
      showModalAlert('Error confirming password reset.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className={`auth-modal-overlay${isOpen ? ' active' : ''}`}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="auth-modal-card">
        <button className="auth-modal-close" onClick={onClose} aria-label="Close">×</button>

        <h3 className="auth-modal-title">Reset Password</h3>
        <p className="auth-modal-subtitle">
          Enter your registered email to receive a password reset link.
        </p>

        {/* Modal Alert Banner */}
        {modalAlert.msg && (
          <div className={`auth-modal-alert ${modalAlert.type}`}>
            {modalAlert.msg}
          </div>
        )}

        {/* ── Step 1: Email form ── */}
        {step === 1 && (
          <form onSubmit={handleForgotPasswordSubmit} noValidate>
            <div className="auth-modal-form-group">
              <label className="auth-field-label" htmlFor="modal-forgot-email">
                Registered Email
              </label>
              <div className="auth-input-wrapper">
                <div className="auth-input-icon" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="4" width="20" height="16" rx="4" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                </div>
                <input
                  id="modal-forgot-email"
                  type="email"
                  className="auth-form-input"
                  placeholder="name@example.com"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              className={`auth-btn-submit${loading ? ' loading' : ''}`}
              disabled={loading}
            >
              <span className="auth-btn-text">Send Reset Link</span>
              <div className="auth-spinner" />
            </button>
          </form>
        )}

        {/* ── Step 2: Confirm form ── */}
        {step === 2 && (
          <form onSubmit={handleResetConfirmSubmit} noValidate>
            <div className="auth-modal-form-group">
              <label className="auth-field-label" htmlFor="modal-reset-uid">
                User ID (b64)
              </label>
              <input
                id="modal-reset-uid"
                type="text"
                className="auth-modal-plain-input"
                placeholder="Paste UID from reset link"
                required
                value={resetUid}
                onChange={(e) => setResetUid(e.target.value)}
              />
            </div>

            <div className="auth-modal-form-group">
              <label className="auth-field-label" htmlFor="modal-reset-token">
                Reset Token
              </label>
              <input
                id="modal-reset-token"
                type="text"
                className="auth-modal-plain-input"
                placeholder="Paste Token from reset link"
                required
                value={resetToken}
                onChange={(e) => setResetToken(e.target.value)}
              />
            </div>

            <div className="auth-modal-form-group">
              <label className="auth-field-label" htmlFor="modal-reset-new-pw">
                New Password
              </label>
              <input
                id="modal-reset-new-pw"
                type="password"
                className="auth-modal-plain-input"
                placeholder="Enter new password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            <div className="auth-modal-form-group">
              <label className="auth-field-label" htmlFor="modal-reset-confirm-pw">
                Confirm New Password
              </label>
              <input
                id="modal-reset-confirm-pw"
                type="password"
                className="auth-modal-plain-input"
                placeholder="Confirm new password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className={`auth-btn-submit${loading ? ' loading' : ''}`}
              disabled={loading}
            >
              <span className="auth-btn-text">Update Password</span>
              <div className="auth-spinner" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── LoginForm ─────────────────────────────────────────────────────────────────
// Mirrors id="loginForm" in login.html exactly.
function LoginForm({ onForgotPassword, onSuccessAlert }) {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [username, setUsername]           = useState('');
  const [password, setPassword]           = useState('');
  const [showPassword, setShowPassword]   = useState(false);
  const [loading, setLoading]             = useState(false);
  const [alert, setAlert]                 = useState({ msg: '', type: '' });

  function showAlert(msg, isSuccess = false) {
    setAlert({ msg, type: isSuccess ? 'success' : 'error' });
  }

  function hideAlert() {
    setAlert({ msg: '', type: '' });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    hideAlert();

    const usernameInput = username.trim();
    const passwordInput = password;

    if (!usernameInput || !passwordInput) {
      showAlert('Please enter both email/username and password.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(getApiUrl('/auth/login/'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameInput, password: passwordInput }),
      });
      const data = await response.json();

      if (response.ok) {
        login(data);
        navigate('/');
      } else {
        showAlert(
          data.detail ||
          (data.username ? data.username[0] : null) ||
          'Invalid credentials. Please try again.'
        );
      }
    } catch {
      showAlert('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {alert.msg && (
        <div className={`auth-alert-banner ${alert.type}`} role="alert">
          <AlertIcon />
          <span>{alert.msg}</span>
        </div>
      )}

      <form className="auth-login-form" onSubmit={handleSubmit} noValidate>
        {/* Email / Username */}
        <div className="auth-form-group">
          <label htmlFor="login-email" className="auth-field-label">
            Email or Username
          </label>
          <div className="auth-input-wrapper">
            <div className="auth-input-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2">
                <rect x="2" y="4" width="20" height="16" rx="4" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
            </div>
            <input
              id="login-email"
              type="text"
              name="username"
              className="auth-form-input"
              placeholder="Enter your email or username"
              required
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
        </div>

        {/* Password */}
        <div className="auth-form-group">
          <label htmlFor="login-password" className="auth-field-label">
            Password
          </label>
          <div className="auth-input-wrapper">
            <div className="auth-input-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="3" ry="3" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              name="password"
              className="auth-form-input"
              placeholder="Enter your password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="auth-toggle-password"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              <EyeIcon visible={showPassword} />
            </button>
          </div>
        </div>

        {/* Forgot Password link */}
        <div className="auth-forgot-link-wrapper">
          <button
            type="button"
            className="auth-forgot-link"
            onClick={onForgotPassword}
          >
            Forgot Password?
          </button>
        </div>

        {/* Submit */}
        <button
          type="submit"
          className={`auth-btn-submit${loading ? ' loading' : ''}`}
          disabled={loading}
        >
          <span className="auth-btn-text">Sign In</span>
          <svg className="auth-btn-arrow" width="18" height="18" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
          <div className="auth-spinner" />
        </button>
      </form>
    </>
  );
}

// ─── SignupForm ────────────────────────────────────────────────────────────────
// Mirrors id="signupForm" in login.html exactly.
function SignupForm() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [signupUsername,    setSignupUsername]    = useState('');
  const [signupEmail,       setSignupEmail]       = useState('');
  const [signupPassword,    setSignupPassword]    = useState('');
  const [signupConfirm,     setSignupConfirm]     = useState('');
  const [terms,             setTerms]             = useState(false);
  const [loading,           setLoading]           = useState(false);
  const [alert,             setAlert]             = useState({ msg: '', type: '' });

  const strengthClass = getStrengthClass(signupPassword);

  function showAlert(msg, isSuccess = false) {
    setAlert({ msg, type: isSuccess ? 'success' : 'error' });
  }

  function hideAlert() {
    setAlert({ msg: '', type: '' });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    hideAlert();

    const uname = signupUsername.trim();
    const email = signupEmail.trim();
    const pw    = signupPassword;
    const pw2   = signupConfirm;

    if (!uname || !email || !pw || !pw2) {
      showAlert('Please fill in all registration fields.');
      return;
    }
    if (pw !== pw2) {
      showAlert('Passwords do not match.');
      return;
    }
    if (pw.length < 6) {
      showAlert('Password must be at least 6 characters.');
      return;
    }
    if (!terms) {
      showAlert('Please accept the Terms of Service & Privacy Policy to continue.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(getApiUrl('/auth/signup/'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username:         uname,
          email:            email,
          password:         pw,
          password_confirm: pw2,
        }),
      });
      const data = await response.json();

      if (response.status === 201) {
        login(data);
        showAlert('Account created successfully! Welcome to SoulCare.', true);
        // 800ms delay before redirect (mirrors original setTimeout)
        setTimeout(() => navigate('/'), 800);
      } else {
        const errMsg =
          (data.username     ? data.username[0]     : null) ||
          (data.email        ? data.email[0]        : null) ||
          (data.password     ? data.password[0]     : null) ||
          (data.detail       ? data.detail          : null) ||
          'Registration failed. Please check your details.';
        showAlert(errMsg);
      }
    } catch {
      showAlert('Network error. Could not connect to registration service.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {alert.msg && (
        <div className={`auth-alert-banner ${alert.type}`} role="alert">
          <AlertIcon />
          <span>{alert.msg}</span>
        </div>
      )}

      <form className="auth-signup-form" onSubmit={handleSubmit} noValidate>
        {/* Username */}
        <div className="auth-form-group">
          <label htmlFor="signup-username" className="auth-field-label">Username</label>
          <div className="auth-input-wrapper">
            <div className="auth-input-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <input
              id="signup-username"
              type="text"
              name="signup_username"
              className="auth-form-input"
              placeholder="Choose a username"
              required
              value={signupUsername}
              onChange={(e) => setSignupUsername(e.target.value)}
            />
          </div>
        </div>

        {/* Email */}
        <div className="auth-form-group">
          <label htmlFor="signup-email" className="auth-field-label">Email Address</label>
          <div className="auth-input-wrapper">
            <div className="auth-input-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2">
                <rect x="2" y="4" width="20" height="16" rx="4" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
            </div>
            <input
              id="signup-email"
              type="email"
              name="signup_email"
              className="auth-form-input"
              placeholder="name@example.com"
              required
              value={signupEmail}
              onChange={(e) => setSignupEmail(e.target.value)}
            />
          </div>
        </div>

        {/* Password + strength meter */}
        <div className="auth-form-group">
          <label htmlFor="signup-password" className="auth-field-label">Password</label>
          <div className="auth-input-wrapper">
            <div className="auth-input-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="3" ry="3" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <input
              id="signup-password"
              type="password"
              name="signup_password"
              className="auth-form-input"
              placeholder="Create password (min 6 chars)"
              required
              value={signupPassword}
              onChange={(e) => setSignupPassword(e.target.value)}
            />
          </div>
          <div className="auth-strength-meter">
            <div className={`auth-strength-bar${strengthClass ? ' ' + strengthClass : ''}`} />
          </div>
        </div>

        {/* Confirm Password */}
        <div className="auth-form-group">
          <label htmlFor="signup-password-confirm" className="auth-field-label">
            Confirm Password
          </label>
          <div className="auth-input-wrapper">
            <div className="auth-input-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="3" ry="3" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <input
              id="signup-password-confirm"
              type="password"
              name="signup_password_confirm"
              className="auth-form-input"
              placeholder="Confirm your password"
              required
              value={signupConfirm}
              onChange={(e) => setSignupConfirm(e.target.value)}
            />
          </div>
        </div>

        {/* Terms checkbox */}
        <div className="auth-terms-row">
          <input
            id="signup-terms"
            type="checkbox"
            className="auth-terms-checkbox"
            required
            checked={terms}
            onChange={(e) => setTerms(e.target.checked)}
          />
          <label htmlFor="signup-terms" className="auth-terms-label">
            I accept the Terms of Service &amp; Privacy Policy
          </label>
        </div>

        {/* Submit */}
        <button
          type="submit"
          className={`auth-btn-submit${loading ? ' loading' : ''}`}
          disabled={loading}
        >
          <span className="auth-btn-text">Create Account</span>
          <svg className="auth-btn-arrow" width="18" height="18" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
          <div className="auth-spinner" />
        </button>
      </form>
    </>
  );
}

function GoogleButton({ onAlert }) {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const googleBtnRef = useRef(null);

  // Dynamically load Google GIS script if not present
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    if (!document.getElementById('google-gsi-script')) {
      const script = document.createElement('script');
      script.id = 'google-gsi-script';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  }, []);

  // Initialize GIS and render standard Google button
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    function initGIS() {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleCredentialResponse,
          auto_select: false,
        });

        if (googleBtnRef.current) {
          googleBtnRef.current.innerHTML = '';
          try {
            window.google.accounts.id.renderButton(googleBtnRef.current, {
              theme: 'outline',
              size: 'large',
              width: '100%',
              type: 'standard',
              shape: 'rectangular',
              logo_alignment: 'left',
            });
          } catch (e) {
            console.warn('GIS renderButton error:', e);
          }
        }
      }
    }

    if (window.google?.accounts?.id) {
      initGIS();
    } else {
      const interval = setInterval(() => {
        if (window.google?.accounts?.id) {
          initGIS();
          clearInterval(interval);
        }
      }, 200);
      return () => clearInterval(interval);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleGoogleCredentialResponse(response) {
    const idToken = response?.credential;
    if (!idToken) {
      setLoading(false);
      onAlert('Google Sign-In was cancelled or failed to return credentials.');
      return;
    }

    setLoading(true);
    onAlert('Verifying Google account with backend...', true);

    try {
      const res = await fetch(getApiUrl('/auth/google/'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: idToken }),
      });
      const data = await res.json();

      if (res.ok) {
        login(data);
        onAlert('Google Sign-In successful! Welcome to SoulCare.', true);
        setTimeout(() => navigate('/'), 600);
      } else {
        setLoading(false);
        const errMsg = data.detail || (data.non_field_errors ? data.non_field_errors[0] : null) || 'Google authentication failed.';
        console.error('Google Auth Backend Error:', res.status, data);
        onAlert(errMsg);
      }
    } catch (err) {
      setLoading(false);
      console.error('Google Auth Network Exception:', err);
      onAlert('Network error while verifying Google sign-in: ' + err.message);
    }
  }

  function handleClick() {
    onAlert('');
    if (!GOOGLE_CLIENT_ID) {
      onAlert('Google Sign-In is not configured. Please set GOOGLE_CLIENT_ID in environment.');
      return;
    }

    // Try to trigger GIS prompt / iframe click if GIS is initialized
    if (window.google?.accounts?.id) {
      const iframeBtn = googleBtnRef.current?.querySelector('div[role="button"], iframe');
      if (iframeBtn) {
        iframeBtn.click();
      } else {
        setLoading(true);
        window.google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment() || notification.isDismissedMoment()) {
            setLoading(false);
          }
        });
      }
    } else {
      onAlert('Google Sign-In SDK is loading. Please try again in a moment.');
    }
  }

  return (
    <div style={{ width: '100%' }}>
      {/* Official GIS Button Container */}
      <div ref={googleBtnRef} style={{ display: 'block', width: '100%', minHeight: '40px' }} />

      {/* Fallback Custom Button (hidden when official button is mounted) */}
      {(!googleBtnRef.current || googleBtnRef.current.children.length === 0) && (
        <button
          type="button"
          className="auth-btn-google"
          onClick={handleClick}
          disabled={loading}
          style={{ marginTop: '8px' }}
        >
          {loading ? (
            <div
              className="auth-spinner"
              style={{ display: 'block', borderTopColor: '#7C3AED' }}
            />
          ) : (
            <>
              <GoogleLogo />
              <span>Continue with Google</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}

// ─── AuthPage (main export) ────────────────────────────────────────────────────
// Single page mirroring login.html:
//   - Hero banner with illustration + brand title + tagline
//   - Floating decorative SVGs
//   - Floating white card (slideUpCard animation)
//   - Tab switcher: Sign In / Create Account
//   - LoginForm or SignupForm depending on active tab
//   - Divider + Google button (shared, shown for both tabs)
//   - Footer text that changes based on active tab
//   - ForgotPasswordModal (portal-like, position:fixed)
export default function AuthPage() {
  // 'login' | 'signup' — mirrors switchAuthTab in login.html
  const [activeTab, setActiveTab] = useState('login');

  // Shared alert state used by Google button (sits outside the tab forms)
  const [sharedAlert, setSharedAlert] = useState({ msg: '', type: '' });

  // Forgot password modal state
  const [modalOpen, setModalOpen] = useState(false);

  // Message to show in login form after successful password reset
  const [postResetMsg, setPostResetMsg] = useState('');

  function switchTab(tab) {
    setActiveTab(tab);
    setSharedAlert({ msg: '', type: '' });
    setPostResetMsg('');
  }

  // Called by GoogleButton to set a banner above the Google button
  function handleGoogleAlert(msg, isSuccess = false) {
    if (!msg) { setSharedAlert({ msg: '', type: '' }); return; }
    setSharedAlert({ msg, type: isSuccess ? 'success' : 'error' });
  }

  // Called when password reset completes successfully
  // Mirrors: closeForgotPasswordModal() + switchAuthTab('login') + showAlert(msg, true)
  function handleResetSuccess(msg) {
    setModalOpen(false);
    setActiveTab('login');
    setPostResetMsg(msg);
  }

  return (
    <>
      {/* ── Load Google Identity Services script ── */}
      {GOOGLE_CLIENT_ID && (
        <script src="https://accounts.google.com/gsi/client" async defer />
      )}

      <div className="auth-root">
        <FloatingDecor />

        <div className="auth-viewport">

          {/* ── Hero Banner ── */}
          <header className="auth-hero-banner">
            <div className="auth-hero-illustration-wrapper">
              <HeroIllustration />
            </div>
            <h1 className="auth-brand-title">
              Welcome to <span className="auth-highlight">SoulCare</span> 👋
            </h1>
            <p className="auth-brand-tagline">
              Your safe sanctuary for emotional well-being.
            </p>
          </header>

          {/* ── Floating Card ── */}
          <main className="auth-login-card" role="main">
            <div className="auth-card-handle-bar" />

            {/* Tab Switcher */}
            <div className="auth-tab-bar">
              <button
                id="tab-login-btn"
                className={`auth-tab-btn${activeTab === 'login' ? ' active' : ''}`}
                onClick={() => switchTab('login')}
              >
                Sign In
              </button>
              <button
                id="tab-signup-btn"
                className={`auth-tab-btn${activeTab === 'signup' ? ' active' : ''}`}
                onClick={() => switchTab('signup')}
              >
                Create Account
              </button>
            </div>

            {/* Post-reset success banner (shown only after modal closes) */}
            {postResetMsg && (
              <div className="auth-alert-banner success" role="alert">
                <AlertIcon />
                <span>{postResetMsg}</span>
              </div>
            )}

            {/* Login Form */}
            {activeTab === 'login' && (
              <LoginForm
                onForgotPassword={() => {
                  setPostResetMsg('');
                  setModalOpen(true);
                }}
              />
            )}

            {/* Signup Form */}
            {activeTab === 'signup' && <SignupForm />}

            {/* Shared Google alert (lives between forms and Google button) */}
            {sharedAlert.msg && (
              <div
                className={`auth-alert-banner ${sharedAlert.type}`}
                style={{ marginTop: '16px' }}
                role="alert"
              >
                <AlertIcon />
                <span>{sharedAlert.msg}</span>
              </div>
            )}

            {/* Divider */}
            <div className="auth-divider-container" aria-hidden="true">
              <div className="auth-divider-line" />
              <span className="auth-divider-text">OR</span>
              <div className="auth-divider-line" />
            </div>

            {/* Google Button */}
            <GoogleButton onAlert={handleGoogleAlert} />

            {/* Footer — text mirrors login.html exactly */}
            <footer className="auth-footer-section">
              {activeTab === 'login' ? (
                <>
                  New to SoulCare?{' '}
                  <button className="auth-switch-link" onClick={() => switchTab('signup')}>
                    Create your account →
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button className="auth-switch-link" onClick={() => switchTab('login')}>
                    Sign in →
                  </button>
                </>
              )}
            </footer>
          </main>
        </div>

        {/* ── Forgot Password Modal ── */}
        <ForgotPasswordModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onResetSuccess={handleResetSuccess}
        />
      </div>
    </>
  );
}
