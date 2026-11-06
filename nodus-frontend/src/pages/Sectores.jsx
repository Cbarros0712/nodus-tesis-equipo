import { useState, useEffect, useMemo } from 'react';
import api from '../api';
import { useToast, mensajeDeError } from '../components/Toast';
import ConfirmarDialogo from '../components/ConfirmarDialogo';

const normalizar = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

function Sectores() {
  const toast = useToast();
  const [sectores, setSectores] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [busquedaAbierta, setBusquedaAbierta] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [sectorAEliminar, setSectorAEliminar] = useState(null);

  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [activo, setActivo] = useState(true);

  useEffect(() => { cargarSectores(); }, []);

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape' && modalAbierto) cerrarModal(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalAbierto]);

  const cargarSectores = async () => {
    try {
      const r = await api.get('/sectores');
      setSectores(r.data);
    } catch (err) {
      toast.error('No se pudieron cargar los sectores', mensajeDeError(err, 'Revisá la conexión e intentá de nuevo.'));
    } finally {
      setCargando(false);
    }
  };

  const sectoresFiltrados = useMemo(() => {
    const q = normalizar(busqueda.trim());
    if (!q) return sectores;
    return sectores.filter(s => [s.nombre, s.descripcion].some(c => normalizar(c).includes(q)));
  }, [sectores, busqueda]);

  const limpiar = () => {
    setNombre(''); setDescripcion(''); setActivo(true);
    setEditando(null); setErrores({});
  };
  const abrirModalNuevo = () => { limpiar(); setModalAbierto(true); };
  const abrirModalEditar = (s) => {
    setNombre(s.nombre); setDescripcion(s.descripcion || ''); setActivo(s.activo);
    setEditando(s.idSector); setErrores({});
    setModalAbierto(true);
  };
  const cerrarModal = () => { setModalAbierto(false); limpiar(); };

  const cambiarCampo = (campo, valor, setter) => {
    setter(valor);
    if (errores[campo]) setErrores(prev => { const n = { ...prev }; delete n[campo]; return n; });
  };

  const validar = () => {
    const errs = {};
    if (!nombre.trim()) errs.nombre = 'Falta ingresar el nombre del sector';
    else if (nombre.trim().length > 100) errs.nombre = 'El nombre no puede superar los 100 caracteres';
    if (descripcion.trim().length > 250) errs.descripcion = 'La descripción no puede superar los 250 caracteres';
    return errs;
  };

  const guardar = async () => {
    if (guardando) return;
    const errs = validar();
    setErrores(errs);
    if (Object.keys(errs).length > 0) return;

    const data = {
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || null,
      activo
    };

    setGuardando(true);
    try {
      if (editando) {
        await api.put(`/sectores/${editando}`, { idSector: editando, ...data });
        toast.success('Sector actualizado', `Se guardaron los cambios de ${data.nombre}.`);
      } else {
        await api.post('/sectores', data);
        toast.success('Sector registrado', `${data.nombre} se agregó al catálogo.`);
      }
      cerrarModal();
      cargarSectores();
    } catch (err) {
      setErrores({ __general: mensajeDeError(err, 'No se pudo guardar el sector.') });
    } finally {
      setGuardando(false);
    }
  };

  const confirmarEliminar = async () => {
    const s = sectorAEliminar;
    setSectorAEliminar(null);
    try {
      await api.delete(`/sectores/${s.idSector}`);
      toast.success('Sector eliminado', `Se eliminó ${s.nombre}.`);
      cargarSectores();
    } catch (err) {
      toast.error('No se pudo eliminar', mensajeDeError(err, 'Error al eliminar el sector. Puede tener ubicaciones asociadas.'));
    }
  };

  const inpErr = (campo) => ({
    ...inpStyle,
    border: errores[campo] ? '1.5px solid #B93B1B' : '1.5px solid #E5EDF3',
    background: errores[campo] ? '#FFF8F9' : '#FAFBFC'
  });

  return (
    <>
      <div className="rwd-page-header" style={{ padding: '20px 24px 0', background: 'white' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a', margin: 0, letterSpacing: '0.5px' }}>ADMINISTRACIÓN</h2>
            <span style={etiquetaStyle}>SECTORES</span>
            <p style={{ fontSize: 13, color: '#5C6B7A', margin: 0 }}>Lugares físicos del hospital</p>
          </div>
          <button onClick={abrirModalNuevo} style={btnNuevo}>+ REGISTRAR SECTOR</button>
        </div>

        <div style={{
          display: 'flex', gap: 24, borderBottom: '1px solid #E5EDF3',
          marginTop: 4, alignItems: 'center', flexWrap: 'wrap', paddingBottom: 12
        }}>
          <div style={{ fontSize: 13, color: '#5C6B7A' }}>
            {sectoresFiltrados.length} {sectoresFiltrados.length === 1 ? 'sector' : 'sectores'}
            {sectoresFiltrados.length !== sectores.length ? ` (de ${sectores.length})` : ''}
          </div>

          <div style={{
            marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6,
            background: busquedaAbierta ? '#F0F6FA' : 'transparent',
            borderRadius: 8, padding: busquedaAbierta ? '4px 10px' : '4px',
            transition: 'all 0.2s'
          }}>
            <input
              type="text" placeholder="Buscar nombre o descripción..."
              aria-label="Buscar sector"
              value={busqueda} onChange={e => setBusqueda(e.target.value)}
              autoFocus={busquedaAbierta}
              tabIndex={busquedaAbierta ? 0 : -1}
              style={{
                background: 'transparent', border: 'none', outline: 'none',
                fontSize: 13, padding: '4px 0', color: '#2D3748',
                width: busquedaAbierta ? 220 : 0,
                transition: 'width 0.2s', overflow: 'hidden'
              }}
            />
            {busqueda && busquedaAbierta && (
              <button
                type="button" onClick={() => setBusqueda('')}
                title="Limpiar búsqueda" aria-label="Limpiar búsqueda"
                style={{ background: 'transparent', border: 'none', color: '#5C6B7A', fontSize: 14, cursor: 'pointer', padding: 0 }}
              >✕</button>
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
              style={{ background: 'transparent', border: 'none', color: '#5C6B7A', fontSize: 16, cursor: 'pointer', padding: 0 }}
            >🔍</button>
          </div>
        </div>
      </div>

      <div className="rwd-table-wrap" style={{ padding: '20px 24px', background: 'white', overflowX: 'auto' }}>
        <table className="rwd-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
          <thead>
            <tr>
              <th style={thStyle}>Nombre</th>
              <th style={thStyle}>Descripción</th>
              <th style={thStyle}>Estado</th>
              <th style={thStyle}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {sectoresFiltrados.map((s, idx) => {
              const fondo = idx % 2 === 1 ? '#F8FAFC' : 'white';
              return (
                <tr
                  key={s.idSector}
                  style={{ borderBottom: '1px solid #F1F4F7', background: fondo, transition: 'background 0.1s' }}
                  onMouseOver={(e) => e.currentTarget.style.background = '#F0F6FA'}
                  onMouseOut={(e) => e.currentTarget.style.background = fondo}
                >
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{s.nombre}</td>
                  <td style={{ ...tdStyle, whiteSpace: 'normal', maxWidth: 420 }}>{s.descripcion || '—'}</td>
                  <td style={tdStyle}>
                    <span style={{
                      display: 'inline-block', padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                      background: s.activo ? '#E1F5EE' : '#F1EFE8',
                      color: s.activo ? '#0B5A46' : '#444441'
                    }}>{s.activo ? '✓ Activo' : '– Inactivo'}</span>
                  </td>
                  <td style={tdStyle}>
                    <button className="btn-edit" onClick={() => abrirModalEditar(s)}
                      title="Editar sector" aria-label={`Editar ${s.nombre}`} style={{ marginRight: 6 }}>✏</button>
                    <button className="btn-delete" onClick={() => setSectorAEliminar(s)}
                      title="Eliminar sector" aria-label={`Eliminar ${s.nombre}`}>✕</button>
                  </td>
                </tr>
              );
            })}
            {sectoresFiltrados.length === 0 && (
              <tr><td colSpan="4" style={{ textAlign: 'center', padding: 40, color: '#5C6B7A', fontSize: 13 }}>
                {cargando ? 'Cargando sectores…' : sectores.length === 0 ? 'No hay sectores registrados.' : 'No hay sectores que coincidan con la búsqueda.'}
              </td></tr>
            )}
          </tbody>
        </table>

      </div>

      {modalAbierto && (
        <div onClick={cerrarModal} className="rwd-modal-overlay" style={overlayStyle}>
          <div
            role="dialog" aria-modal="true" aria-labelledby="sector-titulo"
            onClick={e => e.stopPropagation()} className="rwd-modal-box" style={{ ...modalStyle, maxWidth: 560 }}
          >
            <div style={modalHeaderStyle}>
              <div aria-hidden="true" style={{ width: 52, height: 52, borderRadius: 12, background: 'linear-gradient(135deg, #EEF3FB 0%, #DCE7F5 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>🏢</div>
              <div style={{ flex: 1 }}>
                <h3 id="sector-titulo" style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1a1a1a' }}>{editando ? 'Editar sector' : 'Nuevo sector'}</h3>
                <p style={{ margin: '4px 0 0', color: '#5C6B7A', fontSize: 13 }}>Lugar físico donde se ubican los equipos</p>
              </div>
              <button onClick={cerrarModal} style={btnCerrarX} title="Cerrar (Esc)" aria-label="Cerrar">✕</button>
            </div>

            <div style={{ padding: '20px 28px 24px' }}>
              {errores.__general && <div role="alert" style={bannerError}>⚠ {errores.__general}</div>}

              <label htmlFor="sector-nombre" style={lblStyle}>Nombre *</label>
              <input id="sector-nombre" value={nombre} onChange={e => cambiarCampo('nombre', e.target.value, setNombre)}
                placeholder="Ej: Quirófano 3" maxLength={100} style={inpErr('nombre')} />
              {errores.nombre && <span style={errStyle}>⚠ {errores.nombre}</span>}

              <label htmlFor="sector-descripcion" style={{ ...lblStyle, marginTop: 14 }}>Descripción</label>
              <input id="sector-descripcion" value={descripcion} onChange={e => cambiarCampo('descripcion', e.target.value, setDescripcion)}
                placeholder="Ej: Quirófano de cirugía cardiovascular - piso 2" maxLength={250} style={inpErr('descripcion')} />
              {errores.descripcion && <span style={errStyle}>⚠ {errores.descripcion}</span>}

              <label htmlFor="sector-estado" style={{ ...lblStyle, marginTop: 14 }}>Estado</label>
              <select id="sector-estado" value={activo ? 'true' : 'false'} onChange={e => setActivo(e.target.value === 'true')} style={inpStyle}>
                <option value="true">Activo</option>
                <option value="false">Inactivo</option>
              </select>
            </div>

            <div style={modalFooterStyle}>
              <button onClick={cerrarModal} style={btnGhost}>Cancelar</button>
              <button
                onClick={guardar} disabled={guardando}
                style={{ ...btnSave, opacity: guardando ? 0.6 : 1, cursor: guardando ? 'not-allowed' : 'pointer' }}
              >
                {guardando ? 'Guardando…' : (editando ? '✓ Actualizar sector' : '✓ Agregar sector')}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmarDialogo
        abierto={!!sectorAEliminar}
        titulo="¿Eliminar sector?"
        mensaje={sectorAEliminar ? `Se eliminará el sector "${sectorAEliminar.nombre}". Esta acción no se puede deshacer.` : ''}
        textoConfirmar="Eliminar"
        onConfirmar={confirmarEliminar}
        onCancelar={() => setSectorAEliminar(null)}
      />
    </>
  );
}
const thStyle = { fontSize: 11, fontWeight: 600, color: '#5C6B7A', padding: '12px 8px', borderBottom: '1px solid #E5EDF3', textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'left' };
const tdStyle = { padding: '14px 8px', fontSize: 13, color: '#2D3748', whiteSpace: 'nowrap' };
const lblStyle = { display: 'block', fontSize: 11, fontWeight: 600, color: '#4A5868', marginBottom: 6 };
const inpStyle = { width: '100%', padding: '10px 12px', border: '1.5px solid #E5EDF3', borderRadius: 8, fontSize: 13, background: '#FAFBFC', outline: 'none', boxSizing: 'border-box' };
const errStyle = { display: 'block', color: '#B93B1B', fontSize: 11, marginTop: 6, fontWeight: 500 };
const btnNuevo = { background: '#F0F6FA', color: '#4A5868', border: 'none', borderRadius: 6, padding: '10px 16px', fontSize: 11, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' };
const btnGhost = { background: 'white', color: '#5C6B7A', border: '1px solid #E5EDF3', padding: '10px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' };
const btnSave = { background: 'linear-gradient(135deg, #2C7DA0 0%, #4A9BB8 100%)', color: 'white', border: 'none', padding: '10px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' };
const btnCerrarX = { background: '#F4F7FA', border: 'none', width: 32, height: 32, borderRadius: 8, fontSize: 18, cursor: 'pointer', color: '#5C6B7A' };
const overlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(20,25,40,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 };
const modalStyle = { background: 'white', borderRadius: 16, width: '100%', maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' };
const modalHeaderStyle = { padding: '24px 28px 20px', borderBottom: '1px solid #F0F3F7', display: 'flex', alignItems: 'center', gap: 16 };
const modalFooterStyle = { padding: '16px 28px', borderTop: '1px solid #F0F3F7', background: '#FAFBFC', borderBottomLeftRadius: 16, borderBottomRightRadius: 16, display: 'flex', justifyContent: 'flex-end', gap: 10 };
const bannerError = { background: '#FDECEE', border: '1px solid #F5C2C7', color: '#842029', padding: '12px 14px', borderRadius: 10, fontSize: 13, marginBottom: 16 };
const etiquetaStyle = { background: 'rgba(124, 110, 250, 0.12)', color: '#4B3FBF', border: '1px solid rgba(124, 110, 250, 0.25)', padding: '4px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600 };
export default Sectores;
