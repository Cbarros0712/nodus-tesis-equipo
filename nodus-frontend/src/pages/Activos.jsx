import { useState, useEffect, useMemo, forwardRef } from 'react';
import api from '../api';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { FiCalendar } from "react-icons/fi";
import catalogoComponentesRespiratorios from '../data/catalogoComponentesRespiratorios';
import {
  DIAS_AVISO_GARANTIA, EVENTO_EQUIPOS_ACTUALIZADOS,
  diasParaVencerGarantia, garantiaPorVencer, garantiaVencida, textoVence
} from '../vencimientos';
import { urlQrEquipo, apuntaALocalhost, imagenQr, AVISO_QR_LOCALHOST } from '../qr';

const fechaDMY = (iso) => iso ? iso.split('T')[0].split('-').reverse().join('/') : '—';

const CustomDateInput = forwardRef(({ value, onClick }, ref) => (
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

const ID_ESTADO_EN_SERVICIO = 1;

function Activos() {
  const [equipos, setEquipos] = useState([]);
  const [marcas, setMarcas] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [estados, setEstados] = useState([]);
  const [alertas, setAlertas] = useState([]);

  const anioActual = new Date().getFullYear();
  const inicioAnio = new Date(anioActual, 0, 1);
  const finAnio = new Date(anioActual, 11, 31);

  const hoy = new Date();

  const [modelo, setModelo] = useState('');
  const [nroSerie, setNroSerie] = useState('');
  const [fechaAdq, setFechaAdq] = useState('');
  const [fechaGar, setFechaGar] = useState('');
  const [idMarca, setIdMarca] = useState('');
  const [idTipo, setIdTipo] = useState('');
  const [editando, setEditando] = useState(null);
  const [errores, setErrores] = useState({});
  const [componentesSeleccionados, setComponentesSeleccionados] = useState([]);

  const [buscadorMarca, setBuscadorMarca] = useState('');
  const [mostrarListaMarca, setMostrarListaMarca] = useState(false);
  const [buscadorTipo, setBuscadorTipo] = useState('');
  const [mostrarListaTipo, setMostrarListaTipo] = useState(false);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [tabActivo, setTabActivo] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [busquedaAbierta, setBusquedaAbierta] = useState(false);
  const [modalAlertasEquipo, setModalAlertasEquipo] = useState(null);
  const [modalQrEquipo, setModalQrEquipo] = useState(null);

  useEffect(() => {
    cargarEquipos(); cargarMarcas(); cargarTipos(); cargarEstados(); cargarAlertas();
  }, []);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key !== 'Escape') return;
      if (modalAlertasEquipo) setModalAlertasEquipo(null);
      else if (modalAbierto) cerrarModal();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [modalAbierto, modalAlertasEquipo]);

  const cargarEquipos = async () => {
    const r = await api.get('/equipos');
    setEquipos(r.data);
    window.dispatchEvent(new CustomEvent(EVENTO_EQUIPOS_ACTUALIZADOS, { detail: r.data }));
  };
  const cargarMarcas  = async () => { const r = await api.get('/marcas'); setMarcas(r.data); };
  const cargarTipos   = async () => { const r = await api.get('/tiposactivo'); setTipos(r.data); };
  const cargarEstados = async () => { const r = await api.get('/estadosequipo'); setEstados(r.data); };
  const cargarAlertas = async () => { const r = await api.get('/alertas'); setAlertas(r.data); };

  const alertasPorEquipo = useMemo(() => {
    const map = {};
    alertas.forEach(a => {
      if (a.idEquipo && (a.estado === 'No leída' || a.estado === 'Leída')) {
        if (!map[a.idEquipo]) map[a.idEquipo] = [];
        map[a.idEquipo].push(a);
      }
    });
    return map;
  }, [alertas]);

  const equiposFiltrados = useMemo(() => {
    let lista = [...equipos];
    if (tabActivo === 'garantia-porvencer') {
      lista = lista.filter(garantiaPorVencer).sort((a, b) => diasParaVencerGarantia(a) - diasParaVencerGarantia(b));
    } else if (tabActivo === 'garantia-vencida') {
      lista = lista.filter(garantiaVencida);
    } else if (tabActivo !== 'todos') {
      lista = lista.filter(e => e.idEstado === parseInt(tabActivo));
    }
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      lista = lista.filter(e =>
        e.modelo?.toLowerCase().includes(q) ||
        e.nroSerie?.toLowerCase().includes(q) ||
        e.marca?.nombre?.toLowerCase().includes(q)
      );
    }
    return lista;
  }, [equipos, tabActivo, busqueda]);

  const estadosConEquipos = useMemo(() => {
    return estados
      .map(estado => ({
        ...estado,
        cantidad: equipos.filter(e => e.idEstado === estado.idEstado).length
      }))
      .filter(estado => estado.cantidad > 0);
  }, [estados, equipos]);

  const equiposGarantiaPorVencer = useMemo(() =>
    equipos.filter(garantiaPorVencer).sort((a, b) => diasParaVencerGarantia(a) - diasParaVencerGarantia(b)),
    [equipos]);
  const cantGarantiaVencida = useMemo(() => equipos.filter(garantiaVencida).length, [equipos]);

  const abrirModalNuevo = () => { limpiar(); setModalAbierto(true); };
  const abrirModalEditar = (eq) => {
    setModelo(eq.modelo);
    setNroSerie(eq.nroSerie);
    setFechaAdq(eq.fechaAdquisicion?.split('T')[0] || '');
    setFechaGar(eq.vencimientoGarantia?.split('T')[0] || '');
    setIdMarca(eq.idMarca);
    setIdTipo(eq.idTipo);
    setEditando(eq.idEquipo);
    setErrores({});
    setComponentesSeleccionados(eq.componentes || []);
    setModalAbierto(true);
  };
  const cerrarModal = () => { setModalAbierto(false); limpiar(); };

  const validar = () => {
    const errs = {};
    if (!modelo || !modelo.trim()) errs.modelo = 'Falta ingresar el modelo del activo';
    if (!nroSerie || !nroSerie.trim()) errs.nroSerie = 'El N° de Serie es obligatorio para el registro legal';
    if (!fechaAdq) errs.fechaAdq = 'Falta seleccionar la fecha de adquisición';
    else if (fechaAdq > hoy.toLocaleDateString('en-CA')) errs.fechaAdq = 'La fecha de adquisición no puede ser futura';
    if (fechaGar && fechaAdq && fechaGar < fechaAdq) {
      errs.fechaGar = 'La garantía no puede ser anterior a la adquisición';
    }
    if (!idMarca) errs.idMarca = 'Falta seleccionar la marca';
    if (!idTipo) errs.idTipo = 'Falta seleccionar el tipo de activo';
    return errs;
  };

  const guardar = async () => {
    const errs = validar();
    setErrores(errs);
    if (Object.keys(errs).length > 0) return;

    const data = {
      modelo, nroSerie,
      fechaAdquisicion: fechaAdq,
      vencimientoGarantia: fechaGar || null,
      idMarca: parseInt(idMarca),
      idTipo: parseInt(idTipo),

      idEstado: editando
        ? equipos.find(e => e.idEquipo === editando)?.idEstado
        : ID_ESTADO_EN_SERVICIO,
      componentes: componentesSeleccionados
    };
    try {
      if (editando) {
        await api.put(`/equipos/${editando}`, { idEquipo: editando, ...data });
      } else {
        await api.post('/equipos', data);
      }
      cerrarModal();
      cargarEquipos();
    } catch (err) {
      const mensaje = typeof err.response?.data === 'string'
        ? err.response.data
        : 'No se pudo guardar el activo. Revisá los datos e intentá de nuevo.';
      setErrores({ __general: mensaje });
    }
  };

  const limpiar = () => {
    setModelo(''); setNroSerie(''); setFechaAdq(''); setFechaGar('');
    setIdMarca(''); setIdTipo(''); setEditando(null);
    setErrores({});
    setComponentesSeleccionados([]);
    setBuscadorMarca(''); setMostrarListaMarca(false);
    setBuscadorTipo(''); setMostrarListaTipo(false);
  };

  const cambiarCampo = (campo, valor, setter) => {
    setter(valor);
    if (errores[campo]) {
      setErrores(prev => { const n = { ...prev }; delete n[campo]; return n; });
    }
  };

  const marcasFiltradas = useMemo(() => {
    const q = buscadorMarca.trim().toLowerCase();
    if (!q) return marcas.slice(0, 10);
    return marcas.filter(m => m.nombre?.toLowerCase().includes(q)).slice(0, 10);
  }, [marcas, buscadorMarca]);

  const marcaSeleccionada = useMemo(() => {
    return marcas.find(m => m.idMarca === parseInt(idMarca));
  }, [marcas, idMarca]);

  const seleccionarMarca = (m) => {
    setIdMarca(m.idMarca);
    setBuscadorMarca('');
    setMostrarListaMarca(false);
    if (errores.idMarca) {
      setErrores(prev => { const n = { ...prev }; delete n.idMarca; return n; });
    }
  };

  const limpiarMarca = () => {
    setIdMarca('');
    setBuscadorMarca('');
    setMostrarListaMarca(false);
  };

  const tiposFiltrados = useMemo(() => {
    const q = buscadorTipo.trim().toLowerCase();
    if (!q) return tipos.slice(0, 10);
    return tipos.filter(t => t.nombre?.toLowerCase().includes(q)).slice(0, 10);
  }, [tipos, buscadorTipo]);

  const tipoSeleccionado = useMemo(() => {
    return tipos.find(t => t.idTipo === parseInt(idTipo));
  }, [tipos, idTipo]);

  const seleccionarTipo = (t) => {
    setIdTipo(t.idTipo);
    setBuscadorTipo('');
    setMostrarListaTipo(false);
    if (errores.idTipo) {
      setErrores(prev => { const n = { ...prev }; delete n.idTipo; return n; });
    }
  };

  const limpiarTipo = () => {
    setIdTipo('');
    setBuscadorTipo('');
    setMostrarListaTipo(false);
  };

  const normalizar = (s) => (s || '')
    .toString()
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[()]/g, '')
    .trim();

  const extraerAcronimo = (clave) => {
    const m = clave.match(/\(([^)]+)\)/);
    return m ? m[1] : null;
  };

  const componentesDelTipo = useMemo(() => {
    if (!tipoSeleccionado?.nombre) return null;
    const nombreNorm = normalizar(tipoSeleccionado.nombre);
    const claves = Object.keys(catalogoComponentesRespiratorios);

    let clave = claves.find(c => normalizar(c) === nombreNorm);

    if (!clave) {
      clave = claves.find(c => {
        const acr = extraerAcronimo(c);
        return acr && normalizar(acr) === nombreNorm;
      });
    }

    if (!clave) {
      clave = claves.find(c => {
        const cNorm = normalizar(c);
        return cNorm.includes(nombreNorm) || nombreNorm.includes(cNorm);
      });
    }
    return clave ? { clave, items: catalogoComponentesRespiratorios[clave] } : null;
  }, [tipoSeleccionado]);

  const obligatoriosDelTipo = useMemo(() => {
    if (!componentesDelTipo) return [];
    return componentesDelTipo.items
      .filter(i => i.requerimiento === 'Obligatorio')
      .map(i => i.componente);
  }, [componentesDelTipo]);

  useEffect(() => {
    if (!editando && componentesDelTipo) {
      setComponentesSeleccionados(obligatoriosDelTipo);
    }
  }, [componentesDelTipo?.clave]);

  const toggleComponente = (nombre) => {
    setComponentesSeleccionados(prev =>
      prev.includes(nombre) ? prev.filter(c => c !== nombre) : [...prev, nombre]
    );
  };

  const marcarTodosObligatorios = () => setComponentesSeleccionados(obligatoriosDelTipo);
  const limpiarComponentes = () => setComponentesSeleccionados([]);

  const colorRequerimiento = (req) => {
    if (req === 'Obligatorio') return { bg: '#FAECE7', fg: '#712B13' };
    if (req === 'Opcional') return { bg: '#E1F5EE', fg: '#0F6E56' };
    return { bg: '#F1EFE8', fg: '#444441' };
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

  const chipEstado = (color) => {
    const map = {
      verde:    { bg: '#E1F5EE', fg: '#0F6E56' },
      amarillo: { bg: '#FAEEDA', fg: '#633806' },
      gris:     { bg: '#F1EFE8', fg: '#444441' },
      rojo:     { bg: '#FAECE7', fg: '#712B13' },
      azul:     { bg: '#E6F1FB', fg: '#0C447C' }
    };
    return map[color] || map.gris;
  };

  const iconoTipoAlerta = (tipo) => ({
    'Garantía por vencer':     '🛡',
    'Mantenimiento preventivo':'🔧',
    'Falla recurrente':        '⚠',
    'Calibración pendiente':   '📐',
    'Stock crítico':           '📦',
    'Otro':                    '🔔'
  }[tipo] || '🔔');

  const colorEstadoAlerta = (estado) => {
    if (estado === 'No leída') return '#FF5E7A';
    if (estado === 'Leída')    return '#F5A623';
    return '#9E9CBB';
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
            }}>ACTIVOS</span>

            <p style={{ fontSize: 13, color: '#6B7C8C', margin: 0, marginLeft: 8 }}>
              Activos médicos del hospital
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
          >+ REGISTRAR ACTIVOS</button>
        </div>

        <div style={{
          display: 'flex', gap: 24, borderBottom: '1px solid #E5EDF3',
          marginTop: 18, alignItems: 'center', flexWrap: 'wrap'
        }}>
          <div onClick={() => setTabActivo('todos')} style={tabStyle(tabActivo === 'todos')}>
            Todos ({equipos.length})
          </div>
          {estadosConEquipos.map(estado => (
            <div key={estado.idEstado}
              onClick={() => setTabActivo(String(estado.idEstado))}
              style={tabStyle(tabActivo === String(estado.idEstado))}
            >
              {estado.nombre} ({estado.cantidad})
            </div>
          ))}
          <span style={{ width: 1, height: 18, background: '#E5EDF3' }} />
          <div onClick={() => setTabActivo('garantia-porvencer')} style={{ ...tabStyle(tabActivo === 'garantia-porvencer'), display: 'flex', alignItems: 'center', gap: 6 }}>
            Garantía por vencer
            <span style={{
              minWidth: 20, padding: '1px 7px', borderRadius: 999, fontSize: 11, fontWeight: 700, textAlign: 'center',
              background: equiposGarantiaPorVencer.length > 0 ? '#F2A541' : '#EEF1F4',
              color: equiposGarantiaPorVencer.length > 0 ? 'white' : '#6B7C8C'
            }}>{equiposGarantiaPorVencer.length}</span>
          </div>
          <div onClick={() => setTabActivo('garantia-vencida')} style={tabStyle(tabActivo === 'garantia-vencida')}>
            Garantía vencida ({cantGarantiaVencida})
          </div>
          <div style={{
            marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6,
            background: busquedaAbierta ? '#F0F6FA' : 'transparent',
            borderRadius: 8, padding: busquedaAbierta ? '4px 10px' : '4px',
            transition: 'all 0.2s'
          }}>
            <input
              type="text" placeholder="Buscar marca, modelo o serie..."
              value={busqueda} onChange={e => setBusqueda(e.target.value)}
              autoFocus={busquedaAbierta}
              style={{
                background: 'transparent', border: 'none', outline: 'none',
                fontSize: 13, padding: '4px 0', color: '#4A5868',
                width: busquedaAbierta ? 200 : 0,
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
              title={busquedaAbierta ? 'Cerrar búsqueda' : 'Buscar'}
              style={{ color: '#6B7C8C', fontSize: 16, cursor: 'pointer' }}
            >🔍</span>
          </div>
        </div>
      </div>

      {}
      {equiposGarantiaPorVencer.length > 0 && (
        <div style={{ padding: '16px 24px 0', background: 'white' }}>
          <div style={alertaBox}>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#8A4B00', marginBottom: 10 }}>
              ⏰ {equiposGarantiaPorVencer.length} activo{equiposGarantiaPorVencer.length !== 1 ? 's' : ''} con garantía por vencer en los próximos {DIAS_AVISO_GARANTIA} días
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
              {equiposGarantiaPorVencer.map(eq => (
                <div key={eq.idEquipo} style={alertaCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
                    <span style={{ fontWeight: 700, color: '#1a1a1a' }}>{[eq.marca?.nombre, eq.modelo].filter(Boolean).join(' · ')}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#8A4B00', whiteSpace: 'nowrap' }}>
                      {textoVence(diasParaVencerGarantia(eq))}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: '#9E9CBB', fontFamily: 'monospace' }}>{eq.nroSerie}</div>
                  <div style={{ fontSize: 12, color: '#4A5868', marginTop: 6, lineHeight: 1.6 }}>
                    <div>🛡 Garantía hasta el {fechaDMY(eq.vencimientoGarantia)}</div>
                    <div>📍 {eq.ubicacionActual || <span style={{ color: '#9E9CBB' }}>Sin ubicación registrada</span>}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {}
      <div className="rwd-table-wrap" style={{ padding: '20px 24px', background: 'white', overflowX: 'auto' }}>
        <table className="rwd-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
          <thead>
            <tr style={{ textAlign: 'left' }}>
              <th style={thStyle}>Marca</th>
              <th style={thStyle}>Modelo</th>
              <th style={thStyle}>N° serie</th>
              <th style={thStyle}>Estado</th>
              <th style={thStyle}>Garantía</th>
              <th style={thStyle}>Alerta</th>
              <th style={thStyle}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {equiposFiltrados.map(eq => {
              const cm = colorMarca(eq.marca?.nombre);
              const ce = chipEstado(eq.estadoEquipo?.colorSemaforo);
              const cantAlertas = (alertasPorEquipo[eq.idEquipo] || []).length;
              const porVencer = garantiaPorVencer(eq);
              const vencida = garantiaVencida(eq);
              return (
                <tr key={eq.idEquipo} style={{
                  borderBottom: '1px solid #F1F4F7',
                  background: porVencer ? '#FFF8EC' : undefined,
                  boxShadow: porVencer ? 'inset 3px 0 0 #F2A541' : undefined
                }}>
                  <td style={tdStyle}>
                    <span style={{
                      display: 'inline-block', padding: '4px 12px', borderRadius: 999,
                      background: cm.bg, color: cm.fg, fontSize: 12, fontWeight: 500
                    }}>{eq.marca?.nombre || '—'}</span>
                  </td>
                  <td style={{ ...tdStyle, fontSize: 13, fontWeight: 500 }}>{eq.modelo}</td>
                  <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 12, color: '#6B7C8C' }}>{eq.nroSerie}</td>
                  <td style={tdStyle}>
                    <span style={{
                      display: 'inline-block', padding: '4px 12px', borderRadius: 999,
                      background: ce.bg, color: ce.fg, fontSize: 12, fontWeight: 500
                    }}>{eq.estadoEquipo?.nombre || '—'}</span>
                  </td>
                  <td style={tdStyle}>
                    {eq.vencimientoGarantia ? (
                      <>
                        <div style={{ fontSize: 12, color: '#4A5868' }}>{fechaDMY(eq.vencimientoGarantia)}</div>
                        {porVencer && <span style={{ ...chipGarantia, background: '#FDEBD0', color: '#8A4B00' }}>{textoVence(diasParaVencerGarantia(eq))}</span>}
                        {vencida && <span style={{ ...chipGarantia, background: '#FAECE7', color: '#712B13' }}>Vencida</span>}
                      </>
                    ) : (
                      <span style={{ color: '#9E9CBB', fontSize: 13 }}>—</span>
                    )}
                  </td>
                  <td style={tdStyle}>
                    {cantAlertas > 0 ? (
                      <button
                        onClick={() => setModalAlertasEquipo(eq)}
                        title="Ver alertas pendientes"
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          background: '#FCE8EF', color: '#7A1B3E',
                          border: '1px solid #FCD4DE',
                          padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                          cursor: 'pointer', transition: 'background 0.15s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = '#F9D4DD'}
                        onMouseOut={(e) => e.currentTarget.style.background = '#FCE8EF'}
                      >🔔 {cantAlertas}</button>
                    ) : (
                      <span style={{ color: '#9E9CBB', fontSize: 13 }}>—</span>
                    )}
                  </td>
                  <td style={tdStyle}>
                    <button className="btn-edit" onClick={() => abrirModalEditar(eq)}>✏</button>
                    <button className="btn-edit" onClick={() => setModalQrEquipo(eq)} title="Ver / imprimir codigo QR" style={{ marginLeft: 6 }}>QR</button>
                  </td>
                </tr>
              );
            })}
            {equiposFiltrados.length === 0 && (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: 40, color: '#9E9CBB', fontSize: 13 }}>
                No hay activos para mostrar.
              </td></tr>
            )}
          </tbody>
        </table>
        <p style={{ fontSize: 12, color: '#9E9CBB', margin: '16px 0 0', textAlign: 'center' }}>
          {equiposFiltrados.length} {equiposFiltrados.length === 1 ? 'activo' : 'activos'}
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
              maxWidth:850, width:'100%', maxHeight:'92vh',
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
                {editando ? '✏️' : '🏥'}
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, color: '#1a1a1a', fontSize: 18, fontWeight: 700 }}>
                  {editando ? 'Editar activo médico' : 'Activo médico'}
                </h3>
                <p style={{ margin: '4px 0 0', color: '#6B7C8C', fontSize: 13 }}>
                  {editando
                    ? 'Modificá los datos del equipo hospitalario'
                    : 'Completá los datos del equipo para su registro patrimonial'}
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

            {}
            <div style={{ padding: '20px 18px 24px' }}>

              {}
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
              <SeccionTitulo icono="📋" titulo="Identificación del equipo" />
              <div className="rwd-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 22 }}>
                <div>
                  <label style={lblStyle}>Modelo *</label>
                  <input
                    value={modelo}
                    onChange={e => cambiarCampo('modelo', e.target.value, setModelo)}
                    placeholder="Ej: SERVO-i"
                    maxLength={100}
                    style={inpStyleErr('modelo')}
                  />
                  {errores.modelo && <span style={errStyle}>⚠ {errores.modelo}</span>}
                </div>
                <div>
                  <label style={lblStyle}>N° de Serie *</label>
                  <input
                    value={nroSerie}
                    onChange={e => cambiarCampo('nroSerie', e.target.value, setNroSerie)}
                    placeholder="Ej: MQ-2024-00438"
                    maxLength={50}
                    style={{ ...inpStyleErr('nroSerie'), fontFamily: 'monospace' }}
                  />
                  {errores.nroSerie && <span style={errStyle}>⚠ {errores.nroSerie}</span>}
                </div>

                {}
                <div style={{ position: 'relative' }}>
                  <label style={lblStyle}>Marca *</label>

                  {marcaSeleccionada ? (
                    <div style={{
                      ...inpStyleErr('idMarca'),
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 12px', background: '#F0F6FA',
                      border: '1.5px solid #C8DCEA'
                    }}>
                      <span style={{ fontSize: 14 }}>✓</span>
                      <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>
                        {marcaSeleccionada.nombre}
                      </div>
                      <button
                        type="button" onClick={limpiarMarca}
                        title="Cambiar marca"
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
                        position: 'relative', ...inpStyleErr('idMarca'),
                        padding: 0, display: 'flex', alignItems: 'center'
                      }}>
                        <span style={{
                          position: 'absolute', left: 12, top: '50%',
                          transform: 'translateY(-50%)',
                          color: '#9E9CBB', fontSize: 14, pointerEvents: 'none'
                        }}>🔍</span>
                        <input
                          type="text" value={buscadorMarca}
                          onChange={e => { setBuscadorMarca(e.target.value); setMostrarListaMarca(true); }}
                          onFocus={() => setMostrarListaMarca(true)}
                          onBlur={() => setTimeout(() => setMostrarListaMarca(false), 200)}
                          placeholder="Buscar marca..."
                          style={{
                            width: '100%', padding: '10px 12px 10px 36px',
                            border: 'none', outline: 'none',
                            fontSize: 13, background: 'transparent',
                            fontFamily: 'inherit'
                          }}
                        />
                      </div>

                      {mostrarListaMarca && (
                        <div style={{
                          position: 'absolute', top: '100%', left: 0, right: 0,
                          background: 'white',
                          border: '1px solid #E5EDF3', borderRadius: 8,
                          marginTop: 4, maxHeight: 220, overflowY: 'auto',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                          zIndex: 10
                        }}>
                          {marcasFiltradas.length === 0 ? (
                            <div style={{ padding: '16px', textAlign: 'center', color: '#9E9CBB', fontSize: 12 }}>
                              No se encontraron marcas con "{buscadorMarca}"
                            </div>
                          ) : (
                            marcasFiltradas.map(m => (
                              <div
                                key={m.idMarca} onClick={() => seleccionarMarca(m)}
                                style={{
                                  padding: '10px 14px', cursor: 'pointer',
                                  borderBottom: '1px solid #F1F4F7',
                                  fontSize: 13, fontWeight: 500, color: '#1a1a1a',
                                  transition: 'background 0.1s'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.background = '#F0F6FA'}
                                onMouseOut={(e) => e.currentTarget.style.background = 'white'}
                              >
                                {m.nombre}
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </>
                  )}
                  {errores.idMarca && <span style={errStyle}>⚠ {errores.idMarca}</span>}
                </div>

                {}
                <div style={{ position: 'relative' }}>
                  <label style={lblStyle}>Tipo de activo *</label>

                  {tipoSeleccionado ? (
                    <div style={{
                      ...inpStyleErr('idTipo'),
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 12px', background: '#F0F6FA',
                      border: '1.5px solid #C8DCEA'
                    }}>
                      <span style={{ fontSize: 14 }}>✓</span>
                      <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>
                        {tipoSeleccionado.nombre}
                      </div>
                      <button
                        type="button" onClick={limpiarTipo}
                        title="Cambiar tipo"
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
                        position: 'relative', ...inpStyleErr('idTipo'),
                        padding: 0, display: 'flex', alignItems: 'center'
                      }}>
                        <span style={{
                          position: 'absolute', left: 12, top: '50%',
                          transform: 'translateY(-50%)',
                          color: '#9E9CBB', fontSize: 14, pointerEvents: 'none'
                        }}>🔍</span>
                        <input
                          type="text" value={buscadorTipo}
                          onChange={e => { setBuscadorTipo(e.target.value); setMostrarListaTipo(true); }}
                          onFocus={() => setMostrarListaTipo(true)}
                          onBlur={() => setTimeout(() => setMostrarListaTipo(false), 200)}
                          placeholder="Buscar tipo de activo..."
                          style={{
                            width: '100%', padding: '10px 12px 10px 36px',
                            border: 'none', outline: 'none',
                            fontSize: 13, background: 'transparent',
                            fontFamily: 'inherit'
                          }}
                        />
                      </div>

                      {mostrarListaTipo && (
                        <div style={{
                          position: 'absolute', top: '100%', left: 0, right: 0,
                          background: 'white',
                          border: '1px solid #E5EDF3', borderRadius: 8,
                          marginTop: 4, maxHeight: 220, overflowY: 'auto',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                          zIndex: 10
                        }}>
                          {tiposFiltrados.length === 0 ? (
                            <div style={{ padding: '16px', textAlign: 'center', color: '#9E9CBB', fontSize: 12 }}>
                              No se encontraron tipos con "{buscadorTipo}"
                            </div>
                          ) : (
                            tiposFiltrados.map(t => (
                              <div
                                key={t.idTipo} onClick={() => seleccionarTipo(t)}
                                style={{
                                  padding: '10px 14px', cursor: 'pointer',
                                  borderBottom: '1px solid #F1F4F7',
                                  fontSize: 13, fontWeight: 500, color: '#1a1a1a',
                                  transition: 'background 0.1s'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.background = '#F0F6FA'}
                                onMouseOut={(e) => e.currentTarget.style.background = 'white'}
                              >
                                {t.nombre}
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </>
                  )}
                  {errores.idTipo && <span style={errStyle}>⚠ {errores.idTipo}</span>}
                </div>
              </div>

              {}
              <SeccionTitulo icono="📅" titulo="Fechas de trazabilidad" />
              <div
                className="rwd-grid"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(340px, 1fr))',
                  gap: 12,
                  marginBottom: 22
                }}
              >
                <div>
                  <label style={lblStyle}>Fecha de adquisición *</label>

                  <DatePicker
                    selected={fechaAdq ? new Date(fechaAdq) : null}
                    onChange={(date) => {
                      if (date) {
                        const adquisicion = date.toISOString().split("T")[0];
                        const garantia = new Date(date);
                        garantia.setFullYear(garantia.getFullYear() + 1);
                        const vencimiento = garantia.toISOString().split("T")[0];

                        cambiarCampo("fechaAdq", adquisicion, setFechaAdq);
                        cambiarCampo("fechaGar", vencimiento, setFechaGar);
                      } else {
                        cambiarCampo("fechaAdq", "", setFechaAdq);
                        cambiarCampo("fechaGar", "", setFechaGar);
                      }
                    }}
                    dateFormat="dd/MM/yyyy"
                    maxDate={hoy}
                    minDate={inicioAnio}
                    showYearDropdown
                    scrollableYearDropdown
                    yearDropdownItemNumber={50}
                    customInput={<CustomDateInput />}
                  />

                  {errores.fechaAdq && (
                    <span style={errStyle}>⚠ {errores.fechaAdq}</span>
                  )}
                </div>

                <div>
                  <label style={lblStyle}>Vencimiento de garantía</label>

                  <DatePicker
                    selected={fechaGar ? new Date(fechaGar) : null}
                    onChange={(date) =>
                      cambiarCampo(
                        "fechaGar",
                        date ? date.toISOString().split("T")[0] : "",
                        setFechaGar
                      )
                    }
                    dateFormat="dd/MM/yyyy"
                    minDate={fechaAdq ? new Date(fechaAdq) : inicioAnio}
                    maxDate={finAnio}
                    showYearDropdown
                    scrollableYearDropdown
                    yearDropdownItemNumber={1}
                    customInput={<CustomDateInput placeholder="dd/mm/aaaa" />}
                  />

                  {errores.fechaGar && (
                    <span style={errStyle}>⚠ {errores.fechaGar}</span>
                  )}
                </div>
              </div>

              {}
              <SeccionTitulo icono="🧩" titulo="Componentes del equipo" />
              <div style={{ marginBottom: 22 }}>
                {!tipoSeleccionado ? (
                  <div style={{
                    fontSize: 12, color: '#9E9CBB', background: '#FAFBFC',
                    border: '1px dashed #E5EDF3', borderRadius: 10, padding: '14px 16px'
                  }}>
                    Seleccioná primero el <strong>Tipo de activo</strong> para ver los componentes esperados.
                  </div>
                ) : !componentesDelTipo ? (
                  <div style={{
                    fontSize: 12, color: '#633806', background: '#FAEEDA',
                    border: '1px solid #F0DFAE', borderRadius: 10, padding: '14px 16px'
                  }}>
                    Todavía no hay un catálogo de componentes cargado para "<strong>{tipoSeleccionado.nombre}</strong>".
                    Podés continuar sin marcarlos.
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                      <div style={{ fontSize: 11, color: '#9E9CBB' }}>
                        {componentesSeleccionados.length} de {componentesDelTipo.items.length} componentes marcados
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button type="button" onClick={marcarTodosObligatorios} style={btnMiniGhost}>
                          Marcar obligatorios
                        </button>
                        <button type="button" onClick={limpiarComponentes} style={btnMiniGhost}>
                          Limpiar
                        </button>
                      </div>
                    </div>

                    <div style={{
                      border: '1px solid #E5EDF3', borderRadius: 10,
                      maxHeight: 260, overflowY: 'auto'
                    }}>
                      {componentesDelTipo.items.map((item, idx) => {
                        const marcado = componentesSeleccionados.includes(item.componente);
                        const cr = colorRequerimiento(item.requerimiento);
                        return (
                          <label
                            key={idx}
                            title={item.notas || ''}
                            style={{
                              display: 'flex', alignItems: 'flex-start', gap: 10,
                              padding: '10px 14px',
                              borderBottom: idx < componentesDelTipo.items.length - 1 ? '1px solid #F1F4F7' : 'none',
                              cursor: 'pointer',
                              background: marcado ? '#F7FBFD' : 'white'
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={marcado}
                              onChange={() => toggleComponente(item.componente)}
                              style={{ marginTop: 3, cursor: 'pointer' }}
                            />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a' }}>
                                {item.componente}
                              </div>
                              <div style={{ fontSize: 11, color: '#9E9CBB', marginTop: 2 }}>
                                {item.categoria}
                              </div>
                            </div>
                            <span style={{
                              flexShrink: 0, padding: '3px 9px', borderRadius: 999,
                              background: cr.bg, color: cr.fg, fontSize: 10, fontWeight: 600,
                              whiteSpace: 'nowrap'
                            }}>{item.requerimiento}</span>
                          </label>
                        );
                      })}
                    </div>
                  </>
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
                {editando ? '✓ Actualizar activo' : '✓ Registrar activo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {}
      {modalAlertasEquipo && (
        <div
          onClick={() => setModalAlertasEquipo(null)}
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
                <h3 style={{ margin:0, color:'#FF5E7A' }}>🔔 Alertas pendientes</h3>
                <div style={{ fontSize:13, color:'#666', marginTop:4 }}>
                  <strong>{modalAlertasEquipo.modelo}</strong> · S/N {modalAlertasEquipo.nroSerie}
                </div>
              </div>
              <button
                onClick={() => setModalAlertasEquipo(null)}
                style={{ background:'none', border:'none', fontSize:24, cursor:'pointer', color:'#999', lineHeight:1 }}
                title="Cerrar (Esc)"
              >✕</button>
            </div>
            {(alertasPorEquipo[modalAlertasEquipo.idEquipo] || []).map(a => (
              <div key={a.idAlerta}
                style={{ border:'1px solid #eee', borderRadius:8, padding:12, marginBottom:10, borderLeft:`4px solid ${colorEstadoAlerta(a.estado)}` }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <strong style={{ color:'#333', fontSize:14 }}>
                    {iconoTipoAlerta(a.tipo)} {a.tipo}
                  </strong>
                  <span style={{
                    background: colorEstadoAlerta(a.estado) + '22',
                    color: colorEstadoAlerta(a.estado),
                    border: `1px solid ${colorEstadoAlerta(a.estado)}44`,
                    padding:'2px 8px', borderRadius:4, fontSize:10, fontWeight:700
                  }}>{a.estado}</span>
                </div>
                <div style={{ color:'#666', fontSize:12, marginTop:6 }}>
                  📅 {a.fechaGeneracion?.split('T')[0]} · 👤 {a.usuario?.nombre || '—'}
                </div>
              </div>
            ))}
            <div style={{ display:'flex', justifyContent:'flex-end', gap:10, marginTop:14, paddingTop:14, borderTop:'1px solid #eee' }}>
              <button onClick={() => setModalAlertasEquipo(null)} style={btnSave}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {}
      {modalQrEquipo && (
        <div
          onClick={() => setModalQrEquipo(null)}
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
              maxWidth:400, width:'100%', maxHeight:'90vh',
              overflowY:'auto', boxShadow:'0 10px 40px rgba(0,0,0,0.2)'
            }}
          >
            <div id="qr-imprimible" style={{ textAlign: 'center' }}>
              <div style={{ marginBottom: 14 }}>
                <strong style={{ fontSize: 15, color: '#1a1a1a' }}>{modalQrEquipo.modelo}</strong>
                <div style={{ fontSize: 13, color: '#6B7C8C', marginTop: 2 }}>S/N {modalQrEquipo.nroSerie}</div>
              </div>
              <img
                src={imagenQr(urlQrEquipo(modalQrEquipo.idEquipo))}
                alt={`Codigo QR de ${modalQrEquipo.modelo}`}
                style={{ width: 260, height: 260, margin: '0 auto' }}
              />
            </div>
            {apuntaALocalhost(urlQrEquipo(modalQrEquipo.idEquipo)) && (
              <div role="alert" className="no-print" style={{
                marginTop: 14, padding: '10px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600, lineHeight: 1.4,
                background: '#FFF4E5', color: '#8A4B00', border: '1px solid #F5C27A', textAlign: 'left'
              }}>
                ⚠ {AVISO_QR_LOCALHOST}
              </div>
            )}
            <div className="no-print" style={{ display:'flex', justifyContent:'flex-end', gap:10, marginTop:18, paddingTop:14, borderTop:'1px solid #eee' }}>
              <button onClick={() => setModalQrEquipo(null)} style={btnGhost}>Cerrar</button>
              <button onClick={() => window.print()} style={btnSave}>Imprimir</button>
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

        @media print {
          body * { visibility: hidden; }
          #qr-imprimible, #qr-imprimible * { visibility: visible; }
          #qr-imprimible { position: fixed; top: 40px; left: 50%; transform: translateX(-50%); box-shadow: none; }
          .no-print { display: none !important; }
        }

        .react-datepicker-wrapper {
          width: 100%;
          display: block;
        }

        .react-datepicker__input-container {
          width: 100%;
          display: block;
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
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
      paddingBottom: 8,
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

const alertaBox = { background: '#FFF8EC', border: '1px solid #F7D9A8', borderLeft: '4px solid #F2A541', borderRadius: 10, padding: '14px 16px' };
const alertaCard = { background: 'white', border: '1px solid #F3E3C7', borderRadius: 8, padding: '10px 12px', fontSize: 13 };
const chipGarantia = { display: 'inline-block', marginTop: 3, padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600 };

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
  transition: 'all 0.15s',
  outline: 'none',
  fontFamily: 'inherit'
};
const errStyle = {
  display: 'block', color: '#E85A6D', fontSize: 11,
  marginTop: 6, fontWeight: 500
};
const btnGhost = {
  background:'white', color:'#6B7C8C', border:'1px solid #E5EDF3',
  padding:'10px 18px', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer'
};
const btnMiniGhost = {
  background:'white', color:'#2C7DA0', border:'1px solid #C8DCEA',
  padding:'5px 12px', borderRadius:6, fontSize:11, fontWeight:600, cursor:'pointer'
};
const btnSave = {
  background: 'linear-gradient(135deg, #2C7DA0 0%, #4A9BB8 100%)',
  color:'white', border:'none',
  padding:'10px 20px', borderRadius:8,
  fontSize:13, fontWeight:600, cursor:'pointer',
  boxShadow: '0 2px 8px rgba(44,125,160,0.25)'
};

export default Activos;
