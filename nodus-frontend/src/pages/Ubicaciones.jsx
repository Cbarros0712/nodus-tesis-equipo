import { useState, useEffect, useMemo, forwardRef } from 'react';
import api from '../api';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { FiCalendar } from "react-icons/fi";

const CustomDateInput = forwardRef(({ value, onClick }, ref) => (
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

function Ubicaciones() {
  const [ubicaciones, setUbicaciones] = useState([]);
  const [equipos, setEquipos] = useState([]);
  const [sectores, setSectores] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [usuarios, setUsuarios] = useState([]);

  const anioActual = new Date().getFullYear();
  const inicioAnio = new Date(anioActual, 0, 1);
  const hoy = new Date();

  const [fechaTraslado, setFechaTraslado] = useState('');
  const [idSectorAnterior, setIdSectorAnterior] = useState('');
  const [idSectorNuevo, setIdSectorNuevo] = useState('');
  const [idEquipo, setIdEquipo] = useState('');
  const [idServicio, setIdServicio] = useState('');
  const [idUsuario, setIdUsuario] = useState('');
  const [editando, setEditando] = useState(null);
  const [errores, setErrores] = useState({});

  const [buscadorEquipo, setBuscadorEquipo] = useState('');
  const [mostrarLista, setMostrarLista] = useState(false);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [modalHistorialEquipo, setModalHistorialEquipo] = useState(null);

  useEffect(() => {
    cargarUbicaciones(); cargarEquipos(); cargarSectores(); cargarServicios(); cargarUsuarios();
  }, []);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key !== 'Escape') return;
      if (modalHistorialEquipo) setModalHistorialEquipo(null);
      else if (modalAbierto) cerrarModal();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [modalAbierto, modalHistorialEquipo]);

  const cargarUbicaciones = async () => { const r = await api.get('/ubicaciones'); setUbicaciones(r.data); };
  const cargarEquipos    = async () => { const r = await api.get('/equipos');     setEquipos(r.data); };
  const cargarSectores   = async () => { const r = await api.get('/sectores');    setSectores(r.data); };
  const cargarServicios  = async () => { const r = await api.get('/servicios');   setServicios(r.data); };
  const cargarUsuarios   = async () => { const r = await api.get('/usuarios');    setUsuarios(r.data); };

  const equiposPorSector = useMemo(() => {
    const map = {};
    sectores.forEach(s => { map[s.idSector] = []; });

    equipos.forEach(eq => {
      const traslados = ubicaciones
        .filter(u => u.idEquipo === eq.idEquipo)
        .sort((a, b) => new Date(b.fechaTraslado) - new Date(a.fechaTraslado));

      const ultimoTraslado = traslados[0];
      if (ultimoTraslado) {
        const idSector = ultimoTraslado.idSectorNuevo;
        if (map[idSector]) {
          map[idSector].push({ ...eq, ultimoTraslado });
        }
      }
    });
    return map;
  }, [equipos, ubicaciones, sectores]);

  const COLORES_SECTOR = [
    { bg: '#E6F1FB', fg: '#0C447C' },
    { bg: '#E1F5EE', fg: '#0F6E56' },
    { bg: '#FAEEDA', fg: '#633806' },
    { bg: '#EEEDFE', fg: '#3C3489' },
    { bg: '#FCE8EF', fg: '#7A1B3E' },
    { bg: '#E6F3F7', fg: '#0F4D5C' },
  ];
  const colorSector = (idSector) => COLORES_SECTOR[idSector % COLORES_SECTOR.length];

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

  const abrirModalNuevo = () => { limpiar(); setModalAbierto(true); };
  const abrirModalEditar = (u) => {
    setFechaTraslado(u.fechaTraslado?.split('T')[0] || '');
    setIdSectorAnterior(u.idSectorAnterior);
    setIdSectorNuevo(u.idSectorNuevo);
    setIdEquipo(u.idEquipo);
    setIdServicio(u.idServicio);
    setIdUsuario(u.idUsuario);
    setEditando(u.idUbicacion);
    setErrores({});
    setModalAbierto(true);
  };
  const cerrarModal = () => { setModalAbierto(false); limpiar(); };

  const equiposFiltradosBuscador = useMemo(() => {
    const q = buscadorEquipo.trim().toLowerCase();
    if (!q) return equipos.slice(0, 10);
    return equipos.filter(e =>
      e.modelo?.toLowerCase().includes(q)
    ).slice(0, 10);
  }, [equipos, buscadorEquipo]);

  const equipoSeleccionado = useMemo(() => {
    return equipos.find(e => e.idEquipo === parseInt(idEquipo));
  }, [equipos, idEquipo]);

  const validar = () => {
    const errs = {};
    if (!idEquipo) errs.idEquipo = 'Falta seleccionar el equipo a trasladar';
    if (!idSectorAnterior) errs.idSectorAnterior = 'Falta el sector de origen';
    if (!idSectorNuevo) errs.idSectorNuevo = 'Falta el sector de destino';
    if (idSectorAnterior && idSectorNuevo && idSectorAnterior === idSectorNuevo) {
      errs.idSectorNuevo = 'El sector destino debe ser diferente al de origen';
    }
    if (!fechaTraslado) errs.fechaTraslado = 'Falta la fecha del traslado';
    else if (new Date(fechaTraslado) > hoy) errs.fechaTraslado = 'La fecha no puede ser futura';
    if (!idServicio) errs.idServicio = 'Falta seleccionar el servicio';
    if (!idUsuario) errs.idUsuario = 'Falta seleccionar el responsable';
    return errs;
  };

  const guardar = async () => {
    const errs = validar();
    setErrores(errs);
    if (Object.keys(errs).length > 0) return;

    const data = {
      fechaTraslado,
      idSectorAnterior: parseInt(idSectorAnterior),
      idSectorNuevo: parseInt(idSectorNuevo),
      idEquipo: parseInt(idEquipo),
      idServicio: parseInt(idServicio),
      idUsuario: parseInt(idUsuario)
    };
    try {
      if (editando) {
        await api.put(`/ubicaciones/${editando}`, { idUbicacion: editando, ...data });
      } else {
        await api.post('/ubicaciones', data);
      }
      cerrarModal();
      cargarUbicaciones();
    } catch (err) {
      const mensaje = typeof err.response?.data === 'string'
        ? err.response.data
        : 'No se pudo registrar el traslado. Revisá los datos e intentá de nuevo.';
      setErrores({ __general: mensaje });
    }
  };

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

  const limpiar = () => {
    setFechaTraslado('');
    setIdSectorAnterior('');
    setIdSectorNuevo('');
    setIdEquipo('');
    setIdServicio('');
    setIdUsuario('');
    setEditando(null);
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

  const historialDeEquipo = (idEquipo) => {
    return ubicaciones
      .filter(u => u.idEquipo === idEquipo)
      .sort((a, b) => new Date(b.fechaTraslado) - new Date(a.fechaTraslado));
  };

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
            }}>GESTIÓN PATRIMONIAL</h2>

            <span style={{
              background: 'rgba(124, 110, 250, 0.12)',
              color: '#5e51d6',
              border: '1px solid rgba(124, 110, 250, 0.25)',
              padding: '4px 12px', borderRadius: 8,
              fontSize: 12, fontWeight: 600, letterSpacing: '0.5px'
            }}>UBICACIONES</span>

            <p style={{ fontSize: 13, color: '#6B7C8C', margin: 0, marginLeft: 8 }}>
              Distribución de equipos por sector
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
          >+ REGISTRAR TRASLADO EQUIPO</button>
        </div>
      </div>

      {}
      <div className="rwd-table-wrap" style={{
        padding: '20px 24px', background: 'white',
        display: 'flex', gap: 16, overflowX: 'auto',
        alignItems: 'flex-start', minHeight: 400
      }}>
        {sectores.map(sector => {
          const equiposEnSector = equiposPorSector[sector.idSector] || [];
          const c = colorSector(sector.idSector);
          return (
            <div key={sector.idSector} style={{
              minWidth: 260, maxWidth: 280, flex: '0 0 auto',
              background: '#FAFBFC', borderRadius: 12,
              padding: 14, border: '1px solid #EEF1F4'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <span style={{
                  display: 'inline-block', padding: '5px 14px', borderRadius: 999,
                  background: c.bg, color: c.fg, fontSize: 13, fontWeight: 600
                }}>{sector.nombre}</span>
                <span style={{ color: '#9E9CBB', fontSize: 13, fontWeight: 500 }}>
                  {equiposEnSector.length}
                </span>
              </div>

              {equiposEnSector.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 10px', color: '#C4C9D1', fontSize: 12 }}>
                  Sin equipos
                </div>
              ) : (
                equiposEnSector.map(eq => {
                  const cm = colorMarca(eq.marca?.nombre);
                  return (
                    <div
                      key={eq.idEquipo}
                      onClick={() => setModalHistorialEquipo(eq)}
                      style={{
                        background: 'white', borderRadius: 10, padding: 14,
                        marginBottom: 10, border: '1px solid #EEF1F4',
                        cursor: 'pointer', transition: 'all 0.15s',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.borderColor = '#C8DCEA';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.borderColor = '#EEF1F4';
                        e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.02)';
                      }}
                    >
                      <div style={{ fontSize: 18, fontWeight: 600, color: '#1a1a1a', marginBottom: 8 }}>
                        #{eq.idEquipo}
                      </div>
                      <div style={{ fontSize: 10, color: '#9E9CBB', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Equipo</div>
                      <div style={{
                        display: 'inline-block', padding: '2px 8px', borderRadius: 4,
                        background: '#F1F4F7', fontSize: 11, fontFamily: 'monospace',
                        color: '#4A5868', marginBottom: 10
                      }}>{eq.nroSerie}</div>
                      <div style={{ fontSize: 10, color: '#9E9CBB', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Marca</div>
                      <div style={{ marginBottom: 10 }}>
                        <span style={{
                          display: 'inline-block', padding: '3px 10px', borderRadius: 999,
                          background: cm.bg, color: cm.fg, fontSize: 11, fontWeight: 500
                        }}>{eq.marca?.nombre || '—'}</span>
                      </div>
                      <div style={{ fontSize: 10, color: '#9E9CBB', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Modelo</div>
                      <div style={{ fontSize: 13, color: '#2D3748', fontWeight: 500 }}>
                        {eq.modelo}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          );
        })}

        {sectores.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: '#9E9CBB', flex: 1 }}>
            No hay sectores configurados.
          </div>
        )}
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
              maxWidth:680, width:'100%', maxHeight:'92vh',
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
                background: 'linear-gradient(135deg, #EEF3FB 0%, #DCE7F5 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24, flexShrink: 0
              }}>
                {editando ? '✏️' : '📍'}
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, color: '#1a1a1a', fontSize: 18, fontWeight: 700 }}>
                  {editando ? 'Editar traslado' : 'Traslado de equipo'}
                </h3>
                <p style={{ margin: '4px 0 0', color: '#6B7C8C', fontSize: 13 }}>
                  {editando
                    ? 'Modificá los datos del traslado registrado'
                    : 'Documentá el movimiento del equipo entre sectores del hospital'}
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
              <SeccionTitulo icono="🏥" titulo="Equipo a trasladar" />
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
                      type="button"
                      onClick={limpiarEquipo}
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
                      position: 'relative',
                      ...inpStyleErr('idEquipo'),
                      padding: 0,
                      display: 'flex', alignItems: 'center'
                    }}>
                      <span style={{
                        position: 'absolute', left: 12, top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#9E9CBB', fontSize: 14, pointerEvents: 'none'
                      }}>🔍</span>
                      <input
                        type="text"
                        value={buscadorEquipo}
                        onChange={e => {
                          setBuscadorEquipo(e.target.value);
                          setMostrarLista(true);
                        }}
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
                          <div style={{
                            padding: '16px', textAlign: 'center',
                            color: '#9E9CBB', fontSize: 12
                          }}>
                            No se encontraron equipos con "{buscadorEquipo}"
                          </div>
                        ) : (
                          equiposFiltradosBuscador.map(eq => (
                            <div
                              key={eq.idEquipo}
                              onClick={() => seleccionarEquipo(eq)}
                              style={{
                                padding: '10px 14px',
                                cursor: 'pointer',
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
              <SeccionTitulo icono="🔄" titulo="Movimiento entre sectores" />
              <div className="rwd-grid" style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, alignItems: 'end', marginBottom: 22 }}>
                <div>
                  <label style={lblStyle}>Sector de origen *</label>
                  <select
                    value={idSectorAnterior}
                    onChange={e => cambiarCampo('idSectorAnterior', e.target.value, setIdSectorAnterior)}
                    style={inpStyleErr('idSectorAnterior')}
                  >
                    <option value="">Desde...</option>
                    {sectores.map(s => <option key={s.idSector} value={s.idSector}>{s.nombre}</option>)}
                  </select>
                  {errores.idSectorAnterior && <span style={errStyle}>⚠ {errores.idSectorAnterior}</span>}
                </div>
                <div style={{
                  fontSize: 20, color: '#9E9CBB',
                  paddingBottom: errores.idSectorAnterior || errores.idSectorNuevo ? 26 : 10
                }}>→</div>
                <div>
                  <label style={lblStyle}>Sector destino *</label>
                  <select
                    value={idSectorNuevo}
                    onChange={e => cambiarCampo('idSectorNuevo', e.target.value, setIdSectorNuevo)}
                    style={inpStyleErr('idSectorNuevo')}
                  >
                    <option value="">Hacia...</option>
                    {sectores.map(s => <option key={s.idSector} value={s.idSector}>{s.nombre}</option>)}
                  </select>
                  {errores.idSectorNuevo && <span style={errStyle}>⚠ {errores.idSectorNuevo}</span>}
                </div>
              </div>

              {}
              <SeccionTitulo icono="📋" titulo="Asignación y responsable" />
              <div className="rwd-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 6 }}>
                <div>
                  <label style={lblStyle}>Fecha del traslado *</label>
                  <DatePicker
                    selected={fechaTraslado ? new Date(fechaTraslado) : null}
                    onChange={(date) => {
                      cambiarCampo(
                        "fechaTraslado",
                        date ? date.toISOString().split("T")[0] : "",
                        setFechaTraslado
                      );
                    }}
                    dateFormat="dd/MM/yyyy"
                    maxDate={hoy}
                    minDate={inicioAnio}
                    showYearDropdown
                    scrollableYearDropdown
                    yearDropdownItemNumber={1}
                    customInput={<CustomDateInput />}
                  />
                  {errores.fechaTraslado && <span style={errStyle}>⚠ {errores.fechaTraslado}</span>}
                </div>
                <div>
                  <label style={lblStyle}>Servicio *</label>
                  <select
                    value={idServicio}
                    onChange={e => cambiarCampo('idServicio', e.target.value, setIdServicio)}
                    style={inpStyleErr('idServicio')}
                  >
                    <option value="">Seleccionar servicio...</option>
                    {servicios.map(s => <option key={s.idServicio} value={s.idServicio}>{s.nombre}</option>)}
                  </select>
                  {errores.idServicio && <span style={errStyle}>⚠ {errores.idServicio}</span>}
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
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
                {editando ? '✓ Actualizar traslado' : '✓ Registrar traslado'}
              </button>
            </div>
          </div>
        </div>
      )}

      {}
      {modalHistorialEquipo && (
        <div
          onClick={() => setModalHistorialEquipo(null)}
          className="rwd-modal-overlay"
          style={{
            position:'fixed', top:0, left:0, right:0, bottom:0,
            background:'rgba(0,0,0,0.5)', display:'flex',
            alignItems:'center', justifyContent:'center', zIndex:1001, padding:20
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="rwd-modal-box"
            style={{
              background:'white', borderRadius:12, padding:24,
              maxWidth:600, width:'100%', maxHeight:'90vh',
              overflowY:'auto', boxShadow:'0 10px 40px rgba(0,0,0,0.2)'
            }}
          >
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, borderBottom:'1px solid #eee', paddingBottom:12 }}>
              <div>
                <h3 style={{ margin:0, color:'#1a1a1a' }}>📍 Historial de traslados</h3>
                <div style={{ fontSize:13, color:'#666', marginTop:4 }}>
                  <strong>{modalHistorialEquipo.modelo}</strong> · S/N {modalHistorialEquipo.nroSerie}
                </div>
              </div>
              <button
                onClick={() => setModalHistorialEquipo(null)}
                style={{ background:'none', border:'none', fontSize:24, cursor:'pointer', color:'#999', lineHeight:1 }}
                title="Cerrar (Esc)"
              >✕</button>
            </div>

            {historialDeEquipo(modalHistorialEquipo.idEquipo).length === 0 ? (
              <div style={{ textAlign:'center', padding:40, color:'#9E9CBB', fontSize:13 }}>
                Sin traslados registrados.
              </div>
            ) : (
              historialDeEquipo(modalHistorialEquipo.idEquipo).map((u, idx) => (
                <div key={u.idUbicacion}
                  style={{ border:'1px solid #eee', borderRadius:8, padding:12, marginBottom:10, borderLeft: idx === 0 ? '4px solid #2DD4A0' : '4px solid #C4C9D1' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                    <span style={{ fontSize:11, color:'#9E9CBB', fontWeight:600, textTransform:'uppercase' }}>
                      {idx === 0 ? '⭐ ACTUAL' : 'Traslado anterior'}
                    </span>
                    <span style={{ fontSize:12, color:'#6B7C8C' }}>
                      📅 {u.fechaTraslado?.split('T')[0]}
                    </span>
                  </div>
                  <div style={{ fontSize:13, color:'#2D3748' }}>
                    <strong>{u.sectorAnterior?.nombre || '—'}</strong>
                    <span style={{ margin: '0 8px', color:'#9E9CBB' }}>→</span>
                    <strong>{u.sectorNuevo?.nombre || '—'}</strong>
                  </div>
                  <div style={{ fontSize:12, color:'#6B7C8C', marginTop:6 }}>
                    🏥 {u.servicio?.nombre || '—'} · 👤 {u.usuario?.nombre || '—'}
                  </div>
                </div>
              ))
            )}

            <div style={{ display:'flex', justifyContent:'flex-end', gap:10, marginTop:14, paddingTop:14, borderTop:'1px solid #eee' }}>
              <button onClick={() => setModalHistorialEquipo(null)} style={btnSave}>Cerrar</button>
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

        .react-datepicker-wrapper {
          width: 100%;
        }

        .react-datepicker__input-container {
          width: 100%;
        }

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

        .react-datepicker__navigation {
          top: 14px;
        }

        .react-datepicker__navigation-icon::before {
          border-color: white;
          border-width: 2px 2px 0 0;
        }

        .react-datepicker__month {
          margin: 12px;
        }

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

        .react-datepicker__day--outside-month {
          color: #C5CBD3;
        }

        .react-datepicker__triangle {
          display: none;
        }

        .react-datepicker__year-dropdown {
          border: none;
          border-radius: 12px;
          box-shadow: 0 8px 24px rgba(0,0,0,.12);
        }

        .react-datepicker__year-option:hover {
          background: #E8F4F8;
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

export default Ubicaciones;