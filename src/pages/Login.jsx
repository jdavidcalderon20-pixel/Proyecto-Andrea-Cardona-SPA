import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../config/firebase';
import { Mail, Lock, AlertCircle, ArrowRight, Loader2, KeyRound, X, CheckCircle2 } from 'lucide-react';
import '../login.css';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Password Reset Modal State
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState('');

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/dashboard');
    } catch (err) {
      switch (err.code) {
        case 'auth/invalid-credential':
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          setError('Credenciales incorrectas. Verifica tu correo y contraseña.');
          break;
        case 'auth/invalid-email':
          setError('El formato del correo electrónico no es válido.');
          break;
        case 'auth/network-request-failed':
          setError('Error de conexión. Verifica tu internet e intenta nuevamente.');
          break;
        case 'auth/too-many-requests':
          setError('Demasiados intentos fallidos. Por seguridad, intenta más tarde.');
          break;
        default:
          setError('No se pudo iniciar sesión. Verifica tus credenciales.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setResetError('');
    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setResetSuccess(true);
    } catch (err) {
      switch (err.code) {
        case 'auth/user-not-found':
        case 'auth/invalid-email':
          setResetError('No encontramos una cuenta con ese correo electrónico.');
          break;
        default:
          setResetError('Error al enviar el correo. Intenta de nuevo más tarde.');
      }
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="modern-login-wrapper">
      {/* ─── Left Form Side ─── */}
      <div className="login-form-side">
        <div className="login-form-container">
          <div className="auth-header">
            <h4>Bienvenida</h4>
            <p>Ingresa a tu panel de control y gestiona tu SPA.</p>
          </div>

          {error && (
            <div className="modern-alert error">
              <AlertCircle size={20} style={{ minWidth: '20px' }} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="modern-input-group">
              <label htmlFor="email">Correo Electrónico</label>
              <div className="modern-input-wrapper">
                <Mail className="modern-icon" size={20} />
                <input
                  id="email"
                  type="email"
                  placeholder="ejemplo@correo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="modern-input-group">
              <label htmlFor="password">Contraseña</label>
              <div className="modern-input-wrapper">
                <Lock className="modern-icon" size={20} />
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength="6"
                />
              </div>
              <button
                type="button"
                onClick={() => { setShowResetModal(true); setResetEmail(email); setResetSuccess(false); setResetError(''); }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#5a7a3a', fontSize: '0.83rem', fontWeight: 600,
                  textAlign: 'right', width: '100%', marginTop: '6px',
                  padding: 0, textDecoration: 'underline', letterSpacing: '0.01em'
                }}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            <button
              className="modern-btn"
              type="submit"
              disabled={loading || !email || !password}
            >
              {loading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <>Entrar al Panel <ArrowRight size={18} /></>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* ─── Right Splash Side ─── */}
      <div className="login-splash">
        <div className="blob-1"></div>
        <div className="blob-2"></div>
        <div className="splash-content">
          <h2>Andrea Cardona <br />SPA</h2>
          <p>Exclusividad, tranquilidad y el mejor servicio de bienestar integral en la ciudad.</p>
        </div>
      </div>

      {/* ─── Password Reset Modal ─── */}
      {showResetModal && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)',
          zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px', backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: 'white', borderRadius: '20px', width: '100%', maxWidth: '420px',
            padding: '2rem', boxShadow: '0 25px 60px rgba(0,0,0,0.2)', position: 'relative'
          }}>
            <button
              onClick={() => setShowResetModal(false)}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
            >
              <X size={22} />
            </button>

            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'inline-flex', padding: '14px', backgroundColor: '#f0fdf4', borderRadius: '50%', marginBottom: '12px' }}>
                <KeyRound size={28} color="#5a7a3a" />
              </div>
              <h5 style={{ margin: 0, fontWeight: 800, color: '#0f172a', fontSize: '1.2rem' }}>Recuperar Contraseña</h5>
              <p style={{ margin: '6px 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>
                Te enviaremos un enlace de recuperación a tu correo.
              </p>
            </div>

            {resetSuccess ? (
              <div style={{ textAlign: 'center', padding: '1rem' }}>
                <div style={{ display: 'inline-flex', padding: '14px', backgroundColor: '#f0fdf4', borderRadius: '50%', marginBottom: '12px' }}>
                  <CheckCircle2 size={32} color="#059669" />
                </div>
                <h6 style={{ fontWeight: 700, color: '#059669', margin: '0 0 8px 0' }}>¡Correo Enviado!</h6>
                <p style={{ color: '#475569', fontSize: '0.9rem', margin: '0 0 1.5rem 0' }}>
                  Revisa tu bandeja de entrada en <strong>{resetEmail}</strong> y sigue las instrucciones.
                </p>
                <button
                  onClick={() => setShowResetModal(false)}
                  style={{ backgroundColor: '#5a7a3a', color: 'white', border: 'none', borderRadius: '10px', padding: '12px 30px', fontWeight: 600, cursor: 'pointer', width: '100%' }}
                >
                  Entendido
                </button>
              </div>
            ) : (
              <form onSubmit={handlePasswordReset}>
                {resetError && (
                  <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '10px', padding: '10px 14px', marginBottom: '1rem', display: 'flex', gap: '8px', alignItems: 'center', color: '#b91c1c', fontSize: '0.88rem' }}>
                    <AlertCircle size={16} />
                    {resetError}
                  </div>
                )}
                <div className="modern-input-group">
                  <label>Correo Electrónico</label>
                  <div className="modern-input-wrapper">
                    <Mail className="modern-icon" size={20} />
                    <input
                      type="email"
                      placeholder="tu@correo.com"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={resetLoading || !resetEmail}
                  style={{
                    width: '100%', backgroundColor: resetLoading ? '#94a3b8' :'#5a7a3a',
                    color: 'white', border: 'none', borderRadius: '10px',
                    padding: '14px', fontWeight: 700, cursor: resetLoading ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    fontSize: '0.95rem', marginTop: '0.5rem', transition: 'background 0.2s'
                  }}
                >
                  {resetLoading ? <><Loader2 size={18} className="animate-spin" /> Enviando...</> : 'Enviar Enlace de Recuperación'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Login;
