import { useState, useEffect, useMemo, forwardRef } from 'react';
import api from '../api';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { FiCalendar } from "react-icons/fi";

const MOTIVOS = [
  { nombre: 'Obsolescencia tecnológica', icono: '📉' },
  { nombre: 'Falla irreparable', icono: '💔' },
  { nombre: 'Vida útil agotada', icono: '⏳' },
  { nombre: 'Daño físico irreversible', icono: '💥' },
  { nombre: 'Robo / extravío', icono: '❓' },
  { nombre: 'Decisión administrativa', icono: '📋' }
];

const CustomDateInputBaja = forwardRef(({ value, onClick }, ref) => (
  <div
    onClick={onClick}
    ref={ref}
    style={{
      width: "100%",
      height: "48px",
      border: "1px solid #D8DEE9",
      borderRadius: "12px",
      padding: "0 16px",
      display: "flex",
      alignItems: "center",
      gap: "12px",
      boxSizing: "border-box",
      background: "#FAFBFC",
      cursor: "pointer"
    }}
  >
    <span
      style={{
        flex: 1,
        color: value ? "#1F2937" : "#9CA3AF",
        fontSize: "14px",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis"
      }}
    >
      {value || "dd/mm/aaaa"}
    </span>
    <FiCalendar color="#374151" size={16} />
  </div>
));

function BajasPatrimoniales() {
  const [bajas, setBajas] = useState([]);
  const [equipos, setEquipos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);

  const hoyDate = new Date();
  const hoy = (() => {
    const yyyy = hoyDate.getFullYear();
    const mm = String(hoyDate.getMonth() + 1).padStart(2, '0');
    const dd = String(hoyDate.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  })();

  const [fecha, setFecha] = useState(hoy);
  const [motivo, setMotivo] = useState('');
  const [informeObsolescencia, setInformeObsolescencia] = useState('');
  const [idEquipo, setIdEquipo] = useState('');
  const [idUsuario, setIdUsuario] = useState('');
  const [editando, setEditando] = useState(null);
  const [errores, setErrores] = useState({});

  const [buscadorEquipo, setBuscadorEquipo] = useState('');
  const [mostrarLista, setMostrarLista] = useState(false);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [tabActivo, setTabActivo] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [busquedaAbierta, setBusquedaAbierta] = useState(false);

  useEffect(() => {
    cargarBajas(); cargarEquipos(); cargarUsuarios();
  }, []);

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape' && modalAbierto) cerrarModal(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [modalAbierto]);

  const cargarBajas    = async () => { const r = await api.get('/bajaspatrimoniales'); setBajas(r.data); };
  const cargarEquipos  = async () => { const r = await api.get('/equipos');            setEquipos(r.data); };
  const cargarUsuarios = async () => { const r = await api.get('/usuarios');           setUsuarios(r.data); };

  const equiposDisponibles = useMemo(() => {
    if (editando) return equipos;
    const idsConBaja = new Set(bajas.map(b => b.idEquipo));
    return equipos.filter(e => !idsConBaja.has(e.idEquipo));
  }, [equipos, bajas, editando]);

  const bajasFiltradas = useMemo(() => {
    let lista = [...bajas];
    if (tabActivo !== 'todos') {
      lista = lista.filter(b => b.motivo === tabActivo);
    }
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      lista = lista.filter(b =>
        b.equipo?.modelo?.toLowerCase().includes(q) ||
        b.equipo?.nroSerie?.toLowerCase().includes(q) ||
        b.equipo?.marca?.nombre?.toLowerCase().includes(q) ||
        b.motivo?.toLowerCase().includes(q)
      );
    }
    return lista;
  }, [bajas, tabActivo, busqueda]);

  const motivosConBajas = useMemo(() => {
    return MOTIVOS
      .map(m => ({
        nombre: m.nombre,
        cantidad: bajas.filter(b => b.motivo === m.nombre).length
      }))
      .filter(m => m.cantidad > 0);
  }, [bajas]);

  const equiposFiltradosBuscador = useMemo(() => {
    const q = buscadorEquipo.trim().toLowerCase();
    if (!q) return equiposDisponibles.slice(0, 10);
    return equiposDisponibles.filter(e =>
      e.modelo?.toLowerCase().includes(q)
    ).slice(0, 10);
  }, [equiposDisponibles, buscadorEquipo]);

  const equipoSeleccionado = useMemo(() => {
    return equipos.find(e => e.idEquipo === parseInt(idEquipo));
  }, [equipos, idEquipo]);

  const seleccionarEquipo = (eq) => {
    setIdEquipo(eq.idEquipo);
    setBuscadorEquipo('');
    setMostrarLista(false);
    if (errores.idEquipo) {
      setErrores(prev => { const n = { ...prev }; delete n.idEquipo; return n; });
    }
  };

  const limpiarEquipo = () => {
    setIdEquipo('');
    setBuscadorEquipo('');
    setMostrarLista(false);
  };

  const abrirModalNuevo = () => { limpiar(); setModalAbierto(true); };
  const abrirModalEditar = (b) => {
    setFecha(b.fecha?.split('T')[0] || hoy);
    setMotivo(b.motivo);
    setInformeObsolescencia(b.informeObsolescencia);
    setIdEquipo(b.idEquipo);
    setIdUsuario(b.idUsuario);
    setEditando(b.idBaja);
    setErrores({});
    setModalAbierto(true);
  };
  const cerrarModal = () => { setModalAbierto(false); limpiar(); };

  const validar = () => {
    const errs = {};
    if (!fecha) errs.fecha = 'Falta la fecha de baja';
    else if (fecha !== hoy) errs.fecha = 'La baja debe registrarse en la fecha actual por auditoría patrimonial';
    if (!idEquipo) errs.idEquipo = 'Falta seleccionar el equipo a dar de baja';
    if (!motivo) errs.motivo = 'Falta seleccionar el motivo';
    if (!idUsuario) errs.idUsuario = 'Falta seleccionar el responsable';
    if (!informeObsolescencia || !informeObsolescencia.trim())
      errs.informeObsolescencia = 'El informe técnico es obligatorio para justificar la baja';
    else if (informeObsolescencia.trim().length < 20)
      errs.informeObsolescencia = 'El informe debe tener al menos 20 caracteres';
    return errs;
  };

  const guardar = async () => {
    const errs = validar();
    setErrores(errs);
    if (Object.keys(errs).length > 0) return;

    const data = {
      fecha,
      motivo,
      informeObsolescencia: informeObsolescencia.trim(),
      idEquipo: parseInt(idEquipo),
      idUsuario: parseInt(idUsuario),
    };
    try {
      if (editando) {
        await api.put(`/bajaspatrimoniales/${editando}`, { idBaja: editando, ...data });
      } else {
        await api.post('/bajaspatrimoniales', data);
      }
      cerrarModal();
      cargarBajas();
      cargarEquipos();
    } catch (err) {
      const mensaje = typeof err.response?.data === 'string'
        ? err.response.data
        : 'No se pudo confirmar la baja. Revisá los datos e intentá de nuevo.';
      setErrores({ __general: mensaje });
    }
  };

  const limpiar = () => {
    setFecha(hoy);
    setMotivo(''); setInformeObsolescencia('');
    setIdEquipo(''); setIdUsuario(''); setEditando(null);
    setErrores({});
    setBuscadorEquipo('');
    setMostrarLista(false);
  };

  const cambiarCampo = (campo, valor, setter) => {
    setter(valor);
    if (errores[campo]) {
      setErrores(prev => { const n = { ...prev }; delete n[campo]; return n; });
    }
  };

  const chipMotivo = (m) => {
    const map = {
      'Obsolescencia tecnológica':  { bg: '#EEEDFE', fg: '#3C3489' },
      'Falla irreparable':          { bg: '#FAECE7', fg: '#712B13' },
      'Vida útil agotada':          { bg: '#FAEEDA', fg: '#633806' },
      'Daño físico irreversible':   { bg: '#FCE8EF', fg: '#7A1B3E' },
      'Robo / extravío':            { bg: '#F1EFE8', fg: '#444441' },
      'Decisión administrativa':    { bg: '#E1F5EE', fg: '#0F6E56' }
    };
    return map[m] || { bg: '#F1EFE8', fg: '#444441' };
  };

  const PALETA_PASTEL = [
    { bg: '#E6F1FB', fg: '#0C447C' },
    { bg: '#EEEDFE', fg: '#3C3489' },
    { bg: '#E1F5EE', fg: '#0F6E56' },
    { bg: '#FAECE7', fg: '#712B13' },
    { bg: '#FAEEDA', fg: '#633806' },
    { bg: '#F4E6F6', fg: '#5C1864' },
    { bg: '#E6F3F7', fg: '#0F4D5C' },
    { bg: '#F1EFE8', fg: '#444441' },
    { bg: '#FCE8EF', fg: '#7A1B3E' },
    { bg: '#E8F3E8', fg: '#2A5A2D' },
  ];
  const colorMarca = (nombre) => {
    if (!nombre) return PALETA_PASTEL[0];
    let hash = 0;
    for (let i = 0; i < nombre.length; i++) {
      hash = nombre.charCodeAt(i) + ((hash << 5) - hash);
    }
    return PALETA_PASTEL[Math.abs(hash) % PALETA_PASTEL.length];
  };

  const tabStyle = (activo) => ({
    padding: '10px 0',
    fontSize: 14,
    fontWeight: activo ? 600 : 400,
    color: activo ? '#1a1a1a' : '#6B7C8C',
    borderBottom: activo ? '2px solid #1a1a1a' : '2px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.15s'
  });

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
          marginBottom: 4, flexWrap: 'wrap', gap: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <h2 style={{
              fontSize: 16, fontWeight: 700, color: '#1a1a1a',
              margin: 0, letterSpacing: '0.5px'
            }}>GESTIÓN PATRIMONIAL</h2>

            <span style={{
              background: 'rgba(124, 110, 250, 0.12)',
              color: '#5e51d6',
              border: '1px solid rgba(124, 110, 250, 0.25)',
              padding: '4px 12px', borderRadius: 8,
              fontSize: 12, fontWeight: 600, letterSpacing: '0.5px'
            }}>BAJAS PATRIMONIALES</span>

            <p style={{ fontSize: 13, color: '#6B7C8C', margin: 0, marginLeft: 8 }}>
              Registro definitivo de bajas por obsolescencia, falla o pérdida
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
          >+ REGISTRAR BAJA</button>
        </div>

        {}
        <div style={{
          display: 'flex', gap: 24, borderBottom: '1px solid #E5EDF3',
          marginTop: 18, alignItems: 'center', flexWrap: 'wrap'
        }}>
          <div onClick={() => setTabActivo('todos')} style={tabStyle(tabActivo === 'todos')}>
            Todos ({bajas.length})
          </div>

          {motivosConBajas.map(m => (
            <div key={m.nombre} onClick={() => setTabActivo(m.nombre)}
              style={tabStyle(tabActivo === m.nombre)}>
              {m.nombre} ({m.cantidad})
            </div>
          ))}

          <div style={{
            marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6,
            background: busquedaAbierta ? '#F0F6FA' : 'transparent',
            borderRadius: 8, padding: busquedaAbierta ? '4px 10px' : '4px',
            transition: 'all 0.2s'
          }}>
            <input
              type="text" placeholder="Buscar equipo, marca o motivo..."
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
                style={{ color: '#9E9CBB', fontSize: 14, cursor: 'pointer' }}
              >✕</span>
            )}
            <span
              onClick={() => {
                if (busquedaAbierta && busqueda) { setBusqueda(''); setBusquedaAbierta(false); }
                else { setBusquedaAbierta(!busquedaAbierta); }
              }}
              title={busquedaAbierta ? 'Cerrar búsqueda' : 'Buscar'}
              style={{ color: '#6B7C8C', fontSize: 16, cursor: 'pointer' }}
            >🔍</span>
          </div>
        </div>
      </div>

      {}
      <div className="rwd-table-wrap" style={{ padding: '20px 24px', background: 'white', overflowX: 'auto' }}>
        <table className="rwd-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
          <thead>
            <tr style={{ textAlign: 'left' }}>
              <th style={thStyle}>Fecha</th>
              <th style={thStyle}>Marca</th>
              <th style={thStyle}>Modelo</th>
              <th style={thStyle}>N° serie</th>
              <th style={thStyle}>Motivo</th>
              <th style={thStyle}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {bajasFiltradas.map(b => {
              const cm = colorMarca(b.equipo?.marca?.nombre);
              const cMot = chipMotivo(b.motivo);
              return (
                <tr key={b.idBaja} style={{ borderBottom: '1px solid #F1F4F7' }}>
                  <td style={{ ...tdStyle, fontSize: 12, color: '#6B7C8C' }}>
                    📅 {b.fecha?.split('T')[0]}
                  </td>
                  <td style={tdStyle}>
                    <span style={{
                      display: 'inline-block', padding: '4px 12px', borderRadius: 999,
                      background: cm.bg, color: cm.fg, fontSize: 12, fontWeight: 500
                    }}>{b.equipo?.marca?.nombre || '—'}</span>
                  </td>
                  <td style={{ ...tdStyle, fontSize: 13, fontWeight: 500 }}>{b.equipo?.modelo || '—'}</td>
                  <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 12, color: '#6B7C8C' }}>
                    {b.equipo?.nroSerie || '—'}
                  </td>
                  <td style={tdStyle}>
                    <span style={{
                      display: 'inline-block', padding: '4px 12px', borderRadius: 999,
                      background: cMot.bg, color: cMot.fg, fontSize: 12, fontWeight: 500
                    }}>{b.motivo}</span>
                  </td>
                  <td style={tdStyle}>
                    <button className="btn-edit" onClick={() => abrirModalEditar(b)}>✏</button>
                  </td>
                </tr>
              );
            })}
            {bajasFiltradas.length === 0 && (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: 40, color: '#9E9CBB', fontSize: 13 }}>
                {bajas.length === 0 ? 'No hay bajas registradas.' : 'No hay bajas que coincidan con el filtro.'}
              </td></tr>
            )}
          </tbody>
        </table>

        <p style={{ fontSize: 12, color: '#9E9CBB', margin: '16px 0 0', textAlign: 'center' }}>
          {bajasFiltradas.length} {bajasFiltradas.length === 1 ? 'baja' : 'bajas'}
          {bajasFiltradas.length !== bajas.length ? ` (de ${bajas.length})` : ''}
        </p>
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
              maxWidth:720, width:'100%', maxHeight:'92vh',
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
                background: 'linear-gradient(135deg, #FDECEE 0%, #F9D4DD 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24, flexShrink: 0
              }}>
                {editando ? '✏️' : '📦'}
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, color: '#1a1a1a', fontSize: 18, fontWeight: 700 }}>
                  {editando ? 'Editar baja patrimonial' : 'Baja patrimonial'}
                </h3>
                <p style={{ margin: '4px 0 0', color: '#6B7C8C', fontSize: 13 }}>
                  {editando
                    ? 'Modificá los datos de la baja registrada'
                    : 'Registrá la baja definitiva de un equipo del inventario patrimonial'}
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
              <SeccionTitulo icono="🏥" titulo="Equipo a dar de baja" />
              <div style={{ marginBottom: 22, position: 'relative' }}>
                <label style={lblStyle}>Equipo *</label>

                {equipoSeleccionado ? (
                  <div style={{
                    ...inpStyleErr('idEquipo'),
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', background: '#F0F6FA',
                    border: '1.5px solid #C8DCEA'
                  }}>
                    <span style={{ fontSize: 14 }}>✓</span>
                    <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>
                      {equipoSeleccionado.modelo}
                    </div>
                    <button
                      type="button" onClick={limpiarEquipo}
                      title="Cambiar equipo"
                      style={{
                        background: 'transparent', border: 'none',
                        color: '#9E9CBB', fontSize: 16, cursor: 'pointer',
                        padding: '4px 8px', borderRadius: 6
                      }}
                    >✕</button>
                  </div>
                ) : (
                  <>
                    <div style={{
                      position: 'relative', ...inpStyleErr('idEquipo'),
                      padding: 0, display: 'flex', alignItems: 'center'
                    }}>
                      <span style={{
                        position: 'absolute', left: 12, top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#9E9CBB', fontSize: 14, pointerEvents: 'none'
                      }}>🔍</span>
                      <input
                        type="text" value={buscadorEquipo}
                        onChange={e => { setBuscadorEquipo(e.target.value); setMostrarLista(true); }}
                        onFocus={() => setMostrarLista(true)}
                        onBlur={() => setTimeout(() => setMostrarLista(false), 200)}
                        placeholder="Buscar equipo..."
                        style={{
                          width: '100%', padding: '10px 12px 10px 36px',
                          border: 'none', outline: 'none',
                          fontSize: 13, background: 'transparent',
                          fontFamily: 'inherit'
                        }}
                      />
                    </div>

                    {mostrarLista && (
                      <div style={{
                        position: 'absolute', top: '100%', left: 0, right: 0,
                        background: 'white',
                        border: '1px solid #E5EDF3', borderRadius: 8,
                        marginTop: 4, maxHeight: 280, overflowY: 'auto',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                        zIndex: 10
                      }}>
                        {equiposFiltradosBuscador.length === 0 ? (
                          <div style={{ padding: '16px', textAlign: 'center', color: '#9E9CBB', fontSize: 12 }}>
                            {equiposDisponibles.length === 0
                              ? 'No hay equipos disponibles para dar de baja'
                              : `No se encontraron equipos con "${buscadorEquipo}"`}
                          </div>
                        ) : (
                          equiposFiltradosBuscador.map(eq => (
                            <div
                              key={eq.idEquipo} onClick={() => seleccionarEquipo(eq)}
                              style={{
                                padding: '10px 14px', cursor: 'pointer',
                                borderBottom: '1px solid #F1F4F7',
                                fontSize: 13, fontWeight: 500, color: '#1a1a1a',
                                transition: 'background 0.1s'
                              }}
                              onMouseOver={(e) => e.currentTarget.style.background = '#F0F6FA'}
                              onMouseOut={(e) => e.currentTarget.style.background = 'white'}
                            >
                              {eq.modelo}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </>
                )}

                {errores.idEquipo && <span style={errStyle}>⚠ {errores.idEquipo}</span>}
              </div>

              {}
              <SeccionTitulo icono="⚠️" titulo="Motivo de la baja" />
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                {MOTIVOS.map(m => {
                  const seleccionado = motivo === m.nombre;
                  const c = chipMotivo(m.nombre);
                  return (
                    <button
                      key={m.nombre}
                      type="button"
                      onClick={() => cambiarCampo('motivo', m.nombre, setMotivo)}
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
                      <span>{m.icono}</span>
                      {m.nombre}
                    </button>
                  );
                })}
              </div>
              {errores.motivo && <span style={errStyle}>⚠ {errores.motivo}</span>}

              {}
              <div style={{ marginTop: 22 }}>
                <SeccionTitulo icono="📋" titulo="Responsabilidad y fecha" />

                <div className="rwd-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 22 }}>
                  <div>
                    <label style={lblStyle}>Fecha de baja *</label>
                    <DatePicker
                      selected={fecha ? new Date(fecha + 'T00:00:00') : new Date()}
                      onChange={(date) => {
                        if (date) {
                          const yyyy = date.getFullYear();
                          const mm = String(date.getMonth() + 1).padStart(2, '0');
                          const dd = String(date.getDate()).padStart(2, '0');
                          cambiarCampo("fecha", `${yyyy}-${mm}-${dd}`, setFecha);
                        }
                      }}
                      dateFormat="dd/MM/yyyy"
                      minDate={hoyDate}
                      maxDate={hoyDate}
                      openToDate={hoyDate}
                      customInput={<CustomDateInputBaja />}
                    />
                    <small style={{
                      display: 'block', marginTop: 6, fontSize: 11,
                      color: '#9E9CBB', fontStyle: 'italic'
                    }}>
                      🔒 Registro obligatorio en la fecha actual
                    </small>
                    {errores.fecha && <span style={errStyle}>⚠ {errores.fecha}</span>}
                  </div>
                  <div>
                    <label style={lblStyle}>Usuario responsable *</label>
                    <select
                      value={idUsuario}
                      onChange={e => cambiarCampo('idUsuario', e.target.value, setIdUsuario)}
                      style={inpStyleErr('idUsuario')}
                    >
                      <option value="">Seleccionar responsable...</option>
                      {usuarios.map(u => <option key={u.idUsuario} value={u.idUsuario}>{u.nombre}</option>)}
                    </select>
                    {errores.idUsuario && <span style={errStyle}>⚠ {errores.idUsuario}</span>}
                  </div>
                </div>
              </div>

              {}
              <SeccionTitulo icono="📝" titulo="Informe técnico" />
              <div>
                <label style={lblStyle}>Justificación técnica *</label>
                <textarea
                  value={informeObsolescencia}
                  onChange={e => cambiarCampo('informeObsolescencia', e.target.value, setInformeObsolescencia)}
                  placeholder="Detallá técnicamente las razones de la baja: estado del equipo, evaluación costo-beneficio, antecedentes de fallas, recomendaciones del fabricante, etc."
                  rows={5}
                  style={{ ...inpStyleErr('informeObsolescencia'), resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }}
                />
                {errores.informeObsolescencia && <span style={errStyle}>⚠ {errores.informeObsolescencia}</span>}
                {!errores.informeObsolescencia && (
                  <span style={{
                    display: 'block', fontSize: 11, color: '#9E9CBB',
                    marginTop: 4, fontStyle: 'italic'
                  }}>
                    {informeObsolescencia.length} / mínimo 20 caracteres
                  </span>
                )}
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
                {editando ? '✓ Actualizar baja' : '✓ Confirmar baja'}
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

        .react-datepicker-wrapper { width: 100%; }
        .react-datepicker__input-container { width: 100%; }

        .react-datepicker {
          border: none !important;
          border-radius: 16px !important;
          overflow: hidden;
          box-shadow: 0 16px 40px rgba(0,0,0,.15);
          font-family: inherit;
        }

        .react-datepicker__header {
          background: #2C7DA0;
          border-bottom: none;
          padding: 14px 0;
        }

        .react-datepicker__current-month {
          color: white;
          font-size: 15px;
          font-weight: 600;
        }

        .react-datepicker__day-name {
          color: rgba(255,255,255,.9);
          font-size: 12px;
          font-weight: 600;
          width: 2.3rem;
          line-height: 2.3rem;
        }

        .react-datepicker__navigation { top: 14px; }
        .react-datepicker__navigation-icon::before {
          border-color: white;
          border-width: 2px 2px 0 0;
        }

        .react-datepicker__month { margin: 12px; }

        .react-datepicker__day {
          width: 2.3rem;
          line-height: 2.3rem;
          margin: .15rem;
          border-radius: 10px;
          font-size: 13px;
          transition: all .2s ease;
        }

        .react-datepicker__day:hover {
          background: #E8F4F8;
          color: #2C7DA0;
        }

        .react-datepicker__day--today {
          border: 2px solid #2C7DA0;
          background: white;
          color: #2C7DA0;
          font-weight: 700;
        }

        .react-datepicker__day--selected,
        .react-datepicker__day--keyboard-selected {
          background: #2C7DA0 !important;
          color: white !important;
          border-radius: 10px;
        }

        .react-datepicker__day--disabled {
          color: #C5CBD3 !important;
          cursor: not-allowed !important;
        }

        .react-datepicker__day--outside-month { color: #C5CBD3; }
        .react-datepicker__triangle { display: none; }
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

export default BajasPatrimoniales;