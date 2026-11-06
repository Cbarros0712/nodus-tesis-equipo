import { useState, useEffect, useMemo } from 'react';
import api from '../api';
import { useToast, mensajeDeError } from '../components/Toast';
import ConfirmarDialogo from '../components/ConfirmarDialogo';

const normalizar = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

function Marcas() {
  const toast = useToast();
  const [marcas, setMarcas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [busquedaAbierta, setBusquedaAbierta] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [marcaAEliminar, setMarcaAEliminar] = useState(null);

  const [nombre, setNombre] = useState('');
  const [paisOrigen, setPaisOrigen] = useState('');
  const [contacto, setContacto] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => { cargarMarcas(); }, []);

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape' && modalAbierto) cerrarModal(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalAbierto]);

  const cargarMarcas = async () => {
    try {
      const res = await api.get('/marcas');
      setMarcas(res.data);
    } catch (err) {
      toast.error('No se pudieron cargar las marcas', mensajeDeError(err, 'Revisá la conexión e intentá de nuevo.'));
    } finally {
      setCargando(false);
    }
  };

  const marcasFiltradas = useMemo(() => {
    const q = normalizar(busqueda.trim());
    if (!q) return marcas;
    return marcas.filter(m => [m.nombre, m.paisOrigen, m.contactoSoporte].some(c => normalizar(c).includes(q)));
  }, [marcas, busqueda]);

  const limpiar = () => {
    setNombre(''); setPaisOrigen(''); setContacto(''); setTelefono(''); setEmail('');
    setEditando(null); setErrores({});
  };
  const abrirModalNuevo = () => { limpiar(); setModalAbierto(true); };
  const abrirModalEditar = (m) => {
    setNombre(m.nombre); setPaisOrigen(m.paisOrigen || ''); setContacto(m.contactoSoporte || '');
    setTelefono(m.telefonoSoporte || ''); setEmail(m.emailSoporte || '');
    setEditando(m.idMarca); setErrores({});
    setModalAbierto(true);
  };
  const cerrarModal = () => { setModalAbierto(false); limpiar(); };

  const cambiarCampo = (campo, valor, setter) => {
    setter(valor);
    if (errores[campo]) setErrores(prev => { const n = { ...prev }; delete n[campo]; return n; });
  };

  const validar = () => {
    const errs = {};
    if (!nombre.trim()) errs.nombre = 'Falta ingresar el nombre de la marca';
    else if (nombre.trim().length > 100) errs.nombre = 'El nombre no puede superar los 100 caracteres';
    if (paisOrigen.trim().length > 60) errs.paisOrigen = 'El país no puede superar los 60 caracteres';
    if (contacto.trim().length > 100) errs.contacto = 'El contacto no puede superar los 100 caracteres';
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      errs.email = 'El email no tiene un formato válido. Ejemplo: soporte@ejemplo.com';
    if (telefono.trim() && !/^[0-9+()\-\s]{6,30}$/.test(telefono.trim()))
      errs.telefono = 'El teléfono solo puede tener números, espacios, + ( ) y guiones';
    return errs;
  };

  const guardar = async () => {
    if (guardando) return;
    const errs = validar();
    setErrores(errs);
    if (Object.keys(errs).length > 0) return;

    const data = {
      nombre: nombre.trim(),
      paisOrigen: paisOrigen.trim() || null,
      contactoSoporte: contacto.trim() || null,
      telefonoSoporte: telefono.trim() || null,
      emailSoporte: email.trim() || null
    };

    setGuardando(true);
    try {
      if (editando) {
        await api.put(`/marcas/${editando}`, { idMarca: editando, ...data });
        toast.success('Marca actualizada', `Se guardaron los cambios de ${data.nombre}.`);
      } else {
        await api.post('/marcas', data);
        toast.success('Marca registrada', `${data.nombre} se agregó al catálogo.`);
      }
      cerrarModal();
      cargarMarcas();
    } catch (err) {
      setErrores({ __general: mensajeDeError(err, 'No se pudo guardar la marca. Revisá los datos e intentá de nuevo.') });
    } finally {
      setGuardando(false);
    }
  };

  const confirmarEliminar = async () => {
    const m = marcaAEliminar;
    setMarcaAEliminar(null);
    try {
      await api.delete(`/marcas/${m.idMarca}`);
      toast.success('Marca eliminada', `Se eliminó ${m.nombre}.`);
      cargarMarcas();
    } catch (err) {
      toast.error('No se pudo eliminar', mensajeDeError(err, 'Error al eliminar la marca. Puede tener equipos asociados.'));
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
            <span style={etiquetaStyle}>MARCAS</span>
            <p style={{ fontSize: 13, color: '#5C6B7A', margin: 0 }}>Catálogo de fabricantes de equipos médicos</p>
          </div>
          <button onClick={abrirModalNuevo} style={btnNuevo}>+ REGISTRAR MARCA</button>
        </div>

        <div style={{
          display: 'flex', gap: 24, borderBottom: '1px solid #E5EDF3',
          marginTop: 4, alignItems: 'center', flexWrap: 'wrap', paddingBottom: 12
        }}>
          <div style={{ fontSize: 13, color: '#5C6B7A' }}>
            {marcasFiltradas.length} {marcasFiltradas.length === 1 ? 'marca' : 'marcas'}
            {marcasFiltradas.length !== marcas.length ? ` (de ${marcas.length})` : ''}
          </div>

          <div style={{
            marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6,
            background: busquedaAbierta ? '#F0F6FA' : 'transparent',
            borderRadius: 8, padding: busquedaAbierta ? '4px 10px' : '4px',
            transition: 'all 0.2s'
          }}>
            <input
              type="text" placeholder="Buscar nombre, país o contacto..."
              aria-label="Buscar marca"
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
        <table className="rwd-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
          <thead>
            <tr>
              <th style={thStyle}>Nombre</th>
              <th style={thStyle}>País</th>
              <th style={thStyle}>Contacto</th>
              <th style={thStyle}>Teléfono</th>
              <th style={thStyle}>Email</th>
              <th style={thStyle}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {marcasFiltradas.map((m, idx) => {
              const fondo = idx % 2 === 1 ? '#F8FAFC' : 'white';
              return (
                <tr
                  key={m.idMarca}
                  style={{ borderBottom: '1px solid #F1F4F7', background: fondo, transition: 'background 0.1s' }}
                  onMouseOver={(e) => e.currentTarget.style.background = '#F0F6FA'}
                  onMouseOut={(e) => e.currentTarget.style.background = fondo}
                >
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{m.nombre}</td>
                  <td style={tdStyle}>{m.paisOrigen || '—'}</td>
                  <td style={tdStyle}>{m.contactoSoporte || '—'}</td>
                  <td style={tdStyle}>{m.telefonoSoporte || '—'}</td>
                  <td style={tdStyle}>{m.emailSoporte || '—'}</td>
                  <td style={tdStyle}>
                    <button className="btn-edit" onClick={() => abrirModalEditar(m)}
                      title="Editar marca" aria-label={`Editar ${m.nombre}`} style={{ marginRight: 6 }}>✏</button>
                    <button className="btn-delete" onClick={() => setMarcaAEliminar(m)}
                      title="Eliminar marca" aria-label={`Eliminar ${m.nombre}`}>✕</button>
                  </td>
                </tr>
              );
            })}
            {marcasFiltradas.length === 0 && (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: 40, color: '#5C6B7A', fontSize: 13 }}>
                {cargando ? 'Cargando marcas…' : marcas.length === 0 ? 'No hay marcas registradas.' : 'No hay marcas que coincidan con la búsqueda.'}
              </td></tr>
            )}
          </tbody>
        </table>

      </div>

      {modalAbierto && (
        <div onClick={cerrarModal} className="rwd-modal-overlay" style={overlayStyle}>
          <div
            role="dialog" aria-modal="true" aria-labelledby="marca-titulo"
            onClick={e => e.stopPropagation()} className="rwd-modal-box" style={{ ...modalStyle, maxWidth: 560 }}
          >
            <div style={modalHeaderStyle}>
              <div aria-hidden="true" style={{ width: 52, height: 52, borderRadius: 12, background: 'linear-gradient(135deg, #EEF3FB 0%, #DCE7F5 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>🏷</div>
              <div style={{ flex: 1 }}>
                <h3 id="marca-titulo" style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1a1a1a' }}>{editando ? 'Editar marca' : 'Nueva marca'}</h3>
                <p style={{ margin: '4px 0 0', color: '#5C6B7A', fontSize: 13 }}>Fabricante y datos de soporte técnico</p>
              </div>
              <button onClick={cerrarModal} style={btnCerrarX} title="Cerrar (Esc)" aria-label="Cerrar">✕</button>
            </div>

            <div style={{ padding: '20px 28px 24px' }}>
              {errores.__general && <div role="alert" style={bannerError}>⚠ {errores.__general}</div>}

              <label htmlFor="marca-nombre" style={lblStyle}>Nombre *</label>
              <input id="marca-nombre" value={nombre} onChange={e => cambiarCampo('nombre', e.target.value, setNombre)}
                placeholder="Ej: Philips Healthcare" maxLength={100} style={inpErr('nombre')} />
              {errores.nombre && <span style={errStyle}>⚠ {errores.nombre}</span>}

              <div className="rwd-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>
                <div>
                  <label htmlFor="marca-pais" style={lblStyle}>País de origen</label>
                  <input id="marca-pais" value={paisOrigen} onChange={e => cambiarCampo('paisOrigen', e.target.value, setPaisOrigen)}
                    placeholder="Ej: Alemania" maxLength={60} style={inpErr('paisOrigen')} />
                  {errores.paisOrigen && <span style={errStyle}>⚠ {errores.paisOrigen}</span>}
                </div>
                <div>
                  <label htmlFor="marca-contacto" style={lblStyle}>Contacto de soporte</label>
                  <input id="marca-contacto" value={contacto} onChange={e => cambiarCampo('contacto', e.target.value, setContacto)}
                    placeholder="Ej: Distribuidor local" maxLength={100} style={inpErr('contacto')} />
                  {errores.contacto && <span style={errStyle}>⚠ {errores.contacto}</span>}
                </div>
                <div>
                  <label htmlFor="marca-telefono" style={lblStyle}>Teléfono</label>
                  <input id="marca-telefono" type="tel" value={telefono} onChange={e => cambiarCampo('telefono', e.target.value, setTelefono)}
                    placeholder="Ej: +54 11 0000-0000" maxLength={30} style={inpErr('telefono')} />
                  {errores.telefono && <span style={errStyle}>⚠ {errores.telefono}</span>}
                </div>
                <div>
                  <label htmlFor="marca-email" style={lblStyle}>Email de soporte</label>
                  <input id="marca-email" type="email" value={email} onChange={e => cambiarCampo('email', e.target.value, setEmail)}
                    placeholder="Ej: soporte@ejemplo.com" maxLength={100} style={inpErr('email')} />
                  {errores.email && <span style={errStyle}>⚠ {errores.email}</span>}
                </div>
              </div>
            </div>

            <div style={modalFooterStyle}>
              <button onClick={cerrarModal} style={btnGhost}>Cancelar</button>
              <button
                onClick={guardar} disabled={guardando}
                style={{ ...btnSave, opacity: guardando ? 0.6 : 1, cursor: guardando ? 'not-allowed' : 'pointer' }}
              >
                {guardando ? 'Guardando…' : (editando ? '✓ Actualizar marca' : '✓ Agregar marca')}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmarDialogo
        abierto={!!marcaAEliminar}
        titulo="¿Eliminar marca?"
        mensaje={marcaAEliminar ? `Se eliminará la marca "${marcaAEliminar.nombre}". Esta acción no se puede deshacer.` : ''}
        textoConfirmar="Eliminar"
        onConfirmar={confirmarEliminar}
        onCancelar={() => setMarcaAEliminar(null)}
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
export default Marcas;