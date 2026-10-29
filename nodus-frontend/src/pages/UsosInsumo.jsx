import { useState, useEffect, useMemo } from 'react';
import api from '../api';
import { useToast, mensajeDeError } from '../components/Toast';

function UsosInsumo() {
  const toast = useToast();
  const [usos, setUsos] = useState([]);
  const [ots, setOts] = useState([]);
  const [insumos, setInsumos] = useState([]);

  const [cantidad, setCantidad] = useState('');
  const [idInsumo, setIdInsumo] = useState('');
  const [idOT, setIdOT] = useState('');
  const [editando, setEditando] = useState(null);
  const [errores, setErrores] = useState({});

  const [buscadorOT, setBuscadorOT] = useState('');
  const [mostrarListaOT, setMostrarListaOT] = useState(false);
  const [buscadorInsumo, setBuscadorInsumo] = useState('');
  const [mostrarListaInsumo, setMostrarListaInsumo] = useState(false);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [filtroOT, setFiltroOT] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [busquedaAbierta, setBusquedaAbierta] = useState(false);

  useEffect(() => {
    cargarUsos(); cargarOTs(); cargarInsumos();
  }, []);

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape' && modalAbierto) cerrarModal(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [modalAbierto]);

  const cargarUsos    = async () => { const r = await api.get('/usosinsumo');     setUsos(r.data); };
  const cargarOTs     = async () => { const r = await api.get('/ordenestrabajo'); setOts(r.data); };
  const cargarInsumos = async () => { const r = await api.get('/insumos');        setInsumos(r.data); };

  const otsDisponibles = useMemo(() => ots.filter(o => o.estado !== 'Anulada'), [ots]);

  const otsFiltradasBuscador = useMemo(() => {
    const q = buscadorOT.trim().toLowerCase();
    if (!q) return otsDisponibles.slice(0, 10);
    return otsDisponibles.filter(o =>
      String(o.idOT).includes(q) ||
      o.tipo?.toLowerCase().includes(q) ||
      o.equipo?.modelo?.toLowerCase().includes(q)
    ).slice(0, 10);
  }, [otsDisponibles, buscadorOT]);

  const otSeleccionada = useMemo(() => {
    return ots.find(o => o.idOT === parseInt(idOT));
  }, [ots, idOT]);

  const seleccionarOT = (o) => {
    setIdOT(o.idOT);
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

  const insumosFiltradosBuscador = useMemo(() => {
    const q = buscadorInsumo.trim().toLowerCase();
    if (!q) return insumos.slice(0, 10);
    return insumos.filter(i =>
      i.nombre?.toLowerCase().includes(q) ||
      i.tipo?.toLowerCase().includes(q)
    ).slice(0, 10);
  }, [insumos, buscadorInsumo]);

  const insumoSeleccionado = useMemo(() =>
    insumos.find(i => i.idInsumo === parseInt(idInsumo)),
    [insumos, idInsumo]
  );

  const seleccionarInsumo = (i) => {
    setIdInsumo(i.idInsumo);
    setBuscadorInsumo('');
    setMostrarListaInsumo(false);
    if (errores.idInsumo) {
      setErrores(prev => { const n = { ...prev }; delete n.idInsumo; return n; });
    }
  };

  const limpiarInsumo = () => {
    setIdInsumo('');
    setBuscadorInsumo('');
    setMostrarListaInsumo(false);
  };

  const validar = () => {
    const errs = {};
    if (!idOT) errs.idOT = 'Falta seleccionar la OT';
    if (!idInsumo) errs.idInsumo = 'Falta seleccionar el insumo';
    if (!cantidad) errs.cantidad = 'Falta ingresar la cantidad';
    else {
      const cant = parseInt(cantidad);
      if (isNaN(cant) || cant <= 0) errs.cantidad = 'La cantidad debe ser mayor a 0';
      else if (insumoSeleccionado && !editando && cant > insumoSeleccionado.stockActual) {
        errs.cantidad = `La cantidad supera el stock disponible (${insumoSeleccionado.stockActual})`;
      }
    }
    return errs;
  };

  const abrirModalNuevo = () => { limpiar(); setModalAbierto(true); };
  const abrirModalEditar = (u) => {
    setCantidad(u.cantidad.toString());
    setIdInsumo(u.idInsumo);
    setIdOT(u.idOT);
    setEditando(u.idUso);
    setErrores({});
    setModalAbierto(true);
  };
  const cerrarModal = () => { setModalAbierto(false); limpiar(); };

  const guardar = async () => {
    const errs = validar();
    setErrores(errs);
    if (Object.keys(errs).length > 0) return;

    const data = {
      cantidad: parseInt(cantidad),
      idInsumo: parseInt(idInsumo),
      idOT: parseInt(idOT),
    };
    try {
      if (editando) {
        await api.put(`/usosinsumo/${editando}`, { idUso: editando, ...data });
      } else {
        await api.post('/usosinsumo', data);
      }
      cerrarModal();
      cargarUsos();
      cargarInsumos();
    } catch (err) {
      const mensaje = typeof err.response?.data === 'string'
        ? err.response.data
        : 'No se pudo registrar el consumo. Revisá los datos e intentá de nuevo.';
      setErrores({ __general: mensaje });
    }
  };

  const eliminar = async (u) => {
    if (!window.confirm(`¿Eliminar este consumo? El stock (${u.cantidad}) se devolverá al insumo "${u.insumo?.nombre || ''}".`)) return;
    try {
      await api.delete(`/usosinsumo/${u.idUso}`);
      cargarUsos();
      cargarInsumos();
    } catch (err) {
      toast.error('No se pudo eliminar', mensajeDeError(err, 'No se pudo eliminar el consumo.'));
    }
  };

  const limpiar = () => {
    setCantidad(''); setIdInsumo(''); setIdOT(''); setEditando(null);
    setErrores({});
    setBuscadorOT(''); setMostrarListaOT(false);
    setBuscadorInsumo(''); setMostrarListaInsumo(false);
  };

  const cambiarCampo = (campo, valor, setter) => {
    setter(valor);
    if (errores[campo]) {
      setErrores(prev => { const n = { ...prev }; delete n[campo]; return n; });
    }
  };

  const { kpiTotalUsos, kpiUnidadesGastadas, usosFiltrados } = useMemo(() => {
    const totalUsos = usos.length;
    const unidades = usos.reduce((acc, u) => acc + (u.cantidad || 0), 0);
    let filtrados = usos.filter(u => !filtroOT || u.idOT === parseInt(filtroOT));
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      filtrados = filtrados.filter(u =>
        u.insumo?.nombre?.toLowerCase().includes(q) ||
        u.insumo?.tipo?.toLowerCase().includes(q) ||
        u.ordenTrabajo?.equipo?.modelo?.toLowerCase().includes(q) ||
        String(u.idOT).includes(q)
      );
    }
    return { kpiTotalUsos: totalUsos, kpiUnidadesGastadas: unidades, usosFiltrados: filtrados };
  }, [usos, filtroOT, busqueda]);

  const chipStockInsumo = (i) => {
    if (!i) return { bg: '#F1EFE8', fg: '#444441', label: '—' };
    if (i.stockActual === 0) return { bg: '#FAECE7', fg: '#B93B1B', label: 'Sin stock' };
    if (i.stockActual < i.stockMinimo) return { bg: '#FAEEDA', fg: '#A37715', label: 'Stock bajo' };
    return { bg: '#E1F5EE', fg: '#0F6E56', label: 'OK' };
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
            }}>USO DE INSUMOS</span>

            <p style={{ fontSize: 13, color: '#6B7C8C', margin: 0, marginLeft: 8 }}>
              Registro de insumos consumidos en cada OT — descuenta stock automáticamente
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
          >+ REGISTRAR CONSUMO</button>
        </div>

        {}
        <div style={{
          display: 'flex', gap: 24, borderBottom: '1px solid #E5EDF3',
          marginTop: 18, alignItems: 'center', flexWrap: 'wrap'
        }}>
          <div onClick={() => setFiltroOT('')} style={tabStyle(!filtroOT)}>
            Todos ({kpiTotalUsos})
          </div>
          <div style={{
            padding: '10px 0',
            fontSize: 13,
            color: '#6B7C8C',
            display: 'flex', alignItems: 'center', gap: 6
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%', background: '#F5A623'
            }}></span>
            Unidades consumidas: <strong style={{ color: '#A37715' }}>{kpiUnidadesGastadas}</strong>
          </div>

          <div style={{
            marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap'
          }}>
            <select
              value={filtroOT}
              onChange={e => setFiltroOT(e.target.value)}
              style={{
                background: filtroOT ? '#F0F6FA' : 'white',
                border: '1px solid #E5EDF3', borderRadius: 8,
                padding: '6px 10px', fontSize: 13, color: '#4A5868',
                outline: 'none', cursor: 'pointer', maxWidth: 260
              }}
            >
              <option value="">Todas las OTs</option>
              {ots.map(o => (
                <option key={o.idOT} value={o.idOT}>
                  OT {o.idOT} · {o.equipo?.modelo || 'equipo'}
                </option>
              ))}
            </select>

            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: busquedaAbierta ? '#F0F6FA' : 'transparent',
              borderRadius: 8, padding: busquedaAbierta ? '4px 10px' : '4px',
              transition: 'all 0.2s'
            }}>
              <input
                type="text" placeholder="Buscar consumo..."
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
              <th style={thStyle}>OT</th>
              <th style={thStyle}>Equipo</th>
              <th style={thStyle}>Insumo</th>
              <th style={thStyle}>Tipo</th>
              <th style={thStyle}>Cantidad</th>
              <th style={{ ...thStyle, width: 80 }}></th>
            </tr>
          </thead>
          <tbody>
            {usosFiltrados.map(u => (
              <tr key={u.idUso} style={{ borderBottom: '1px solid #F1F4F7' }}>
                <td style={{ ...tdStyle, fontWeight: 600, color: '#1a1a1a' }}>
                  OT {u.idOT}
                </td>
                <td style={{ ...tdStyle, color: '#2D3748' }}>
                  {u.ordenTrabajo?.equipo?.modelo || '—'}
                </td>
                <td style={{ ...tdStyle, fontSize: 13, fontWeight: 500, color: '#1a1a1a' }}>
                  <span style={{
                    display: 'inline-block', padding: '3px 10px', borderRadius: 999,
                    background: '#EEEDFE', color: '#3C3489',
                    fontSize: 12, fontWeight: 500
                  }}>{u.insumo?.nombre || '—'}</span>
                </td>
                <td style={{ ...tdStyle, color: '#6B7C8C' }}>{u.insumo?.tipo || '—'}</td>
                <td style={{ ...tdStyle, fontWeight: 600, color: '#5e51d6' }}>
                  {u.cantidad}
                </td>
                <td style={tdStyle}>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => abrirModalEditar(u)} title="Editar"
                      style={{
                        background: '#F0F6FA', color: '#4A5868', border: 'none',
                        borderRadius: 4, padding: '4px 8px', fontSize: 12,
                        cursor: 'pointer'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = '#E0EBF3'}
                      onMouseOut={(e) => e.currentTarget.style.background = '#F0F6FA'}
                    >✏</button>
                    <button
                      onClick={() => eliminar(u)} title="Eliminar (devuelve al stock)"
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
            ))}
            {usosFiltrados.length === 0 && (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: 40, color: '#9E9CBB', fontSize: 13 }}>
                {usos.length === 0 ? 'No hay consumos de insumos registrados.' : 'No hay registros que coincidan con el filtro.'}
              </td></tr>
            )}
          </tbody>
        </table>

        <p style={{ fontSize: 12, color: '#9E9CBB', margin: '16px 0 0', textAlign: 'left' }}>
          {usosFiltrados.length} {usosFiltrados.length === 1 ? 'registro' : 'registros'}
          {usosFiltrados.length !== usos.length ? ` (de ${usos.length})` : ''}
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
                background: 'linear-gradient(135deg, #EEEDFE 0%, #DCD9F5 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24, flexShrink: 0
              }}>
                {editando ? '✏️' : '📤'}
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, color: '#1a1a1a', fontSize: 18, fontWeight: 700 }}>
                  {editando ? 'Editar consumo' : 'Consumo de insumo'}
                </h3>
                <p style={{ margin: '4px 0 0', color: '#6B7C8C', fontSize: 13 }}>
                  {editando
                    ? 'Modificá los datos del consumo registrado'
                    : 'Documentá el uso de un insumo dentro de una OT (descuenta stock)'}
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
                        {otSeleccionada.equipo?.modelo || '—'} · Estado: {otSeleccionada.estado}
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
                        zIndex: 20
                      }}>
                        {otsFiltradasBuscador.length === 0 ? (
                          <div style={{ padding: '16px', textAlign: 'center', color: '#9E9CBB', fontSize: 12 }}>
                            {otsDisponibles.length === 0
                              ? 'No hay OTs disponibles. Creá una OT primero.'
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
              <SeccionTitulo icono="📦" titulo="Insumo consumido" />
              <div style={{ marginBottom: 22, position: 'relative' }}>
                <label style={lblStyle}>Insumo *</label>

                {insumoSeleccionado ? (
                  <div style={{
                    ...inpStyleErr('idInsumo'),
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', background: '#F0F6FA',
                    border: '1.5px solid #C8DCEA'
                  }}>
                    <span style={{ fontSize: 14 }}>✓</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>
                        {insumoSeleccionado.nombre}
                      </div>
                      <div style={{ fontSize: 11, color: '#6B7C8C', marginTop: 2, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span>Tipo: {insumoSeleccionado.tipo}</span>
                        <span>·</span>
                        <span>Stock disponible: <strong>{insumoSeleccionado.stockActual}</strong></span>
                        <span style={{
                          display: 'inline-block', padding: '2px 8px', borderRadius: 999,
                          background: chipStockInsumo(insumoSeleccionado).bg,
                          color: chipStockInsumo(insumoSeleccionado).fg,
                          fontSize: 10, fontWeight: 600
                        }}>{chipStockInsumo(insumoSeleccionado).label}</span>
                      </div>
                    </div>
                    <button
                      type="button" onClick={limpiarInsumo}
                      title="Cambiar insumo"
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
                      position: 'relative', ...inpStyleErr('idInsumo'),
                      padding: 0, display: 'flex', alignItems: 'center'
                    }}>
                      <span style={{
                        position: 'absolute', left: 12, top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#9E9CBB', fontSize: 14, pointerEvents: 'none'
                      }}>🔍</span>
                      <input
                        type="text" value={buscadorInsumo}
                        onChange={e => { setBuscadorInsumo(e.target.value); setMostrarListaInsumo(true); }}
                        onFocus={() => setMostrarListaInsumo(true)}
                        onBlur={() => setTimeout(() => setMostrarListaInsumo(false), 200)}
                        placeholder="Buscar insumo por nombre o tipo..."
                        style={{
                          width: '100%', padding: '10px 12px 10px 36px',
                          border: 'none', outline: 'none',
                          fontSize: 13, background: 'transparent',
                          fontFamily: 'inherit'
                        }}
                      />
                    </div>

                    {mostrarListaInsumo && (
                      <div style={{
                        position: 'absolute', top: '100%', left: 0, right: 0,
                        background: 'white',
                        border: '1px solid #E5EDF3', borderRadius: 8,
                        marginTop: 4, maxHeight: 280, overflowY: 'auto',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                        zIndex: 20
                      }}>
                        {insumosFiltradosBuscador.length === 0 ? (
                          <div style={{ padding: '16px', textAlign: 'center', color: '#9E9CBB', fontSize: 12 }}>
                            No se encontraron insumos con "{buscadorInsumo}"
                          </div>
                        ) : (
                          insumosFiltradosBuscador.map(i => {
                            const sinStock = i.stockActual === 0 && !editando;
                            const chip = chipStockInsumo(i);
                            return (
                              <div
                                key={i.idInsumo}
                                onClick={() => { if (!sinStock) seleccionarInsumo(i); }}
                                style={{
                                  padding: '10px 14px',
                                  cursor: sinStock ? 'not-allowed' : 'pointer',
                                  opacity: sinStock ? 0.5 : 1,
                                  borderBottom: '1px solid #F1F4F7',
                                  transition: 'background 0.1s',
                                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8
                                }}
                                onMouseOver={(e) => { if (!sinStock) e.currentTarget.style.background = '#F0F6FA'; }}
                                onMouseOut={(e) => e.currentTarget.style.background = 'white'}
                              >
                                <div>
                                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>
                                    {i.nombre}
                                  </div>
                                  <div style={{ fontSize: 11, color: '#6B7C8C', marginTop: 2 }}>
                                    {i.tipo} · Stock: {i.stockActual}
                                  </div>
                                </div>
                                <span style={{
                                  display: 'inline-block', padding: '2px 8px', borderRadius: 999,
                                  background: chip.bg, color: chip.fg,
                                  fontSize: 10, fontWeight: 600, flexShrink: 0
                                }}>{chip.label}</span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </>
                )}
                {errores.idInsumo && <span style={errStyle}>⚠ {errores.idInsumo}</span>}
              </div>

              {}
              <SeccionTitulo icono="📊" titulo="Cantidad utilizada" />
              <div className="rwd-grid" style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 14, alignItems: 'flex-start' }}>
                <div>
                  <label style={lblStyle}>Cantidad *</label>
                  <input
                    type="number" min="1"
                    max={insumoSeleccionado && !editando ? insumoSeleccionado.stockActual : undefined}
                    value={cantidad}
                    onChange={e => cambiarCampo('cantidad', e.target.value, setCantidad)}
                    placeholder="Ej: 2"
                    style={inpStyleErr('cantidad')}
                  />
                  {errores.cantidad && <span style={errStyle}>⚠ {errores.cantidad}</span>}
                </div>
                {insumoSeleccionado && (
                  <div style={{
                    padding: '10px 14px',
                    background: '#FAFBFC',
                    border: '1px solid #E5EDF3',
                    borderRadius: 8,
                    fontSize: 12, color: '#6B7C8C'
                  }}>
                    <div style={{ fontWeight: 600, color: '#4A5868', marginBottom: 4 }}>
                      📊 Después del consumo
                    </div>
                    <div>
                      Stock actual: <strong>{insumoSeleccionado.stockActual}</strong>
                      {cantidad && parseInt(cantidad) > 0 && (
                        <>
                          {' → '}
                          <strong style={{
                            color: (insumoSeleccionado.stockActual - parseInt(cantidad)) < 0 ? '#B93B1B'
                                 : (insumoSeleccionado.stockActual - parseInt(cantidad)) < insumoSeleccionado.stockMinimo ? '#A37715'
                                 : '#0F6E56'
                          }}>
                            {insumoSeleccionado.stockActual - parseInt(cantidad)}
                          </strong>
                        </>
                      )}
                    </div>
                  </div>
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
                {editando ? '✓ Actualizar consumo' : '✓ Registrar consumo'}
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

export default UsosInsumo;