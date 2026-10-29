import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api';
import { destinoSeguro, esDestinoQR } from '../sesion';
import '../App.css';

function Login({ onLogin }) {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [recordar, setRecordar] = useState(false);
  const [mostrarRecuperar, setMostrarRecuperar] = useState(false);
  const [emailRecuperar, setEmailRecuperar] = useState('');
  const [mensajeRecuperar, setMensajeRecuperar] = useState('');

  const [params] = useSearchParams();
  const vieneDeQR = esDestinoQR(destinoSeguro(params.get('redirect')));

  useEffect(() => {
    const saved = localStorage.getItem('nodus_usuario');
    if (saved) {
      setUsuario(saved);
      setRecordar(true);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    if (!usuario || !password) {
      setError('Usuario y contraseña son obligatorios.');
      return;
    }
    setCargando(true);
    try {
      const res = await api.post('/auth/login', { usuario, password });
      if (recordar) {
        localStorage.setItem('nodus_usuario', usuario);
      } else {
        localStorage.removeItem('nodus_usuario');
      }
      onLogin(res.data);
    } catch (err) {
      setError(err.response?.data || 'Error de conexión con el servidor.');
    }
    setCargando(false);
  };

  const handleRecuperar = (e) => {
    e.preventDefault();
    if (!emailRecuperar.trim()) {
      setMensajeRecuperar('Ingresá tu email para recuperar la contraseña.');
      return;
    }
    setMensajeRecuperar('Se enviaron las instrucciones de recuperación a ' + emailRecuperar + '. Revisá tu bandeja de entrada.');
    setTimeout(() => {
      setMostrarRecuperar(false);
      setMensajeRecuperar('');
      setEmailRecuperar('');
    }, 4000);
  };

  if (mostrarRecuperar) {
    return (
      <div className="login-page">
        <div className="login-card">
          <img src="/logo.png" alt="NODUS" className="login-logo" />
          <h1 className="login-title">NODUS</h1>
          <p className="login-subtitle">Recuperar contraseña</p>
          <form onSubmit={handleRecuperar}>
            <div className="form-group">
              <label>Email de tu cuenta</label>
              <input type="email" value={emailRecuperar} onChange={e => setEmailRecuperar(e.target.value)}
                placeholder="usuario@hospital.gob.ar" />
            </div>
            {mensajeRecuperar && (
              <div className="login-success">{mensajeRecuperar}</div>
            )}
            <button type="submit" className="btn-primary login-btn">Enviar instrucciones</button>
          </form>
          <button className="btn-link" onClick={() => { setMostrarRecuperar(false); setMensajeRecuperar(''); }}>
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
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Usuario</label>
            <input type="text" value={usuario} onChange={e => setUsuario(e.target.value)}
              placeholder="Nombre o email" />
          </div>
          <div className="form-group">
            <label>Contraseña</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Ingresá tu contraseña" />
          </div>
          <div className="login-options">
            <label className="checkbox-label">
              <input type="checkbox" checked={recordar} onChange={e => setRecordar(e.target.checked)} />
              <span>Recordar mi usuario</span>
            </label>

          </div>
          {error && <div className="login-error">{error}</div>}
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