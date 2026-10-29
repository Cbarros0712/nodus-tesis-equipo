import { useState, useEffect } from 'react';
import api from '../api';
import { useToast, mensajeDeError } from '../components/Toast';

function Marcas() {
  const toast = useToast();
  const [marcas, setMarcas] = useState([]);
  const [nombre, setNombre] = useState('');
  const [paisOrigen, setPaisOrigen] = useState('');
  const [contacto, setContacto] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [editando, setEditando] = useState(null);

  useEffect(() => { cargarMarcas(); }, []);

  const cargarMarcas = async () => {
    const res = await api.get('/marcas');
    setMarcas(res.data);
  };

  const guardar = async () => {
    if (!nombre.trim()) { toast.warning('Falta el nombre', 'El nombre de la marca es obligatorio.'); return; }
    const data = { nombre, paisOrigen: paisOrigen || null, contactoSoporte: contacto || null,
      telefonoSoporte: telefono || null, emailSoporte: email || null };
    if (editando) {
      await api.put(`/marcas/${editando}`, { idMarca: editando, ...data });
    } else {
      await api.post('/marcas', data);
    }
    limpiar(); cargarMarcas();
  };

  const editar = (m) => {
    setNombre(m.nombre); setPaisOrigen(m.paisOrigen || ''); setContacto(m.contactoSoporte || '');
    setTelefono(m.telefonoSoporte || ''); setEmail(m.emailSoporte || ''); setEditando(m.idMarca);
  };

  const eliminar = async (id, nom) => {
    if (!window.confirm(`¿Eliminar "${nom}"?`)) return;
    try { await api.delete(`/marcas/${id}`); cargarMarcas(); }
    catch (err) { toast.error('No se pudo eliminar', mensajeDeError(err, 'Error al eliminar la marca.')); }
  };

  const limpiar = () => {
    setNombre(''); setPaisOrigen(''); setContacto(''); setTelefono(''); setEmail(''); setEditando(null);
  };

  return (
    <>
      <header className="topbar">
        <h2>MARCAS</h2>
        <span className="badge">MAESTRA</span>
        <span className="desc">Catálogo de fabricantes de equipos médicos</span>
      </header>
      <div className="page-content">
        <div className="form-card">
          <h3>{editando ? '✏ Editar marca' : '+ Nueva marca'}</h3>
          <div className="form-grid">
            <div className="form-group"><label>Nombre *</label>
              <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Philips Healthcare" /></div>
            <div className="form-group"><label>País de origen</label>
              <input value={paisOrigen} onChange={e => setPaisOrigen(e.target.value)} placeholder="Ej: Alemania" /></div>
            <div className="form-group"><label>Contacto soporte</label>
              <input value={contacto} onChange={e => setContacto(e.target.value)} placeholder="Distribuidor local" /></div>
            <div className="form-group"><label>Teléfono</label>
              <input value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="+54 11..." /></div>
            <div className="form-group full"><label>Email soporte</label>
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="soporte@ejemplo.com" /></div>
          </div>
          <div className="form-actions">
            <button className="btn-primary" onClick={guardar}>{editando ? 'Actualizar' : 'Guardar'}</button>
            {editando && <button className="btn-ghost" onClick={limpiar}>Cancelar</button>}
          </div>
        </div>
        <div className="table-card">
          <div className="table-header"><span>{marcas.length} registros</span></div>
          <table>
            <thead><tr><th>ID</th><th>Nombre</th><th>País</th><th>Contacto</th><th>Teléfono</th><th>Email</th><th>Acciones</th></tr></thead>
            <tbody>
              {marcas.map(m => (
                <tr key={m.idMarca}>
                  <td className="td-id">#{m.idMarca}</td>
                  <td><strong>{m.nombre}</strong></td>
                  <td>{m.paisOrigen || '—'}</td>
                  <td>{m.contactoSoporte || '—'}</td>
                  <td className="td-mono">{m.telefonoSoporte || '—'}</td>
                  <td className="td-mono">{m.emailSoporte || '—'}</td>
                  <td>
                    <button className="btn-edit" onClick={() => editar(m)}>✏</button>
                    <button className="btn-delete" onClick={() => eliminar(m.idMarca, m.nombre)}>✕</button>
                  </td>
                </tr>
              ))}
              {marcas.length === 0 && <tr><td colSpan="7" className="empty">No hay marcas registradas.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export default Marcas;