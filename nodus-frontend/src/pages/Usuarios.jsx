import { useState, useEffect, useMemo } from 'react';
import api from '../api';
import { useToast, mensajeDeError } from '../components/Toast';

const ROLES = ['Técnico biomédico', 'Jefe patrimonio', 'Jefe servicio', 'Auditor ANMAT', 'Administrador', 'Médico', 'Residente', 'Enfermero', 'Personal asistencial'];

function Usuarios() {
  const toast = useToast();
  const [usuarios, setUsuarios] = useState([]);

  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [rol, setRol] = useState('');
  const [password, setPassword] = useState('');
  const [editando, setEditando] = useState(null);
  const [errores, setErrores] = useState({});
  const [mostrarPassword, setMostrarPassword] = useState(false);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [busquedaAbierta, setBusquedaAbierta] = useState(false);

  useEffect(() => { cargarUsuarios(); }, []);

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape' && modalAbierto) cerrarModal(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [modalAbierto]);

  const cargarUsuarios = async () => {
    const res = await api.get('/usuarios');
    setUsuarios(res.data);
  };

  const validar = () => {
    const errs = {};
    if (!nombre || !nombre.trim()) errs.nombre = 'Falta ingresar el nombre completo';
    if (!email || !email.trim()) errs.email = 'Falta ingresar el email';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errs.email = 'El email no tiene un formato válido';
    if (!rol) errs.rol = 'Falta seleccionar el rol';
    if (!editando) {
      if (!password || !password.trim()) errs.password = 'La contraseña es obligatoria para usuarios nuevos';
      else if (password.trim().length < 6) errs.password = 'La contraseña debe tener al menos 6 caracteres';
    } else if (password && password.trim().length > 0 && password.trim().length < 6) {
      errs.password = 'La contraseña debe tener al menos 6 caracteres';
    }
    return errs;
  };

  const abrirModalNuevo = () => { limpiar(); setModalAbierto(true); };
  const abrirModalEditar = (u) => {
    setNombre(u.nombre);
    setEmail(u.email);
    setRol(u.rol);
    setPassword('');
    setEditando(u.idUsuario);
    setErrores({});
    setModalAbierto(true);
  };
  const cerrarModal = () => { setModalAbierto(false); limpiar(); };

  const guardar = async () => {
    const errs = validar();
    setErrores(errs);
    if (Object.keys(errs).length > 0) return;

    try {
      if (editando) {
        const data = { nombre: nombre.trim(), email: email.trim(), rol };
        if (password.trim()) data.password = password.trim();
        await api.put(`/usuarios/${editando}`, data);
      } else {
        await api.post('/usuarios', { nombre: nombre.trim(), email: email.trim(), rol, password: password.trim() });
      }
      cerrarModal();
      cargarUsuarios();
    } catch (err) {
      const mensaje = typeof err.response?.data === 'string'
        ? err.response.data
        : 'No se pudo guardar el usuario. Revisá los datos e intentá de nuevo.';
      setErrores({ __general: mensaje });
    }
  };

  const eliminar = async (u) => {
    if (!window.confirm(`¿Eliminar al usuario "${u.nombre}"?`)) return;
    try {
      await api.delete(`/usuarios/${u.idUsuario}`);
      cargarUsuarios();
    } catch (err) {
      toast.error('No se pudo eliminar', mensajeDeError(err, 'Puede tener registros asociados.'));
    }
  };

  const limpiar = () => {
    setNombre(''); setEmail(''); setRol(''); setPassword('');
    setEditando(null); setErrores({}); setMostrarPassword(false);
  };

  const cambiarCampo = (campo, valor, setter) => {
    setter(valor);
    if (errores[campo]) {
      setErrores(prev => { const n = { ...prev }; delete n[campo]; return n; });
    }
  };

  const chipRol = (r) => {
    const map = {
      'Técnico biomédico': { bg: '#E1F5EE', fg: '#0F6E56' },
      'Jefe patrimonio':   { bg: '#EEEDFE', fg: '#3C3489' },
      'Jefe servicio':     { bg: '#E6F3F7', fg: '#0F4D5C' },
      'Auditor ANMAT':     { bg: '#FAEEDA', fg: '#633806' },
      'Administrador':     { bg: '#FCE8EF', fg: '#7A1B3E' },
      'Médico':            { bg: '#E6F1FB', fg: '#0C447C' },
      'Residente':         { bg: '#F0F6FA', fg: '#2C7DA0' },
      'Enfermero':         { bg: '#FFF3E0', fg: '#8A5A16' },
      'Personal asistencial': { bg: '#EEF3FB', fg: '#2F4A6D' },
    };
    return map[r] || { bg: '#F1EFE8', fg: '#444441' };
  };

  const usuariosFiltrados = useMemo(() => {
    if (!busqueda.trim()) return usuarios;
    const q = busqueda.toLowerCase();
    return usuarios.filter(u =>
      u.nombre?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.rol?.toLowerCase().includes(q)
    );
  }, [usuarios, busqueda]);

  const inpStyleErr = (campo) => ({
    ...inpStyle,
    border: errores[campo] ? '1.5px solid #E85A6D' : '1.5px solid #E5EDF3',
    background: errores[campo] ? '#FFF8F9' : '#FAFBFC'
  });

  return (
    <>
      {}
      <div className="rwd-page-header" style={{ padding: '20px 24px 0', background: 'white' }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 18, flexWrap: 'wrap', gap: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <h2 style={{
              fontSize: 16, fontWeight: 700, color: '#1a1a1a',
              margin: 0, letterSpacing: '0.5px'
            }}>ADMINISTRACIÓN</h2>

            <span style={{
              background: 'rgba(124, 110, 250, 0.12)',
              color: '#5e51d6',
              border: '1px solid rgba(124, 110, 250, 0.25)',
              padding: '4px 12px', borderRadius: 8,
              fontSize: 12, fontWeight: 600, letterSpacing: '0.5px'
            }}>USUARIOS</span>

            <p style={{ fontSize: 13, color: '#6B7C8C', margin: 0, marginLeft: 8 }}>
              Gestión de usuarios y roles del sistema
            </p>
          </div>

          <button
            onClick={abrirModalNuevo}
            style={{
              background: '#F0F6FA', color: '#4A5868', border: 'none',
              borderRadius: 6, padding: '10px 16px', fontSize: 11,
              fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase',
              cursor: 'pointer', transition: 'background 0.15s, color 0.15s'
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = '#E0EBF3'; e.currentTarget.style.color = '#2C7DA0'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = '#F0F6FA'; e.currentTarget.style.color = '#4A5868'; }}
          >+ REGISTRAR USUARIO</button>
        </div>

        {}
        <div style={{
          display: 'flex', gap: 24, borderBottom: '1px solid #E5EDF3',
          marginTop: 4, alignItems: 'center', flexWrap: 'wrap', paddingBottom: 12
        }}>
          <div style={{ fontSize: 13, color: '#6B7C8C' }}>
            {usuariosFiltrados.length} {usuariosFiltrados.length === 1 ? 'usuario' : 'usuarios'}
            {usuariosFiltrados.length !== usuarios.length ? ` (de ${usuarios.length})` : ''}
          </div>

          <div style={{
            marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6,
            background: busquedaAbierta ? '#F0F6FA' : 'transparent',
            borderRadius: 8, padding: busquedaAbierta ? '4px 10px' : '4px',
            transition: 'all 0.2s'
          }}>
            <input
              type="text" placeholder="Buscar nombre, email o rol..."
              value={busqueda} onChange={e => setBusqueda(e.target.value)}
              autoFocus={busquedaAbierta}
              style={{
                background: 'transparent', border: 'none', outline: 'none',
                fontSize: 13, padding: '4px 0', color: '#4A5868',
                width: busquedaAbierta ? 220 : 0,
                transition: 'width 0.2s', overflow: 'hidden'
              }}
            />
            {busqueda && busquedaAbierta && (
              <span onClick={() => setBusqueda('')} title="Limpiar"
                style={{ color: '#9E9CBB', fontSize: 14, cursor: 'pointer' }}>✕</span>
            )}
            <span
              onClick={() => {
                if (busquedaAbierta && busqueda) { setBusqueda(''); setBusquedaAbierta(false); }
                else { setBusquedaAbierta(!busquedaAbierta); }
              }}
              title={busquedaAbierta ? 'Cerrar' : 'Buscar'}
              style={{ color: '#6B7C8C', fontSize: 16, cursor: 'pointer' }}
            >🔍</span>
          </div>
        </div>
      </div>

      {}
      <div className="rwd-table-wrap" style={{ padding: '20px 24px', background: 'white', overflowX: 'auto' }}>
        <table className="rwd-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: 550 }}>
          <thead>
            <tr style={{ textAlign: 'left' }}>
              <th style={thStyle}>Nombre</th>
              <th style={thStyle}>Email</th>
              <th style={thStyle}>Rol</th>
              <th style={{ ...thStyle, width: 80 }}></th>
            </tr>
          </thead>
          <tbody>
            {usuariosFiltrados.map(u => {
              const c = chipRol(u.rol);
              return (
                <tr key={u.idUsuario} style={{ borderBottom: '1px solid #F1F4F7' }}>
                  <td style={{ ...tdStyle, fontSize: 13, fontWeight: 500, color: '#1a1a1a' }}>
                    {u.nombre}
                  </td>
                  <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 12, color: '#6B7C8C' }}>
                    {u.email}
                  </td>
                  <td style={tdStyle}>
                    <span style={{
                      display: 'inline-block', padding: '4px 12px', borderRadius: 999,
                      background: c.bg, color: c.fg, fontSize: 12, fontWeight: 500
                    }}>{u.rol}</span>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => abrirModalEditar(u)} title="Editar"
                        style={{
                          background: '#F0F6FA', color: '#4A5868', border: 'none',
                          borderRadius: 4, padding: '4px 8px', fontSize: 12,
                          cursor: 'pointer'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = '#E0EBF3'}
                        onMouseOut={(e) => e.currentTarget.style.background = '#F0F6FA'}
                      >✏</button>
                      <button
                        onClick={() => eliminar(u)} title="Eliminar"
                        style={{
                          background: '#FDECEE', color: '#B93B1B', border: 'none',
                          borderRadius: 4, padding: '4px 8px', fontSize: 12,
                          cursor: 'pointer'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = '#F9D4DD'}
                        onMouseOut={(e) => e.currentTarget.style.background = '#FDECEE'}
                      >✕</button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {usuariosFiltrados.length === 0 && (
              <tr><td colSpan="4" style={{ textAlign: 'center', padding: 40, color: '#9E9CBB', fontSize: 13 }}>
                {usuarios.length === 0 ? 'No hay usuarios registrados.' : 'No hay usuarios que coincidan con la búsqueda.'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {}
      {modalAbierto && (
        <div
          onClick={cerrarModal}
          className="rwd-modal-overlay"
          style={{
            position:'fixed', top:0, left:0, right:0, bottom:0,
            background:'rgba(20,25,40,0.6)', backdropFilter: 'blur(4px)',
            display:'flex', alignItems:'center', justifyContent:'center',
            zIndex:1000, padding:20
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="rwd-modal-box"
            style={{
              background:'white', borderRadius:16,
              maxWidth:640, width:'100%', maxHeight:'92vh',
              overflowY:'auto',
              boxShadow:'0 20px 60px rgba(0,0,0,0.25)',
              animation: 'slideIn 0.25s ease-out'
            }}
          >
            {}
            <div style={{
              padding: '24px 28px 20px',
              borderBottom: '1px solid #F0F3F7',
              display: 'flex', alignItems: 'center', gap: 16
            }}>
              <div style={{
                width: 52, height: 52, borderRadius: 12,
                background: 'linear-gradient(135deg, #FCE8EF 0%, #F9D4DD 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24, flexShrink: 0
              }}>
                {editando ? '✏️' : '👤'}
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, color: '#1a1a1a', fontSize: 18, fontWeight: 700 }}>
                  {editando ? 'Editar usuario' : 'Usuario'}
                </h3>
                <p style={{ margin: '4px 0 0', color: '#6B7C8C', fontSize: 13 }}>
                  {editando
                    ? 'Modificá los datos de acceso y el rol del usuario'
                    : 'Registrá un nuevo usuario con acceso al sistema'}
                </p>
              </div>
              <button
                onClick={cerrarModal}
                style={{
                  background: '#F4F7FA', border: 'none',
                  width: 32, height: 32, borderRadius: 8,
                  fontSize: 18, cursor: 'pointer', color: '#6B7C8C',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
                title="Cerrar (Esc)"
              >✕</button>
            </div>

            <div style={{ padding: '20px 28px 24px' }}>

              {errores.__general && (
                <div style={{
                  background: 'linear-gradient(90deg, #FEF2F3 0%, #FDECEE 100%)',
                  border: '1px solid #F5C2C7',
                  color: '#842029',
                  padding: '12px 14px', borderRadius: 10,
                  fontSize: 13, marginBottom: 18,
                  display: 'flex', gap: 10, alignItems: 'flex-start'
                }}>
                  <span style={{ fontSize: 18 }}>⚠</span>
                  <span>{errores.__general}</span>
                </div>
              )}

              {}
              <SeccionTitulo icono="📋" titulo="Datos personales" />
              <div className="rwd-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 22 }}>
                <div>
                  <label style={lblStyle}>Nombre completo *</label>
                  <input
                    value={nombre}
                    onChange={e => cambiarCampo('nombre', e.target.value, setNombre)}
                    placeholder="Ej: Ing. Carlos Rivas"
                    maxLength={100}
                    style={inpStyleErr('nombre')}
                  />
                  {errores.nombre && <span style={errStyle}>⚠ {errores.nombre}</span>}
                </div>
                <div>
                  <label style={lblStyle}>Email *</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => cambiarCampo('email', e.target.value, setEmail)}
                    placeholder="usuario@hospital.gob.ar"
                    maxLength={100}
                    style={{ ...inpStyleErr('email'), fontFamily: 'monospace' }}
                  />
                  {errores.email && <span style={errStyle}>⚠ {errores.email}</span>}
                </div>
              </div>

              {}
              <SeccionTitulo icono="🛡" titulo="Rol en el sistema" />
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                {ROLES.map(r => {
                  const seleccionado = rol === r;
                  const c = chipRol(r);
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => cambiarCampo('rol', r, setRol)}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 10,
                        border: seleccionado ? `2px solid ${c.fg}` : '2px solid #E5EDF3',
                        background: seleccionado ? c.bg : 'white',
                        color: seleccionado ? c.fg : '#6B7C8C',
                        fontSize: 12,
                        fontWeight: seleccionado ? 600 : 500,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        display: 'flex', alignItems: 'center', gap: 6,
                        boxShadow: seleccionado ? `0 2px 8px ${c.bg}` : 'none'
                      }}
                    >
                      <span style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: c.fg, opacity: seleccionado ? 1 : 0.4
                      }}></span>
                      {r}
                    </button>
                  );
                })}
              </div>
              {errores.rol && <span style={errStyle}>⚠ {errores.rol}</span>}

              {}
              <div style={{ marginTop: 22 }}>
                <SeccionTitulo icono="🔒" titulo="Credenciales de acceso" />
                <div>
                  <label style={lblStyle}>
                    {editando ? 'Nueva contraseña (opcional)' : 'Contraseña *'}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={mostrarPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => cambiarCampo('password', e.target.value, setPassword)}
                      placeholder="Mínimo 6 caracteres"
                      style={{ ...inpStyleErr('password'), paddingRight: 40 }}
                    />
                    <span
                      onClick={() => setMostrarPassword(!mostrarPassword)}
                      title={mostrarPassword ? 'Ocultar' : 'Mostrar'}
                      style={{
                        position: 'absolute', right: 12, top: '50%',
                        transform: 'translateY(-50%)',
                        cursor: 'pointer', color: '#9E9CBB', fontSize: 14
                      }}
                    >{mostrarPassword ? '🙈' : '👁'}</span>
                  </div>
                  {errores.password && <span style={errStyle}>⚠ {errores.password}</span>}
                  {editando && !errores.password && (
                    <small style={{ display: 'block', marginTop: 6, fontSize: 11, color: '#9E9CBB', fontStyle: 'italic' }}>
                      Dejá este campo vacío si no querés cambiar la contraseña actual.
                    </small>
                  )}
                </div>
              </div>
            </div>

            {}
            <div style={{
              padding: '16px 28px',
              borderTop: '1px solid #F0F3F7',
              background: '#FAFBFC',
              borderBottomLeftRadius: 16,
              borderBottomRightRadius: 16,
              display:'flex', justifyContent:'flex-end', gap:10
            }}>
              <button onClick={cerrarModal} style={btnGhost}>Cancelar</button>
              <button onClick={guardar} style={btnSave}>
                {editando ? '✓ Actualizar usuario' : '✓ Registrar usuario'}
              </button>
            </div>
          </div>
        </div>
      )}

      {}
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-20px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </>
  );
}

function SeccionTitulo({ icono, titulo }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      marginBottom: 12, paddingBottom: 8,
      borderBottom: '1px solid #F0F3F7'
    }}>
      <span style={{ fontSize: 14 }}>{icono}</span>
      <span style={{
        fontSize: 11, fontWeight: 700, color: '#4A5868',
        textTransform: 'uppercase', letterSpacing: '0.08em'
      }}>{titulo}</span>
    </div>
  );
}

const thStyle = {
  fontSize: 11, fontWeight: 500, color: '#6B7C8C',
  padding: '12px 8px', borderBottom: '1px solid #F1F4F7',
  textTransform: 'uppercase', letterSpacing: '0.4px'
};
const tdStyle = {
  padding: '14px 8px', fontSize: 13, color: '#2D3748', whiteSpace: 'nowrap'
};
const lblStyle = {
  display:'block', fontSize:11, fontWeight:600, color:'#4A5868',
  marginBottom:6, letterSpacing: '0.02em'
};
const inpStyle = {
  width:'100%', padding: '10px 12px',
  border:'1.5px solid #E5EDF3', borderRadius: 8,
  fontSize:13, background: '#FAFBFC',
  transition: 'all 0.15s', outline: 'none', fontFamily: 'inherit'
};
const errStyle = {
  display: 'block', color: '#E85A6D', fontSize: 11,
  marginTop: 6, fontWeight: 500
};
const btnGhost = {
  background:'white', color:'#6B7C8C', border:'1px solid #E5EDF3',
  padding:'10px 18px', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer'
};
const btnSave = {
  background: 'linear-gradient(135deg, #2C7DA0 0%, #4A9BB8 100%)',
  color:'white', border:'none',
  padding:'10px 20px', borderRadius:8,
  fontSize:13, fontWeight:600, cursor:'pointer',
  boxShadow: '0 2px 8px rgba(44,125,160,0.25)'
};

export default Usuarios;