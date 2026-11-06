import { useState, useEffect, useMemo } from 'react';
import api from '../api';
import { useToast, mensajeDeError } from '../components/Toast';
import ConfirmarDialogo from '../components/ConfirmarDialogo';

function HospitalesExternos() {
  const toast = useToast();
  const [hospitales, setHospitales] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [hospitalAEliminar, setHospitalAEliminar] = useState(null);

  const [nombre, setNombre] = useState('');
  const [localidad, setLocalidad] = useState('');
  const [direccion, setDireccion] = useState('');
  const [contacto, setContacto] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => { cargarHospitales(); }, []);

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape' && modalAbierto) cerrarModal(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [modalAbierto]);

  const cargarHospitales = async () => {
    try {
      const r = await api.get('/hospitalesexternos');
      setHospitales(r.data);
    } catch (err) {
      toast.error('No se pudieron cargar los hospitales', mensajeDeError(err, 'Revisá la conexión e intentá de nuevo.'));
    }
  };

  const hospitalesFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return hospitales;
    return hospitales.filter(h =>
      h.nombre?.toLowerCase().includes(q) ||
      h.localidad?.toLowerCase().includes(q)
    );
  }, [hospitales, busqueda]);

  const abrirModalNuevo = () => { limpiar(); setModalAbierto(true); };
  const abrirModalEditar = (h) => {
    setNombre(h.nombre); setLocalidad(h.localidad || ''); setDireccion(h.direccion || '');
    setContacto(h.contacto || ''); setTelefono(h.telefono || ''); setEmail(h.email || '');
    setEditando(h.idHospital);
    setErrores({});
    setModalAbierto(true);
  };
  const cerrarModal = () => { setModalAbierto(false); limpiar(); };

  const limpiar = () => {
    setNombre(''); setLocalidad(''); setDireccion(''); setContacto(''); setTelefono(''); setEmail('');
    setEditando(null); setErrores({});
  };

  const cambiarCampo = (campo, valor, setter) => {
    setter(valor);
    if (errores[campo]) {
      setErrores(prev => { const n = { ...prev }; delete n[campo]; return n; });
    }
  };

  const validar = () => {
    const errs = {};
    if (!nombre.trim()) errs.nombre = 'Falta ingresar el nombre del hospital';
    else if (nombre.trim().length > 150) errs.nombre = 'El nombre no puede superar los 150 caracteres';
    if (localidad.trim().length > 100) errs.localidad = 'La localidad no puede superar los 100 caracteres';
    if (direccion.trim().length > 200) errs.direccion = 'La dirección no puede superar los 200 caracteres';
    if (contacto.trim().length > 100) errs.contacto = 'El contacto no puede superar los 100 caracteres';
    if (telefono.trim() && !/^[0-9+()\-\s]{6,30}$/.test(telefono.trim()))
      errs.telefono = 'El teléfono solo puede tener números, espacios, + ( ) y guiones';
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      errs.email = 'El email no tiene un formato válido. Ejemplo: bioingenieria@hospital.gob.ar';
    return errs;
  };

  const guardar = async () => {
    if (guardando) return;
    const errs = validar();
    setErrores(errs);
    if (Object.keys(errs).length > 0) return;

    const data = {
      nombre: nombre.trim(),
      localidad: localidad.trim(),
      direccion: direccion.trim(),
      contacto: contacto.trim(),
      telefono: telefono.trim(),
      email: email.trim(),
      activo: true
    };

    setGuardando(true);
    try {
      if (editando) {
        await api.put(`/hospitalesexternos/${editando}`, { idHospital: editando, ...data });
        toast.success('Hospital actualizado', `Se guardaron los cambios de ${data.nombre}.`);
      } else {
        await api.post('/hospitalesexternos', data);
        toast.success('Hospital registrado', `${data.nombre} se agregó al catálogo.`);
      }
      cerrarModal();
      cargarHospitales();
    } catch (err) {
      const mensaje = typeof err.response?.data === 'string' ? err.response.data : 'No se pudo guardar el hospital.';
      setErrores({ __general: mensaje });
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = (h) => setHospitalAEliminar(h);

  const confirmarEliminar = async () => {
    const h = hospitalAEliminar;
    setHospitalAEliminar(null);
    try {
      await api.delete(`/hospitalesexternos/${h.idHospital}`);
      toast.success('Hospital eliminado', `Se eliminó ${h.nombre}.`);
      cargarHospitales();
    } catch (err) {
      toast.error('No se pudo eliminar', mensajeDeError(err, 'No se pudo eliminar el hospital. Puede tener préstamos asociados.'));
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
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a', margin: 0, letterSpacing: '0.5px' }}>GESTIÓN DE PRÉSTAMOS</h2>
            <span style={{
              background: 'rgba(124, 110, 250, 0.12)', color: '#5e51d6',
              border: '1px solid rgba(124, 110, 250, 0.25)', padding: '4px 12px', borderRadius: 8,
              fontSize: 12, fontWeight: 600
            }}>HOSPITALES EXTERNOS</span>
            <p style={{ fontSize: 13, color: '#5C6B7A', margin: 0 }}>Catálogo de hospitales públicos de Córdoba</p>
          </div>
          <button onClick={abrirModalNuevo} style={btnNuevo}>+ REGISTRAR HOSPITAL</button>
        </div>

        <div style={{ marginTop: 18, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <input
            type="text" placeholder="Buscar por nombre o localidad..."
            aria-label="Buscar hospital"
            value={busqueda} onChange={e => setBusqueda(e.target.value)}
            style={{ ...inpStyle, maxWidth: 320 }}
          />
          {busqueda.trim() && (
            <button
              onClick={() => setBusqueda('')}
              style={{
                background: 'transparent', border: '1px solid #E5EDF3', borderRadius: 8,
                padding: '8px 12px', fontSize: 12, color: '#2C7DA0', fontWeight: 600, cursor: 'pointer'
              }}
            >Limpiar filtros</button>
          )}
        </div>
      </div>

      <div className="rwd-table-wrap" style={{ padding: '20px 24px', background: 'white', overflowX: 'auto' }}>
        <table className="rwd-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
          <thead>
            <tr>
              <th style={thStyle}>Nombre</th>
              <th style={thStyle}>Localidad</th>
              <th style={thStyle}>Contacto</th>
              <th style={thStyle}>Teléfono</th>
              <th style={thStyle}>Email</th>
              <th style={thStyle}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {hospitalesFiltrados.map((h, idx) => {
              const fondo = idx % 2 === 1 ? '#F8FAFC' : 'white';
              return (
                <tr
                  key={h.idHospital}
                  style={{ borderBottom: '1px solid #F1F4F7', background: fondo, transition: 'background 0.1s' }}
                  onMouseOver={(e) => e.currentTarget.style.background = '#F0F6FA'}
                  onMouseOut={(e) => e.currentTarget.style.background = fondo}
                >
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{h.nombre}</td>
                  <td style={tdStyle}>{h.localidad || '—'}</td>
                  <td style={tdStyle}>{h.contacto || '—'}</td>
                  <td style={tdStyle}>{h.telefono || '—'}</td>
                  <td style={tdStyle}>{h.email || '—'}</td>
                  <td style={tdStyle}>
                    <button className="btn-edit" onClick={() => abrirModalEditar(h)}
                      title="Editar hospital" aria-label={`Editar ${h.nombre}`} style={{ marginRight: 6 }}>✏</button>
                    <button className="btn-delete" onClick={() => eliminar(h)}
                      title="Eliminar hospital" aria-label={`Eliminar ${h.nombre}`}>✕</button>
                  </td>
                </tr>
              );
            })}
            {hospitalesFiltrados.length === 0 && (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: 40, color: '#5C6B7A', fontSize: 13 }}>
                {hospitales.length === 0 ? 'No hay hospitales cargados.' : 'No hay hospitales que coincidan con la búsqueda.'}
              </td></tr>
            )}
          </tbody>
        </table>

        <p style={{ fontSize: 12, color: '#5C6B7A', margin: '16px 0 0', textAlign: 'left' }}>
          {hospitalesFiltrados.length} {hospitalesFiltrados.length === 1 ? 'registro' : 'registros'}
          {hospitalesFiltrados.length !== hospitales.length ? ` (de ${hospitales.length})` : ''}
        </p>
      </div>

      {modalAbierto && (
        <div onClick={cerrarModal} className="rwd-modal-overlay" style={overlayStyle}>
          <div onClick={e => e.stopPropagation()} className="rwd-modal-box" style={{ ...modalStyle, maxWidth: 560 }}>
            <div style={modalHeaderStyle}>
              <div style={{ width: 52, height: 52, borderRadius: 12, background: 'linear-gradient(135deg, #EEF3FB 0%, #DCE7F5 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>🏥</div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1a1a1a' }}>{editando ? 'Editar hospital' : 'Nuevo hospital externo'}</h3>
                <p style={{ margin: '4px 0 0', color: '#5C6B7A', fontSize: 13 }}>Datos del hospital receptor de préstamos</p>
              </div>
              <button onClick={cerrarModal} style={btnCerrarX} title="Cerrar (Esc)" aria-label="Cerrar">✕</button>
            </div>

            <div style={{ padding: '20px 28px 24px' }}>
              {errores.__general && <div style={bannerError}>⚠ {errores.__general}</div>}

              <label style={lblStyle}>Nombre *</label>
              <input
                value={nombre} onChange={e => cambiarCampo('nombre', e.target.value, setNombre)}
                placeholder="Ej: Hospital Córdoba" maxLength={150} style={inpErr('nombre')}
              />
              {errores.nombre && <span style={errStyle}>⚠ {errores.nombre}</span>}

              <div className="rwd-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>
                <div>
                  <label style={lblStyle}>Localidad</label>
                  <input value={localidad} onChange={e => cambiarCampo('localidad', e.target.value, setLocalidad)}
                    placeholder="Ej: Córdoba Capital" maxLength={100} style={inpErr('localidad')} />
                  {errores.localidad && <span style={errStyle}>⚠ {errores.localidad}</span>}
                </div>
                <div>
                  <label style={lblStyle}>Dirección</label>
                  <input value={direccion} onChange={e => cambiarCampo('direccion', e.target.value, setDireccion)}
                    placeholder="Ej: Av. Patria 656" maxLength={200} style={inpErr('direccion')} />
                  {errores.direccion && <span style={errStyle}>⚠ {errores.direccion}</span>}
                </div>
                <div>
                  <label style={lblStyle}>Contacto</label>
                  <input value={contacto} onChange={e => cambiarCampo('contacto', e.target.value, setContacto)}
                    placeholder="Ej: Ing. Juan Pérez" maxLength={100} style={inpErr('contacto')} />
                  {errores.contacto && <span style={errStyle}>⚠ {errores.contacto}</span>}
                </div>
                <div>
                  <label style={lblStyle}>Teléfono</label>
                  <input type="tel" value={telefono} onChange={e => cambiarCampo('telefono', e.target.value, setTelefono)}
                    placeholder="Ej: +54 351 000-0000" maxLength={30} style={inpErr('telefono')} />
                  {errores.telefono && <span style={errStyle}>⚠ {errores.telefono}</span>}
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={lblStyle}>Email</label>
                  <input type="email" value={email} onChange={e => cambiarCampo('email', e.target.value, setEmail)}
                    placeholder="Ej: bioingenieria@hospital.gob.ar" maxLength={100} style={inpErr('email')} />
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
                {guardando ? 'Guardando…' : (editando ? '✓ Actualizar hospital' : '✓ Agregar hospital')}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmarDialogo
        abierto={!!hospitalAEliminar}
        titulo="¿Eliminar hospital?"
        mensaje={hospitalAEliminar ? `Se eliminará "${hospitalAEliminar.nombre}" del catálogo. Esta acción no se puede deshacer.` : ''}
        textoConfirmar="Eliminar"
        onConfirmar={confirmarEliminar}
        onCancelar={() => setHospitalAEliminar(null)}
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

export default HospitalesExternos;