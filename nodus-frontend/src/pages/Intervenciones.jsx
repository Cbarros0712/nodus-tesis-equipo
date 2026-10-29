import { useState, useEffect, useMemo, forwardRef } from 'react';
import api from '../api';
import { useToast } from '../components/Toast';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { FiCalendar } from "react-icons/fi";

const CustomDateInput = forwardRef(({ value, onClick, placeholder }, ref) => (
  <div
    onClick={onClick}
    ref={ref}
    style={{
      width: "100%",
      minHeight: "56px",
      border: "1px solid #E5EDF3",
      borderRadius: "12px",
      padding: "0 20px",
      display: "flex",
      alignItems: "center",
      gap: "14px",
      boxSizing: "border-box",
      background: "#FAFBFC",
      cursor: "pointer",
      transition: "all 0.15s"
    }}
    onMouseOver={(e) => {
      e.currentTarget.style.borderColor = "#C8DCEA";
      e.currentTarget.style.background = "#F0F6FA";
    }}
    onMouseOut={(e) => {
      e.currentTarget.style.borderColor = "#E5EDF3";
      e.currentTarget.style.background = "#FAFBFC";
    }}
  >
    <span
      style={{
        flex: 1,
        color: value ? "#1F2937" : "#9CA3AF",
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
    <FiCalendar color="#6B7C8C" size={18} />
  </div>
));

const RESULTADOS = [
  { nombre: 'Aprobado', icono: '✅', color: { bg: '#E1F5EE', fg: '#0F6E56' } },
  { nombre: 'Aprobado con observaciones', icono: '⚠️', color: { bg: '#FAEEDA', fg: '#633806' } },
  { nombre: 'Desaprobado', icono: '❌', color: { bg: '#FCEBEB', fg: '#A32D2D' } }
];

const RESULTADOS_HISTORICOS = [
  { nombre: 'No aplica', icono: '➖', color: { bg: '#F1EFE8', fg: '#444441' } }
];

const nombreResultado = (r) => (r === 'Reprobado' ? 'Desaprobado' : r);

const ID_ESTADO_EN_SERVICIO = 1;

const AVISO_REABIERTA = "La OT volvió a 'En curso'";

function Intervenciones() {
  const toast = useToast();
  const [intervenciones, setIntervenciones] = useState([]);
  const [ots, setOts] = useState([]);
  const [usuarios, setUsuarios] = useState([]);

  const hoy = (() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  })();

  const [tareasRealizadas, setTareasRealizadas] = useState('');
  const [tiempoEmpleado, setTiempoEmpleado] = useState('');
  const [resultadoSegElectrica, setResultadoSegElectrica] = useState('');
  const [fecha, setFecha] = useState(hoy);
  const [fechaFin, setFechaFin] = useState('');
  const [idOT, setIdOT] = useState('');
  const [idUsuario, setIdUsuario] = useState('');
  const [editando, setEditando] = useState(null);
  const [errores, setErrores] = useState({});

  const [buscadorOT, setBuscadorOT] = useState('');
  const [mostrarListaOT, setMostrarListaOT] = useState(false);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [seleccionada, setSeleccionada] = useState(null);
  const [fechasExpandidas, setFechasExpandidas] = useState({});

  useEffect(() => {
    cargarIntervenciones(); cargarOTs(); cargarUsuarios();
  }, []);

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape' && modalAbierto) cerrarModal(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [modalAbierto]);

  const cargarIntervenciones = async () => { const r = await api.get('/intervenciones'); setIntervenciones(r.data); };
  const cargarOTs            = async () => { const r = await api.get('/ordenestrabajo'); setOts(r.data); };
  const cargarUsuarios       = async () => { const r = await api.get('/usuarios');       setUsuarios(r.data); };

  const intervencionesFiltradas = useMemo(() => {
    if (!busqueda.trim()) return intervenciones;
    const q = busqueda.toLowerCase();
    return intervenciones.filter(i =>
      i.ordenTrabajo?.equipo?.modelo?.toLowerCase().includes(q) ||
      i.ordenTrabajo?.equipo?.marca?.nombre?.toLowerCase().includes(q) ||
      i.ordenTrabajo?.equipo?.nroSerie?.toLowerCase().includes(q) ||
      i.tareasRealizadas?.toLowerCase().includes(q) ||
      i.usuario?.nombre?.toLowerCase().includes(q)
    );
  }, [intervenciones, busqueda]);

  const agrupadasPorFecha = useMemo(() => {
    const map = {};
    intervencionesFiltradas.forEach(i => {
      const f = i.fecha?.split('T')[0] || 'Sin fecha';
      if (!map[f]) map[f] = [];
      map[f].push(i);
    });
    return Object.entries(map).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [intervencionesFiltradas]);

  useEffect(() => {
    if (agrupadasPorFecha.length > 0) {
      const primeraFecha = agrupadasPorFecha[0][0];
      if (Object.keys(fechasExpandidas).length === 0) {
        setFechasExpandidas({ [primeraFecha]: true });
      }
      if (!seleccionada && agrupadasPorFecha[0][1].length > 0) {
        setSeleccionada(agrupadasPorFecha[0][1][0]);
      }
    }
  }, [agrupadasPorFecha]);

  const toggleFecha = (fecha) => {
    setFechasExpandidas(prev => ({ ...prev, [fecha]: !prev[fecha] }));
  };

  const otsDisponibles = useMemo(
    () => ots.filter(o => o.estado !== 'Anulada' && o.estado !== 'Cerrada'),
    [ots]
  );

  const otsFiltradasBuscador = useMemo(() => {
    const q = buscadorOT.trim().toLowerCase();
    if (!q) return otsDisponibles.slice(0, 10);
    return otsDisponibles.filter(o =>
      o.equipo?.modelo?.toLowerCase().includes(q) ||
      o.tipo?.toLowerCase().includes(q) ||
      String(o.idOT).includes(q)
    ).slice(0, 10);
  }, [otsDisponibles, buscadorOT]);

  const otSeleccionada = useMemo(() => {
    return ots.find(o => o.idOT === parseInt(idOT));
  }, [ots, idOT]);

  const seleccionarOT = (ot) => {
    setIdOT(ot.idOT);
    setBuscadorOT('');
    setMostrarListaOT(false);
    if (errores.idOT) {
      setErrores(prev => { const n = { ...prev }; delete n.idOT; return n; });
    }
  };

  const limpiarOT = () => {
    setIdOT('');
    setBuscadorOT('');
    setMostrarListaOT(false);
  };

  const abrirModalNuevo = () => { limpiar(); setModalAbierto(true); };
  const abrirModalEditar = (i) => {
    setTareasRealizadas(i.tareasRealizadas);
    setTiempoEmpleado(i.tiempoEmpleado.toString());
    setResultadoSegElectrica(nombreResultado(i.resultadoSegElectrica));
    setFecha(i.fecha?.split('T')[0] || '');
    setFechaFin(i.fechaFin?.split('T')[0] || '');
    setIdOT(i.idOT);
    setIdUsuario(i.idUsuario);
    setEditando(i.idIntervencion);
    setErrores({});
    setModalAbierto(true);
  };
  const cerrarModal = () => { setModalAbierto(false); limpiar(); };

  const validar = () => {
    const errs = {};
    if (!fecha) errs.fecha = 'Falta la fecha de inicio';
    else if (fecha > hoy) errs.fecha = 'La fecha no puede ser futura';
    if (fechaFin) {
      if (fechaFin > hoy) errs.fechaFin = 'La fecha no puede ser futura';
      else if (fecha && fechaFin < fecha) errs.fechaFin = 'La fecha de fin no puede ser anterior a la de inicio';
    }
    if (!idOT) errs.idOT = 'Falta seleccionar la OT asociada';
    if (!idUsuario) errs.idUsuario = 'Falta seleccionar el técnico responsable';
    if (!tiempoEmpleado) errs.tiempoEmpleado = 'Falta el tiempo empleado';
    else {
      const t = parseInt(tiempoEmpleado);
      if (isNaN(t) || t <= 0) errs.tiempoEmpleado = 'El tiempo debe ser mayor a 0';
      else if (t > 480) errs.tiempoEmpleado = 'El tiempo no puede superar las 8 horas (480 min)';
    }
    if (!resultadoSegElectrica) errs.resultadoSegElectrica = 'Falta seleccionar el resultado de seguridad eléctrica';
    if (!tareasRealizadas || !tareasRealizadas.trim())
      errs.tareasRealizadas = 'Describí las tareas técnicas realizadas';
    else if (tareasRealizadas.trim().length < 20)
      errs.tareasRealizadas = 'La descripción debe tener al menos 20 caracteres';
    return errs;
  };

  const guardar = async () => {
    const errs = validar();
    setErrores(errs);
    if (Object.keys(errs).length > 0) return;

    const data = {
      tareasRealizadas: tareasRealizadas.trim(),
      tiempoEmpleado: parseInt(tiempoEmpleado),
      resultadoSegElectrica,
      fecha,
      fechaFin: fechaFin || null,
      idOT: parseInt(idOT),
      idUsuario: parseInt(idUsuario),
    };
    const estadoOTAntes = otSeleccionada?.estado;
    try {
      const r = editando
        ? await api.put(`/intervenciones/${editando}`, { idIntervencion: editando, ...data })
        : await api.post('/intervenciones', data);
      cerrarModal();
      cargarIntervenciones();
      cargarOTs();
      await avisarResultado(r.data?.mensaje, data.idOT, estadoOTAntes);
    } catch (err) {
      const mensaje = typeof err.response?.data === 'string'
        ? err.response.data
        : 'No se pudo guardar la tarea. Revisá los datos e intentá de nuevo.';
      setErrores({ __general: mensaje });
    }
  };

  const avisarResultado = async (mensaje, idOTGuardada, estadoOTAntes) => {
    if (mensaje?.startsWith(AVISO_REABIERTA)) {
      toast.warning('OT reabierta', "La OT volvió a 'En curso' porque el resultado de seguridad eléctrica fue Desaprobado.");
      return;
    }
    if (mensaje) {
      toast.warning('OT no cerrada', mensaje);
      return;
    }

    let ot = null;
    try { ot = (await api.get(`/ordenestrabajo/${idOTGuardada}`)).data; } catch {  }
    if (ot?.estado === 'Cerrada' && estadoOTAntes !== 'Cerrada') {
      toast.success('OT cerrada', ot.equipo?.idEstado === ID_ESTADO_EN_SERVICIO
        ? "La OT se cerró y el activo volvió a 'En servicio'."
        : 'La OT se cerró.');
    } else if (editando) {
      toast.success('Tarea actualizada', 'Los cambios de la tarea de mantenimiento se guardaron correctamente.');
    } else {
      toast.success('Tarea registrada', 'La tarea de mantenimiento se guardó correctamente.');
    }
  };

  const limpiar = () => {
    setTareasRealizadas(''); setTiempoEmpleado(''); setResultadoSegElectrica('');
    setFecha(''); setFechaFin(''); setIdOT(''); setIdUsuario(''); setEditando(null);
    setErrores({}); setBuscadorOT(''); setMostrarListaOT(false);
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

  const chipResultado = (r) => {
    const found = [...RESULTADOS, ...RESULTADOS_HISTORICOS].find(x => x.nombre === nombreResultado(r));
    return found?.color || { bg: '#F1EFE8', fg: '#444441' };
  };

  const chipEstadoEquipo = (color) => {
    const map = {
      verde:    { bg: '#E1F5EE', fg: '#0F6E56' },
      amarillo: { bg: '#FAEEDA', fg: '#633806' },
      gris:     { bg: '#F1EFE8', fg: '#444441' },
      rojo:     { bg: '#FAECE7', fg: '#712B13' },
      azul:     { bg: '#E6F1FB', fg: '#0C447C' }
    };
    return map[color] || map.gris;
  };

  const fmtFecha = (s) => {
    if (!s || s === 'Sin fecha') return s;
    const [y, m, d] = s.split('-');
    return `${d}/${m}/${y}`;
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
            }}>GESTIÓN DE MANTENIMIENTO</h2>

            <span style={{
              background: 'rgba(124, 110, 250, 0.12)',
              color: '#5e51d6',
              border: '1px solid rgba(124, 110, 250, 0.25)',
              padding: '4px 12px', borderRadius: 8,
              fontSize: 12, fontWeight: 600, letterSpacing: '0.5px'
            }}>TAREAS DE MANTENIMIENTO</span>

            <p style={{ fontSize: 13, color: '#6B7C8C', margin: 0, marginLeft: 8 }}>
              Registro técnico de tareas realizadas sobre OTs
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
          >+ REGISTRAR TAREA</button>
        </div>
      </div>

      {}
      <div className="rwd-grid" style={{
        display: 'grid', gridTemplateColumns: '340px 1fr',
        gap: 0, background: 'white',
        minHeight: 600, borderTop: '1px solid #E5EDF3'
      }}>

        {}
        <div style={{
          borderRight: '1px solid #E5EDF3', padding: '16px',
          maxHeight: 'calc(100vh - 180px)', overflowY: 'auto'
        }}>
          <div style={{
            background: '#F4F7FA', borderRadius: 8, padding: '8px 12px',
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14
          }}>
            <span style={{ color: '#9E9CBB', fontSize: 14 }}>🔍</span>
            <input
              type="text" placeholder="Buscar" value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              style={{
                background: 'transparent', border: 'none', outline: 'none',
                flex: 1, fontSize: 13, color: '#4A5868'
              }}
            />
          </div>

          {agrupadasPorFecha.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 30, color: '#9E9CBB', fontSize: 13 }}>
              No hay tareas registradas.
            </div>
          ) : (
            agrupadasPorFecha.map(([fecha, lista]) => {
              const expandido = fechasExpandidas[fecha];
              return (
                <div key={fecha} style={{ marginBottom: 6 }}>
                  <div
                    onClick={() => toggleFecha(fecha)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '8px 4px', cursor: 'pointer',
                      fontSize: 13, color: '#4A5868', fontWeight: 500
                    }}
                  >
                    <span style={{
                      transform: expandido ? 'rotate(90deg)' : 'rotate(0deg)',
                      transition: 'transform 0.15s', fontSize: 10, color: '#9E9CBB'
                    }}>▶</span>
                    <span>Fecha de inicio:</span>
                    <strong>{fmtFecha(fecha)}</strong>
                    <span style={{ marginLeft: 'auto', color: '#9E9CBB', fontSize: 11 }}>
                      {lista.length}
                    </span>
                  </div>

                  {expandido && lista.map(i => {
                    const isSelected = seleccionada?.idIntervencion === i.idIntervencion;
                    const cm = colorMarca(i.ordenTrabajo?.equipo?.marca?.nombre);
                    const cr = chipResultado(i.resultadoSegElectrica);
                    return (
                      <div
                        key={i.idIntervencion}
                        onClick={() => setSeleccionada(i)}
                        style={{
                          background: isSelected ? '#F0F6FA' : 'white',
                          border: isSelected ? '1px solid #C8DCEA' : '1px solid #F1F4F7',
                          borderRadius: 10, padding: 12,
                          marginBottom: 8, marginLeft: 14,
                          cursor: 'pointer', transition: 'all 0.15s'
                        }}
                        onMouseOver={(e) => { if (!isSelected) e.currentTarget.style.background = '#FAFBFC'; }}
                        onMouseOut={(e) => { if (!isSelected) e.currentTarget.style.background = 'white'; }}
                      >
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', marginBottom: 8 }}>
                          {i.ordenTrabajo?.equipo?.modelo || 'Sin equipo'}
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{
                            display: 'inline-block', padding: '2px 8px', borderRadius: 999,
                            background: cm.bg, color: cm.fg, fontSize: 10, fontWeight: 500
                          }}>{i.ordenTrabajo?.equipo?.marca?.nombre || '—'}</span>
                          <span style={{
                            display: 'inline-block', padding: '2px 8px', borderRadius: 999,
                            background: cr.bg, color: cr.fg, fontSize: 10, fontWeight: 500
                          }}>{nombreResultado(i.resultadoSegElectrica)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        {}
        <div style={{ padding: '24px 28px', maxHeight: 'calc(100vh - 180px)', overflowY: 'auto' }}>
          {!seleccionada ? (
            <div style={{ textAlign: 'center', padding: 80, color: '#9E9CBB', fontSize: 14 }}>
              Seleccioná una tarea de la lista para ver el detalle.
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1a1a1a', margin: 0, lineHeight: 1.3 }}>
                  {seleccionada.tareasRealizadas?.length > 80
                    ? seleccionada.tareasRealizadas.substring(0, 80) + '...'
                    : seleccionada.tareasRealizadas || 'Sin descripción'}
                </h1>
                {}
                {seleccionada.ordenTrabajo?.estado !== 'Anulada' && (
                  <button
                    onClick={() => abrirModalEditar(seleccionada)}
                    className="btn-edit" title="Editar tarea"
                    style={{ flexShrink: 0, marginLeft: 14 }}
                  >✏</button>
                )}
              </div>

              <h3 style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', margin: '24px 0 12px', fontStyle: 'italic' }}>
                Detalles del equipo
              </h3>
              <div style={{ background: '#FAFBFC', borderRadius: 10, padding: '16px 20px', marginBottom: 20 }}>
                <FilaDetalle label="Marca">
                  {seleccionada.ordenTrabajo?.equipo?.marca?.nombre ? (
                    <span style={{
                      display: 'inline-block', padding: '4px 12px', borderRadius: 999,
                      background: colorMarca(seleccionada.ordenTrabajo.equipo.marca.nombre).bg,
                      color: colorMarca(seleccionada.ordenTrabajo.equipo.marca.nombre).fg,
                      fontSize: 12, fontWeight: 500
                    }}>{seleccionada.ordenTrabajo.equipo.marca.nombre}</span>
                  ) : '—'}
                </FilaDetalle>
                <FilaDetalle label="Modelo">
                  {seleccionada.ordenTrabajo?.equipo?.modelo || '—'}
                </FilaDetalle>
                <FilaDetalle label="N° serie">
                  <span style={{ fontFamily: 'monospace', fontSize: 12 }}>
                    {seleccionada.ordenTrabajo?.equipo?.nroSerie || '—'}
                  </span>
                </FilaDetalle>
                <FilaDetalle label="Estado">
                  {seleccionada.ordenTrabajo?.equipo?.estadoEquipo ? (
                    <span style={{
                      display: 'inline-block', padding: '4px 12px', borderRadius: 999,
                      background: chipEstadoEquipo(seleccionada.ordenTrabajo.equipo.estadoEquipo.colorSemaforo).bg,
                      color: chipEstadoEquipo(seleccionada.ordenTrabajo.equipo.estadoEquipo.colorSemaforo).fg,
                      fontSize: 12, fontWeight: 500
                    }}>{seleccionada.ordenTrabajo.equipo.estadoEquipo.nombre}</span>
                  ) : '—'}
                </FilaDetalle>
              </div>

              <h3 style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', margin: '24px 0 12px', fontStyle: 'italic' }}>
                Detalles de la tarea
              </h3>
              <div style={{ background: '#FAFBFC', borderRadius: 10, padding: '16px 20px', marginBottom: 20 }}>
                <FilaDetalle label="Técnico">{seleccionada.usuario?.nombre || '—'}</FilaDetalle>
                <FilaDetalle label="OT asociada">
                  <span>OT {seleccionada.idOT} · {seleccionada.ordenTrabajo?.tipo || '—'}</span>
                </FilaDetalle>
                <FilaDetalle label="Resultado seg. eléctrica">
                  <span style={{
                    display: 'inline-block', padding: '4px 12px', borderRadius: 999,
                    background: chipResultado(seleccionada.resultadoSegElectrica).bg,
                    color: chipResultado(seleccionada.resultadoSegElectrica).fg,
                    fontSize: 12, fontWeight: 500
                  }}>{nombreResultado(seleccionada.resultadoSegElectrica)}</span>
                </FilaDetalle>
                <FilaDetalle label="Fecha de inicio">
                  📅 {fmtFecha(seleccionada.fecha?.split('T')[0])}
                </FilaDetalle>
                <FilaDetalle label="Fecha de fin">
                  {seleccionada.fechaFin ? <>📅 {fmtFecha(seleccionada.fechaFin.split('T')[0])}</> : '—'}
                </FilaDetalle>
              </div>

              <h3 style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', margin: '24px 0 12px', fontStyle: 'italic' }}>
                Tareas realizadas
              </h3>
              <div style={{
                background: '#FAFBFC', borderRadius: 10, padding: '16px 20px',
                whiteSpace: 'pre-wrap', fontSize: 13, color: '#2D3748', lineHeight: 1.6
              }}>
                {seleccionada.tareasRealizadas || '—'}
              </div>
            </>
          )}
        </div>
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
                background: 'linear-gradient(135deg, #E1F5EE 0%, #B8E7D4 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24, flexShrink: 0
              }}>
                {editando ? '✏️' : '🩺'}
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, color: '#1a1a1a', fontSize: 18, fontWeight: 700 }}>
                  {editando ? 'Editar tarea de mantenimiento' : 'Tarea de Mantenimiento'}
                </h3>
                <p style={{ margin: '4px 0 0', color: '#6B7C8C', fontSize: 13 }}>
                  {editando
                    ? 'Modificá los datos de la intervención técnica'
                    : 'Registrá la intervención técnica realizada sobre una OT'}
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
              <SeccionTitulo icono="🔧" titulo="Orden de trabajo asociada" />
              <div style={{ marginBottom: 22, position: 'relative' }}>
                <label style={lblStyle}>OT *</label>

                {otSeleccionada ? (
                  <div style={{
                    ...inpStyleErr('idOT'),
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', background: '#F0F6FA',
                    border: '1.5px solid #C8DCEA'
                  }}>
                    <span style={{ fontSize: 14 }}>✓</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>
                        OT {otSeleccionada.idOT} · {otSeleccionada.tipo}
                      </div>
                      <div style={{ fontSize: 11, color: '#6B7C8C', marginTop: 2 }}>
                        {otSeleccionada.equipo?.modelo || '—'}
                      </div>
                    </div>
                    <button
                      type="button" onClick={limpiarOT}
                      title="Cambiar OT"
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
                      position: 'relative', ...inpStyleErr('idOT'),
                      padding: 0, display: 'flex', alignItems: 'center'
                    }}>
                      <span style={{
                        position: 'absolute', left: 12, top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#9E9CBB', fontSize: 14, pointerEvents: 'none'
                      }}>🔍</span>
                      <input
                        type="text" value={buscadorOT}
                        onChange={e => { setBuscadorOT(e.target.value); setMostrarListaOT(true); }}
                        onFocus={() => setMostrarListaOT(true)}
                        onBlur={() => setTimeout(() => setMostrarListaOT(false), 200)}
                        placeholder="Buscar OT por número, tipo o modelo..."
                        style={{
                          width: '100%', padding: '10px 12px 10px 36px',
                          border: 'none', outline: 'none',
                          fontSize: 13, background: 'transparent',
                          fontFamily: 'inherit'
                        }}
                      />
                    </div>

                    {mostrarListaOT && (
                      <div style={{
                        position: 'absolute', top: '100%', left: 0, right: 0,
                        background: 'white',
                        border: '1px solid #E5EDF3', borderRadius: 8,
                        marginTop: 4, maxHeight: 280, overflowY: 'auto',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                        zIndex: 10
                      }}>
                        {otsFiltradasBuscador.length === 0 ? (
                          <div style={{ padding: '16px', textAlign: 'center', color: '#9E9CBB', fontSize: 12 }}>
                            {otsDisponibles.length === 0
                              ? 'No hay OTs abiertas disponibles'
                              : `No se encontraron OTs con "${buscadorOT}"`}
                          </div>
                        ) : (
                          otsFiltradasBuscador.map(o => (
                            <div
                              key={o.idOT} onClick={() => seleccionarOT(o)}
                              style={{
                                padding: '10px 14px', cursor: 'pointer',
                                borderBottom: '1px solid #F1F4F7',
                                transition: 'background 0.1s'
                              }}
                              onMouseOver={(e) => e.currentTarget.style.background = '#F0F6FA'}
                              onMouseOut={(e) => e.currentTarget.style.background = 'white'}
                            >
                              <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>
                                OT {o.idOT} · {o.tipo}
                              </div>
                              <div style={{ fontSize: 11, color: '#6B7C8C', marginTop: 2 }}>
                                {o.equipo?.modelo || '—'}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </>
                )}
                {errores.idOT && <span style={errStyle}>⚠ {errores.idOT}</span>}
              </div>

              {}
              <SeccionTitulo icono="📋" titulo="Datos de la intervención" />
              <div className="rwd-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 22 }}>
                <div>
                  <label style={lblStyle}>Fecha de inicio *</label>
                  <DatePicker
                    selected={fecha ? new Date(fecha + 'T00:00:00') : null}
                    onChange={(date) => {
                      if (date) {
                        const yyyy = date.getFullYear();
                        const mm = String(date.getMonth() + 1).padStart(2, '0');
                        const dd = String(date.getDate()).padStart(2, '0');
                        cambiarCampo('fecha', `${yyyy}-${mm}-${dd}`, setFecha);
                      }
                    }}
                    dateFormat="dd/MM/yyyy"
                    maxDate={new Date()}
                    customInput={<CustomDateInput />}
                  />
                  {errores.fecha && <span style={errStyle}>⚠ {errores.fecha}</span>}
                </div>
                <div>
                  <label style={lblStyle}>Fecha de fin</label>
                  <DatePicker
                    selected={fechaFin ? new Date(fechaFin + 'T00:00:00') : null}
                    onChange={(date) => {
                      if (date) {
                        const yyyy = date.getFullYear();
                        const mm = String(date.getMonth() + 1).padStart(2, '0');
                        const dd = String(date.getDate()).padStart(2, '0');
                        cambiarCampo('fechaFin', `${yyyy}-${mm}-${dd}`, setFechaFin);
                      }
                    }}
                    dateFormat="dd/MM/yyyy"
                    minDate={fecha ? new Date(fecha + 'T00:00:00') : null}
                    maxDate={new Date()}
                    customInput={<CustomDateInput />}
                  />
                  {fechaFin && (
                    <button
                      type="button"
                      onClick={() => cambiarCampo('fechaFin', '', setFechaFin)}
                      style={{ background: 'none', border: 'none', padding: '4px 0 0', color: '#6B7C8C', fontSize: 11, cursor: 'pointer' }}
                    >✕ Quitar fecha de fin</button>
                  )}
                  {errores.fechaFin && <span style={errStyle}>⚠ {errores.fechaFin}</span>}
                </div>
                <div>
                  <label style={lblStyle}>Tiempo empleado (minutos) *</label>
                  <input
                    type="number" min="1" max="480"
                    value={tiempoEmpleado}
                    onChange={e => cambiarCampo('tiempoEmpleado', e.target.value, setTiempoEmpleado)}
                    placeholder="Ej: 45"
                    style={inpStyleErr('tiempoEmpleado')}
                  />
                  {errores.tiempoEmpleado && <span style={errStyle}>⚠ {errores.tiempoEmpleado}</span>}
                </div>
                <div>
                  <label style={lblStyle}>Técnico responsable *</label>
                  <select
                    value={idUsuario}
                    onChange={e => cambiarCampo('idUsuario', e.target.value, setIdUsuario)}
                    style={inpStyleErr('idUsuario')}
                  >
                    <option value="">Seleccionar técnico...</option>
                    {usuarios.map(u => <option key={u.idUsuario} value={u.idUsuario}>{u.nombre}</option>)}
                  </select>
                  {errores.idUsuario && <span style={errStyle}>⚠ {errores.idUsuario}</span>}
                </div>
              </div>

              {}
              <SeccionTitulo icono="⚡" titulo="Resultado de seguridad eléctrica" />
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                {RESULTADOS.map(r => {
                  const seleccionado = resultadoSegElectrica === r.nombre;
                  return (
                    <button
                      key={r.nombre} type="button"
                      onClick={() => cambiarCampo('resultadoSegElectrica', r.nombre, setResultadoSegElectrica)}
                      style={{
                        padding: '10px 14px', borderRadius: 10,
                        border: seleccionado ? `2px solid ${r.color.fg}` : '2px solid #E5EDF3',
                        background: seleccionado ? r.color.bg : 'white',
                        color: seleccionado ? r.color.fg : '#6B7C8C',
                        fontSize: 12, fontWeight: seleccionado ? 600 : 500,
                        cursor: 'pointer', transition: 'all 0.15s',
                        display: 'flex', alignItems: 'center', gap: 6,
                        boxShadow: seleccionado ? `0 2px 8px ${r.color.bg}` : 'none'
                      }}
                    >
                      <span>{r.icono}</span>
                      {r.nombre}
                    </button>
                  );
                })}
              </div>
              {errores.resultadoSegElectrica && <span style={errStyle}>⚠ {errores.resultadoSegElectrica}</span>}
              <small style={{ display: 'block', marginTop: 8, fontSize: 11, color: '#9E9CBB', fontStyle: 'italic' }}>
                Solo el resultado 'Aprobado' habilita el cierre de la OT (US-10 · Riesgo Eléctrico Crítico). Si el resultado es 'Desaprobado', la OT vuelve a 'En curso'.
              </small>

              {}
              <div style={{ marginTop: 22 }}>
                <SeccionTitulo icono="📝" titulo="Detalle técnico" />
                <label style={lblStyle}>Tareas realizadas *</label>
                <textarea
                  value={tareasRealizadas}
                  onChange={e => cambiarCampo('tareasRealizadas', e.target.value, setTareasRealizadas)}
                  placeholder="Detallá las tareas técnicas realizadas: limpieza, calibración, reemplazo de componentes, pruebas funcionales, etc."
                  rows={5}
                  style={{ ...inpStyleErr('tareasRealizadas'), resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }}
                />
                {errores.tareasRealizadas && <span style={errStyle}>⚠ {errores.tareasRealizadas}</span>}
                {!errores.tareasRealizadas && (
                  <span style={{
                    display: 'block', fontSize: 11, color: '#9E9CBB',
                    marginTop: 4, fontStyle: 'italic'
                  }}>
                    {tareasRealizadas.length} / mínimo 20 caracteres
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
                {editando ? '✓ Actualizar tarea' : '✓ Registrar tarea'}
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
        .react-datepicker__day--outside-month { color: #C5CBD3; }
        .react-datepicker__triangle { display: none; }
      `}</style>

    </>
  );
}

function FilaDetalle({ label, children }) {
  return (
    <div style={{
      display: 'flex', padding: '10px 0',
      borderBottom: '1px solid #F1F4F7',
      alignItems: 'flex-start', gap: 16
    }}>
      <div style={{ flex: '0 0 180px', fontSize: 13, color: '#6B7C8C', fontWeight: 400 }}>{label}</div>
      <div style={{ flex: 1, fontSize: 13, color: '#2D3748' }}>{children}</div>
    </div>
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

export default Intervenciones;