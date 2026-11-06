import { useState, useEffect, useMemo } from 'react';
import api from '../api';
import { useToast, mensajeDeError } from '../components/Toast';
import ConfirmarDialogo from '../components/ConfirmarDialogo';

const ROLES = ['Personal asistencial', 'Técnico', 'Bioingeniero'];

const normalizar = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

function Usuarios() {
  const toast = useToast();
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);

  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [rol, setRol] = useState('');
  const [password, setPassword] = useState('');
  const [editando, setEditando] = useState(null);
  const [errores, setErrores] = useState({});
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [usuarioAEliminar, setUsuarioAEliminar] = useState(null);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [busquedaAbierta, setBusquedaAbierta] = useState(false);

  useEffect(() => { cargarUsuarios(); }, []);

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape' && modalAbierto) cerrarModal(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalAbierto]);

  const cargarUsuarios = async () => {
    try {
      const res = await api.get('/usuarios');
      setUsuarios(res.data);
    } catch (err) {
      toast.error('No se pudieron cargar los usuarios', mensajeDeError(err, 'Revisá la conexión e intentá de nuevo.'));
    } finally {
      setCargando(false);
    }
  };

  const validar = () => {
    const errs = {};
    if (!nombre.trim()) errs.nombre = 'Falta ingresar el nombre completo';
    else if (nombre.trim().length > 100) errs.nombre = 'El nombre no puede superar los 100 caracteres';
    if (!email.trim()) errs.email = 'Falta ingresar el email';
    else if (email.trim().length > 100) errs.email = 'El email no puede superar los 100 caracteres';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errs.email = 'El email no tiene un formato válido. Ejemplo: usuario@hospital.gob.ar';
    if (!rol) errs.rol = 'Falta seleccionar el rol';
    if (!editando) {
      if (!password.trim()) errs.password = 'La contraseña es obligatoria para usuarios nuevos';
      else if (password.trim().length < 6) errs.password = 'La contraseña debe tener al menos 6 caracteres';
    } else if (password.trim().length > 0 && password.trim().length < 6) {
      errs.password = 'La contraseña debe tener al menos 6 caracteres';
    }
    if (password.length > 100) errs.password = 'La contraseña no puede superar los 100 caracteres';
    return errs;
  };

  const limpiar = () => {
    setNombre(''); setEmail(''); setRol(''); setPassword('');
    setEditando(null); setErrores({}); setMostrarPassword(false);
  };
  const abrirModalNuevo = () => { limpiar(); setModalAbierto(true); };
  const abrirModalEditar = (u) => {
    setNombre(u.nombre);
    setEmail(u.email);
    setRol(u.rol);
    setPassword('');
    setEditando(u.idUsuario);
    setErrores({});
    setMostrarPassword(false);
    setModalAbierto(true);
  };
  const cerrarModal = () => { setModalAbierto(false); limpiar(); };

  const guardar = async () => {
    if (guardando) return;
    const errs = validar();
    setErrores(errs);
    if (Object.keys(errs).length > 0) return;

    setGuardando(true);
    try {
      if (editando) {
        const data = { nombre: nombre.trim(), email: email.trim(), rol };
        if (password.trim()) data.password = password.trim();
        await api.put(`/usuarios/${editando}`, data);
        toast.success('Usuario actualizado', `Se guardaron los cambios de ${nombre.trim()}.`);
      } else {
        await api.post('/usuarios', { nombre: nombre.trim(), email: email.trim(), rol, password: password.trim() });
        toast.success('Usuario registrado', `${nombre.trim()} ya puede ingresar al sistema.`);
      }
      cerrarModal();
      cargarUsuarios();
    } catch (err) {
      setErrores({ __general: mensajeDeError(err, 'No se pudo guardar el usuario. Revisá los datos e intentá de nuevo.') });
    } finally {
      setGuardando(false);
    }
  };

  const confirmarEliminar = async () => {
    const u = usuarioAEliminar;
    setUsuarioAEliminar(null);
    try {
      await api.delete(`/usuarios/${u.idUsuario}`);
      toast.success('Usuario eliminado', `Se eliminó a ${u.nombre}.`);
      cargarUsuarios();
    } catch (err) {
      toast.error('No se pudo eliminar', mensajeDeError(err, 'Puede tener registros asociados.'));
    }
  };

  const cambiarCampo = (campo, valor, setter) => {
    setter(valor);
    if (errores[campo]) {
      setErrores(prev => { const n = { ...prev }; delete n[campo]; return n; });
    }
  };

  const chipRol = (r) => {
    const map = {
      'Personal asistencial': { bg: '#EEF3FB', fg: '#2F4A6D' },
      'Técnico':              { bg: '#E1F5EE', fg: '#0B5A46' },
      'Bioingeniero':         { bg: '#E6F1FB', fg: '#0C447C' },
    };
    return map[r] || { bg: '#F1EFE8', fg: '#444441' };
  };

  const usuariosFiltrados = useMemo(() => {
    const q = normalizar(busqueda.trim());
    if (!q) return usuarios;
    return usuarios.filter(u => [u.nombre, u.email, u.rol].some(c => normalizar(c).includes(q)));
  }, [usuarios, busqueda]);

  const inpStyleErr = (campo) => ({
    ...inpStyle,
    border: errores[campo] ? '1.5px solid #B93B1B' : '1.5px solid #E5EDF3',
    background: errores[campo] ? '#FFF8F9' : '#FAFBFC'
  });

  return (
    <>
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
              color: '#4B3FBF',
              border: '1px solid rgba(124, 110, 250, 0.25)',
              padding: '4px 12px', borderRadius: 8,
              fontSize: 12, fontWeight: 600, letterSpacing: '0.5px'
            }}>USUARIOS</span>

            <p style={{ fontSize: 13, color: '#5C6B7A', margin: 0, marginLeft: 8 }}>
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
            onMouseOver={(e) => { e.currentTarget.style.background = '#E0EBF3'; e.currentTarget.style.color = '#1F6E8F'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = '#F0F6FA'; e.currentTarget.style.color = '#4A5868'; }}
          >+ REGISTRAR USUARIO</button>
        </div>

        <div style={{
          display: 'flex', gap: 24, borderBottom: '1px solid #E5EDF3',
          marginTop: 4, alignItems: 'center', flexWrap: 'wrap', paddingBottom: 12
        }}>
          <div style={{ fontSize: 13, color: '#5C6B7A' }}>
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
              aria-label="Buscar usuario por nombre, email o rol"
              value={busqueda} onChange={e => setBusqueda(e.target.value)}
              autoFocus={busquedaAbierta}
              tabIndex={busquedaAbierta ? 0 : -1}
              style={{
                background: 'transparent', border: 'none', outline: 'none',
                fontSize: 13, padding: '4px 0', color: '#2D3748',
                width: busquedaAbierta ? 220 : 0,
                transition: 'width 0.2s', overflow: 'hidden'
              }}
            />
            {busqueda && busquedaAbierta && (
              <button
                type="button" onClick={() => setBusqueda('')}
                title="Limpiar búsqueda" aria-label="Limpiar búsqueda"
                style={{ background: 'transparent', border: 'none', color: '#5C6B7A', fontSize: 14, cursor: 'pointer', padding: 0 }}
              >✕</button>
            )}
            <button
              type="button"
              onClick={() => {
                if (busquedaAbierta && busqueda) { setBusqueda(''); setBusquedaAbierta(false); }
                else { setBusquedaAbierta(!busquedaAbierta); }
              }}
              title={busquedaAbierta ? 'Cerrar búsqueda' : 'Buscar'}
              aria-label={busquedaAbierta ? 'Cerrar búsqueda' : 'Abrir búsqueda'}
              aria-expanded={busquedaAbierta}
              style={{ background: 'transparent', border: 'none', color: '#5C6B7A', fontSize: 16, cursor: 'pointer', padding: 0 }}
            >🔍</button>
          </div>
        </div>
      </div>

      <div className="rwd-table-wrap" style={{ padding: '20px 24px', background: 'white', overflowX: 'auto' }}>
        <table className="rwd-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: 550 }}>
          <thead>
            <tr style={{ textAlign: 'left' }}>
              <th style={thStyle}>Nombre</th>
              <th style={thStyle}>Email</th>
              <th style={thStyle}>Rol</th>
              <th style={{ ...thStyle, width: 80 }}><span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Acciones</span></th>
            </tr>
          </thead>
          <tbody>
            {usuariosFiltrados.map((u, idx) => {
              const c = chipRol(u.rol);
              const fondo = idx % 2 === 1 ? '#F8FAFC' : 'white';
              return (
                <tr
                  key={u.idUsuario}
                  style={{ borderBottom: '1px solid #F1F4F7', background: fondo, transition: 'background 0.1s' }}
                  onMouseOver={(e) => e.currentTarget.style.background = '#F0F6FA'}
                  onMouseOut={(e) => e.currentTarget.style.background = fondo}
                >
                  <td style={{ ...tdStyle, fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>
                    {u.nombre}
                  </td>
                  <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 12, color: '#4A5868' }}>
                    {u.email}
                  </td>
                  <td style={tdStyle}>
                    <span style={{
                      display: 'inline-block', padding: '4px 12px', borderRadius: 999,
                      background: c.bg, color: c.fg, fontSize: 12, fontWeight: 600
                    }}>{u.rol}</span>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => abrirModalEditar(u)} title="Editar usuario" aria-label={`Editar a ${u.nombre}`}
                        style={{
                          background: '#F0F6FA', color: '#4A5868', border: 'none',
                          borderRadius: 4, padding: '4px 8px', fontSize: 12,
                          cursor: 'pointer'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = '#E0EBF3'}
                        onMouseOut={(e) => e.currentTarget.style.background = '#F0F6FA'}
                      >✏</button>
                      <button
                        onClick={() => setUsuarioAEliminar(u)} title="Eliminar usuario" aria-label={`Eliminar a ${u.nombre}`}
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
              <tr><td colSpan="4" style={{ textAlign: 'center', padding: 40, color: '#5C6B7A', fontSize: 13 }}>
                {cargando ? 'Cargando usuarios…' : usuarios.length === 0 ? 'No hay usuarios registrados.' : 'No hay usuarios que coincidan con la búsqueda.'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

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
            role="dialog" aria-modal="true" aria-labelledby="usuario-titulo"
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
            <div style={{
              padding: '24px 28px 20px',
              borderBottom: '1px solid #F0F3F7',
              display: 'flex', alignItems: 'center', gap: 16
            }}>
              <div aria-hidden="true" style={{
                width: 52, height: 52, borderRadius: 12,
                background: 'linear-gradient(135deg, #FCE8EF 0%, #F9D4DD 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24, flexShrink: 0
              }}>
                {editando ? '✏️' : '👤'}
              </div>
              <div style={{ flex: 1 }}>
                <h3 id="usuario-titulo" style={{ margin: 0, color: '#1a1a1a', fontSize: 18, fontWeight: 700 }}>
                  {editando ? 'Editar usuario' : 'Nuevo usuario'}
                </h3>
                <p style={{ margin: '4px 0 0', color: '#5C6B7A', fontSize: 13 }}>
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
                  fontSize: 18, cursor: 'pointer', color: '#5C6B7A',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
                title="Cerrar (Esc)"
                aria-label="Cerrar"
              >✕</button>
            </div>

            <div style={{ padding: '20px 28px 24px' }}>

              {errores.__general && (
                <div role="alert" style={{
                  background: 'linear-gradient(90deg, #FEF2F3 0%, #FDECEE 100%)',
                  border: '1px solid #F5C2C7',
                  color: '#842029',
                  padding: '12px 14px', borderRadius: 10,
                  fontSize: 13, marginBottom: 18,
                  display: 'flex', gap: 10, alignItems: 'flex-start'
                }}>
                  <span aria-hidden="true" style={{ fontSize: 18 }}>⚠</span>
                  <span>{errores.__general}</span>
                </div>
              )}

              <SeccionTitulo icono="📋" titulo="Datos personales" />
              <div className="rwd-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 22 }}>
                <div>
                  <label htmlFor="usr-nombre" style={lblStyle}>Nombre completo *</label>
                  <input
                    id="usr-nombre"
                    value={nombre}
                    onChange={e => cambiarCampo('nombre', e.target.value, setNombre)}
                    placeholder="Ej: Ing. Carlos Rivas"
                    maxLength={100}
                    style={inpStyleErr('nombre')}
                  />
                  {errores.nombre && <span style={errStyle}>⚠ {errores.nombre}</span>}
                </div>
                <div>
                  <label htmlFor="usr-email" style={lblStyle}>Email *</label>
                  <input
                    id="usr-email"
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

              <SeccionTitulo icono="🛡" titulo="Rol en el sistema" />
              <div role="group" aria-label="Rol en el sistema" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                {ROLES.map(r => {
                  const seleccionado = rol === r;
                  const c = chipRol(r);
                  return (
                    <button
                      key={r}
                      type="button"
                      aria-pressed={seleccionado}
                      onClick={() => cambiarCampo('rol', r, setRol)}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 10,
                        border: seleccionado ? `2px solid ${c.fg}` : '2px solid #E5EDF3',
                        background: seleccionado ? c.bg : 'white',
                        color: seleccionado ? c.fg : '#5C6B7A',
                        fontSize: 12,
                        fontWeight: seleccionado ? 600 : 500,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        display: 'flex', alignItems: 'center', gap: 6
                      }}
                    >
                      <span aria-hidden="true" style={{ fontWeight: 700 }}>{seleccionado ? '✓' : '○'}</span>
                      {r}
                    </button>
                  );
                })}
              </div>
              {errores.rol && <span style={errStyle}>⚠ {errores.rol}</span>}

              <div style={{ marginTop: 22 }}>
                <SeccionTitulo icono="🔒" titulo="Credenciales de acceso" />
                <div>
                  <label htmlFor="usr-password" style={lblStyle}>
                    {editando ? 'Nueva contraseña (opcional)' : 'Contraseña *'}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="usr-password"
                      type={mostrarPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => cambiarCampo('password', e.target.value, setPassword)}
                      placeholder="Mínimo 6 caracteres"
                      maxLength={100}
                      autoComplete="new-password"
                      style={{ ...inpStyleErr('password'), paddingRight: 44 }}
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarPassword(!mostrarPassword)}
                      title={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      aria-label={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      aria-pressed={mostrarPassword}
                      style={{
                        position: 'absolute', right: 8, top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent', border: 'none',
                        cursor: 'pointer', color: '#5C6B7A', fontSize: 15, padding: '4px 6px'
                      }}
                    >{mostrarPassword ? '🙈' : '👁'}</button>
                  </div>
                  {errores.password && <span style={errStyle}>⚠ {errores.password}</span>}
                  {editando && !errores.password && (
                    <small style={{ display: 'block', marginTop: 6, fontSize: 11, color: '#5C6B7A' }}>
                      Dejá este campo vacío si no querés cambiar la contraseña actual.
                    </small>
                  )}
                </div>
              </div>
            </div>

            <div style={{
              padding: '16px 28px',
              borderTop: '1px solid #F0F3F7',
              background: '#FAFBFC',
              borderBottomLeftRadius: 16,
              borderBottomRightRadius: 16,
              display:'flex', justifyContent:'flex-end', gap:10
            }}>
              <button onClick={cerrarModal} style={btnGhost}>Cancelar</button>
              <button
                onClick={guardar}
                disabled={guardando}
                style={{ ...btnSave, opacity: guardando ? 0.6 : 1, cursor: guardando ? 'not-allowed' : 'pointer' }}
              >
                {guardando ? 'Guardando…' : (editando ? '✓ Actualizar usuario' : '✓ Registrar usuario')}
              </button>
            </div>
          </div>
        </div>
      )}
      <ConfirmarDialogo
        abierto={!!usuarioAEliminar}
        titulo="¿Eliminar usuario?"
        mensaje={usuarioAEliminar ? `Se eliminará a "${usuarioAEliminar.nombre}". Esta acción no se puede deshacer.` : ''}
        textoConfirmar="Eliminar"
        onConfirmar={confirmarEliminar}
        onCancelar={() => setUsuarioAEliminar(null)}
      />
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
      <span aria-hidden="true" style={{ fontSize: 14 }}>{icono}</span>
      <span style={{
        fontSize: 11, fontWeight: 700, color: '#4A5868',
        textTransform: 'uppercase', letterSpacing: '0.08em'
      }}>{titulo}</span>
    </div>
  );
}

const thStyle = {
  fontSize: 11, fontWeight: 600, color: '#5C6B7A',
  padding: '12px 8px', borderBottom: '1px solid #E5EDF3',
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
  transition: 'all 0.15s', outline: 'none', fontFamily: 'inherit',
  boxSizing: 'border-box'
};
const errStyle = {
  display: 'block', color: '#B93B1B', fontSize: 11,
  marginTop: 6, fontWeight: 500
};
const btnGhost = {
  background:'white', color:'#5C6B7A', border:'1px solid #E5EDF3',
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