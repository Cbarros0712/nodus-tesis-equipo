import { useState, useEffect, useMemo, useRef } from 'react';
import api from '../api';
import { useToast, mensajeDeError } from '../components/Toast';
import { puedeHacer } from '../permisos';

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

const hashTexto = (nombre) => {
  let hash = 0;
  for (let i = 0; i < nombre.length; i++) {
    hash = nombre.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
};
const colorMarca = (nombre) => (nombre ? PALETA_PASTEL[hashTexto(nombre) % PALETA_PASTEL.length] : PALETA_PASTEL[0]);
const colorTipo = (nombre) => (nombre ? PALETA_PASTEL[(hashTexto(nombre) + 7) % PALETA_PASTEL.length] : PALETA_PASTEL[0]);

const normalizar = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// Fechas "solo día" (sin hora o a medianoche) se muestran tal cual, sin correrse un día por la zona horaria.
// Los instantes con hora real se pasan a hora local.
const fmtFecha = (f) => {
  if (!f) return '—';
  const texto = String(f);
  const soloDia = /^(\d{4})-(\d{2})-(\d{2})(?:T00:00:00(?:\.0+)?Z?)?$/.exec(texto);
  const opciones = { day: '2-digit', month: 'short', year: 'numeric' };
  if (soloDia) {
    return new Date(Number(soloDia[1]), Number(soloDia[2]) - 1, Number(soloDia[3])).toLocaleDateString('es-AR', opciones);
  }
  const d = new Date(f);
  return isNaN(d) ? '—' : d.toLocaleDateString('es-AR', opciones);
};

const fmtTiempo = (min) => {
  if (!min) return '0 min';
  const h = Math.floor(min / 60), m = min % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
};

const alActivar = (fn) => (e) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); }
};

function HojasDeVida({ auth }) {
  const toast = useToast();
  // La apertura masiva escribe datos: solo para quien puede editar activos (Bioingeniero)
  const puedeAbrirMasivo = puedeHacer(auth?.usuario?.rol, 'editar_activo');

  const [hojas, setHojas] = useState([]);
  const [cargandoHojas, setCargandoHojas] = useState(true);
  const [historia, setHistoria] = useState(null);
  const [equipoSeleccionadoId, setEquipoSeleccionadoId] = useState(null);
  const [cargandoHistoria, setCargandoHistoria] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [gruposExpandidos, setGruposExpandidos] = useState({});
  const [modalMasivo, setModalMasivo] = useState(false);
  const [generando, setGenerando] = useState(false);
  const peticionActual = useRef(0);

  useEffect(() => { cargarHojas(); }, []);

  const cargarHojas = async () => {
    setCargandoHojas(true);
    try {
      const r = await api.get('/hojasdevida');
      setHojas(r.data);
    } catch (err) {
      toast.error('No se pudieron cargar las hojas de vida', mensajeDeError(err, 'Revisá la conexión e intentá de nuevo.'));
    } finally {
      setCargandoHojas(false);
    }
  };

  const gruposPorTipo = useMemo(() => {
    let lista = hojas;
    const q = normalizar(busqueda.trim());
    if (q) {
      lista = hojas.filter(h =>
        [h.equipo?.modelo, h.equipo?.marca?.nombre, h.equipo?.nroSerie, h.equipo?.tipoActivo?.nombre]
          .some(c => normalizar(c).includes(q))
      );
    }

    const map = {};
    lista.forEach(h => {
      const tipo = h.equipo?.tipoActivo?.nombre || 'Sin tipo';
      if (!map[tipo]) map[tipo] = [];
      map[tipo].push(h);
    });

    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
  }, [hojas, busqueda]);

  const totalVisibles = useMemo(() => gruposPorTipo.reduce((n, [, l]) => n + l.length, 0), [gruposPorTipo]);

  // Al entrar, se abre la hoja del primer equipo
  useEffect(() => {
    if (!equipoSeleccionadoId && gruposPorTipo.length > 0 && gruposPorTipo[0][1].length > 0) {
      verHistoria(gruposPorTipo[0][1][0].idEquipo);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gruposPorTipo]);

  // Mientras se busca, todos los grupos se muestran abiertos para ver los resultados
  const estaExpandido = (tipo) => (busqueda.trim() ? true : (gruposExpandidos[tipo] ?? true));
  const toggleGrupo = (tipo) => {
    setGruposExpandidos(prev => ({ ...prev, [tipo]: !(prev[tipo] ?? true) }));
  };

  const cerrarModalMasivo = () => { if (!generando) setModalMasivo(false); };

  useEffect(() => {
    if (!modalMasivo) return;
    const handler = (e) => { if (e.key === 'Escape') cerrarModalMasivo(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalMasivo, generando]);

  const generarParaTodos = async () => {
    if (generando) return;
    setGenerando(true);
    try {
      const r = await api.post('/hojasdevida/generar-para-todos');
      toast.success('Hojas de vida generadas', r.data.mensaje || 'Hojas de vida generadas correctamente.');
      setModalMasivo(false);
      cargarHojas();
    } catch (err) {
      toast.error('No se pudo generar', mensajeDeError(err, 'Error al generar las hojas de vida.'));
    } finally {
      setGenerando(false);
    }
  };

  // Si se hacen clic en dos equipos seguidos, solo vale la respuesta del último
  const verHistoria = async (idEquipo) => {
    const numero = ++peticionActual.current;
    setCargandoHistoria(true);
    setEquipoSeleccionadoId(idEquipo);
    try {
      const r = await api.get(`/hojasdevida/equipo/${idEquipo}/historia`);
      if (numero !== peticionActual.current) return;
      setHistoria(r.data);
    } catch (err) {
      if (numero !== peticionActual.current) return;
      toast.error('No se pudo cargar', mensajeDeError(err, 'Error al cargar la historia del equipo.'));
      setHistoria(null);
    } finally {
      if (numero === peticionActual.current) setCargandoHistoria(false);
    }
  };

  return (
    <>
      <div className="rwd-page-header no-print" style={{ padding: '20px 24px 0', background: 'white' }}>
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
              color: '#4B3FBF',
              border: '1px solid rgba(124, 110, 250, 0.25)',
              padding: '4px 12px', borderRadius: 8,
              fontSize: 12, fontWeight: 600, letterSpacing: '0.5px'
            }}>HOJAS DE VIDA</span>

            <p style={{ fontSize: 13, color: '#5C6B7A', margin: 0, marginLeft: 8 }}>
              Documento patrimonial del ciclo de vida de cada equipo
            </p>
          </div>

          {puedeAbrirMasivo && (
            <button
              onClick={() => setModalMasivo(true)}
              style={{
                background: '#F0F6FA', color: '#4A5868', border: 'none',
                borderRadius: 6, padding: '10px 16px', fontSize: 11,
                fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase',
                cursor: 'pointer', transition: 'background 0.15s, color 0.15s'
              }}
              onMouseOver={(e) => { e.currentTarget.style.background = '#E0EBF3'; e.currentTarget.style.color = '#1F6E8F'; }}
              onMouseOut={(e) => { e.currentTarget.style.background = '#F0F6FA'; e.currentTarget.style.color = '#4A5868'; }}
            ><span aria-hidden="true">📋 </span>APERTURA MASIVA</button>
          )}
        </div>
      </div>

      <div className="rwd-grid hv-grid" style={{
        display: 'grid', gridTemplateColumns: '340px 1fr',
        gap: 0, background: 'white',
        minHeight: 600, borderTop: '1px solid #E5EDF3'
      }}>

        <div className="hv-lista no-print" style={{
          borderRight: '1px solid #E5EDF3', padding: '16px',
          maxHeight: 'calc(100vh - 180px)', overflowY: 'auto'
        }}>
          <div style={{
            fontSize: 15, fontWeight: 700, color: '#1a1a1a',
            marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8
          }}>
            <span aria-hidden="true">📋</span>
            <span>Hoja de vida</span>
            <span
              title={busqueda.trim() ? `${totalVisibles} de ${hojas.length} equipos` : `${hojas.length} equipos`}
              style={{
                marginLeft: 'auto',
                background: '#1a1a1a', color: 'white',
                borderRadius: 6, padding: '2px 8px',
                fontSize: 11, fontWeight: 600
              }}>{busqueda.trim() ? `${totalVisibles} de ${hojas.length}` : hojas.length}</span>
          </div>

          <div style={{
            background: '#F4F7FA', borderRadius: 8, padding: '8px 12px',
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14
          }}>
            <span aria-hidden="true" style={{ color: '#5C6B7A', fontSize: 14 }}>🔍</span>
            <input
              type="text" placeholder="Buscar equipo" value={busqueda}
              aria-label="Buscar equipo por modelo, marca, serie o tipo"
              onChange={e => setBusqueda(e.target.value)}
              style={{
                background: 'transparent', border: 'none', outline: 'none',
                flex: 1, fontSize: 13, color: '#2D3748'
              }}
            />
            {busqueda && (
              <button
                type="button" onClick={() => setBusqueda('')}
                title="Limpiar búsqueda" aria-label="Limpiar búsqueda"
                style={{ background: 'transparent', border: 'none', color: '#5C6B7A', fontSize: 16, cursor: 'pointer', padding: '0 4px' }}
              >×</button>
            )}
          </div>

          {gruposPorTipo.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 30, color: '#5C6B7A', fontSize: 13, lineHeight: 1.5 }}>
              {cargandoHojas
                ? 'Cargando hojas de vida…'
                : hojas.length === 0
                  ? <>No hay hojas de vida.{puedeAbrirMasivo && <><br />Usá "Apertura masiva" para crearlas.</>}</>
                  : 'Sin resultados para la búsqueda.'}
            </div>
          ) : (
            gruposPorTipo.map(([tipo, lista]) => {
              const expandido = estaExpandido(tipo);
              return (
                <div key={tipo} style={{ marginBottom: 6 }}>
                  <div
                    role="button" tabIndex={0} aria-expanded={expandido}
                    onClick={() => toggleGrupo(tipo)}
                    onKeyDown={alActivar(() => toggleGrupo(tipo))}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '8px 4px', cursor: 'pointer',
                      fontSize: 12, color: '#4A5868', fontWeight: 500
                    }}
                  >
                    <span aria-hidden="true" style={{
                      transform: expandido ? 'rotate(90deg)' : 'rotate(0deg)',
                      transition: 'transform 0.15s', fontSize: 10, color: '#5C6B7A'
                    }}>▶</span>
                    <span style={{ color: '#5C6B7A', textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: 10 }}>
                      Tipo:
                    </span>
                    <strong>{tipo}</strong>
                    <span style={{ marginLeft: 'auto', color: '#5C6B7A', fontSize: 11 }}>
                      {lista.length}
                    </span>
                  </div>

                  {expandido && lista.map(h => {
                    const isSelected = equipoSeleccionadoId === h.idEquipo;
                    const cm = colorMarca(h.equipo?.marca?.nombre);
                    return (
                      <div
                        key={h.idHoja}
                        role="button" tabIndex={0} aria-pressed={isSelected}
                        onClick={() => verHistoria(h.idEquipo)}
                        onKeyDown={alActivar(() => verHistoria(h.idEquipo))}
                        style={{
                          background: isSelected ? '#F0F6FA' : 'white',
                          border: isSelected ? '1px solid #C8DCEA' : '1px solid #F1F4F7',
                          borderLeft: isSelected ? '4px solid #1F6E8F' : '4px solid transparent',
                          borderRadius: 10, padding: 12,
                          marginBottom: 8, marginLeft: 14,
                          cursor: 'pointer', transition: 'all 0.15s'
                        }}
                        onMouseOver={(e) => { if (!isSelected) e.currentTarget.style.background = '#F8FAFC'; }}
                        onMouseOut={(e) => { if (!isSelected) e.currentTarget.style.background = 'white'; }}
                      >
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', marginBottom: 6 }}>
                          {h.equipo?.modelo || 'Sin modelo'}
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                          <span style={{
                            display: 'inline-block', padding: '2px 8px', borderRadius: 999,
                            background: cm.bg, color: cm.fg, fontSize: 10, fontWeight: 500
                          }}>{h.equipo?.marca?.nombre || '—'}</span>
                          <span style={{ fontSize: 10, color: '#5C6B7A', fontFamily: 'monospace' }}>
                            {h.equipo?.nroSerie || '—'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        <div className="hv-detalle" style={{ padding: '24px 28px', maxHeight: 'calc(100vh - 180px)', overflowY: 'auto' }}>
          {cargandoHistoria ? (
            <div role="status" style={{ textAlign: 'center', padding: 60, color: '#5C6B7A', fontSize: 14 }}>
              Cargando historia del equipo…
            </div>
          ) : !historia ? (
            <div style={{ textAlign: 'center', padding: 80, color: '#5C6B7A', fontSize: 14 }}>
              Seleccioná un equipo de la lista para ver su hoja de vida.
            </div>
          ) : (
            <HistoriaDetalle key={historia.equipo?.idEquipo} historia={historia} usuario={auth?.usuario?.nombre} />
          )}
        </div>
      </div>

      {modalMasivo && (
        <div
          onClick={cerrarModalMasivo}
          className="rwd-modal-overlay no-print"
          style={{
            position:'fixed', top:0, left:0, right:0, bottom:0,
            background:'rgba(20,25,40,0.6)', backdropFilter: 'blur(4px)',
            display:'flex', alignItems:'center', justifyContent:'center',
            zIndex:1000, padding:20
          }}
        >
          <div
            role="dialog" aria-modal="true" aria-labelledby="hv-masivo-titulo"
            onClick={(e) => e.stopPropagation()}
            className="rwd-modal-box"
            style={{
              background:'white', borderRadius:16,
              maxWidth:520, width:'100%',
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
                background: 'linear-gradient(135deg, #EEEDFE 0%, #DCD9F5 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24, flexShrink: 0
              }}>📋</div>
              <div style={{ flex: 1 }}>
                <h3 id="hv-masivo-titulo" style={{ margin: 0, color: '#1a1a1a', fontSize: 18, fontWeight: 700 }}>
                  Apertura masiva de hojas de vida
                </h3>
                <p style={{ margin: '4px 0 0', color: '#5C6B7A', fontSize: 13 }}>
                  Crea automáticamente hojas de vida para todos los equipos que aún no tengan
                </p>
              </div>
              <button
                onClick={cerrarModalMasivo} title="Cerrar (Esc)" aria-label="Cerrar"
                style={{ background: '#F4F7FA', border: 'none', width: 32, height: 32, borderRadius: 8, fontSize: 18, cursor: 'pointer', color: '#5C6B7A' }}
              >✕</button>
            </div>

            <div style={{ padding: '20px 28px' }}>
              <div style={{
                background: '#FAFBFC', border: '1px solid #E5EDF3',
                borderRadius: 10, padding: '14px 16px', fontSize: 13, color: '#4A5868',
                lineHeight: 1.6
              }}>
                Se generará una hoja de vida por cada equipo del inventario que aún no tenga una,
                utilizando la <strong>fecha de adquisición del equipo</strong> como fecha de apertura.
                <br/><br/>
                Los equipos que ya tengan hoja de vida <strong>no se verán afectados</strong>.
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
              <button onClick={cerrarModalMasivo} disabled={generando} style={btnGhost}>Cancelar</button>
              <button
                onClick={generarParaTodos} disabled={generando}
                style={{ ...btnSave, opacity: generando ? 0.6 : 1, cursor: generando ? 'not-allowed' : 'pointer' }}
              >
                {generando ? 'Generando…' : '✓ Generar hojas de vida'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-20px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .solo-print { display: none; }
        @media print {
          .no-print { display: none !important; }
          .solo-print { display: block !important; }
          .hv-grid { display: block !important; border-top: none !important; min-height: 0 !important; }
          .hv-detalle { max-height: none !important; overflow: visible !important; padding: 0 !important; }
          .hv-extra { display: block !important; }
        }
      `}</style>
    </>
  );
}

function HistoriaDetalle({ historia, usuario }) {
  const { equipo, hojaDeVida, ubicaciones, ots, alertas, baja, metricas } = historia;
  const [verTodosTraslados, setVerTodosTraslados] = useState(false);
  const [verTodasAlertas, setVerTodasAlertas] = useState(false);
  const LIMITE = 5;

  const chipEstadoOT = (estado) => {
    const map = {
      'Pendiente':  { bg: '#FAEEDA', fg: '#633806' },
      'En curso':   { bg: '#E6F1FB', fg: '#0C447C' },
      'Cerrada':    { bg: '#E1F5EE', fg: '#0B5A46' },
      'Anulada':    { bg: '#F1EFE8', fg: '#444441' }
    };
    return map[estado] || map['Anulada'];
  };

  const chipResultadoSeg = (r) => {
    const map = {
      'Aprobado':                       { bg: '#E1F5EE', fg: '#0B5A46' },
      'Aprobado con observaciones':     { bg: '#FAEEDA', fg: '#633806' },
      'Desaprobado':                    { bg: '#FCEBEB', fg: '#8F2D14' },
      'Reprobado':                      { bg: '#FCEBEB', fg: '#8F2D14' },
      'No aplica':                      { bg: '#F1EFE8', fg: '#444441' }
    };
    return map[r] || map['No aplica'];
  };

  const cm = colorMarca(equipo.marca?.nombre);
  const ct = colorTipo(equipo.tipoActivo?.nombre);

  const imprimirPDF = () => window.print();

  return (
    <>
      {/* Encabezado que solo aparece al imprimir */}
      <div className="solo-print" style={{ textAlign: 'center', marginBottom: 16 }}>
        <img src="/logonodus.jpg" alt="NODUS" style={{ height: 56, width: 'auto' }} />
        <div style={{ fontSize: 12, color: '#4A5868', marginTop: 4 }}>Sistema de Control Patrimonial Hospitalario</div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 11, color: '#5C6B7A', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
            Hoja de vida · Equipo #{equipo.idEquipo}
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1a1a1a', margin: 0, lineHeight: 1.2 }}>
            {equipo.modelo}
          </h1>
        </div>
        <button
          onClick={imprimirPDF}
          className="no-print"
          title='Se abre la impresión: elegí "Guardar como PDF" para obtener el archivo'
          style={{
            background: '#F0F6FA', color: '#4A5868', border: 'none',
            borderRadius: 6, padding: '8px 14px', fontSize: 11,
            fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
            cursor: 'pointer', flexShrink: 0
          }}
          onMouseOver={(e) => { e.currentTarget.style.background = '#E0EBF3'; e.currentTarget.style.color = '#1F6E8F'; }}
          onMouseOut={(e) => { e.currentTarget.style.background = '#F0F6FA'; e.currentTarget.style.color = '#4A5868'; }}
        ><span aria-hidden="true">🖨 </span>Exportar PDF</button>
      </div>

      <div style={{ height: 1, background: '#E5EDF3', marginBottom: 24 }}></div>

      <div style={{ marginBottom: 30 }}>
        <FilaDetalle label="Equipo">
          <div style={{
            background: '#FAFBFC', border: '1px solid #E5EDF3',
            borderRadius: 8, padding: '12px 14px', maxWidth: 480
          }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a', marginBottom: 8 }}>
              {equipo.modelo}
            </div>
            <div className="rwd-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 12 }}>
              <div>
                <div style={{ color: '#5C6B7A', fontSize: 10, textTransform: 'uppercase', marginBottom: 2 }}>Id</div>
                <div style={{ color: '#2D3748', fontWeight: 500 }}>{equipo.idEquipo}</div>
              </div>
              <div>
                <div style={{ color: '#5C6B7A', fontSize: 10, textTransform: 'uppercase', marginBottom: 2 }}>Tipo</div>
                <span style={{
                  display: 'inline-block', padding: '2px 8px', borderRadius: 999,
                  background: ct.bg, color: ct.fg,
                  fontSize: 11, fontWeight: 500
                }}>{equipo.tipoActivo?.nombre || '—'}</span>
              </div>
            </div>
          </div>
        </FilaDetalle>

        <FilaDetalle label="Marca">
          <span style={{
            display: 'inline-block', padding: '4px 12px', borderRadius: 999,
            background: cm.bg, color: cm.fg,
            fontSize: 12, fontWeight: 500
          }}>{equipo.marca?.nombre || '—'}</span>
        </FilaDetalle>

        <FilaDetalle label="Modelo">
          {equipo.modelo || '—'}
        </FilaDetalle>

        <FilaDetalle label="N° de serie">
          <span style={{ fontFamily: 'monospace', fontSize: 13, color: '#4A5868' }}>
            {equipo.nroSerie || '—'}
          </span>
        </FilaDetalle>

        <FilaDetalle label="Estado actual">
          <span style={{
            display: 'inline-block', padding: '4px 12px', borderRadius: 999,
            background: '#F0F6FA', color: '#0C447C',
            fontSize: 12, fontWeight: 500
          }}>{equipo.estadoEquipo?.nombre || '—'}</span>
        </FilaDetalle>

        <FilaDetalle label="Adquisición">
          📅 {fmtFecha(equipo.fechaAdquisicion)}
        </FilaDetalle>

        <FilaDetalle label="Garantía">
          {!equipo.vencimientoGarantia ? (
            <span style={{ color: '#5C6B7A' }}>Sin garantía registrada</span>
          ) : (
            <span style={{ color: metricas?.garantiaVigente ? '#0B5A46' : '#8F2D14' }}>
              📅 {fmtFecha(equipo.vencimientoGarantia)}
              {' '}
              <span style={{ fontSize: 11, fontWeight: 600 }}>
                {metricas?.garantiaVigente ? '✓ Vigente' : '✗ Vencida'}
              </span>
            </span>
          )}
        </FilaDetalle>

        {hojaDeVida && (
          <FilaDetalle label="Apertura de hoja">
            📅 {fmtFecha(hojaDeVida.fechaApertura)}
          </FilaDetalle>
        )}
      </div>

      {metricas && (
        <div style={{ marginBottom: 30 }}>
          <SeccionTitulo icono="📊" titulo="Métricas del ciclo de vida" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10 }}>
            <MiniKPI label="Años" valor={metricas.antiguedadAnios} color="#4B3FBF" />
            <MiniKPI label="Traslados" valor={metricas.totalTraslados} color="#1F6E8F" />
            <MiniKPI label="OTs" valor={metricas.totalOTs} color="#7A4A00" />
            <MiniKPI label="Tareas" valor={metricas.totalIntervenciones} color="#4B3FBF" />
            <MiniKPI label="Alertas" valor={metricas.totalAlertas} color="#8F2D14" />
          </div>
          {metricas.totalMinutosIntervencion > 0 && (
            <div style={{
              marginTop: 10, padding: '10px 14px',
              background: '#FAEEDA', border: '1px solid rgba(163, 119, 21, 0.2)',
              borderRadius: 8, fontSize: 12, color: '#633806'
            }}>
              ⏱ <strong>Tiempo total de intervenciones técnicas:</strong> {fmtTiempo(metricas.totalMinutosIntervencion)}
            </div>
          )}
        </div>
      )}

      {metricas?.dadoDeBaja && baja && (
        <div style={{
          background: 'linear-gradient(90deg, #FDECEE 0%, #F9D4DD 100%)',
          border: '1px solid #F5C2C7',
          borderRadius: 10, padding: '14px 16px',
          marginBottom: 24
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#7A1B3E', marginBottom: 6 }}>
            📦 Equipo dado de baja
          </div>
          <div style={{ fontSize: 12, color: '#4A5868', lineHeight: 1.6 }}>
            <div>📅 <strong>Fecha:</strong> {fmtFecha(baja.fecha)}</div>
            <div><strong>Motivo:</strong> {baja.motivo || '—'}</div>
            <div style={{ marginTop: 6 }}><strong>Informe técnico:</strong> {baja.informeObsolescencia || '—'}</div>
          </div>
        </div>
      )}

      {ubicaciones && ubicaciones.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <SeccionTitulo icono="📍" titulo={`Traslados (${ubicaciones.length})`} />
          {ubicaciones.map((u, idx) => (
            <div
              key={u.idUbicacion}
              className={idx >= LIMITE ? 'hv-extra' : undefined}
              style={{
                background: '#FAFBFC', border: '1px solid #EEF1F4',
                borderRadius: 10, padding: '12px 14px', marginBottom: 8,
                display: idx >= LIMITE && !verTodosTraslados ? 'none' : undefined
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, gap: 8, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a' }}>
                  <strong>{u.sectorAnterior?.nombre || '—'}</strong>
                  <span aria-label="a" style={{ margin: '0 8px', color: '#5C6B7A' }}>→</span>
                  <strong>{u.sectorNuevo?.nombre || '—'}</strong>
                </div>
                <span style={{ fontSize: 11, color: '#5C6B7A' }}>
                  📅 {fmtFecha(u.fechaTraslado)}
                </span>
              </div>
              <div style={{ fontSize: 11, color: '#5C6B7A' }}>
                🏥 {u.servicio?.nombre || '—'} · 👤 {u.usuario?.nombre || '—'}
              </div>
            </div>
          ))}
          {ubicaciones.length > LIMITE && (
            <button
              type="button" className="no-print"
              onClick={() => setVerTodosTraslados(v => !v)}
              aria-expanded={verTodosTraslados}
              style={btnVerMas}
            >
              {verTodosTraslados ? 'Ver menos' : `Ver los ${ubicaciones.length - LIMITE} traslado${ubicaciones.length - LIMITE > 1 ? 's' : ''} restante${ubicaciones.length - LIMITE > 1 ? 's' : ''}`}
            </button>
          )}
        </div>
      )}

      {ots && ots.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <SeccionTitulo icono="🔧" titulo={`Órdenes de trabajo (${ots.length})`} />
          {ots.map(o => {
            const ceOT = chipEstadoOT(o.estado);
            return (
              <div key={o.idOT} style={{
                background: '#FAFBFC', border: '1px solid #EEF1F4',
                borderRadius: 10, padding: '12px 14px', marginBottom: 10
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, gap: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>
                    OT {o.idOT} · {o.tipo}
                  </div>
                  <span style={{
                    display: 'inline-block', padding: '2px 10px', borderRadius: 999,
                    background: ceOT.bg, color: ceOT.fg, fontSize: 11, fontWeight: 600
                  }}>{o.estado}</span>
                </div>
                <div style={{ fontSize: 12, color: '#4A5868', marginBottom: 6, lineHeight: 1.5 }}>
                  {o.sintoma}
                </div>
                <div style={{ fontSize: 11, color: '#5C6B7A' }}>
                  📅 {fmtFecha(o.fechaApertura)}
                  {o.fechaCierre && ` · Cierre: ${fmtFecha(o.fechaCierre)}`}
                </div>

                {o.intervenciones && o.intervenciones.length > 0 && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed #E5EDF3' }}>
                    <div style={{ fontSize: 10, color: '#5C6B7A', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                      Tareas realizadas ({o.intervenciones.length})
                    </div>
                    {o.intervenciones.map(i => {
                      const crSeg = chipResultadoSeg(i.resultadoSegElectrica);
                      return (
                        <div key={i.idIntervencion} style={{
                          background: 'white', border: '1px solid #F1F4F7',
                          borderRadius: 8, padding: '10px 12px', marginBottom: 6
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span style={{
                              display: 'inline-block', padding: '2px 8px', borderRadius: 999,
                              background: crSeg.bg, color: crSeg.fg, fontSize: 10, fontWeight: 600
                            }}>⚡ {i.resultadoSegElectrica === 'Reprobado' ? 'Desaprobado' : (i.resultadoSegElectrica || 'No aplica')}</span>
                            <span style={{ fontSize: 11, color: '#5C6B7A' }}>
                              {fmtTiempo(i.tiempoEmpleado)}
                            </span>
                          </div>
                          <div style={{ fontSize: 12, color: '#2D3748', lineHeight: 1.5, marginBottom: 4 }}>
                            {i.tareasRealizadas}
                          </div>
                          <div style={{ fontSize: 10.5, color: '#5C6B7A' }}>
                            📅 Fecha de inicio: {fmtFecha(i.fecha)}
                            {i.fechaFin && <> · Fecha de fin: {fmtFecha(i.fechaFin)}</>}
                            {' '}· 👤 {i.usuario?.nombre || '—'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {o.usosInsumo && o.usosInsumo.length > 0 && (
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed #E5EDF3' }}>
                    <div style={{ fontSize: 10, color: '#5C6B7A', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                      Insumos consumidos
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {o.usosInsumo.map(u => (
                        <span key={u.idUso} style={{
                          display: 'inline-block', padding: '3px 10px', borderRadius: 999,
                          background: '#EEEDFE', color: '#3C3489',
                          fontSize: 11, fontWeight: 500
                        }}>📦 {u.insumo?.nombre || 'insumo'} × {u.cantidad} u.</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {alertas && alertas.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <SeccionTitulo icono="🔔" titulo={`Alertas (${alertas.length})`} />
          {alertas.map((a, idx) => (
            <div
              key={a.idAlerta}
              className={idx >= LIMITE ? 'hv-extra' : undefined}
              style={{
                background: '#FAFBFC', border: '1px solid #EEF1F4',
                borderRadius: 10, padding: '12px 14px', marginBottom: 8,
                borderLeft: '3px solid #B93B1B',
                display: idx >= LIMITE && !verTodasAlertas ? 'none' : undefined
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, gap: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>
                  {a.tipo}
                </div>
                <span style={{
                  fontSize: 10, fontWeight: 600, color: '#8F2D14',
                  background: '#FAECE7', padding: '2px 8px', borderRadius: 4
                }}>{a.estado}</span>
              </div>
              <div style={{ fontSize: 11, color: '#5C6B7A' }}>
                📅 {fmtFecha(a.fechaGeneracion)} · 👤 {a.usuario?.nombre || '—'}
              </div>
            </div>
          ))}
          {alertas.length > LIMITE && (
            <button
              type="button" className="no-print"
              onClick={() => setVerTodasAlertas(v => !v)}
              aria-expanded={verTodasAlertas}
              style={btnVerMas}
            >
              {verTodasAlertas ? 'Ver menos' : `Ver las ${alertas.length - LIMITE} alerta${alertas.length - LIMITE > 1 ? 's' : ''} restante${alertas.length - LIMITE > 1 ? 's' : ''}`}
            </button>
          )}
        </div>
      )}

      <div style={{
        marginTop: 30, paddingTop: 16,
        borderTop: '1px solid #E5EDF3',
        fontSize: 11, color: '#5C6B7A', textAlign: 'center'
      }}>
        Documento generado el {new Date().toLocaleString('es-AR')}
        {usuario ? ` por ${usuario}` : ''} · Sistema NODUS
      </div>
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
      <div style={{ flex: '0 0 160px', fontSize: 13, color: '#5C6B7A', fontWeight: 500, paddingTop: 2 }}>
        {label}
      </div>
      <div style={{ flex: 1, fontSize: 13, color: '#2D3748' }}>
        {children}
      </div>
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
      <span aria-hidden="true" style={{ fontSize: 14 }}>{icono}</span>
      <h2 style={{
        fontSize: 11, fontWeight: 700, color: '#4A5868', margin: 0,
        textTransform: 'uppercase', letterSpacing: '0.08em'
      }}>{titulo}</h2>
    </div>
  );
}

function MiniKPI({ label, valor, color }) {
  return (
    <div style={{
      background: 'white', border: '1px solid #EEF1F4',
      borderRadius: 10, padding: '10px 12px', textAlign: 'center'
    }}>
      <div style={{ fontSize: 10, color: '#5C6B7A', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color }}>
        {valor ?? 0}
      </div>
    </div>
  );
}

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
const btnVerMas = {
  display: 'block', margin: '4px auto 0', background: 'transparent',
  border: '1px solid #E5EDF3', borderRadius: 8, padding: '6px 14px',
  fontSize: 12, fontWeight: 600, color: '#1F6E8F', cursor: 'pointer'
};

export default HojasDeVida;