import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api';
import { destinoSeguro, esDestinoQR } from '../sesion';
import '../App.css';

// Convierte la respuesta de error en un texto seguro para mostrar (nunca un objeto).
function mensajeLogin(err) {
  if (!err.response) return 'No se pudo conectar con el servidor. Revisá tu conexión e intentá de nuevo.';
  const data = err.response.data;
  if (typeof data === 'string' && data.trim()) return data;
  if (data && typeof data === 'object') {
    if (typeof data.message === 'string' && data.message) return data.message;
    if (typeof data.title === 'string' && data.title) return data.title;
  }
  if (err.response.status === 429) return 'Demasiados intentos. Esperá un momento antes de volver a intentar.';
  if (err.response.status === 401) return 'Usuario o contraseña incorrectos.';
  return 'No se pudo iniciar sesión. Intentá de nuevo.';
}

function Login({ onLogin }) {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [recordar, setRecordar] = useState(false);
  const [mostrarRecuperar, setMostrarRecuperar] = useState(false);

  const [params] = useSearchParams();
  const vieneDeQR = esDestinoQR(destinoSeguro(params.get('redirect')));

  useEffect(() => {
    try {
      const saved = localStorage.getItem('nodus_usuario');
      if (saved) {
        setUsuario(saved);
        setRecordar(true);
      }
    } catch { /* sin acceso a localStorage: se ignora */ }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (cargando) return;
    setError('');
    const usuarioLimpio = usuario.trim();
    if (!usuarioLimpio || !password) {
      setError('Usuario y contraseña son obligatorios.');
      return;
    }
    setCargando(true);
    try {
      const res = await api.post('/auth/login', { usuario: usuarioLimpio, password });
      try {
        if (recordar) localStorage.setItem('nodus_usuario', usuarioLimpio);
        else localStorage.removeItem('nodus_usuario');
      } catch { /* sin acceso a localStorage: se ignora */ }
      onLogin(res.data);
    } catch (err) {
      setError(mensajeLogin(err));
    } finally {
      setCargando(false);
    }
  };

  if (mostrarRecuperar) {
    return (
      <div className="login-page">
        <div className="login-card">
          <img src="/logonodus.jpg" alt="NODUS" className="login-logo" />
          <p className="login-subtitle">Recuperar contraseña</p>
          <div role="status" style={{
            background: '#E6F1FB', color: '#0C447C', border: '1px solid #C7DDF2', borderRadius: 10,
            padding: '12px 14px', fontSize: 14, lineHeight: 1.5, marginBottom: 16
          }}>
            El sistema todavía no envía correos de recuperación. Para restablecer tu contraseña,
            pedíselo al administrador del sistema (Bioingeniería), que puede asignarte una nueva.
          </div>
          <button type="button" className="btn-link" onClick={() => setMostrarRecuperar(false)}>
            ← Volver al inicio de sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <img src="/logonodus.jpg" alt="NODUS" className="login-logo" />
        <p className="login-subtitle">Sistema de Control Patrimonial Hospitalario</p>
        {vieneDeQR && (
          <div role="status" style={{
            background: '#E6F1FB', color: '#0C447C', border: '1px solid #C7DDF2', borderRadius: 10,
            padding: '10px 12px', fontSize: 13.5, fontWeight: 600, lineHeight: 1.4, textAlign: 'center', marginBottom: 16
          }}>
            Iniciá sesión para ver la información del equipo
          </div>
        )}
        <form onSubmit={handleLogin} noValidate>
          <div className="form-group">
            <label htmlFor="login-usuario">Usuario</label>
            <input id="login-usuario" type="text" value={usuario} onChange={e => setUsuario(e.target.value)}
              placeholder="Nombre o email" autoComplete="username" aria-invalid={!!error} />
          </div>
          <div className="form-group">
            <label htmlFor="login-password">Contraseña</label>
            <input id="login-password" type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Ingresá tu contraseña" autoComplete="current-password" aria-invalid={!!error} />
          </div>
          <div className="login-options">
            <label className="checkbox-label">
              <input type="checkbox" checked={recordar} onChange={e => setRecordar(e.target.checked)} />
              <span>Recordar mi usuario</span>
            </label>
          </div>
          {error && <div className="login-error" role="alert">{error}</div>}
          <button type="submit" className="btn-primary login-btn" disabled={cargando}>
            {cargando ? 'Ingresando...' : 'Ingresar'}
          </button>
          <button type="button" className="btn-link" onClick={() => setMostrarRecuperar(true)}>
            ¿Olvidaste tu contraseña?
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;