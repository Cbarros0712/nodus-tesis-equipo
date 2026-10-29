import { useState, useEffect, useMemo } from 'react';
import api from '../api';
import { useToast } from '../components/Toast';

function HospitalesExternos() {
  const toast = useToast();
  const [hospitales, setHospitales] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [errores, setErrores] = useState({});

  const [nombre, setNombre] = useState('');
  const [localidad, setLocalidad] = useState('');
  const [direccion, setDireccion] = useState('');
  const [contacto, setContacto] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => { cargarHospitales(); }, []);

  const cargarHospitales = async () => {
    const r = await api.get('/hospitalesexternos');
    setHospitales(r.data);
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

  const guardar = async () => {
    if (!nombre.trim()) { setErrores({ nombre: 'El nombre es obligatorio' }); return; }
    const data = { nombre, localidad, direccion, contacto, telefono, email, activo: true };
    try {
      if (editando) {
        await api.put(`/hospitalesexternos/${editando}`, { idHospital: editando, ...data });
      } else {
        await api.post('/hospitalesexternos', data);
      }
      cerrarModal();
      cargarHospitales();
    } catch (err) {
      const mensaje = typeof err.response?.data === 'string' ? err.response.data : 'No se pudo guardar el hospital.';
      setErrores({ __general: mensaje });
    }
  };

  const eliminar = async (h) => {
    if (!window.confirm(`¿Eliminar "${h.nombre}"?`)) return;
    try {
      await api.delete(`/hospitalesexternos/${h.idHospital}`);
      cargarHospitales();
    } catch {
      toast.error('No se pudo eliminar', 'No se pudo eliminar el hospital.');
    }
  };

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
            <p style={{ fontSize: 13, color: '#6B7C8C', margin: 0 }}>Catálogo de hospitales públicos de Córdoba</p>
          </div>
          <button onClick={abrirModalNuevo} style={btnNuevo}>+ REGISTRAR HOSPITAL</button>
        </div>

        <div style={{ marginTop: 18, marginBottom: 4 }}>
          <input
            type="text" placeholder="Buscar por nombre o localidad..."
            value={busqueda} onChange={e => setBusqueda(e.target.value)}
            style={{ ...inpStyle, maxWidth: 320 }}
          />
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
            {hospitalesFiltrados.map(h => (
              <tr key={h.idHospital} style={{ borderBottom: '1px solid #F1F4F7' }}>
                <td style={{ ...tdStyle, fontWeight: 600 }}>{h.nombre}</td>
                <td style={tdStyle}>{h.localidad || '—'}</td>
                <td style={tdStyle}>{h.contacto || '—'}</td>
                <td style={tdStyle}>{h.telefono || '—'}</td>
                <td style={tdStyle}>{h.email || '—'}</td>
                <td style={tdStyle}>
                  <button className="btn-edit" onClick={() => abrirModalEditar(h)} style={{ marginRight: 6 }}>✏</button>
                  <button className="btn-edit" onClick={() => eliminar(h)}>🗑</button>
                </td>
              </tr>
            ))}
            {hospitalesFiltrados.length === 0 && (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: 40, color: '#9E9CBB', fontSize: 13 }}>
                No hay hospitales cargados.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modalAbierto && (
        <div onClick={cerrarModal} className="rwd-modal-overlay" style={overlayStyle}>
          <div onClick={e => e.stopPropagation()} className="rwd-modal-box" style={{ ...modalStyle, maxWidth: 560 }}>
            <div style={modalHeaderStyle}>
              <div style={{ width: 52, height: 52, borderRadius: 12, background: 'linear-gradient(135deg, #EEF3FB 0%, #DCE7F5 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>🏥</div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1a1a1a' }}>{editando ? 'Editar hospital' : 'HOSPITAL EXTERNO'}</h3>
                <p style={{ margin: '4px 0 0', color: '#6B7C8C', fontSize: 13 }}>Datos del hospital receptor de préstamos</p>
              </div>
              <button onClick={cerrarModal} style={btnCerrarX}>✕</button>
            </div>

            <div style={{ padding: '20px 28px 24px' }}>
              {errores.__general && <div style={bannerError}>⚠ {errores.__general}</div>}

              <label style={lblStyle}>Nombre *</label>
              <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Hospital Córdoba" style={inpStyle} />
              {errores.nombre && <span style={errStyle}>⚠ {errores.nombre}</span>}

              <div className="rwd-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>
                <div>
                  <label style={lblStyle}>Localidad</label>
                  <input value={localidad} onChange={e => setLocalidad(e.target.value)} placeholder="Ej: Córdoba Capital" style={inpStyle} />
                </div>
                <div>
                  <label style={lblStyle}>Dirección</label>
                  <input value={direccion} onChange={e => setDireccion(e.target.value)} placeholder="Ej: Av. Patria 656" style={inpStyle} />
                </div>
                <div>
                  <label style={lblStyle}>Contacto</label>
                  <input value={contacto} onChange={e => setContacto(e.target.value)} placeholder="Ej: Ing. Juan Pérez" style={inpStyle} />
                </div>
                <div>
                  <label style={lblStyle}>Teléfono</label>
                  <input value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="Ej: +54 351 000-0000" style={inpStyle} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={lblStyle}>Email</label>
                  <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Ej: bioingenieria@hospital.gob.ar" style={inpStyle} />
                </div>
              </div>
            </div>

            <div style={modalFooterStyle}>
              <button onClick={cerrarModal} style={btnGhost}>Cancelar</button>
              <button onClick={guardar} style={btnSave}>{editando ? '✓ Actualizar' : '✓ Agregar hospital'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const thStyle = { fontSize: 11, fontWeight: 500, color: '#6B7C8C', padding: '12px 8px', borderBottom: '1px solid #F1F4F7', textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'left' };
const tdStyle = { padding: '14px 8px', fontSize: 13, color: '#2D3748', whiteSpace: 'nowrap' };
const lblStyle = { display: 'block', fontSize: 11, fontWeight: 600, color: '#4A5868', marginBottom: 6 };
const inpStyle = { width: '100%', padding: '10px 12px', border: '1.5px solid #E5EDF3', borderRadius: 8, fontSize: 13, background: '#FAFBFC', outline: 'none', boxSizing: 'border-box' };
const errStyle = { display: 'block', color: '#E85A6D', fontSize: 11, marginTop: 6, fontWeight: 500 };
const btnNuevo = { background: '#F0F6FA', color: '#4A5868', border: 'none', borderRadius: 6, padding: '10px 16px', fontSize: 11, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' };
const btnGhost = { background: 'white', color: '#6B7C8C', border: '1px solid #E5EDF3', padding: '10px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' };
const btnSave = { background: 'linear-gradient(135deg, #2C7DA0 0%, #4A9BB8 100%)', color: 'white', border: 'none', padding: '10px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' };
const btnCerrarX = { background: '#F4F7FA', border: 'none', width: 32, height: 32, borderRadius: 8, fontSize: 18, cursor: 'pointer', color: '#6B7C8C' };
const overlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(20,25,40,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 };
const modalStyle = { background: 'white', borderRadius: 16, width: '100%', maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' };
const modalHeaderStyle = { padding: '24px 28px 20px', borderBottom: '1px solid #F0F3F7', display: 'flex', alignItems: 'center', gap: 16 };
const modalFooterStyle = { padding: '16px 28px', borderTop: '1px solid #F0F3F7', background: '#FAFBFC', borderBottomLeftRadius: 16, borderBottomRightRadius: 16, display: 'flex', justifyContent: 'flex-end', gap: 10 };
const bannerError = { background: '#FDECEE', border: '1px solid #F5C2C7', color: '#842029', padding: '12px 14px', borderRadius: 10, fontSize: 13, marginBottom: 16 };

export default HospitalesExternos;
