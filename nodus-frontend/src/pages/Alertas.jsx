import { useState, useEffect, useMemo } from 'react';
import api from '../api';
import { useToast, mensajeDeError } from '../components/Toast';

const TIPOS = [
  'Garantía por vencer',
  'Mantenimiento preventivo',
  'Falla recurrente',
  'Calibración pendiente',
  'Stock crítico',
  'Otro'
];
const ESTADOS = ['No leída', 'Leída', 'Resuelta', 'Descartada'];

function Alertas({ auth }) {
  const toast = useToast();
  const [alertas, setAlertas] = useState([]);
  const [equipos, setEquipos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);

  const [tipo, setTipo] = useState('');
  const [fechaGeneracion, setFechaGeneracion] = useState(() => new Date().toISOString().split('T')[0]);
  const [estado, setEstado] = useState('No leída');
  const [idEquipo, setIdEquipo] = useState('');
  const [idUsuario, setIdUsuario] = useState('');
  const [editando, setEditando] = useState(null);

  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');

  useEffect(() => {
    cargarAlertas();
    cargarEquipos();
    cargarUsuarios();
  }, []);

  const cargarAlertas  = async () => { const r = await api.get('/alertas');   setAlertas(r.data); };
  const cargarEquipos  = async () => { const r = await api.get('/equipos');   setEquipos(r.data); };
  const cargarUsuarios = async () => { const r = await api.get('/usuarios');  setUsuarios(r.data); };

  const guardar = async () => {
    if (!tipo || !fechaGeneracion || !idUsuario) {
      toast.warning('Faltan datos', 'Tipo, fecha y usuario reportador son obligatorios.'); return;
    }
    const data = {
      tipo,
      fechaGeneracion,
      estado,
      idEquipo: idEquipo ? parseInt(idEquipo) : null,
      idUsuario: parseInt(idUsuario)
    };
    try {
      if (editando) {
        await api.put(`/alertas/${editando}`, { idAlerta: editando, ...data });
      } else {
        await api.post('/alertas', data);
      }
      limpiar();
      cargarAlertas();
    } catch (err) {
      toast.error('No se pudo guardar', mensajeDeError(err, 'Error al guardar la alerta.'));
    }
  };

  const editar = (a) => {
    setTipo(a.tipo);
    setFechaGeneracion(a.fechaGeneracion?.split('T')[0] || '');
    setEstado(a.estado);
    setIdEquipo(a.idEquipo || '');
    setIdUsuario(a.idUsuario);
    setEditando(a.idAlerta);
  };

  const eliminar = async (id) => {
    if (!window.confirm('¿Eliminar esta alerta?')) return;
    try {
      await api.delete(`/alertas/${id}`);
      cargarAlertas();
    } catch (err) {
      toast.error('No se pudo eliminar', mensajeDeError(err, 'Error al eliminar la alerta.'));
    }
  };

  const cambiarEstadoRapido = async (alerta, nuevoEstado) => {
    try {
      await api.put(`/alertas/${alerta.idAlerta}`, { ...alerta, estado: nuevoEstado });
      cargarAlertas();
    } catch (err) {
      toast.error('No se pudo actualizar', mensajeDeError(err, 'Error al actualizar el estado de la alerta.'));
    }
  };

  const generarAutomaticas = async () => {
    if (!auth?.usuario?.idUsuario) {
      toast.error('Usuario no identificado', 'No se pudo identificar el usuario actual.'); return;
    }
    if (!window.confirm('El sistema buscará equipos con garantía por vencer e insumos con stock bajo y creará alertas automáticamente. ¿Continuar?')) return;
    try {
      const r = await api.post(`/alertas/generar-automaticas?idUsuarioReportador=${auth.usuario.idUsuario}`);
      toast.success('Alertas generadas', r.data.mensaje);
      cargarAlertas();
    } catch (err) {
      toast.error('No se pudieron generar', mensajeDeError(err, 'Error al generar las alertas automáticas.'));
    }
  };

  const limpiar = () => {
    setTipo(''); setFechaGeneracion(new Date().toISOString().split('T')[0]);
    setEstado('No leída'); setIdEquipo(''); setIdUsuario(''); setEditando(null);
  };

  const { kpiTotal, kpiNoLeidas, kpiEnRevision, kpiResueltas, alertasFiltradas } = useMemo(() => {
    const total = alertas.length;
    const noLeidas = alertas.filter(a => a.estado === 'No leída').length;
    const enRev = alertas.filter(a => a.estado === 'Leída').length;
    const resueltas = alertas.filter(a => a.estado === 'Resuelta').length;
    const filtradas = alertas.filter(a => {
      const me = !filtroEstado || a.estado === filtroEstado;
      const mt = !filtroTipo || a.tipo === filtroTipo;
      return me && mt;
    });
    return { kpiTotal: total, kpiNoLeidas: noLeidas, kpiEnRevision: enRev, kpiResueltas: resueltas, alertasFiltradas: filtradas };
  }, [alertas, filtroEstado, filtroTipo]);

  const chipEstado = (estado) => {
    const base = { padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, border: '1px solid' };
    const map = {
      'No leída':   { bg: 'rgba(255,94,122,0.15)',  col: '#FF5E7A', bd: 'rgba(255,94,122,0.3)'  },
      'Leída':      { bg: 'rgba(245,166,35,0.15)',  col: '#F5A623', bd: 'rgba(245,166,35,0.3)'  },
      'Resuelta':   { bg: 'rgba(45,212,160,0.15)',  col: '#2DD4A0', bd: 'rgba(45,212,160,0.3)'  },
      'Descartada': { bg: 'rgba(158,156,187,0.15)', col: '#9E9CBB', bd: 'rgba(158,156,187,0.3)' },
    };
    const c = map[estado] || map['Descartada'];
    return { ...base, background: c.bg, color: c.col, borderColor: c.bd };
  };

  const iconoTipo = (tipo) => ({
    'Garantía por vencer':     '🛡',
    'Mantenimiento preventivo':'🔧',
    'Falla recurrente':        '⚠',
    'Calibración pendiente':   '📐',
    'Stock crítico':           '📦',
    'Otro':                    '🔔'
  }[tipo] || '🔔');

  return (
    <>
      <header className="topbar">
        <h2>ALERTAS</h2>
        <span className="badge" style={{background:'rgba(255,94,122,0.15)',color:'#FF5E7A',borderColor:'rgba(255,94,122,0.3)'}}>NOTIFICACIONES</span>
        <span className="desc">Avisos del sistema sobre equipos e insumos</span>
      </header>

      <div className="page-content">
        {}
        <div className="rwd-grid" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:20 }}>
          <div style={{ background:'rgba(124,110,250,0.08)', border:'1px solid rgba(124,110,250,0.2)', borderRadius:12, padding:16 }}>
            <div style={{ color:'#9E9CBB', fontSize:12, fontWeight:600, marginBottom:4 }}>TOTAL</div>
            <div style={{ color:'#A89BFF', fontSize:28, fontWeight:700 }}>{kpiTotal}</div>
          </div>
          <div style={{ background:'rgba(255,94,122,0.08)', border:'1px solid rgba(255,94,122,0.2)', borderRadius:12, padding:16 }}>
            <div style={{ color:'#9E9CBB', fontSize:12, fontWeight:600, marginBottom:4 }}>NO LEÍDAS</div>
            <div style={{ color:'#FF5E7A', fontSize:28, fontWeight:700 }}>{kpiNoLeidas}</div>
          </div>
          <div style={{ background:'rgba(245,166,35,0.08)', border:'1px solid rgba(245,166,35,0.2)', borderRadius:12, padding:16 }}>
            <div style={{ color:'#9E9CBB', fontSize:12, fontWeight:600, marginBottom:4 }}>EN REVISIÓN</div>
            <div style={{ color:'#F5A623', fontSize:28, fontWeight:700 }}>{kpiEnRevision}</div>
          </div>
          <div style={{ background:'rgba(45,212,160,0.08)', border:'1px solid rgba(45,212,160,0.2)', borderRadius:12, padding:16 }}>
            <div style={{ color:'#9E9CBB', fontSize:12, fontWeight:600, marginBottom:4 }}>RESUELTAS</div>
            <div style={{ color:'#2DD4A0', fontSize:28, fontWeight:700 }}>{kpiResueltas}</div>
          </div>
        </div>

        {}
        <div className="form-card" style={{ padding: 16, marginBottom: 20 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
            <div>
              <strong style={{ color:'#A89BFF' }}>🤖 Detección automática</strong>
              <div style={{ color:'#9E9CBB', fontSize:12, marginTop:4 }}>
                Buscá equipos con garantía por vencer en los próximos 30 días e insumos con stock bajo.
              </div>
            </div>
            <button className="btn-primary" onClick={generarAutomaticas}>🔄 Generar alertas automáticas</button>
          </div>
        </div>

        {}
        <div className="form-card">
          <h3>{editando ? '✏ Editar alerta' : '+ Nueva alerta manual'}</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Tipo *</label>
              <select value={tipo} onChange={e => setTipo(e.target.value)}>
                <option value="">Seleccionar...</option>
                {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Fecha de generación *</label>
              <input type="date" value={fechaGeneracion} onChange={e => setFechaGeneracion(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Equipo (opcional)</label>
              <select value={idEquipo} onChange={e => setIdEquipo(e.target.value)}>
                <option value="">Sin equipo asociado</option>
                {equipos.map(eq => (
                  <option key={eq.idEquipo} value={eq.idEquipo}>
                    {eq.modelo} ({eq.nroSerie})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Usuario reportador *</label>
              <select value={idUsuario} onChange={e => setIdUsuario(e.target.value)}>
                <option value="">Seleccionar...</option>
                {usuarios.map(u => <option key={u.idUsuario} value={u.idUsuario}>{u.nombre}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Estado</label>
              <select value={estado} onChange={e => setEstado(e.target.value)}>
                {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
          </div>
          <div className="form-actions">
            <button className="btn-primary" onClick={guardar}>{editando ? 'Actualizar' : 'Guardar'}</button>
            {editando && <button className="btn-ghost" onClick={limpiar}>Cancelar</button>}
          </div>
        </div>

        {}
        <div className="form-card" style={{ padding:16 }}>
          <div style={{ display:'flex', gap:12, alignItems:'center', flexWrap:'wrap' }}>
            <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} style={{ minWidth:180 }}>
              <option value="">Todos los estados</option>
              {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
            <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} style={{ minWidth:220 }}>
              <option value="">Todos los tipos</option>
              {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            {(filtroEstado || filtroTipo) && (
              <button className="btn-ghost" onClick={() => { setFiltroEstado(''); setFiltroTipo(''); }}>Limpiar filtros</button>
            )}
          </div>
        </div>

        {}
        <div className="table-card">
          <div className="table-header">
            <span>{alertasFiltradas.length} {alertasFiltradas.length === 1 ? 'alerta' : 'alertas'}{alertasFiltradas.length !== alertas.length ? ` (de ${alertas.length})` : ''}</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Equipo</th>
                <th>Reportador</th>
                <th>Estado</th>
                <th>Acciones rápidas</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {alertasFiltradas.map(a => (
                <tr key={a.idAlerta} style={{ background: a.estado === 'No leída' ? 'rgba(255,94,122,0.04)' : 'transparent' }}>
                  <td className="td-id">#{a.idAlerta}</td>
                  <td>{a.fechaGeneracion?.split('T')[0]}</td>
                  <td><strong>{iconoTipo(a.tipo)} {a.tipo}</strong></td>
                  <td>{a.equipo ? `${a.equipo.modelo} (${a.equipo.nroSerie})` : '—'}</td>
                  <td>{a.usuario?.nombre || '—'}</td>
                  <td><span style={chipEstado(a.estado)}>{a.estado}</span></td>
                  <td>
                    {a.estado === 'No leída' && (
                      <button className="btn-ghost" style={{ fontSize: 11, padding:'4px 8px' }} onClick={() => cambiarEstadoRapido(a, 'Leída')}>Marcar leída</button>
                    )}
                    {(a.estado === 'No leída' || a.estado === 'Leída') && (
                      <button className="btn-ghost" style={{ fontSize: 11, padding:'4px 8px', marginLeft:4 }} onClick={() => cambiarEstadoRapido(a, 'Resuelta')}>✓ Resolver</button>
                    )}
                  </td>
                  <td>
                    <button className="btn-edit" onClick={() => editar(a)}>✏</button>
                    <button className="btn-delete" onClick={() => eliminar(a.idAlerta)}>✕</button>
                  </td>
                </tr>
              ))}
              {alertasFiltradas.length === 0 && (
                <tr><td colSpan="8" className="empty">
                  {alertas.length === 0 ? 'No hay alertas registradas.' : 'No hay alertas que coincidan con los filtros.'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export default Alertas;