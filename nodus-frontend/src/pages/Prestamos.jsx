import { useState, useEffect, useMemo, forwardRef, Fragment } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api';
import { DIAS_AVISO, EVENTO_PRESTAMOS_ACTUALIZADOS, diasParaVencer, estaVencido, estaPorVencer, textoVence } from '../vencimientos';
import { urlRemito, fechaDMY } from '../documentosPrestamo';
import { ModalDevolucion } from '../components/DocumentosPrestamo';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { FiCalendar } from 'react-icons/fi';

const CustomDateInput = forwardRef(({ value, onClick }, ref) => (
  <div
    onClick={onClick}
    ref={ref}
    style={{
      width: '100%', minHeight: 44, border: '1.5px solid #E5EDF3', borderRadius: 8,
      padding: '0 14px', display: 'flex', alignItems: 'center', gap: 10,
      boxSizing: 'border-box', background: '#FAFBFC', cursor: 'pointer'
    }}
  >
    <span style={{ flex: 1, color: value ? '#1F2937' : '#9CA3AF', fontSize: 13 }}>
      {value || 'dd/mm/aaaa'}
    </span>
    <FiCalendar color="#6B7C8C" size={16} />
  </div>
));

const aISODia = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function Prestamos({ auth }) {
  const hoy = new Date();
  const [searchParams] = useSearchParams();
  const prestamoDestacado = Number(searchParams.get('prestamo')) || null;
  const [prestamos, setPrestamos] = useState([]);
  const [equipos, setEquipos] = useState([]);
  const [hospitales, setHospitales] = useState([]);

  const [tabActivo, setTabActivo] = useState('todos');
  const [busqueda, setBusqueda] = useState('');

  const [modalAbierto, setModalAbierto] = useState(false);
  const [idEquipo, setIdEquipo] = useState('');
  const [idHospital, setIdHospital] = useState('');
  const [fechaPrestamo, setFechaPrestamo] = useState('');
  const [fechaEstimada, setFechaEstimada] = useState('');
  const [motivo, setMotivo] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [errores, setErrores] = useState({});

  const [buscadorEquipo, setBuscadorEquipo] = useState('');
  const [mostrarListaEquipo, setMostrarListaEquipo] = useState(false);
  const [buscadorHospital, setBuscadorHospital] = useState('');
  const [mostrarListaHospital, setMostrarListaHospital] = useState(false);
  const [componentesPrestamo, setComponentesPrestamo] = useState([]);

  const [modalDevolucion, setModalDevolucion] = useState(null);

  const [remitoCreado, setRemitoCreado] = useState(null);

  const [modalProrroga, setModalProrroga] = useState(null);
  const [fechaProrroga, setFechaProrroga] = useState('');
  const [motivoProrroga, setMotivoProrroga] = useState('');
  const [errorProrroga, setErrorProrroga] = useState('');

  const [historialAbierto, setHistorialAbierto] = useState({});
  const alternarHistorial = (id) => setHistorialAbierto(prev => ({ ...prev, [id]: !prev[id] }));

  const MOTIVOS_PRESTAMO = [
    { valor: 'Emergencia sanitaria', color: 'rojo' },
    { valor: 'Colaboración interinstitucional', color: 'azul' },
    { valor: 'Falta de equipo propio', color: 'amarillo' },
    { valor: 'Prueba / evaluación técnica', color: 'violeta' },
    { valor: 'Otro', color: 'gris' }
  ];

  const chipMotivo = (color) => {
    const map = {
      rojo:     { bg: '#FAECE7', fg: '#712B13' },
      azul:     { bg: '#E6F1FB', fg: '#0C447C' },
      amarillo: { bg: '#FAEEDA', fg: '#633806' },
      violeta:  { bg: '#EEEDFE', fg: '#3C3489' },
      gris:     { bg: '#F1EFE8', fg: '#444441' }
    };
    return map[color] || map.gris;
  };

  useEffect(() => { cargarTodo(); }, []);

  const cargarTodo = async () => {
    const [rp, re, rh] = await Promise.all([
      api.get('/prestamos'),
      api.get('/equipos'),
      api.get('/hospitalesexternos')
    ]);
    setPrestamos(rp.data);
    setEquipos(re.data);
    setHospitales(rh.data);
    window.dispatchEvent(new CustomEvent(EVENTO_PRESTAMOS_ACTUALIZADOS, { detail: rp.data }));
  };

  useEffect(() => {
    if (prestamoDestacado && prestamos.length > 0)
      document.getElementById(`prestamo-${prestamoDestacado}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [prestamoDestacado, prestamos]);

  const estadoVisual = (p) => {
    if (p.estado === 'Devuelto') return { label: 'Devuelto', bg: '#F1EFE8', fg: '#444441' };
    if (estaVencido(p)) return { label: 'Vencido', bg: '#FAECE7', fg: '#712B13' };
    if (estaPorVencer(p)) return { label: textoVence(diasParaVencer(p)), bg: '#FDEBD0', fg: '#8A4B00' };
    return { label: 'En préstamo', bg: '#E6F1FB', fg: '#0C447C' };
  };

  const prestamosPorVencer = useMemo(() =>
    prestamos.filter(estaPorVencer).sort((a, b) => diasParaVencer(a) - diasParaVencer(b)),
    [prestamos]);

  const prestamosFiltrados = useMemo(() => {
    let lista = [...prestamos];
    if (tabActivo === 'activos') lista = lista.filter(p => p.estado === 'En préstamo' && !estaVencido(p) && !estaPorVencer(p));
    if (tabActivo === 'porvencer') lista = lista.filter(p => estaPorVencer(p));
    if (tabActivo === 'vencidos') lista = lista.filter(p => estaVencido(p));
    if (tabActivo === 'devueltos') lista = lista.filter(p => p.estado === 'Devuelto');

    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      lista = lista.filter(p =>
        p.equipo?.modelo?.toLowerCase().includes(q) ||
        p.equipo?.nroSerie?.toLowerCase().includes(q) ||
        p.hospital?.nombre?.toLowerCase().includes(q)
      );
    }
    return lista;
  }, [prestamos, tabActivo, busqueda]);

  const conteos = useMemo(() => ({
    todos: prestamos.length,
    activos: prestamos.filter(p => p.estado === 'En préstamo' && !estaVencido(p) && !estaPorVencer(p)).length,
    porVencer: prestamos.filter(p => estaPorVencer(p)).length,
    vencidos: prestamos.filter(p => estaVencido(p)).length,
    devueltos: prestamos.filter(p => p.estado === 'Devuelto').length
  }), [prestamos]);

  const equiposDisponibles = useMemo(() => equipos.filter(e => e.idEstado === 1), [equipos]);

  const equiposFiltrados = useMemo(() => {
    const q = buscadorEquipo.trim().toLowerCase();
    if (!q) return equiposDisponibles.slice(0, 10);
    return equiposDisponibles.filter(e =>
      e.modelo?.toLowerCase().includes(q) || e.nroSerie?.toLowerCase().includes(q) || e.marca?.nombre?.toLowerCase().includes(q)
    ).slice(0, 10);
  }, [equiposDisponibles, buscadorEquipo]);

  const equipoSeleccionado = useMemo(() => equipos.find(e => e.idEquipo === parseInt(idEquipo)), [equipos, idEquipo]);

  useEffect(() => {
    if (equipoSeleccionado) {
      setComponentesPrestamo(equipoSeleccionado.componentes || []);
    } else {
      setComponentesPrestamo([]);
    }
  }, [equipoSeleccionado]);

  const toggleComponentePrestamo = (nombre) => {
    setComponentesPrestamo(prev =>
      prev.includes(nombre) ? prev.filter(c => c !== nombre) : [...prev, nombre]
    );
  };

  const hospitalesFiltrados = useMemo(() => {
    const q = buscadorHospital.trim().toLowerCase();
    if (!q) return hospitales.slice(0, 10);
    return hospitales.filter(h => h.nombre?.toLowerCase().includes(q)).slice(0, 10);
  }, [hospitales, buscadorHospital]);

  const hospitalSeleccionado = useMemo(() => hospitales.find(h => h.idHospital === parseInt(idHospital)), [hospitales, idHospital]);

  const abrirModalNuevo = () => { limpiar(); setModalAbierto(true); };
  const cerrarModal = () => { setModalAbierto(false); limpiar(); };

  const limpiar = () => {
    setIdEquipo(''); setIdHospital(''); setFechaPrestamo(''); setFechaEstimada('');
    setMotivo(''); setObservaciones(''); setErrores({});
    setBuscadorEquipo(''); setMostrarListaEquipo(false);
    setBuscadorHospital(''); setMostrarListaHospital(false);
    setComponentesPrestamo([]);
  };

  const validar = () => {
    const errs = {};
    if (!idEquipo) errs.idEquipo = 'Elegí el equipo a prestar';
    if (!idHospital) errs.idHospital = 'Elegí el hospital destino';
    if (!fechaPrestamo) errs.fechaPrestamo = 'Falta la fecha de préstamo';
    if (!motivo) errs.motivo = 'Elegí el motivo del préstamo';
    if (fechaEstimada && fechaPrestamo && fechaEstimada < fechaPrestamo) {
      errs.fechaEstimada = 'No puede ser anterior a la fecha de préstamo';
    }
    return errs;
  };

  const registrarPrestamo = async () => {
    const errs = validar();
    setErrores(errs);
    if (Object.keys(errs).length > 0) return;

    try {
      const r = await api.post('/prestamos', {
        idEquipo: parseInt(idEquipo),
        idHospital: parseInt(idHospital),
        idUsuario: auth?.usuario?.idUsuario || 1,
        fechaPrestamo,
        fechaEstimadaDevolucion: fechaEstimada || null,
        motivo,
        observaciones: observaciones || null,
        componentes: componentesPrestamo
      });
      cerrarModal();
      setRemitoCreado(r.data);
      cargarTodo();
    } catch (err) {
      const mensaje = typeof err.response?.data === 'string' ? err.response.data : 'No se pudo registrar el préstamo.';
      setErrores({ __general: mensaje });
    }
  };

  const minFechaProrroga = (p) => {
    const hoyDia = new Date(); hoyDia.setHours(0, 0, 0, 0);
    if (!p?.fechaEstimadaDevolucion) return hoyDia;
    const siguiente = new Date(p.fechaEstimadaDevolucion.split('T')[0] + 'T00:00:00');
    siguiente.setDate(siguiente.getDate() + 1);
    return siguiente > hoyDia ? siguiente : hoyDia;
  };

  const abrirProrroga = (p) => {
    setModalProrroga(p);
    setFechaProrroga('');
    setMotivoProrroga('');
    setErrorProrroga('');
  };
  const cerrarProrroga = () => setModalProrroga(null);

  const confirmarProrroga = async () => {
    if (!fechaProrroga) { setErrorProrroga('Elegí la nueva fecha de devolución.'); return; }
    if (!motivoProrroga.trim()) { setErrorProrroga('Indicá el motivo de la prórroga.'); return; }
    try {
      await api.post(`/prestamos/${modalProrroga.idPrestamo}/prorrogar`, {
        fechaNueva: fechaProrroga,
        motivo: motivoProrroga.trim(),
        idUsuario: auth?.usuario?.idUsuario || 1
      });
      setHistorialAbierto(prev => ({ ...prev, [modalProrroga.idPrestamo]: true }));
      cerrarProrroga();
      cargarTodo();
    } catch (err) {
      setErrorProrroga(typeof err.response?.data === 'string' ? err.response.data : 'No se pudo registrar la prórroga.');
    }
  };

  const tabStyle = (activo) => ({
    padding: '10px 0', fontSize: 14, fontWeight: activo ? 600 : 400,
    color: activo ? '#1a1a1a' : '#6B7C8C',
    borderBottom: activo ? '2px solid #1a1a1a' : '2px solid transparent',
    cursor: 'pointer'
  });

  return (
    <>
      {}
      <div className="rwd-page-header" style={{ padding: '20px 24px 0', background: 'white' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a', margin: 0, letterSpacing: '0.5px' }}>GESTIÓN DE PRÉSTAMOS</h2>
            <span style={{
              background: 'rgba(124, 110, 250, 0.12)', color: '#5e51d6',
              border: '1px solid rgba(124, 110, 250, 0.25)', padding: '4px 12px', borderRadius: 8,
              fontSize: 12, fontWeight: 600
            }}>PRÉSTAMOS</span>
            <p style={{ fontSize: 13, color: '#6B7C8C', margin: 0 }}>Equipos prestados a hospitales públicos de Córdoba</p>
          </div>
          <button onClick={abrirModalNuevo} style={btnNuevo}>+ REGISTRAR PRÉSTAMOS</button>
        </div>

        <div style={{ display: 'flex', gap: 24, borderBottom: '1px solid #E5EDF3', marginTop: 18, alignItems: 'center', flexWrap: 'wrap' }}>
          <div onClick={() => setTabActivo('todos')} style={tabStyle(tabActivo === 'todos')}>Todos ({conteos.todos})</div>
          <div onClick={() => setTabActivo('activos')} style={tabStyle(tabActivo === 'activos')}>En préstamo ({conteos.activos})</div>
          <div onClick={() => setTabActivo('porvencer')} style={{ ...tabStyle(tabActivo === 'porvencer'), display: 'flex', alignItems: 'center', gap: 6 }}>
            Por vencer
            <span style={{
              minWidth: 20, padding: '1px 7px', borderRadius: 999, fontSize: 11, fontWeight: 700, textAlign: 'center',
              background: conteos.porVencer > 0 ? '#F2A541' : '#EEF1F4', color: conteos.porVencer > 0 ? 'white' : '#6B7C8C'
            }}>{conteos.porVencer}</span>
          </div>
          <div onClick={() => setTabActivo('vencidos')} style={tabStyle(tabActivo === 'vencidos')}>Vencidos ({conteos.vencidos})</div>
          <div onClick={() => setTabActivo('devueltos')} style={tabStyle(tabActivo === 'devueltos')}>Devueltos ({conteos.devueltos})</div>
          <div style={{ marginLeft: 'auto' }}>
            <input
              type="text" placeholder="Buscar equipo u hospital..."
              value={busqueda} onChange={e => setBusqueda(e.target.value)}
              style={{ ...inpStyle, width: 220 }}
            />
          </div>
        </div>
      </div>

      {}
      {prestamosPorVencer.length > 0 && (
        <div style={{ padding: '16px 24px 0', background: 'white' }}>
          <div style={alertaBox}>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#8A4B00', marginBottom: 10 }}>
              ⏰ {prestamosPorVencer.length} préstamo{prestamosPorVencer.length !== 1 ? 's' : ''} por vencer en los próximos {DIAS_AVISO} días: avisar al hospital
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
              {prestamosPorVencer.map(p => (
                <div key={p.idPrestamo} style={alertaCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
                    <span style={{ fontWeight: 700, color: '#1a1a1a' }}>{p.equipo?.modelo}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#8A4B00', whiteSpace: 'nowrap' }}>
                      {textoVence(diasParaVencer(p))} ({p.fechaEstimadaDevolucion?.split('T')[0].split('-').reverse().join('/')})
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: '#9E9CBB', fontFamily: 'monospace' }}>{p.equipo?.nroSerie}</div>
                  <div style={{ marginTop: 6, fontWeight: 600, color: '#2D3748' }}>🏥 {p.hospital?.nombre}</div>
                  <div style={{ fontSize: 12, color: '#4A5868', marginTop: 2, lineHeight: 1.6 }}>
                    <div>👤 {p.hospital?.contacto || 'Sin contacto cargado'}</div>
                    {p.hospital?.telefono && <div>📞 {p.hospital.telefono}</div>}
                    {p.hospital?.email && <div style={{ wordBreak: 'break-all' }}>✉ {p.hospital.email}</div>}
                    {!p.hospital?.telefono && !p.hospital?.email && <div style={{ color: '#B45309' }}>Sin teléfono ni email: completalos en Hospitales externos</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {}
      <div className="rwd-table-wrap" style={{ padding: '20px 24px', background: 'white', overflowX: 'auto' }}>
        <table className="rwd-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: 750 }}>
          <thead>
            <tr>
              <th style={thStyle}>Equipo</th>
              <th style={thStyle}>Hospital</th>
              <th style={thStyle}>Fecha préstamo</th>
              <th style={thStyle}>Devolución estimada</th>
              <th style={thStyle}>Estado</th>
              <th style={thStyle}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {prestamosFiltrados.map(p => {
              const ev = estadoVisual(p);
              const porVencer = estaPorVencer(p);
              const prorrogas = p.prorrogas || [];
              const verHistorial = prorrogas.length > 0 && !!historialAbierto[p.idPrestamo];
              const destacado = p.idPrestamo === prestamoDestacado;
              return (
                <Fragment key={p.idPrestamo}>
                <tr id={`prestamo-${p.idPrestamo}`} style={{
                  borderBottom: '1px solid #F1F4F7',
                  background: destacado ? '#EEF6FB' : porVencer ? '#FFF8EC' : undefined,
                  boxShadow: destacado ? 'inset 3px 0 0 #2C7DA0' : porVencer ? 'inset 3px 0 0 #F2A541' : undefined
                }}>
                  <td style={{ ...tdStyle, fontWeight: 500 }}>
                    {p.equipo?.modelo}
                    <div style={{ fontSize: 11, color: '#9E9CBB', fontFamily: 'monospace' }}>{p.equipo?.nroSerie}</div>
                    {p.componentes && p.componentes.length > 0 && (
                      <div title={p.componentes.join(', ')} style={{ fontSize: 10, color: '#2C7DA0', marginTop: 2, cursor: 'help' }}>
                        🧩 {p.componentes.length} componente{p.componentes.length !== 1 ? 's' : ''}
                      </div>
                    )}
                  </td>
                  <td style={tdStyle}>
                    {p.hospital?.nombre}
                    {p.motivo && (
                      <div style={{ marginTop: 3 }}>
                        <span style={{
                          display: 'inline-block', padding: '2px 8px', borderRadius: 999,
                          background: chipMotivo(MOTIVOS_PRESTAMO.find(m => m.valor === p.motivo)?.color).bg,
                          color: chipMotivo(MOTIVOS_PRESTAMO.find(m => m.valor === p.motivo)?.color).fg,
                          fontSize: 10, fontWeight: 600
                        }}>{p.motivo}</span>
                      </div>
                    )}
                  </td>
                  <td style={tdStyle}>{p.fechaPrestamo?.split('T')[0]}</td>
                  <td style={tdStyle}>
                    {p.fechaEstimadaDevolucion?.split('T')[0] || '—'}
                    {prorrogas.length > 0 && (
                      <div>
                        <button
                          onClick={() => alternarHistorial(p.idPrestamo)}
                          style={btnHistorial}
                          title={`Fecha original: ${fechaDMY(p.fechaEstimadaDevolucionOriginal)}`}
                        >
                          ↻ Prorrogado {prorrogas.length} {prorrogas.length === 1 ? 'vez' : 'veces'} {verHistorial ? '▴' : '▾'}
                        </button>
                      </div>
                    )}
                  </td>
                  <td style={tdStyle}>
                    <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 999, background: ev.bg, color: ev.fg, fontSize: 12, fontWeight: 500 }}>
                      {ev.label}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      {p.estado === 'En préstamo' && (
                        <button onClick={() => setModalDevolucion(p)} style={btnDevolver}>↩ Registrar devolución</button>
                      )}
                      {p.estado === 'En préstamo' && (
                        <button onClick={() => abrirProrroga(p)} style={btnProrrogar}>⏩ Prorrogar</button>
                      )}
                      {p.estado === 'Devuelto' && (
                        <span style={{ fontSize: 12, color: '#9E9CBB' }}>
                          Devuelto el {p.fechaDevolucionReal?.split('T')[0]}
                        </span>
                      )}
                      {p.numeroRemito && (
                        <Link to={`/remitos?remito=${p.numeroRemito}`} style={lnkRemito} title="Ver los documentos de este préstamo en Remitos">
                          📄 {p.numeroRemito}
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
                {verHistorial && (
                  <tr style={{ background: '#FAFBFC', borderBottom: '1px solid #F1F4F7' }}>
                    <td colSpan="6" style={{ padding: '10px 16px 14px', whiteSpace: 'normal' }}>
                      <div style={tituloDetalle}>
                        Historial de prórrogas · fecha pactada originalmente: {fechaDMY(p.fechaEstimadaDevolucionOriginal)}
                      </div>
                      {prorrogas.map((pr, i) => (
                        <div key={pr.idProrroga} style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'baseline', fontSize: 12, color: '#4A5868', padding: '5px 0', borderTop: i > 0 ? '1px dashed #E5EDF3' : 'none' }}>
                          <span style={{ fontWeight: 700, color: '#2C7DA0', minWidth: 22 }}>#{i + 1}</span>
                          <span style={{ fontFamily: 'monospace' }}>{fechaDMY(pr.fechaAnterior)} → <b>{fechaDMY(pr.fechaNueva)}</b></span>
                          <span style={{ flex: 1, minWidth: 160, whiteSpace: 'normal' }}>{pr.motivo}</span>
                          <span style={{ color: '#9E9CBB' }}>
                            Solicitada el {new Date(pr.fechaSolicitud).toLocaleDateString('es-AR')}{pr.autorizadoPor && ` · autorizó ${pr.autorizadoPor}`}
                          </span>
                        </div>
                      ))}
                    </td>
                  </tr>
                )}
                </Fragment>
              );
            })}
            {prestamosFiltrados.length === 0 && (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: 40, color: '#9E9CBB', fontSize: 13 }}>
                No hay préstamos para mostrar.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {}
      {modalAbierto && (
        <div onClick={cerrarModal} className="rwd-modal-overlay" style={overlayStyle}>
          <div onClick={e => e.stopPropagation()} className="rwd-modal-box" style={{ ...modalStyle, maxWidth: 620 }}>
            <div style={modalHeaderStyle}>
              <div style={{ width: 52, height: 52, borderRadius: 12, background: 'linear-gradient(135deg, #EEF3FB 0%, #DCE7F5 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>🤝</div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1a1a1a' }}>PRESTAMOS</h3>
                <p style={{ margin: '4px 0 0', color: '#6B7C8C', fontSize: 13 }}>Cedé un equipo a otro hospital público</p>
              </div>
              <button onClick={cerrarModal} style={btnCerrarX}>✕</button>
            </div>

            <div style={{ padding: '20px 28px 24px' }}>
              {errores.__general && <div style={bannerError}>⚠ {errores.__general}</div>}

              {}
              <div style={{ position: 'relative', marginBottom: 16 }}>
                <label style={lblStyle}>Equipo a prestar *</label>
                {equipoSeleccionado ? (
                  <div style={{ ...inpStyle, display: 'flex', alignItems: 'center', gap: 10, background: '#F0F6FA', border: '1.5px solid #C8DCEA' }}>
                    <span>✓</span>
                    <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>
                      {equipoSeleccionado.modelo} <span style={{ color: '#9E9CBB', fontWeight: 400 }}>· S/N {equipoSeleccionado.nroSerie}</span>
                    </div>
                    <button type="button" onClick={() => { setIdEquipo(''); setBuscadorEquipo(''); }} style={btnLimpiarX}>✕</button>
                  </div>
                ) : (
                  <>
                    <input
                      type="text" value={buscadorEquipo}
                      onChange={e => { setBuscadorEquipo(e.target.value); setMostrarListaEquipo(true); }}
                      onFocus={() => setMostrarListaEquipo(true)}
                      onBlur={() => setTimeout(() => setMostrarListaEquipo(false), 200)}
                      placeholder="🔍 Buscar equipo en servicio..."
                      style={inpStyle}
                    />
                    {mostrarListaEquipo && (
                      <div style={dropdownStyle}>
                        {equiposFiltrados.length === 0 ? (
                          <div style={dropdownVacio}>No hay equipos disponibles (en servicio) con ese criterio.</div>
                        ) : (
                          equiposFiltrados.map(e => (
                            <div key={e.idEquipo} onClick={() => { setIdEquipo(e.idEquipo); setMostrarListaEquipo(false); }} style={dropdownItem}>
                              {e.modelo} <span style={{ color: '#9E9CBB' }}>· S/N {e.nroSerie} · {e.marca?.nombre}</span>
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
              {equipoSeleccionado && (
                <div style={{ marginBottom: 16 }}>
                  <label style={lblStyle}>Componentes que se prestan junto al equipo</label>
                  {(!equipoSeleccionado.componentes || equipoSeleccionado.componentes.length === 0) ? (
                    <div style={{
                      fontSize: 12, color: '#9E9CBB', background: '#FAFBFC',
                      border: '1px dashed #E5EDF3', borderRadius: 10, padding: '12px 14px'
                    }}>
                      Este equipo no tiene componentes registrados en Activos.
                    </div>
                  ) : (
                    <>
                      <div style={{ fontSize: 11, color: '#9E9CBB', marginBottom: 6 }}>
                        {componentesPrestamo.length} de {equipoSeleccionado.componentes.length} tildados
                      </div>
                      <div style={{ border: '1px solid #E5EDF3', borderRadius: 10, maxHeight: 180, overflowY: 'auto' }}>
                        {equipoSeleccionado.componentes.map((c, idx) => {
                          const marcado = componentesPrestamo.includes(c);
                          return (
                            <label key={idx} style={{
                              display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px',
                              borderBottom: idx < equipoSeleccionado.componentes.length - 1 ? '1px solid #F1F4F7' : 'none',
                              cursor: 'pointer', background: marcado ? '#F7FBFD' : 'white'
                            }}>
                              <input type="checkbox" checked={marcado} onChange={() => toggleComponentePrestamo(c)} style={{ cursor: 'pointer' }} />
                              <span style={{ fontSize: 13, color: '#1a1a1a' }}>{c}</span>
                            </label>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}

              {}
              <div style={{ position: 'relative', marginBottom: 16 }}>
                <label style={lblStyle}>Hospital destino *</label>
                {hospitalSeleccionado ? (
                  <div style={{ ...inpStyle, display: 'flex', alignItems: 'center', gap: 10, background: '#F0F6FA', border: '1.5px solid #C8DCEA' }}>
                    <span>✓</span>
                    <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{hospitalSeleccionado.nombre}</div>
                    <button type="button" onClick={() => { setIdHospital(''); setBuscadorHospital(''); }} style={btnLimpiarX}>✕</button>
                  </div>
                ) : (
                  <>
                    <input
                      type="text" value={buscadorHospital}
                      onChange={e => { setBuscadorHospital(e.target.value); setMostrarListaHospital(true); }}
                      onFocus={() => setMostrarListaHospital(true)}
                      onBlur={() => setTimeout(() => setMostrarListaHospital(false), 200)}
                      placeholder="🔍 Buscar hospital..."
                      style={inpStyle}
                    />
                    {mostrarListaHospital && (
                      <div style={dropdownStyle}>
                        {hospitalesFiltrados.length === 0 ? (
                          <div style={dropdownVacio}>
                            No se encontraron hospitales. Agregalos primero en "Hospitales externos".
                          </div>
                        ) : (
                          hospitalesFiltrados.map(h => (
                            <div key={h.idHospital} onClick={() => { setIdHospital(h.idHospital); setMostrarListaHospital(false); }} style={dropdownItem}>
                              {h.nombre} {h.localidad && <span style={{ color: '#9E9CBB' }}>· {h.localidad}</span>}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </>
                )}
                {errores.idHospital && <span style={errStyle}>⚠ {errores.idHospital}</span>}
              </div>

              <div className="rwd-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
                <div>
                  <label style={lblStyle}>Fecha de préstamo *</label>
                  <DatePicker
                    selected={fechaPrestamo ? new Date(fechaPrestamo + 'T00:00:00') : null}
                    onChange={(date) => setFechaPrestamo(date ? date.toISOString().split('T')[0] : '')}
                    dateFormat="dd/MM/yyyy"
                    minDate={hoy}
                    maxDate={hoy}
                    customInput={<CustomDateInput />}
                  />
                  {errores.fechaPrestamo && <span style={errStyle}>⚠ {errores.fechaPrestamo}</span>}
                </div>
                <div>
                  <label style={lblStyle}>Devolución estimada</label>
                  <DatePicker
                    selected={fechaEstimada ? new Date(fechaEstimada + 'T00:00:00') : null}
                    onChange={(date) => setFechaEstimada(date ? date.toISOString().split('T')[0] : '')}
                    dateFormat="dd/MM/yyyy"
                    minDate={fechaPrestamo ? new Date(fechaPrestamo + 'T00:00:00') : hoy}
                    customInput={<CustomDateInput />}
                  />
                  {errores.fechaEstimada && <span style={errStyle}>⚠ {errores.fechaEstimada}</span>}
                </div>
              </div>

              <label style={lblStyle}>Motivo del préstamo *</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                {MOTIVOS_PRESTAMO.map(m => {
                  const seleccionado = motivo === m.valor;
                  const c = chipMotivo(m.color);
                  return (
                    <button
                      key={m.valor}
                      type="button"
                      onClick={() => { setMotivo(m.valor); if (errores.motivo) setErrores(prev => { const n = { ...prev }; delete n.motivo; return n; }); }}
                      style={{
                        padding: '8px 14px', borderRadius: 10,
                        border: seleccionado ? `2px solid ${c.fg}` : '2px solid #E5EDF3',
                        background: seleccionado ? c.bg : 'white',
                        color: seleccionado ? c.fg : '#6B7C8C',
                        fontSize: 12.5, fontWeight: seleccionado ? 600 : 500,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
                      }}
                    >
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.fg, opacity: seleccionado ? 1 : 0.4 }}></span>
                      {m.valor}
                    </button>
                  );
                })}
              </div>
              {errores.motivo && <span style={errStyle}>⚠ {errores.motivo}</span>}

              <label style={{ ...lblStyle, marginTop: 16 }}>Observaciones (opcional)</label>
              <textarea
                value={observaciones} onChange={e => setObservaciones(e.target.value)}
                placeholder="Condiciones, responsable de traslado, detalle adicional, etc."
                rows={3}
                style={{ ...inpStyle, resize: 'vertical', fontFamily: 'inherit' }}
              />
            </div>

            <div style={modalFooterStyle}>
              <button onClick={cerrarModal} style={btnGhost}>Cancelar</button>
              <button onClick={registrarPrestamo} style={btnSave}>✓ Registrar préstamo</button>
            </div>
          </div>
        </div>
      )}

      {}
      {remitoCreado && (
        <div onClick={() => setRemitoCreado(null)} className="rwd-modal-overlay" style={overlayStyle}>
          <div onClick={e => e.stopPropagation()} className="rwd-modal-box" style={{ ...modalStyle, maxWidth: 460 }}>
            <div style={modalHeaderStyle}>
              <div style={{ width: 52, height: 52, borderRadius: 12, background: 'linear-gradient(135deg, #E1F5EE 0%, #CFEEE1 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>📄</div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1a1a1a' }}>Préstamo registrado</h3>
                <p style={{ margin: '4px 0 0', color: '#6B7C8C', fontSize: 13 }}>
                  {remitoCreado.tieneRemitoPdf ? 'El remito se generó correctamente.' : 'El remito se generará al abrirlo.'}
                </p>
              </div>
              <button onClick={() => setRemitoCreado(null)} style={btnCerrarX}>✕</button>
            </div>

            <div style={{ padding: '20px 28px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#6B7C8C', letterSpacing: '0.5px' }}>N° DE REMITO</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: '#2C7DA0', margin: '4px 0 12px', fontFamily: 'monospace' }}>{remitoCreado.numeroRemito}</div>
              <div style={{ fontSize: 13, color: '#4A5868' }}>
                {remitoCreado.equipo?.modelo} <span style={{ color: '#9E9CBB' }}>({remitoCreado.equipo?.nroSerie})</span>
              </div>
              <div style={{ fontSize: 13, color: '#4A5868', marginTop: 2 }}>→ {remitoCreado.hospital?.nombre}</div>
              <p style={{ fontSize: 12, color: '#6B7C8C', margin: '14px 0 0' }}>
                Imprimilo para que firmen quien entrega y quien retira el equipo. Después subí el escaneo
                {' '}desde Remitos con "Subir firmado".
              </p>
            </div>

            <div style={modalFooterStyle}>
              <button onClick={() => setRemitoCreado(null)} style={btnGhost}>Cerrar</button>
              <a href={urlRemito(remitoCreado.idPrestamo, true)} style={{ ...btnGhost, textDecoration: 'none' }}>⬇ Descargar</a>
              <a href={urlRemito(remitoCreado.idPrestamo)} target="_blank" rel="noreferrer" style={{ ...btnSave, textDecoration: 'none' }}>🖨 Ver / imprimir</a>
            </div>
          </div>
        </div>
      )}

      {}
      {modalProrroga && (
        <div onClick={cerrarProrroga} className="rwd-modal-overlay" style={overlayStyle}>
          <div onClick={e => e.stopPropagation()} className="rwd-modal-box" style={{ ...modalStyle, maxWidth: 480 }}>
            <div style={modalHeaderStyle}>
              <div style={{ width: 52, height: 52, borderRadius: 12, background: 'linear-gradient(135deg, #EEEDFE 0%, #DEDCFB 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>⏩</div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1a1a1a' }}>Prorrogar préstamo</h3>
                <p style={{ margin: '4px 0 0', color: '#6B7C8C', fontSize: 13 }}>
                  {modalProrroga.equipo?.modelo} · {modalProrroga.hospital?.nombre}
                </p>
              </div>
              <button onClick={cerrarProrroga} style={btnCerrarX}>✕</button>
            </div>

            <div style={{ padding: '20px 28px 24px' }}>
              {errorProrroga && <div style={bannerError}>⚠ {errorProrroga}</div>}

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6B7C8C', marginBottom: 14, gap: 8, flexWrap: 'wrap' }}>
                <span>Devolución estimada actual: <b style={{ color: estaVencido(modalProrroga) ? '#712B13' : '#2D3748' }}>{fechaDMY(modalProrroga.fechaEstimadaDevolucion)}{estaVencido(modalProrroga) && ' (vencido)'}</b></span>
                {(modalProrroga.prorrogas?.length || 0) > 0 && <span>Prórrogas previas: {modalProrroga.prorrogas.length}</span>}
              </div>

              <label style={lblStyle}>Nueva fecha de devolución estimada *</label>
              <DatePicker
                selected={fechaProrroga ? new Date(fechaProrroga + 'T00:00:00') : null}
                onChange={(date) => setFechaProrroga(date ? aISODia(date) : '')}
                dateFormat="dd/MM/yyyy"
                minDate={minFechaProrroga(modalProrroga)}
                customInput={<CustomDateInput />}
              />

              <label style={{ ...lblStyle, marginTop: 14 }}>Motivo *</label>
              <textarea
                value={motivoProrroga} onChange={e => setMotivoProrroga(e.target.value)}
                placeholder="Ej: Paciente continúa en tratamiento"
                rows={3} maxLength={300}
                style={{ ...inpStyle, resize: 'vertical', fontFamily: 'inherit' }}
              />
            </div>

            <div style={modalFooterStyle}>
              <button onClick={cerrarProrroga} style={btnGhost}>Cancelar</button>
              <button onClick={confirmarProrroga} style={btnSave}>✓ Confirmar prórroga</button>
            </div>
          </div>
        </div>
      )}

      {}
      {modalDevolucion && (
        <ModalDevolucion
          prestamo={modalDevolucion}
          onCerrar={() => setModalDevolucion(null)}
          onRegistrado={cargarTodo}
        />
      )}

      <style>{`
        .react-datepicker-wrapper { width: 100%; display: block; }
        .react-datepicker__input-container { width: 100%; display: block; }
        .react-datepicker { border: none !important; border-radius: 16px !important; overflow: hidden; box-shadow: 0 16px 40px rgba(0,0,0,.15); font-family: inherit; }
        .react-datepicker__header { background: #2C7DA0; border-bottom: none; padding: 14px 0; }
        .react-datepicker__current-month { color: white; font-size: 15px; font-weight: 600; }
        .react-datepicker__day-name { color: rgba(255,255,255,.9); font-size: 12px; font-weight: 600; width: 2.3rem; line-height: 2.3rem; }
        .react-datepicker__navigation-icon::before { border-color: white; border-width: 2px 2px 0 0; }
        .react-datepicker__month { margin: 12px; }
        .react-datepicker__day { width: 2.3rem; line-height: 2.3rem; margin: .15rem; border-radius: 10px; font-size: 13px; }
        .react-datepicker__day:hover { background: #E8F4F8; color: #2C7DA0; }
        .react-datepicker__day--today { border: 2px solid #2C7DA0; background: white; color: #2C7DA0; font-weight: 700; }
        .react-datepicker__day--selected, .react-datepicker__day--keyboard-selected { background: #2C7DA0 !important; color: white !important; border-radius: 10px; }
        .react-datepicker__day--disabled { color: #D8DCE1 !important; cursor: not-allowed; }
        .react-datepicker__day--outside-month { color: #C5CBD3; }
        .react-datepicker__triangle { display: none; }
      `}</style>
    </>
  );
}

const thStyle = { fontSize: 11, fontWeight: 500, color: '#6B7C8C', padding: '12px 8px', borderBottom: '1px solid #F1F4F7', textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'left' };
const tdStyle = { padding: '14px 8px', fontSize: 13, color: '#2D3748', whiteSpace: 'nowrap' };
const lblStyle = { display: 'block', fontSize: 11, fontWeight: 600, color: '#4A5868', marginBottom: 6 };
const inpStyle = { width: '100%', padding: '10px 12px', border: '1.5px solid #E5EDF3', borderRadius: 8, fontSize: 13, background: '#FAFBFC', outline: 'none', boxSizing: 'border-box' };
const errStyle = { display: 'block', color: '#E85A6D', fontSize: 11, marginTop: 6, fontWeight: 500 };
const btnNuevo = { background: '#F0F6FA', color: '#4A5868', border: 'none', borderRadius: 6, padding: '10px 16px', fontSize: 11, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' };
const btnGhost = { background: 'white', color: '#6B7C8C', border: '1px solid #E5EDF3', padding: '10px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' };
const btnSave = { background: 'linear-gradient(135deg, #2C7DA0 0%, #4A9BB8 100%)', color: 'white', border: 'none', padding: '10px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' };
const btnCerrarX = { background: '#F4F7FA', border: 'none', width: 32, height: 32, borderRadius: 8, fontSize: 18, cursor: 'pointer', color: '#6B7C8C' };
const btnLimpiarX = { background: 'transparent', border: 'none', color: '#9E9CBB', fontSize: 16, cursor: 'pointer', padding: '4px 8px' };
const btnDevolver = { background: '#E1F5EE', color: '#0F6E56', border: '1px solid #CFEEE1', borderRadius: 999, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' };
const tituloDetalle = { fontSize: 11, fontWeight: 600, color: '#6B7C8C', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 6 };
const btnProrrogar = { background: '#EEEDFE', color: '#3C3489', border: '1px solid #DEDCFB', borderRadius: 999, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' };
const btnHistorial = { background: 'none', border: 'none', padding: 0, marginTop: 3, color: '#5e51d6', fontSize: 11, fontWeight: 600, cursor: 'pointer' };
const lnkRemito = { color: '#2C7DA0', padding: '5px 10px', fontSize: 12, fontWeight: 600, textDecoration: 'none', fontFamily: 'monospace', border: '1px solid #D6E4EE', borderRadius: 999, background: '#F0F6FA' };
const alertaBox = { background: '#FFF8EC', border: '1px solid #F7D9A8', borderLeft: '4px solid #F2A541', borderRadius: 10, padding: '14px 16px' };
const alertaCard = { background: 'white', border: '1px solid #F3E3C7', borderRadius: 8, padding: '10px 12px', fontSize: 13 };
const overlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(20,25,40,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 };
const modalStyle = { background: 'white', borderRadius: 16, width: '100%', maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' };
const modalHeaderStyle = { padding: '24px 28px 20px', borderBottom: '1px solid #F0F3F7', display: 'flex', alignItems: 'center', gap: 16 };
const modalFooterStyle = { padding: '16px 28px', borderTop: '1px solid #F0F3F7', background: '#FAFBFC', borderBottomLeftRadius: 16, borderBottomRightRadius: 16, display: 'flex', justifyContent: 'flex-end', gap: 10 };
const bannerError = { background: '#FDECEE', border: '1px solid #F5C2C7', color: '#842029', padding: '12px 14px', borderRadius: 10, fontSize: 13, marginBottom: 16 };
const dropdownStyle = { position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #E5EDF3', borderRadius: 8, marginTop: 4, maxHeight: 220, overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', zIndex: 10 };
const dropdownItem = { padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #F1F4F7', fontSize: 13, fontWeight: 500, color: '#1a1a1a' };
const dropdownVacio = { padding: 16, textAlign: 'center', color: '#9E9CBB', fontSize: 12 };

export default Prestamos;
