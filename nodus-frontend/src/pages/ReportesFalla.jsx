import { useState, useEffect, useMemo } from 'react';
import api from '../api';
import { useToast, mensajeDeError } from '../components/Toast';
import ConfirmarDialogo from '../components/ConfirmarDialogo';

const ESTADOS = ['Pendiente', 'Convertido en OT', 'Descartado'];
const ESTADO_INICIAL = 'Pendiente';

const normalizar = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

function ReportesFalla() {
  const toast = useToast();
  const [reportes, setReportes] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [filtroEstado, setFiltroEstado] = useState(ESTADO_INICIAL);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(null);

  const [convirtiendo, setConvirtiendo] = useState(null);
  const [idServicio, setIdServicio] = useState('');
  const [errorServicio, setErrorServicio] = useState('');
  const [aDescartar, setADescartar] = useState(null);

  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelado = false;
    api.get('/reportes-falla', { params: filtroEstado ? { estado: filtroEstado } : {} })
      .then(r => { if (!cancelado) setReportes(r.data); })
      .catch(err => {
        if (!cancelado) toast.error('No se pudieron cargar los reportes', mensajeDeError(err, 'Error de conexión con el servidor.'));
      })
      .finally(() => { if (!cancelado) setCargando(false); });
    return () => { cancelado = true; };
  }, [filtroEstado, version, toast]);

  const cargar = () => { setCargando(true); setVersion(v => v + 1); };
  const cambiarFiltro = (estado) => { setCargando(true); setFiltroEstado(estado); };

  useEffect(() => {
    api.get('/servicios').then(r => setServicios(r.data)).catch(() => {
      toast.warning('No se pudieron cargar los servicios', 'No vas a poder convertir reportes en OT hasta que se recarguen. Actualizá la página.');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Esc cierra el modal de conversión (si no se está procesando)
  useEffect(() => {
    if (!convirtiendo) return;
    const handler = (e) => { if (e.key === 'Escape' && !procesando) cerrarConvertir(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convirtiendo, procesando]);

  const visibles = useMemo(() => {
    const q = normalizar(busqueda.trim());
    if (!q) return reportes;
    return reportes.filter(r =>
      [r.equipo, r.nroSerie, r.nombreCompleto, r.legajo, r.servicio, r.descripcion].some(c => normalizar(c).includes(q))
    );
  }, [reportes, busqueda]);

  const hayFiltros = !!busqueda.trim() || filtroEstado !== ESTADO_INICIAL;
  const limpiarFiltros = () => {
    setBusqueda('');
    if (filtroEstado !== ESTADO_INICIAL) cambiarFiltro(ESTADO_INICIAL);
  };

  const abrirConvertir = (rep) => {
    setConvirtiendo(rep);
    setIdServicio(rep.idServicioSugerido ? String(rep.idServicioSugerido) : '');
    setErrorServicio('');
  };
  const cerrarConvertir = () => { setConvirtiendo(null); setErrorServicio(''); };

  const confirmarConvertir = async () => {
    if (procesando) return;
    if (!idServicio) {
      setErrorServicio('Elegí el servicio al que se asigna la orden de trabajo.');
      return;
    }
    const rep = convirtiendo;
    setProcesando(rep.idReporteFalla);
    try {
      const r = await api.post(`/reportes-falla/${rep.idReporteFalla}/convertir-en-ot`, { idServicio: parseInt(idServicio) });
      toast.success('Orden de trabajo creada', `Se creó la OT #${r.data.idOT} en estado Pendiente.`);
      setConvirtiendo(null);
      cargar();
    } catch (err) {
      toast.error('No se pudo convertir en OT', mensajeDeError(err, 'Error de conexión con el servidor.'));
    } finally {
      setProcesando(null);
    }
  };

  const confirmarDescartar = async () => {
    if (procesando || !aDescartar) return;
    const rep = aDescartar;
    setProcesando(rep.idReporteFalla);
    try {
      await api.put(`/reportes-falla/${rep.idReporteFalla}/descartar`);
      toast.info('Reporte descartado', 'El equipo se puede volver a reportar.');
      setADescartar(null);
      cargar();
    } catch (err) {
      toast.error('No se pudo descartar', mensajeDeError(err, 'Error de conexión con el servidor.'));
      setADescartar(null);
    } finally {
      setProcesando(null);
    }
  };

  const chipEstado = (estado) => {
    const map = {
      'Pendiente': { bg: '#FAEEDA', fg: '#633806', simbolo: '◐' },
      'Convertido en OT': { bg: '#E1F5EE', fg: '#0B5A46', simbolo: '✓' },
      'Descartado': { bg: '#F1EFE8', fg: '#444441', simbolo: '–' }
    };
    const c = map[estado] || map.Descartado;
    return {
      estilo: { background: c.bg, color: c.fg, padding: '3px 10px', borderRadius: 999, fontSize: 11.5, fontWeight: 600, whiteSpace: 'nowrap' },
      simbolo: c.simbolo
    };
  };

  return (
    <>
      <header className="topbar">
        <h2>REGISTROS DE FALLA</h2>
        <span className="badge" style={{ background: 'rgba(245,166,35,0.15)', color: '#7A4A00', borderColor: 'rgba(245,166,35,0.3)' }}>QR</span>
        <span className="desc">Fallas reportadas desde la ficha QR de los equipos</span>
      </header>

      <div className="page-content">
        <div className="form-card rf-filtros">
          <div className="rf-busqueda">
            <span className="rf-lupa" aria-hidden="true">🔍</span>
            <input
              type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar por equipo, quién reportó, servicio o descripción..."
              aria-label="Buscar reportes"
            />
            {busqueda && (
              <button type="button" className="rf-limpiar" onClick={() => setBusqueda('')}
                title="Limpiar búsqueda" aria-label="Limpiar búsqueda">×</button>
            )}
          </div>
          <div className="rf-acciones">
            <select className="rf-select" value={filtroEstado} onChange={e => cambiarFiltro(e.target.value)} aria-label="Filtrar por estado">
              <option value="">Todos los estados</option>
              {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
            {hayFiltros && (
              <button
                type="button" onClick={limpiarFiltros}
                style={{
                  background: 'transparent', border: '1px solid #E5EDF3', borderRadius: 8,
                  padding: '8px 12px', fontSize: 12, color: '#1F6E8F', fontWeight: 600, cursor: 'pointer'
                }}
              >Limpiar filtros</button>
            )}
            <button type="button" className="btn-ghost rf-actualizar" onClick={cargar} disabled={cargando}
              title="Actualizar" aria-label="Actualizar">↻</button>
          </div>
        </div>

        <div className="table-card">
          <div className="table-header">
            <span>{visibles.length} {visibles.length === 1 ? 'reporte' : 'reportes'}</span>
          </div>
          <table>
            <thead>
              <tr>
                <th className="rf-nro">N°</th>
                <th>Fecha</th>
                <th>Equipo</th>
                <th>Reportó</th>
                <th>Servicio</th>
                <th>Descripción</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((r, i) => {
                const chip = chipEstado(r.estado);
                const fondo = i % 2 === 1 ? '#F8FAFC' : 'white';
                return (
                  <tr
                    key={r.idReporteFalla}
                    style={{ background: fondo, transition: 'background 0.1s' }}
                    onMouseOver={(e) => e.currentTarget.style.background = '#F0F6FA'}
                    onMouseOut={(e) => e.currentTarget.style.background = fondo}
                  >
                    <td className="rf-nro">{i + 1}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {new Date(r.fechaReporte).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td><strong>{r.equipo}</strong><div style={{ fontSize: 11.5, color: '#5C6B7A', fontFamily: 'monospace' }}>S/N {r.nroSerie}</div></td>
                    <td>
                      {r.nombreCompleto}
                      <div style={{ fontSize: 11.5, color: '#5C6B7A' }}>Legajo {r.legajo} · usuario {r.usuario}</div>
                    </td>
                    <td>{r.servicio || <span style={{ color: '#5C6B7A' }}>—</span>}</td>
                    <td style={{ maxWidth: 360, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{r.descripcion}</td>
                    <td>
                      <span style={chip.estilo}>{chip.simbolo} {r.estado}</span>
                      {r.idOT && <div style={{ fontSize: 11.5, color: '#5C6B7A', marginTop: 4 }}>OT #{r.idOT}</div>}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {r.estado === 'Pendiente' ? (
                        <>
                          <button className="btn-primary" style={{ fontSize: 12, padding: '6px 10px' }}
                            aria-label={`Convertir en orden de trabajo el reporte de ${r.equipo}`}
                            disabled={!!procesando} onClick={() => abrirConvertir(r)}>
                            Convertir en OT
                          </button>
                          <button className="btn-ghost" style={{ fontSize: 12, padding: '6px 10px', marginLeft: 6 }}
                            aria-label={`Descartar el reporte de ${r.equipo}`}
                            disabled={!!procesando} onClick={() => setADescartar(r)}>
                            Descartar
                          </button>
                        </>
                      ) : '—'}
                    </td>
                  </tr>
                );
              })}
              {cargando && visibles.length === 0 && (
                <tr><td colSpan="8" className="empty">Cargando reportes…</td></tr>
              )}
              {!cargando && visibles.length === 0 && (
                <tr><td colSpan="8" className="empty">
                  {busqueda.trim() ? 'No se encontraron reportes para tu búsqueda.'
                    : filtroEstado ? `No hay reportes en estado "${filtroEstado}".` : 'No hay reportes de falla.'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {convirtiendo && (
        <div onClick={() => procesando || cerrarConvertir()} style={{
          position: 'fixed', inset: 0, background: 'rgba(16,24,40,0.45)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
        }}>
          <div
            role="dialog" aria-modal="true" aria-labelledby="rf-convertir-titulo"
            onClick={e => e.stopPropagation()}
            style={{
              background: 'white', borderRadius: 14, padding: 22, width: '100%', maxWidth: 440,
              boxShadow: '0 12px 32px rgba(16,24,40,0.18)'
            }}
          >
            <h3 id="rf-convertir-titulo" style={{ margin: '0 0 6px', fontSize: 16, color: '#1a1a1a' }}>Convertir en orden de trabajo</h3>
            <p style={{ margin: '0 0 14px', fontSize: 13, color: '#4A5868', lineHeight: 1.45 }}>
              Se crea una OT correctiva en estado Pendiente para <strong>{convirtiendo.equipo}</strong> (S/N {convirtiendo.nroSerie}).
              El equipo pasa a "Fuera de servicio".
            </p>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label htmlFor="rf-servicio">Servicio *</label>
              <select
                id="rf-servicio" value={idServicio}
                onChange={e => { setIdServicio(e.target.value); setErrorServicio(''); }}
                aria-invalid={!!errorServicio}
                style={{ width: '100%', border: errorServicio ? '1.5px solid #B93B1B' : undefined }}
              >
                <option value="">Seleccionar...</option>
                {servicios.map(s => <option key={s.idServicio} value={s.idServicio}>{s.nombre}</option>)}
              </select>
              {errorServicio && <span style={{ display: 'block', color: '#B93B1B', fontSize: 11, marginTop: 6, fontWeight: 500 }}>⚠ {errorServicio}</span>}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn-ghost" onClick={cerrarConvertir} disabled={!!procesando}>Cancelar</button>
              <button className="btn-primary" onClick={confirmarConvertir} disabled={!!procesando}>
                {procesando ? 'Creando…' : 'Crear OT'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmarDialogo
        abierto={!!aDescartar}
        titulo="Descartar reporte"
        mensaje={aDescartar
          ? `¿Descartar el reporte de ${aDescartar.nombreCompleto} sobre ${aDescartar.equipo}? El equipo se podrá volver a reportar hoy.`
          : ''}
        textoConfirmar="Descartar"
        textoCancelar="Cancelar"
        destructivo
        onConfirmar={confirmarDescartar}
        onCancelar={() => { if (!procesando) setADescartar(null); }}
      />
    </>
  );
}

export default ReportesFalla;