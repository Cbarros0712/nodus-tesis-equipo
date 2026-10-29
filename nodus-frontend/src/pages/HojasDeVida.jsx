import { useState, useEffect, useMemo } from 'react';
import api from '../api';
import { useToast, mensajeDeError } from '../components/Toast';

function HojasDeVida() {
  const toast = useToast();
  const [hojas, setHojas] = useState([]);
  const [historia, setHistoria] = useState(null);
  const [equipoSeleccionadoId, setEquipoSeleccionadoId] = useState(null);
  const [cargandoHistoria, setCargandoHistoria] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [gruposExpandidos, setGruposExpandidos] = useState({});
  const [modalMasivo, setModalMasivo] = useState(false);

  useEffect(() => { cargarHojas(); }, []);

  const cargarHojas = async () => {
    const r = await api.get('/hojasdevida');
    setHojas(r.data);
  };

  const gruposPorTipo = useMemo(() => {
    let lista = hojas;
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      lista = hojas.filter(h =>
        h.equipo?.modelo?.toLowerCase().includes(q) ||
        h.equipo?.marca?.nombre?.toLowerCase().includes(q) ||
        h.equipo?.nroSerie?.toLowerCase().includes(q) ||
        h.equipo?.tipoActivo?.nombre?.toLowerCase().includes(q)
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

  useEffect(() => {
    if (gruposPorTipo.length > 0 && Object.keys(gruposExpandidos).length === 0) {
      const initial = {};
      gruposPorTipo.forEach(([tipo]) => { initial[tipo] = true; });
      setGruposExpandidos(initial);

      if (!equipoSeleccionadoId && gruposPorTipo[0][1].length > 0) {
        verHistoria(gruposPorTipo[0][1][0].idEquipo);
      }
    }
  }, [gruposPorTipo]);

  const toggleGrupo = (tipo) => {
    setGruposExpandidos(prev => ({ ...prev, [tipo]: !prev[tipo] }));
  };

  const generarParaTodos = async () => {
    try {
      const r = await api.post('/hojasdevida/generar-para-todos');
      toast.success('Hojas de vida generadas', r.data.mensaje || 'Hojas de vida generadas correctamente.');
      setModalMasivo(false);
      cargarHojas();
    } catch (err) {
      toast.error('No se pudo generar', mensajeDeError(err, 'Error al generar las hojas de vida.'));
    }
  };

  const verHistoria = async (idEquipo) => {
    setCargandoHistoria(true);
    setEquipoSeleccionadoId(idEquipo);
    try {
      const r = await api.get(`/hojasdevida/equipo/${idEquipo}/historia`);
      setHistoria(r.data);
    } catch (err) {
      toast.error('No se pudo cargar', mensajeDeError(err, 'Error al cargar la historia del equipo.'));
      setHistoria(null);
    } finally {
      setCargandoHistoria(false);
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

  const colorTipo = (nombre) => {
    if (!nombre) return PALETA_PASTEL[0];
    let hash = 0;
    for (let i = 0; i < nombre.length; i++) {
      hash = nombre.charCodeAt(i) + ((hash << 5) - hash);
    }
    return PALETA_PASTEL[Math.abs(hash + 7) % PALETA_PASTEL.length];
  };

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
            }}>HOJAS DE VIDA</span>

            <p style={{ fontSize: 13, color: '#6B7C8C', margin: 0, marginLeft: 8 }}>
              Documento patrimonial del ciclo de vida de cada equipo
            </p>
          </div>

          <button
            onClick={() => setModalMasivo(true)}
            style={{
              background: '#F0F6FA', color: '#4A5868', border: 'none',
              borderRadius: 6, padding: '10px 16px', fontSize: 11,
              fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase',
              cursor: 'pointer', transition: 'background 0.15s, color 0.15s'
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = '#E0EBF3'; e.currentTarget.style.color = '#2C7DA0'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = '#F0F6FA'; e.currentTarget.style.color = '#4A5868'; }}
          >📋 APERTURA MASIVA</button>
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
          {}
          <div style={{
            fontSize: 15, fontWeight: 700, color: '#1a1a1a',
            marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8
          }}>
            <span>📋</span>
            <span>Hoja de vida</span>
            <span style={{
              marginLeft: 'auto',
              background: '#1a1a1a', color: 'white',
              borderRadius: 6, padding: '2px 8px',
              fontSize: 11, fontWeight: 600
            }}>{hojas.length}</span>
          </div>

          {}
          <div style={{
            background: '#F4F7FA', borderRadius: 8, padding: '8px 12px',
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14
          }}>
            <span style={{ color: '#9E9CBB', fontSize: 14 }}>🔍</span>
            <input
              type="text" placeholder="Buscar equipo" value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              style={{
                background: 'transparent', border: 'none', outline: 'none',
                flex: 1, fontSize: 13, color: '#4A5868'
              }}
            />
          </div>

          {gruposPorTipo.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 30, color: '#9E9CBB', fontSize: 13 }}>
              {hojas.length === 0
                ? 'No hay hojas de vida.'
                : 'Sin resultados para la búsqueda.'}
            </div>
          ) : (
            gruposPorTipo.map(([tipo, lista]) => {
              const expandido = gruposExpandidos[tipo];
              return (
                <div key={tipo} style={{ marginBottom: 6 }}>
                  <div
                    onClick={() => toggleGrupo(tipo)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '8px 4px', cursor: 'pointer',
                      fontSize: 12, color: '#4A5868', fontWeight: 500
                    }}
                  >
                    <span style={{
                      transform: expandido ? 'rotate(90deg)' : 'rotate(0deg)',
                      transition: 'transform 0.15s', fontSize: 10, color: '#9E9CBB'
                    }}>▶</span>
                    <span style={{ color: '#9E9CBB', textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: 10 }}>
                      Tipo:
                    </span>
                    <strong>{tipo}</strong>
                    <span style={{ marginLeft: 'auto', color: '#9E9CBB', fontSize: 11 }}>
                      {lista.length}
                    </span>
                  </div>

                  {expandido && lista.map(h => {
                    const isSelected = equipoSeleccionadoId === h.idEquipo;
                    const cm = colorMarca(h.equipo?.marca?.nombre);
                    return (
                      <div
                        key={h.idHoja}
                        onClick={() => verHistoria(h.idEquipo)}
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
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', marginBottom: 6 }}>
                          {h.equipo?.modelo || 'Sin modelo'}
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                          <span style={{
                            display: 'inline-block', padding: '2px 8px', borderRadius: 999,
                            background: cm.bg, color: cm.fg, fontSize: 10, fontWeight: 500
                          }}>{h.equipo?.marca?.nombre || '—'}</span>
                          <span style={{ fontSize: 10, color: '#9E9CBB', fontFamily: 'monospace' }}>
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

        {}
        <div style={{ padding: '24px 28px', maxHeight: 'calc(100vh - 180px)', overflowY: 'auto' }}>
          {cargandoHistoria ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#9E9CBB', fontSize: 14 }}>
              Cargando historia del equipo...
            </div>
          ) : !historia ? (
            <div style={{ textAlign: 'center', padding: 80, color: '#9E9CBB', fontSize: 14 }}>
              Seleccioná un equipo de la lista para ver su hoja de vida.
            </div>
          ) : (
            <HistoriaDetalle historia={historia} colorMarca={colorMarca} colorTipo={colorTipo} />
          )}
        </div>
      </div>

      {}
      {modalMasivo && (
        <div
          onClick={() => setModalMasivo(false)}
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
              <div style={{
                width: 52, height: 52, borderRadius: 12,
                background: 'linear-gradient(135deg, #EEEDFE 0%, #DCD9F5 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24, flexShrink: 0
              }}>📋</div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, color: '#1a1a1a', fontSize: 18, fontWeight: 700 }}>
                  Apertura masiva de hojas de vida
                </h3>
                <p style={{ margin: '4px 0 0', color: '#6B7C8C', fontSize: 13 }}>
                  Crea automáticamente hojas de vida para todos los equipos que aún no tengan
                </p>
              </div>
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
              <button onClick={() => setModalMasivo(false)} style={btnGhost}>Cancelar</button>
              <button onClick={generarParaTodos} style={btnSave}>
                ✓ Generar hojas de vida
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
        @media print {
          .no-print { display: none !important; }
        }
      `}</style>
    </>
  );
}

function HistoriaDetalle({ historia, colorMarca, colorTipo }) {
  const { equipo, hojaDeVida, ubicaciones, ots, alertas, baja, metricas } = historia;

  const fmtFecha = (f) => {
    if (!f) return '—';
    const d = new Date(f);
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const fmtTiempo = (min) => {
    if (!min) return '0 min';
    const h = Math.floor(min / 60), m = min % 60;
    if (h === 0) return `${m} min`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}min`;
  };

  const chipEstadoOT = (estado) => {
    const map = {
      'Pendiente':  { bg: '#FAEEDA', fg: '#633806' },
      'En curso':   { bg: '#E6F1FB', fg: '#0C447C' },
      'Cerrada':    { bg: '#E1F5EE', fg: '#0F6E56' },
      'Anulada':    { bg: '#F1EFE8', fg: '#444441' }
    };
    return map[estado] || map['Anulada'];
  };

  const chipResultadoSeg = (r) => {
    const map = {
      'Aprobado':                       { bg: '#E1F5EE', fg: '#0F6E56' },
      'Aprobado con observaciones':     { bg: '#FAEEDA', fg: '#633806' },
      'Desaprobado':                    { bg: '#FCEBEB', fg: '#A32D2D' },
      'Reprobado':                      { bg: '#FCEBEB', fg: '#A32D2D' },
      'No aplica':                      { bg: '#F1EFE8', fg: '#444441' }
    };
    return map[r] || map['No aplica'];
  };

  const cm = colorMarca(equipo.marca?.nombre);
  const ct = colorTipo(equipo.tipoActivo?.nombre);

  const imprimirPDF = () => window.print();

  return (
    <>
      {}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 11, color: '#9E9CBB', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
            Hoja de vida · Equipo #{equipo.idEquipo}
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1a1a1a', margin: 0, lineHeight: 1.2 }}>
            {equipo.modelo}
          </h1>
        </div>
        <button
          onClick={imprimirPDF}
          className="no-print"
          style={{
            background: '#F0F6FA', color: '#4A5868', border: 'none',
            borderRadius: 6, padding: '8px 14px', fontSize: 11,
            fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
            cursor: 'pointer', flexShrink: 0
          }}
          onMouseOver={(e) => { e.currentTarget.style.background = '#E0EBF3'; e.currentTarget.style.color = '#2C7DA0'; }}
          onMouseOut={(e) => { e.currentTarget.style.background = '#F0F6FA'; e.currentTarget.style.color = '#4A5868'; }}
        >🖨 Exportar PDF</button>
      </div>

      {}
      <div style={{ height: 1, background: '#E5EDF3', marginBottom: 24 }}></div>

      {}
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
                <div style={{ color: '#9E9CBB', fontSize: 10, textTransform: 'uppercase', marginBottom: 2 }}>Id</div>
                <div style={{ color: '#2D3748', fontWeight: 500 }}>{equipo.idEquipo}</div>
              </div>
              <div>
                <div style={{ color: '#9E9CBB', fontSize: 10, textTransform: 'uppercase', marginBottom: 2 }}>Tipo</div>
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
          <span style={{ color: metricas?.garantiaVigente ? '#0F6E56' : '#B93B1B' }}>
            📅 {fmtFecha(equipo.vencimientoGarantia)}
            {' '}
            <span style={{ fontSize: 11, fontWeight: 500 }}>
              {metricas?.garantiaVigente ? '✓ Vigente' : '✗ Vencida'}
            </span>
          </span>
        </FilaDetalle>

        {hojaDeVida && (
          <FilaDetalle label="Apertura de hoja">
            📅 {fmtFecha(hojaDeVida.fechaApertura)}
          </FilaDetalle>
        )}
      </div>

      {}
      {metricas && (
        <div style={{ marginBottom: 30 }}>
          <SeccionTitulo icono="📊" titulo="Métricas del ciclo de vida" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10 }}>
            <MiniKPI label="Años" valor={metricas.antiguedadAnios} color="#5e51d6" />
            <MiniKPI label="Traslados" valor={metricas.totalTraslados} color="#2C7DA0" />
            <MiniKPI label="OTs" valor={metricas.totalOTs} color="#A37715" />
            <MiniKPI label="Tareas" valor={metricas.totalIntervenciones} color="#5e51d6" />
            <MiniKPI label="Alertas" valor={metricas.totalAlertas} color="#B93B1B" />
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

      {}
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
            <div><strong>Motivo:</strong> {baja.motivo}</div>
            <div style={{ marginTop: 6 }}><strong>Informe técnico:</strong> {baja.informeObsolescencia}</div>
          </div>
        </div>
      )}

      {}
      {ubicaciones && ubicaciones.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <SeccionTitulo icono="📍" titulo={`Traslados (${ubicaciones.length})`} />
          {ubicaciones.slice(0, 5).map(u => (
            <div key={u.idUbicacion} style={{
              background: '#FAFBFC', border: '1px solid #EEF1F4',
              borderRadius: 10, padding: '12px 14px', marginBottom: 8
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a' }}>
                  <strong>{u.sectorAnterior?.nombre || '—'}</strong>
                  <span style={{ margin: '0 8px', color: '#9E9CBB' }}>→</span>
                  <strong>{u.sectorNuevo?.nombre || '—'}</strong>
                </div>
                <span style={{ fontSize: 11, color: '#6B7C8C' }}>
                  📅 {fmtFecha(u.fechaTraslado)}
                </span>
              </div>
              <div style={{ fontSize: 11, color: '#6B7C8C' }}>
                🏥 {u.servicio?.nombre || '—'} · 👤 {u.usuario?.nombre || '—'}
              </div>
            </div>
          ))}
          {ubicaciones.length > 5 && (
            <div style={{ fontSize: 11, color: '#9E9CBB', fontStyle: 'italic', textAlign: 'center', marginTop: 4 }}>
              ... y {ubicaciones.length - 5} traslado{ubicaciones.length - 5 > 1 ? 's' : ''} más
            </div>
          )}
        </div>
      )}

      {}
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
                <div style={{ fontSize: 11, color: '#6B7C8C' }}>
                  📅 {fmtFecha(o.fechaApertura)}
                  {o.fechaCierre && ` · Cierre: ${fmtFecha(o.fechaCierre)}`}
                </div>

                {}
                {o.intervenciones && o.intervenciones.length > 0 && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed #E5EDF3' }}>
                    <div style={{ fontSize: 10, color: '#9E9CBB', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
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
                            }}>⚡ {i.resultadoSegElectrica === 'Reprobado' ? 'Desaprobado' : i.resultadoSegElectrica}</span>
                            <span style={{ fontSize: 11, color: '#6B7C8C' }}>
                              {fmtTiempo(i.tiempoEmpleado)}
                            </span>
                          </div>
                          <div style={{ fontSize: 12, color: '#2D3748', lineHeight: 1.5, marginBottom: 4 }}>
                            {i.tareasRealizadas}
                          </div>
                          <div style={{ fontSize: 10, color: '#9E9CBB' }}>
                            📅 Fecha de inicio: {fmtFecha(i.fecha)}
                            {i.fechaFin && <> · Fecha de fin: {fmtFecha(i.fechaFin)}</>}
                            {' '}· 👤 {i.usuario?.nombre || '—'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {}
                {o.usosInsumo && o.usosInsumo.length > 0 && (
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed #E5EDF3' }}>
                    <div style={{ fontSize: 10, color: '#9E9CBB', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                      Insumos consumidos
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {o.usosInsumo.map(u => (
                        <span key={u.idUso} style={{
                          display: 'inline-block', padding: '3px 10px', borderRadius: 999,
                          background: '#EEEDFE', color: '#3C3489',
                          fontSize: 11, fontWeight: 500
                        }}>📦 {u.insumo?.nombre || 'insumo'} × {u.cantidad}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {}
      {alertas && alertas.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <SeccionTitulo icono="🔔" titulo={`Alertas (${alertas.length})`} />
          {alertas.slice(0, 5).map(a => (
            <div key={a.idAlerta} style={{
              background: '#FAFBFC', border: '1px solid #EEF1F4',
              borderRadius: 10, padding: '12px 14px', marginBottom: 8,
              borderLeft: '3px solid #E85A6D'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>
                  {a.tipo}
                </div>
                <span style={{
                  fontSize: 10, fontWeight: 600, color: '#B93B1B',
                  background: '#FAECE7', padding: '2px 8px', borderRadius: 4
                }}>{a.estado}</span>
              </div>
              <div style={{ fontSize: 11, color: '#6B7C8C' }}>
                📅 {fmtFecha(a.fechaGeneracion)} · 👤 {a.usuario?.nombre || '—'}
              </div>
            </div>
          ))}
        </div>
      )}

      {}
      <div style={{
        marginTop: 30, paddingTop: 16,
        borderTop: '1px solid #E5EDF3',
        fontSize: 11, color: '#9E9CBB', textAlign: 'center'
      }}>
        Documento generado el {new Date().toLocaleString('es-AR')} · Sistema NODUS
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
      <div style={{ flex: '0 0 160px', fontSize: 13, color: '#6B7C8C', fontWeight: 500, paddingTop: 2 }}>
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
      <span style={{ fontSize: 14 }}>{icono}</span>
      <span style={{
        fontSize: 11, fontWeight: 700, color: '#4A5868',
        textTransform: 'uppercase', letterSpacing: '0.08em'
      }}>{titulo}</span>
    </div>
  );
}

function MiniKPI({ label, valor, color }) {
  return (
    <div style={{
      background: 'white', border: '1px solid #EEF1F4',
      borderRadius: 10, padding: '10px 12px', textAlign: 'center'
    }}>
      <div style={{ fontSize: 10, color: '#9E9CBB', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color }}>
        {valor ?? 0}
      </div>
    </div>
  );
}

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

export default HojasDeVida;