import { useState, useEffect, useMemo } from 'react';
import api from '../api';
import { useToast, mensajeDeError } from '../components/Toast';

function Insumos() {
  const toast = useToast();
  const [insumos, setInsumos] = useState([]);

  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState('');
  const [stockActual, setStockActual] = useState('');
  const [stockMinimo, setStockMinimo] = useState('');
  const [editando, setEditando] = useState(null);
  const [errores, setErrores] = useState({});

  const [modalAbierto, setModalAbierto] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [busquedaAbierta, setBusquedaAbierta] = useState(false);

  useEffect(() => {
    cargarInsumos();
  }, []);

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape' && modalAbierto) cerrarModal(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [modalAbierto]);

  const cargarInsumos = async () => {
    const r = await api.get('/insumos');
    setInsumos(r.data);
  };

  const validar = () => {
    const errs = {};
    if (!nombre || !nombre.trim()) errs.nombre = 'Falta ingresar el nombre del insumo';
    if (!tipo || !tipo.trim()) errs.tipo = 'Falta ingresar el tipo';
    if (stockActual === '' || stockActual === null) errs.stockActual = 'Falta el stock actual';
    else {
      const sa = parseInt(stockActual);
      if (isNaN(sa) || sa < 0) errs.stockActual = 'El stock actual debe ser 0 o mayor';
    }
    if (stockMinimo === '' || stockMinimo === null) errs.stockMinimo = 'Falta el stock mínimo';
    else {
      const sm = parseInt(stockMinimo);
      if (isNaN(sm) || sm < 0) errs.stockMinimo = 'El stock mínimo debe ser 0 o mayor';
    }
    return errs;
  };

  const abrirModalNuevo = () => { limpiar(); setModalAbierto(true); };
  const abrirModalEditar = (i) => {
    setNombre(i.nombre);
    setTipo(i.tipo);
    setStockActual(i.stockActual.toString());
    setStockMinimo(i.stockMinimo.toString());
    setEditando(i.idInsumo);
    setErrores({});
    setModalAbierto(true);
  };
  const cerrarModal = () => { setModalAbierto(false); limpiar(); };

  const guardar = async () => {
    const errs = validar();
    setErrores(errs);
    if (Object.keys(errs).length > 0) return;

    const data = {
      nombre: nombre.trim(),
      tipo: tipo.trim(),
      stockActual: parseInt(stockActual),
      stockMinimo: parseInt(stockMinimo)
    };
    try {
      if (editando) {
        await api.put(`/insumos/${editando}`, { idInsumo: editando, ...data });
      } else {
        await api.post('/insumos', data);
      }
      cerrarModal();
      cargarInsumos();
    } catch (err) {
      const mensaje = typeof err.response?.data === 'string'
        ? err.response.data
        : 'No se pudo guardar el insumo. Revisá los datos e intentá de nuevo.';
      setErrores({ __general: mensaje });
    }
  };

  const eliminar = async (i) => {
    if (!window.confirm(`¿Eliminar el insumo "${i.nombre}"?`)) return;
    try {
      await api.delete(`/insumos/${i.idInsumo}`);
      cargarInsumos();
    } catch (err) {
      toast.error('No se pudo eliminar', mensajeDeError(err, 'Puede tener movimientos asociados.'));
    }
  };

  const limpiar = () => {
    setNombre(''); setTipo(''); setStockActual(''); setStockMinimo('');
    setEditando(null); setErrores({});
  };

  const cambiarCampo = (campo, valor, setter) => {
    setter(valor);
    if (errores[campo]) {
      setErrores(prev => { const n = { ...prev }; delete n[campo]; return n; });
    }
  };

  const estadoStock = (insumo) => {
    if (insumo.stockActual === 0) return 'rotura';
    if (insumo.stockActual < insumo.stockMinimo) return 'bajo';
    return 'ok';
  };

  const { tiposUnicos, kpiTotal, kpiBajo, kpiRotura, insumosFiltrados } = useMemo(() => {
    const tipos = [...new Set(insumos.map(i => i.tipo))].sort();
    const total = insumos.length;
    const bajo = insumos.filter(i => i.stockActual > 0 && i.stockActual < i.stockMinimo).length;
    const rotura = insumos.filter(i => i.stockActual === 0).length;

    const filtrados = insumos.filter(i => {
      const matchTipo = !filtroTipo || i.tipo === filtroTipo;
      const matchBusqueda = !busqueda || i.nombre.toLowerCase().includes(busqueda.toLowerCase());
      return matchTipo && matchBusqueda;
    });

    return {
      tiposUnicos: tipos,
      kpiTotal: total,
      kpiBajo: bajo,
      kpiRotura: rotura,
      insumosFiltrados: filtrados
    };
  }, [insumos, filtroTipo, busqueda]);

  const chipEstado = (estado) => {
    const map = {
      ok:     { bg: '#E1F5EE', fg: '#0F6E56', label: 'OK' },
      bajo:   { bg: '#FAEEDA', fg: '#A37715', label: 'Bajo' },
      rotura: { bg: '#FAECE7', fg: '#B93B1B', label: 'Sin stock' }
    };
    return map[estado] || map.ok;
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
            }}>GESTIÓN DE INSUMOS</h2>

            <span style={{
              background: 'rgba(124, 110, 250, 0.12)',
              color: '#5e51d6',
              border: '1px solid rgba(124, 110, 250, 0.25)',
              padding: '4px 12px', borderRadius: 8,
              fontSize: 12, fontWeight: 600, letterSpacing: '0.5px'
            }}>INSUMOS</span>

            <p style={{ fontSize: 13, color: '#6B7C8C', margin: 0, marginLeft: 8 }}>
              Gestión de insumos técnicos y consumibles
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
          >+ REGISTRAR INSUMO</button>
        </div>

        {}
        <div style={{
          display: 'flex', gap: 24, borderBottom: '1px solid #E5EDF3',
          marginTop: 18, alignItems: 'center', flexWrap: 'wrap'
        }}>
          <div onClick={() => setFiltroTipo('')} style={tabStyle(!filtroTipo)}>
            Todos ({kpiTotal})
          </div>
          {kpiBajo > 0 && (
            <div style={{
              ...tabStyle(false),
              color: '#A37715',
              display: 'flex', alignItems: 'center', gap: 6
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%', background: '#F5A623'
              }}></span>
              Stock bajo ({kpiBajo})
            </div>
          )}
          {kpiRotura > 0 && (
            <div style={{
              ...tabStyle(false),
              color: '#B93B1B',
              display: 'flex', alignItems: 'center', gap: 6
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%', background: '#E85A6D'
              }}></span>
              Sin stock ({kpiRotura})
            </div>
          )}

          <div style={{
            marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap'
          }}>
            <select
              value={filtroTipo}
              onChange={e => setFiltroTipo(e.target.value)}
              style={{
                background: filtroTipo ? '#F0F6FA' : 'white',
                border: '1px solid #E5EDF3', borderRadius: 8,
                padding: '6px 10px', fontSize: 13, color: '#4A5868',
                outline: 'none', cursor: 'pointer'
              }}
            >
              <option value="">Todos los tipos</option>
              {tiposUnicos.map(t => <option key={t} value={t}>{t}</option>)}
            </select>

            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: busquedaAbierta ? '#F0F6FA' : 'transparent',
              borderRadius: 8, padding: busquedaAbierta ? '4px 10px' : '4px',
              transition: 'all 0.2s'
            }}>
              <input
                type="text" placeholder="Buscar por nombre..."
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
                title={busquedaAbierta ? 'Cerrar' : 'Buscar'}
                style={{ color: '#6B7C8C', fontSize: 16, cursor: 'pointer' }}
              >🔍</span>
            </div>
          </div>
        </div>
      </div>

      {}
      <div className="rwd-table-wrap" style={{ padding: '20px 24px', background: 'white', overflowX: 'auto' }}>
        <table className="rwd-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: 650 }}>
          <thead>
            <tr style={{ textAlign: 'left' }}>
              <th style={thStyle}>Nombre</th>
              <th style={thStyle}>Tipo</th>
              <th style={thStyle}>Stock actual</th>
              <th style={thStyle}>Stock mínimo</th>
              <th style={thStyle}>Estado</th>
              <th style={{ ...thStyle, width: 80 }}></th>
            </tr>
          </thead>
          <tbody>
            {insumosFiltrados.map(i => {
              const estado = estadoStock(i);
              const c = chipEstado(estado);
              return (
                <tr key={i.idInsumo} style={{ borderBottom: '1px solid #F1F4F7' }}>
                  <td style={{ ...tdStyle, fontSize: 13, fontWeight: 500, color: '#1a1a1a' }}>
                    {i.nombre}
                  </td>
                  <td style={{ ...tdStyle, color: '#6B7C8C' }}>{i.tipo}</td>
                  <td style={{
                    ...tdStyle,
                    fontWeight: 600,
                    color: estado === 'rotura' ? '#B93B1B'
                         : estado === 'bajo' ? '#A37715'
                         : '#2D3748'
                  }}>
                    {i.stockActual}
                  </td>
                  <td style={{ ...tdStyle, color: '#6B7C8C' }}>{i.stockMinimo}</td>
                  <td style={tdStyle}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '4px 10px', borderRadius: 999,
                      background: c.bg, color: c.fg,
                      fontSize: 11, fontWeight: 600
                    }}>
                      <span style={{
                        width: 6, height: 6, borderRadius: '50%', background: c.fg
                      }}></span>
                      {c.label}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => abrirModalEditar(i)} title="Editar"
                        style={{
                          background: '#F0F6FA', color: '#4A5868', border: 'none',
                          borderRadius: 4, padding: '4px 8px', fontSize: 12,
                          cursor: 'pointer'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = '#E0EBF3'}
                        onMouseOut={(e) => e.currentTarget.style.background = '#F0F6FA'}
                      >✏</button>
                      <button
                        onClick={() => eliminar(i)} title="Eliminar"
                        style={{
                          background: '#FDECEE', color: '#B93B1B', border: 'none',
                          borderRadius: 4, padding: '4px 8px', fontSize: 12,
                          cursor: 'pointer'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = '#F9D4DD'}
                        onMouseOut={(e) => e.currentTarget.style.background = '#FDECEE'}
                      >✕</button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {insumosFiltrados.length === 0 && (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: 40, color: '#9E9CBB', fontSize: 13 }}>
                {insumos.length === 0 ? 'No hay insumos registrados.' : 'No hay insumos que coincidan con los filtros.'}
              </td></tr>
            )}
          </tbody>
        </table>

        <p style={{ fontSize: 12, color: '#9E9CBB', margin: '16px 0 0', textAlign: 'left' }}>
          {insumosFiltrados.length} {insumosFiltrados.length === 1 ? 'registro' : 'registros'}
          {insumosFiltrados.length !== insumos.length ? ` (de ${insumos.length})` : ''}
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
              maxWidth:640, width:'100%', maxHeight:'92vh',
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
                background: 'linear-gradient(135deg, #EEEDFE 0%, #DCD9F5 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24, flexShrink: 0
              }}>
                {editando ? '✏️' : '📦'}
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, color: '#1a1a1a', fontSize: 18, fontWeight: 700 }}>
                  {editando ? 'Editar insumo' : 'Insumo'}
                </h3>
                <p style={{ margin: '4px 0 0', color: '#6B7C8C', fontSize: 13 }}>
                  {editando
                    ? 'Modificá los datos del insumo del inventario'
                    : 'Registrá un nuevo insumo técnico o consumible en el inventario'}
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
              <SeccionTitulo icono="📋" titulo="Identificación del insumo" />
              <div className="rwd-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 22 }}>
                <div>
                  <label style={lblStyle}>Nombre *</label>
                  <input
                    value={nombre}
                    onChange={e => cambiarCampo('nombre', e.target.value, setNombre)}
                    placeholder="Ej: Sensor de O2 SERVO-i"
                    maxLength={100}
                    style={inpStyleErr('nombre')}
                  />
                  {errores.nombre && <span style={errStyle}>⚠ {errores.nombre}</span>}
                </div>
                <div>
                  <label style={lblStyle}>Tipo *</label>
                  <input
                    value={tipo}
                    onChange={e => cambiarCampo('tipo', e.target.value, setTipo)}
                    placeholder="Ej: Sensor, Filtro, Accesorio"
                    maxLength={50}
                    list="tipos-existentes"
                    style={inpStyleErr('tipo')}
                  />
                  <datalist id="tipos-existentes">
                    {tiposUnicos.map(t => <option key={t} value={t} />)}
                  </datalist>
                  {errores.tipo && <span style={errStyle}>⚠ {errores.tipo}</span>}
                </div>
              </div>

              {}
              <SeccionTitulo icono="📊" titulo="Niveles de stock" />
              <div className="rwd-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 6 }}>
                <div>
                  <label style={lblStyle}>Stock actual *</label>
                  <input
                    type="number" min="0"
                    value={stockActual}
                    onChange={e => cambiarCampo('stockActual', e.target.value, setStockActual)}
                    placeholder="0"
                    style={inpStyleErr('stockActual')}
                  />
                  {errores.stockActual && <span style={errStyle}>⚠ {errores.stockActual}</span>}
                </div>
                <div>
                  <label style={lblStyle}>Stock mínimo *</label>
                  <input
                    type="number" min="0"
                    value={stockMinimo}
                    onChange={e => cambiarCampo('stockMinimo', e.target.value, setStockMinimo)}
                    placeholder="0"
                    style={inpStyleErr('stockMinimo')}
                  />
                  {errores.stockMinimo && <span style={errStyle}>⚠ {errores.stockMinimo}</span>}
                </div>
              </div>
              <small style={{ display: 'block', marginTop: 10, fontSize: 11, color: '#9E9CBB', fontStyle: 'italic' }}>
                Cuando el stock actual sea menor al mínimo, el sistema alertará el nivel bajo.
              </small>
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
                {editando ? '✓ Actualizar insumo' : '✓ Registrar insumo'}
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

export default Insumos;