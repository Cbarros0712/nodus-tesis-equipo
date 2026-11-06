import { useState, useEffect, useMemo, forwardRef } from 'react';
import api from '../api';
import { useToast, mensajeDeError } from '../components/Toast';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { FiCalendar } from "react-icons/fi";
import { puedeHacer } from '../permisos';

const CustomDateInput = forwardRef(({ value, onClick, onKeyDown, etiqueta, invalido }, ref) => (
  <button
    type="button"
    ref={ref}
    onClick={onClick}
    onKeyDown={(e) => {
      if (e.key === 'Enter') { e.preventDefault(); onClick(e); return; }
      if (e.key === ' ') return;
      if (onKeyDown) onKeyDown(e);
    }}
    className="fecha-input"
    aria-label={`${etiqueta}: ${value || 'sin seleccionar'}. Abrir calendario`}
    aria-invalid={invalido || undefined}
    style={{
      width: "100%",
      minHeight: "56px",
      border: invalido ? '1.5px solid #B93B1B' : '1px solid #8493A2',
      borderRadius: "12px",
      padding: "0 20px",
      display: "flex",
      alignItems: "center",
      gap: "14px",
      boxSizing: "border-box",
      background: "white",
      cursor: "pointer",
      font: "inherit"
    }}
  >
    <span
      style={{
        flex: 1,
        color: value ? "#1F2937" : "#5C6B7A",
        fontSize: "14px",
        textAlign: "center",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        letterSpacing: "0.02em"
      }}
    >
      {value || "dd/mm/aaaa"}
    </span>
    <FiCalendar color="#5C6B7A" size={18} aria-hidden="true" />
  </button>
));

const MIN_SINTOMA = 10;
const MAX_SINTOMA = 1000;

const normalizar = (t) => String(t ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const TIPOS = [
  { nombre: 'Correctiva', icono: '🔧' },
  { nombre: 'Preventiva', icono: '📆' }
];

const ESTADOS = [
  { nombre: 'Pendiente', color: { bg: '#FAEEDA', fg: '#633806' } },
  { nombre: 'En curso',  color: { bg: '#E6F1FB', fg: '#0C447C' } },
  { nombre: 'Cerrada',   color: { bg: '#E1F5EE', fg: '#0F6E56' } },
  { nombre: 'Anulada',   color: { bg: '#F1EFE8', fg: '#444441' } }
];

const ID_ESTADO_BAJA_PATRIMONIAL = 5;

function OrdenesTrabajo({ auth }) {
  const toast = useToast();
  const puedeGestionar = puedeHacer(auth?.usuario?.rol, 'crear_ot');
  const [ots, setOts] = useState([]);
  const [equipos, setEquipos] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [intervenciones, setIntervenciones] = useState([]);

  const hoy = (() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  })();

  const [fechaApertura, setFechaApertura] = useState('');
  const [tipo, setTipo] = useState('');
  const [sintoma, setSintoma] = useState('');
  const [estado, setEstado] = useState('Pendiente');
  const [idEquipo, setIdEquipo] = useState('');
  const [idServicio, setIdServicio] = useState('');
  const [idUsuario, setIdUsuario] = useState('');
  const [editando, setEditando] = useState(null);
  const [errores, setErrores] = useState({});

  const [buscadorEquipo, setBuscadorEquipo] = useState('');
  const [mostrarLista, setMostrarLista] = useState(false);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [tabActivo, setTabActivo] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [busquedaAbierta, setBusquedaAbierta] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');
  const [guardando, setGuardando] = useState(false);

  const cargarTodo = async () => {
    setCargando(true);
    setErrorCarga('');
    try {
      await Promise.all([
        cargarOTs(),
        cargarIntervenciones(),
        puedeGestionar ? Promise.all([cargarEquipos(), cargarServicios(), cargarUsuarios()]) : Promise.resolve()
      ]);
    } catch {
      setErrorCarga('No se pudieron cargar las órdenes de trabajo. Revisá la conexión e intentá de nuevo.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargarTodo(); }, []);

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape' && modalAbierto) cerrarModal(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [modalAbierto]);

  const cargarOTs            = async () => { const r = await api.get('/ordenestrabajo');   setOts(r.data); };
  const cargarEquipos        = async () => { const r = await api.get('/equipos');          setEquipos(r.data); };
  const cargarServicios      = async () => { const r = await api.get('/servicios');        setServicios(r.data); };
  const cargarUsuarios       = async () => { const r = await api.get('/usuarios');         setUsuarios(r.data); };
  const cargarIntervenciones = async () => { const r = await api.get('/intervenciones');   setIntervenciones(r.data); };

  const esEditable = (ot) => ot.estado !== 'Cerrada' && ot.estado !== 'Anulada';

  const tieneSegElectricaAprobada = (idOT) => {
    const ultima = intervenciones
      .filter(i => i.idOT === Number(idOT))
      .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '') || b.idIntervencion - a.idIntervencion)[0];
    return ultima?.resultadoSegElectrica === 'Aprobado';
  };

  const equipoInhabilitado = (equipo) => equipo?.idEstado === ID_ESTADO_BAJA_PATRIMONIAL;

  const equiposDisponibles = useMemo(() => {
    return equipos.filter(eq => !equipoInhabilitado(eq));
  }, [equipos]);

  const equiposFiltradosBuscador = useMemo(() => {
    const q = normalizar(buscadorEquipo.trim());
    if (!q) return equiposDisponibles.slice(0, 10);
    return equiposDisponibles.filter(e =>
      normalizar(e.modelo).includes(q) ||
      normalizar(e.marca?.nombre).includes(q) ||
      normalizar(e.nroSerie).includes(q)
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

  const otsFiltradas = useMemo(() => {
    let lista = [...ots];
    if (tabActivo !== 'todos') {
      lista = lista.filter(o => o.estado === tabActivo);
    }
    if (busqueda.trim()) {
      const q = normalizar(busqueda.trim());
      lista = lista.filter(o =>
        normalizar(o.equipo?.modelo).includes(q) ||
        normalizar(o.equipo?.marca?.nombre).includes(q) ||
        normalizar(o.equipo?.nroSerie).includes(q) ||
        normalizar(o.sintoma).includes(q) ||
        normalizar(o.tipo).includes(q)
      );
    }
    return lista;
  }, [ots, tabActivo, busqueda]);

  const estadosConOTs = useMemo(() => {
    return ESTADOS
      .map(e => ({ nombre: e.nombre, cantidad: ots.filter(o => o.estado === e.nombre).length }))
      .filter(e => e.cantidad > 0);
  }, [ots]);

  const abrirModalNuevo = () => { limpiar(); setModalAbierto(true); };

  const intentarEditar = (o) => {
    if (!puedeGestionar) return;
    if (!esEditable(o)) {
      toast.warning('OT no editable', 'Los registros finalizados son inalterables por auditoría.');
      return;
    }
    setFechaApertura(o.fechaApertura?.split('T')[0] || '');
    setTipo(o.tipo);
    setSintoma(o.sintoma);
    setEstado(o.estado);
    setIdEquipo(o.idEquipo);
    setIdServicio(o.idServicio);
    setIdUsuario(o.idUsuario);
    setEditando(o.idOT);
    setErrores({});
    setModalAbierto(true);
  };

  const cerrarModal = () => { if (guardando) return; setModalAbierto(false); limpiar(); };

  const validar = () => {
    const errs = {};
    if (!fechaApertura) errs.fechaApertura = 'Falta la fecha de apertura';
    else if (fechaApertura > hoy) errs.fechaApertura = 'La fecha no puede ser futura';
    if (!tipo) errs.tipo = 'Falta seleccionar el tipo de OT';
    if (!idEquipo) errs.idEquipo = 'Falta seleccionar el equipo';
    if (!idServicio) errs.idServicio = 'Falta seleccionar el servicio';
    if (!idUsuario) errs.idUsuario = 'Falta seleccionar el responsable';
    if (!sintoma || !sintoma.trim())
      errs.sintoma = 'Describí el síntoma o el trabajo a realizar';
    else if (sintoma.trim().length < MIN_SINTOMA)
      errs.sintoma = `La descripción debe tener al menos ${MIN_SINTOMA} caracteres`;
    else if (sintoma.trim().length > MAX_SINTOMA)
      errs.sintoma = `La descripción no puede superar los ${MAX_SINTOMA} caracteres`;

    const equipoSel = equipos.find(eq => eq.idEquipo === parseInt(idEquipo));
    if (equipoInhabilitado(equipoSel)) {
      errs.idEquipo = 'Error: Equipo inactivo por baja técnica definitiva';
    }
    return errs;
  };

  const guardar = async () => {
    if (!puedeGestionar || guardando) return;
    const errs = validar();
    setErrores(errs);
    if (Object.keys(errs).length > 0) return;

    const data = {
      idOT: editando || 0,
      fechaApertura,
      tipo,
      sintoma: sintoma.trim(),
      idEquipo: parseInt(idEquipo),
      idServicio: parseInt(idServicio),
      idUsuario: parseInt(idUsuario),
    };
    const eraEdicion = !!editando;
    setGuardando(true);
    try {
      if (eraEdicion) {
        await api.put(`/ordenestrabajo/${editando}`, data);
      } else {
        await api.post('/ordenestrabajo', data);
      }
      setGuardando(false);
      cerrarModal();
      toast.success(eraEdicion ? 'OT actualizada' : 'OT registrada',
        eraEdicion ? 'Los cambios de la orden de trabajo se guardaron correctamente.' : 'La orden de trabajo quedó en estado Pendiente.');
      cargarOTs();
      cargarEquipos();
      cargarIntervenciones();
    } catch (err) {
      setErrores({ __general: mensajeDeError(err, 'No se pudo guardar la OT. Revisá los datos e intentá de nuevo.') });
    } finally {
      setGuardando(false);
    }
  };

  const limpiar = () => {
    setFechaApertura(hoy); setTipo(''); setSintoma(''); setEstado('Pendiente');
    setIdEquipo(''); setIdServicio(''); setIdUsuario('');
    setEditando(null); setErrores({});
    setBuscadorEquipo(''); setMostrarLista(false);
  };

  const cambiarCampo = (campo, valor, setter) => {
    setter(valor);
    if (errores[campo]) {
      setErrores(prev => { const n = { ...prev }; delete n[campo]; return n; });
    }
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

  const chipEstadoOT = (nombre) => {
    const map = {
      'Pendiente':  { bg: '#FAEEDA', fg: '#633806' },
      'En curso':   { bg: '#E6F1FB', fg: '#0C447C' },
      'Cerrada':    { bg: '#E1F5EE', fg: '#0F6E56' },
      'Anulada':    { bg: '#F1EFE8', fg: '#444441' }
    };
    return map[nombre] || map['Anulada'];
  };

  const tabStyle = (activo) => ({
    padding: '10px 0',
    fontSize: 14,
    fontWeight: activo ? 600 : 400,
    color: activo ? '#1a1a1a' : '#5C6B7A',
    cursor: 'pointer', background: 'none', borderWidth: 0, font: 'inherit',
    borderBottomWidth: 3, borderBottomStyle: 'solid',
    borderBottomColor: activo ? '#1F6E8F' : 'transparent',
    transition: 'all 0.15s'
  });

  const fmtFecha = (s) => {
    if (!s) return '';
    const fecha = s.split('T')[0];
    const [y, m, d] = fecha.split('-');
    return `${d}/${m}/${y}`;
  };

  const inpStyleErr = (campo) => ({
    ...inpStyle,
    border: errores[campo] ? '1.5px solid #B93B1B' : '1.5px solid #8493A2',
    background: errores[campo] ? '#FFF8F9' : 'white'
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
            }}>GESTIÓN DE MANTENIMIENTO</h2>

            <span style={{
              background: 'rgba(124, 110, 250, 0.12)',
              color: '#4B3FBF',
              border: '1px solid rgba(124, 110, 250, 0.25)',
              padding: '4px 12px', borderRadius: 8,
              fontSize: 12, fontWeight: 600, letterSpacing: '0.5px'
            }}>ÓRDENES DE TRABAJO</span>

            <p style={{ fontSize: 13, color: '#5C6B7A', margin: 0, marginLeft: 8 }}>
              Mantenimiento, reparación y calibración de equipos
            </p>
          </div>

          {puedeGestionar && (
          <button
            type="button"
            onClick={abrirModalNuevo}
            style={{
              background: '#F0F6FA', color: '#4A5868', border: 'none',
              borderRadius: 6, padding: '10px 16px', fontSize: 11,
              fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase',
              cursor: 'pointer', transition: 'background 0.15s, color 0.15s'
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = '#E0EBF3'; e.currentTarget.style.color = '#1F6E8F'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = '#F0F6FA'; e.currentTarget.style.color = '#4A5868'; }}
          >+ REGISTRAR OT</button>
          )}
        </div>

        {}
        <div style={{
          display: 'flex', gap: 24, borderBottom: '1px solid #C5CFD8',
          marginTop: 18, alignItems: 'center', flexWrap: 'wrap'
        }}>
          <button type="button" onClick={() => setTabActivo('todos')} aria-pressed={tabActivo === 'todos'} style={tabStyle(tabActivo === 'todos')}>
            Todos ({ots.length})
          </button>

          {estadosConOTs.map(e => (
            <button type="button" key={e.nombre} onClick={() => setTabActivo(e.nombre)}
              aria-pressed={tabActivo === e.nombre}
              style={tabStyle(tabActivo === e.nombre)}>
              {e.nombre} ({e.cantidad})
            </button>
          ))}

          {}
          <div style={{
            marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6,
            background: busquedaAbierta ? '#F0F6FA' : 'transparent',
            borderRadius: 8, padding: busquedaAbierta ? '4px 10px' : '4px',
            transition: 'all 0.2s'
          }}>
            <input
              type="search" placeholder="Buscar equipo, marca, síntoma..."
              aria-label="Buscar órdenes de trabajo"
              value={busqueda} onChange={e => setBusqueda(e.target.value)}
              autoFocus={busquedaAbierta} tabIndex={busquedaAbierta ? 0 : -1}
              style={{
                background: 'transparent', border: 'none', outline: 'none',
                fontSize: 13, padding: '4px 0', color: '#4A5868',
                width: busquedaAbierta ? 220 : 0,
                transition: 'width 0.2s', overflow: 'hidden'
              }}
            />
            {busqueda && busquedaAbierta && (
              <button type="button" onClick={() => setBusqueda('')} title="Limpiar" aria-label="Limpiar búsqueda"
                style={{ color: '#5C6B7A', fontSize: 14, cursor: 'pointer', background: 'none', border: 'none', padding: 4 }}>✕</button>
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
              style={{ color: '#5C6B7A', fontSize: 16, cursor: 'pointer', background: 'none', border: 'none', padding: 6 }}
            ><span aria-hidden="true">🔍</span></button>
          </div>
        </div>
      </div>

      {errorCarga && (
        <div role="alert" style={{ margin: '12px 24px 0', background: '#FDECEE', border: '1px solid #F5C2C7', color: '#842029', padding: '12px 14px', borderRadius: 10, fontSize: 13, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <span>⚠ {errorCarga}</span>
          <button type="button" onClick={cargarTodo} style={btnGhost}>Reintentar</button>
        </div>
      )}
      <div role="status" style={{ padding: '10px 24px 0', background: '#F7F9FB', fontSize: 12, color: '#5C6B7A' }}>
        {cargando
          ? 'Cargando órdenes de trabajo…'
          : `${otsFiltradas.length} orden${otsFiltradas.length !== 1 ? 'es' : ''} de trabajo${otsFiltradas.length !== ots.length ? ` (de ${ots.length})` : ''}`}
        {(busqueda.trim() || tabActivo !== 'todos') && (
          <button type="button" onClick={() => { setBusqueda(''); setTabActivo('todos'); }}
            style={{ marginLeft: 8, background: 'none', border: 'none', color: '#1F6E8F', textDecoration: 'underline', cursor: 'pointer', fontSize: 12 }}>
            Limpiar filtros
          </button>
        )}
      </div>

      <div style={{
        padding: '24px', background: '#F7F9FB',
        minHeight: 'calc(100vh - 200px)',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 16, alignContent: 'flex-start'
      }}>
        {otsFiltradas.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 60, color: '#5C6B7A', fontSize: 13 }}>
            {cargando ? '' : ots.length === 0 ? 'No hay órdenes de trabajo.' : 'No hay OTs que coincidan con el filtro.'}
          </div>
        ) : (
          otsFiltradas.map(o => {
            const cm = colorMarca(o.equipo?.marca?.nombre);
            const ce = chipEstadoOT(o.estado);
            const editable = esEditable(o);
            const tieneSegElect = tieneSegElectricaAprobada(o.idOT);
            return (
              <div
                key={o.idOT}
                style={{
                  background: 'white', border: '1px solid #EEF1F4',
                  borderRadius: 12, padding: 16,
                  display: 'flex', flexDirection: 'column', gap: 10,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                  transition: 'box-shadow 0.15s', position: 'relative'
                }}
                onMouseOver={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)'}
                onMouseOut={(e) => e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.02)'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', lineHeight: 1.3 }}>
                    {o.tipo}
                    <span style={{ fontSize: 12, color: '#5C6B7A', fontWeight: 500, marginLeft: 6 }}>
                      OT {o.idOT}
                    </span>
                  </div>
                  {editable && !puedeGestionar ? null : editable ? (
                    <button
                      type="button"
                      onClick={() => intentarEditar(o)} title="Editar OT" aria-label={`Editar OT ${o.idOT}`}
                      style={{
                        background: '#F0F6FA', color: '#4A5868', border: 'none',
                        borderRadius: 4, padding: '6px 10px', fontSize: 13,
                        cursor: 'pointer', flexShrink: 0
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = '#E0EBF3'}
                      onMouseOut={(e) => e.currentTarget.style.background = '#F0F6FA'}
                    >✏</button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => intentarEditar(o)}
                      title="Registro finalizado - inalterable por auditoría (PBI-05)"
                      aria-label={`OT ${o.idOT} finalizada, no editable`}
                      style={{
                        background: '#F1F4F7', color: '#5C6B7A', border: 'none',
                        borderRadius: 4, padding: '6px 10px', fontSize: 13,
                        cursor: 'not-allowed', flexShrink: 0
                      }}
                    ><span aria-hidden="true">🔒</span></button>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, color: '#5C6B7A' }}>
                    📅 {fmtFecha(o.fechaApertura)}
                  </span>
                  <span style={{
                    display: 'inline-block', padding: '3px 10px', borderRadius: 999,
                    background: ce.bg, color: ce.fg, fontSize: 11, fontWeight: 600
                  }}>{o.estado}</span>
                </div>

                <div style={{
                  fontSize: 13, color: '#2D3748', lineHeight: 1.4,
                  display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
                  overflow: 'hidden', textOverflow: 'ellipsis', minHeight: 56
                }} title={o.sintoma}>
                  {o.sintoma}
                </div>

                <div style={{ borderTop: '1px solid #F1F4F7', margin: '4px 0' }}></div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{
                    display: 'inline-block', padding: '3px 10px', borderRadius: 999,
                    background: cm.bg, color: cm.fg, fontSize: 11, fontWeight: 500
                  }}>{o.equipo?.marca?.nombre || '—'}</span>

                  {editable && (
                    <span
                      title={tieneSegElect ? 'Seguridad eléctrica aprobada' : 'Falta registrar seguridad eléctrica aprobada'}
                      style={{ fontSize: 12, fontWeight: 600, color: tieneSegElect ? '#0B5A46' : '#7A4A00' }}
                    >
                      {tieneSegElect ? '⚡✓ Seg. eléctrica OK' : '⚡⚠ Falta seg. eléctrica'}
                    </span>
                  )}
                </div>

                <div style={{ fontSize: 13, color: '#2D3748', fontWeight: 500 }}>
                  {o.equipo?.modelo || '—'}
                </div>
              </div>
            );
          })
        )}
      </div>

      {}
      {modalAbierto && (
        <div
          onClick={cerrarModal}
          role="dialog" aria-modal="true" aria-labelledby="titulo-modal-ot"
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
                background: 'linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24, flexShrink: 0
              }}>
                {editando ? '✏️' : '🔧'}
              </div>
              <div style={{ flex: 1 }}>
                <h3 id="titulo-modal-ot" style={{ margin: 0, color: '#1a1a1a', fontSize: 18, fontWeight: 700 }}>
                  {editando ? 'Editar Orden de Trabajo' : 'Orden de Trabajo'}
                </h3>
                <p style={{ margin: '4px 0 0', color: '#5C6B7A', fontSize: 13 }}>
                  {editando
                    ? 'Modificá los datos del trabajo técnico registrado'
                    : 'Registrá una nueva OT para mantenimiento, reparación o calibración'}
                </p>
              </div>
              <button
                type="button"
                onClick={cerrarModal}
                aria-label="Cerrar"
                style={{
                  background: '#EAF0F5', border: 'none',
                  width: 36, height: 36, borderRadius: 8,
                  fontSize: 18, cursor: 'pointer', color: '#3F4D5B',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
                title="Cerrar (Esc)"
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
                  <span style={{ fontSize: 18 }}>⚠</span>
                  <span>{errores.__general}</span>
                </div>
              )}

              {}
              <SeccionTitulo icono="🎯" titulo="Tipo de intervención" />
              <div role="group" aria-label="Tipo de intervención" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                {TIPOS.map(t => {
                  const seleccionado = tipo === t.nombre;
                  return (
                    <button
                      key={t.nombre} type="button" aria-pressed={seleccionado}
                      onClick={() => cambiarCampo('tipo', t.nombre, setTipo)}
                      style={{
                        padding: '10px 14px', borderRadius: 10,
                        border: seleccionado ? '2px solid #1F6E8F' : '2px solid #8493A2',
                        background: seleccionado ? '#E6F1FB' : 'white',
                        color: seleccionado ? '#0C447C' : '#4A5868',
                        fontSize: 12, fontWeight: seleccionado ? 600 : 500,
                        cursor: 'pointer', transition: 'all 0.15s',
                        display: 'flex', alignItems: 'center', gap: 6,
                        boxShadow: seleccionado ? '0 2px 8px rgba(44,125,160,0.15)' : 'none'
                      }}
                    >
                      <span aria-hidden="true">{t.icono}</span>
                      {t.nombre}
                    </button>
                  );
                })}
              </div>
              {errores.tipo && <span role="alert" style={errStyle}>⚠ {errores.tipo}</span>}

              {}
              <div style={{ marginTop: 22 }}>
                <SeccionTitulo icono="🏥" titulo="Equipo a intervenir" />
                <div
                  style={{ position: 'relative' }}
                  onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setMostrarLista(false); }}
                  onKeyDown={(e) => { if (e.key === 'Escape' && mostrarLista) { e.stopPropagation(); setMostrarLista(false); } }}
                >
                  <label htmlFor="buscar-equipo" style={lblStyle}>Equipo *</label>

                  {equipoSeleccionado ? (
                    <div style={{
                      ...inpStyleErr('idEquipo'),
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 12px', background: '#F0F6FA',
                      border: '1.5px solid #1F6E8F'
                    }}>
                      <span aria-hidden="true" style={{ fontSize: 14 }}>✓</span>
                      <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>
                        {equipoSeleccionado.modelo}
                      </div>
                      <button
                        type="button" onClick={limpiarEquipo}
                        title="Cambiar equipo" aria-label="Cambiar equipo"
                        style={{
                          background: 'transparent', border: 'none',
                          color: '#5C6B7A', fontSize: 16, cursor: 'pointer',
                          padding: '6px 10px', borderRadius: 6
                        }}
                      >✕</button>
                    </div>
                  ) : (
                    <>
                      <div style={{
                        position: 'relative', ...inpStyleErr('idEquipo'),
                        padding: 0, display: 'flex', alignItems: 'center'
                      }}>
                        <span aria-hidden="true" style={{
                          position: 'absolute', left: 12, top: '50%',
                          transform: 'translateY(-50%)',
                          color: '#5C6B7A', fontSize: 14, pointerEvents: 'none'
                        }}>🔍</span>
                        <input
                          id="buscar-equipo" aria-invalid={!!errores.idEquipo} autoComplete="off"
                          type="text" value={buscadorEquipo}
                          onChange={e => { setBuscadorEquipo(e.target.value); setMostrarLista(true); }}
                          onFocus={() => setMostrarLista(true)}
                          placeholder="Buscar por modelo, marca o N° de serie..."
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
                          border: '1px solid #8493A2', borderRadius: 8,
                          marginTop: 4, maxHeight: 280, overflowY: 'auto',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                          zIndex: 10
                        }}>
                          {equiposFiltradosBuscador.length === 0 ? (
                            <div style={{ padding: '16px', textAlign: 'center', color: '#5C6B7A', fontSize: 12 }}>
                              {equiposDisponibles.length === 0
                                ? 'No hay equipos disponibles'
                                : `No se encontraron equipos con "${buscadorEquipo}"`}
                            </div>
                          ) : (
                            equiposFiltradosBuscador.map(eq => (
                              <button
                                type="button"
                                key={eq.idEquipo} onClick={() => seleccionarEquipo(eq)}
                                style={{
                                  display: 'block', width: '100%', textAlign: 'left', font: 'inherit',
                                  padding: '10px 14px', cursor: 'pointer', background: 'white', border: 'none',
                                  borderBottom: '1px solid #E5EDF3',
                                  fontSize: 13, fontWeight: 500, color: '#1a1a1a',
                                  transition: 'background 0.1s'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.background = '#F0F6FA'}
                                onMouseOut={(e) => e.currentTarget.style.background = 'white'}
                              >
                                {eq.modelo}
                                {(eq.marca?.nombre || eq.nroSerie) && (
                                  <span style={{ display: 'block', fontSize: 12, fontWeight: 400, color: '#5C6B7A' }}>
                                    {[eq.marca?.nombre, eq.nroSerie && `S/N ${eq.nroSerie}`].filter(Boolean).join(' · ')}
                                  </span>
                                )}
                              </button>
                            ))
                          )}
                        </div>
                      )}
                      <small style={{ color: '#5C6B7A', display: 'block', marginTop: 4, fontSize: 12, fontStyle: 'italic' }}>
                        Los equipos dados de baja no se muestran (US-05).
                      </small>
                    </>
                  )}

                  {errores.idEquipo && <span role="alert" style={errStyle}>⚠ {errores.idEquipo}</span>}
                </div>
              </div>

              {}
              <div style={{ marginTop: 22 }}>
                <SeccionTitulo icono="📋" titulo="Asignación y fecha" />
                <div className="rwd-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                 <label style={lblStyle}>Fecha de apertura *</label>
                    <DatePicker
                      selected={fechaApertura ? new Date(fechaApertura + 'T00:00:00') : null}
                      onChange={(date) => {
                        if (date) {
                          const yyyy = date.getFullYear();
                          const mm = String(date.getMonth() + 1).padStart(2, '0');
                          const dd = String(date.getDate()).padStart(2, '0');
                          cambiarCampo('fechaApertura', `${yyyy}-${mm}-${dd}`, setFechaApertura);
                        }
                      }}
                      dateFormat="dd/MM/yyyy"
                      maxDate={new Date()}
                      customInput={<CustomDateInput etiqueta="Fecha de apertura" invalido={!!errores.fechaApertura} />}
                    />
                    {errores.fechaApertura && <span role="alert" style={errStyle}>⚠ {errores.fechaApertura}</span>}
                  </div>
                  <div>
                    <label htmlFor="ot-servicio" style={lblStyle}>Servicio *</label>
                    <select
                      id="ot-servicio" aria-invalid={!!errores.idServicio}
                      value={idServicio}
                      onChange={e => cambiarCampo('idServicio', e.target.value, setIdServicio)}
                      style={inpStyleErr('idServicio')}
                    >
                      <option value="">Seleccionar...</option>
                      {servicios.map(s => <option key={s.idServicio} value={s.idServicio}>{s.nombre}</option>)}
                    </select>
                    {errores.idServicio && <span role="alert" style={errStyle}>⚠ {errores.idServicio}</span>}
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label htmlFor="ot-responsable" style={lblStyle}>Usuario responsable *</label>
                    <select
                      id="ot-responsable" aria-invalid={!!errores.idUsuario}
                      value={idUsuario}
                      onChange={e => cambiarCampo('idUsuario', e.target.value, setIdUsuario)}
                      style={inpStyleErr('idUsuario')}
                    >
                      <option value="">Seleccionar responsable...</option>
                      {usuarios.map(u => <option key={u.idUsuario} value={u.idUsuario}>{u.nombre}</option>)}
                    </select>
                    {errores.idUsuario && <span role="alert" style={errStyle}>⚠ {errores.idUsuario}</span>}
                  </div>
                </div>
              </div>

              {}
              {editando && (
                <div style={{ marginTop: 22 }}>
                  <SeccionTitulo icono="🚦" titulo="Estado de la OT" />
                  <span style={{
                    display: 'inline-block', padding: '6px 14px', borderRadius: 999,
                    background: chipEstadoOT(estado).bg, color: chipEstadoOT(estado).fg,
                    fontSize: 13, fontWeight: 600
                  }}>{estado}</span>
                  <small style={{ color: '#5C6B7A', fontSize: 12, marginTop: 8, display: 'block' }}>
                    El estado cambia automáticamente: Pendiente al crear; En curso al registrar una tarea; Cerrada al cargar la fecha de fin.
                  </small>
                </div>
              )}

              {}
              <div style={{ marginTop: 22 }}>
                <SeccionTitulo icono="📝" titulo="Descripción del trabajo" />
                <label htmlFor="ot-sintoma" style={lblStyle}>Síntoma o descripción *</label>
                <textarea
                  id="ot-sintoma" aria-invalid={!!errores.sintoma} maxLength={MAX_SINTOMA}
                  value={sintoma}
                  onChange={e => cambiarCampo('sintoma', e.target.value, setSintoma)}
                  placeholder="Describí la falla, el síntoma observado o la tarea a realizar"
                  rows={4}
                  style={{ ...inpStyleErr('sintoma'), resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }}
                />
                {errores.sintoma && <span role="alert" style={errStyle}>⚠ {errores.sintoma}</span>}
                <span style={{ display: 'block', fontSize: 12, color: '#5C6B7A', marginTop: 4, fontStyle: 'italic' }}>
                  {sintoma.length} / {MAX_SINTOMA} caracteres (mínimo {MIN_SINTOMA})
                </span>
              </div>
            </div>

            {}
            <div style={{
              padding: '16px 28px',
              borderTop: '1px solid #E5EDF3',
              background: '#F8FAFC',
              borderBottomLeftRadius: 16,
              borderBottomRightRadius: 16,
              display:'flex', justifyContent:'flex-end', gap:10
            }}>
              <button type="button" onClick={cerrarModal} disabled={guardando} style={btnGhost}>Cancelar</button>
              <button type="button" onClick={guardar} disabled={guardando}
                style={{ ...btnSave, opacity: guardando ? 0.6 : 1, cursor: guardando ? 'not-allowed' : 'pointer' }}>
                {guardando ? 'Guardando…' : editando ? '✓ Actualizar OT' : '✓ Registrar OT'}
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

        .react-datepicker-wrapper { width: 100%; display: block; }
        .react-datepicker__input-container { width: 100%; display: block; }

        .react-datepicker {
          border: none !important;
          border-radius: 16px !important;
          overflow: hidden;
          box-shadow: 0 16px 40px rgba(0,0,0,.15);
          font-family: inherit;
        }
        .fecha-input:hover { background: #F0F6FA !important; border-color: #1F6E8F !important; }

        .react-datepicker__header {
          background: #1F6E8F;
          border-bottom: none;
          padding: 14px 0;
        }
        .react-datepicker__current-month {
          color: white;
          font-size: 15px;
          font-weight: 600;
        }
        .react-datepicker__day-name {
          color: #FFFFFF;
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
          color: #1B6585;
        }
        .react-datepicker__day--today {
          border: 2px solid #1F6E8F;
          background: white;
          color: #1B6585;
          font-weight: 700;
        }
        .react-datepicker__day--selected,
        .react-datepicker__day--keyboard-selected {
          background: #1F6E8F !important;
          color: white !important;
          border-radius: 10px;
        }
        .react-datepicker__day--outside-month { color: #6B7785; }
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

const lblStyle = {
  display:'block', fontSize:11, fontWeight:600, color:'#4A5868',
  marginBottom:6, letterSpacing: '0.02em'
};
const inpStyle = {
  width:'100%', padding: '10px 12px',
  border:'1.5px solid #8493A2', borderRadius: 8,
  fontSize:13, background: 'white',
  transition: 'all 0.15s', outline: 'none', fontFamily: 'inherit'
};
const errStyle = {
  display: 'block', color: '#B93B1B', fontSize: 12,
  marginTop: 6, fontWeight: 600
};
const btnGhost = {
  background:'white', color:'#4A5868', border:'1px solid #8493A2',
  padding:'10px 18px', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer'
};
const btnSave = {
  background: 'linear-gradient(135deg, #1B6585 0%, #1F6E8F 100%)',
  color:'white', border:'none',
  padding:'10px 20px', borderRadius:8,
  fontSize:13, fontWeight:600, cursor:'pointer',
  boxShadow: '0 2px 8px rgba(27,101,133,0.25)'
};

export default OrdenesTrabajo;