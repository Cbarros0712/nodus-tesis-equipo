import { useState, useEffect } from 'react';
import api from '../api';
import { useToast, mensajeDeError } from '../components/Toast';

function Servicios() {
  const toast = useToast();
  const [servicios, setServicios] = useState([]);
  const [nombre, setNombre] = useState('');
  const [sector, setSector] = useState('');
  const [editando, setEditando] = useState(null);

  useEffect(() => {
    cargarServicios();
  }, []);

  const cargarServicios = async () => {
    const r = await api.get('/servicios');
    setServicios(r.data);
  };

  const guardar = async () => {
    if (!nombre.trim()) {
      toast.warning('Falta el nombre', 'El nombre del servicio es obligatorio.');
      return;
    }
    const data = {
      nombre: nombre.trim(),
      sector: sector.trim() || null
    };
    try {
      if (editando) {
        await api.put(`/servicios/${editando}`, { idServicio: editando, ...data });
      } else {
        await api.post('/servicios', data);
      }
      limpiar();
      cargarServicios();
    } catch (err) {
      toast.error('No se pudo guardar', mensajeDeError(err, 'Error al guardar el servicio.'));
    }
  };

  const editar = (s) => {
    setNombre(s.nombre);
    setSector(s.sector || '');
    setEditando(s.idServicio);
  };

  const eliminar = async (id) => {
    if (!window.confirm('¿Eliminar este servicio?')) return;
    try {
      await api.delete(`/servicios/${id}`);
      cargarServicios();
    } catch (err) {
      toast.error('No se pudo eliminar', mensajeDeError(err, 'Error al eliminar el servicio.'));
    }
  };

  const limpiar = () => {
    setNombre('');
    setSector('');
    setEditando(null);
  };

  return (
    <>
      <header className="topbar">
        <h2>SERVICIOS</h2>
        <span className="badge" style={{background:'rgba(45,212,160,0.15)',color:'#2DD4A0',borderColor:'rgba(45,212,160,0.3)'}}>CATÁLOGO</span>
        <span className="desc">Servicios y unidades funcionales del hospital</span>
      </header>
      <div className="page-content">
        <div className="form-card">
          <h3>{editando ? '✏ Editar servicio' : '+ Nuevo servicio'}</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Nombre *</label>
              <input
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                placeholder="Ej: UTI Pediátrica"
                maxLength={100}
              />
            </div>
            <div className="form-group">
              <label>Ubicación general</label>
              <input
                value={sector}
                onChange={e => setSector(e.target.value)}
                placeholder="Ej: Pediatría piso 3"
                maxLength={100}
              />
            </div>
          </div>
          <div className="form-actions">
            <button className="btn-primary" onClick={guardar}>{editando ? 'Actualizar' : 'Guardar'}</button>
            {editando && <button className="btn-ghost" onClick={limpiar}>Cancelar</button>}
          </div>
        </div>
        <div className="table-card">
          <div className="table-header"><span>{servicios.length} registros</span></div>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Ubicación</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {servicios.map(s => (
                <tr key={s.idServicio}>
                  <td className="td-id">#{s.idServicio}</td>
                  <td><strong>{s.nombre}</strong></td>
                  <td>{s.sector || '—'}</td>
                  <td>
                    <button className="btn-edit" onClick={() => editar(s)}>✏</button>
                    <button className="btn-delete" onClick={() => eliminar(s.idServicio)}>✕</button>
                  </td>
                </tr>
              ))}
              {servicios.length === 0 && (
                <tr><td colSpan="4" className="empty">No hay servicios registrados.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export default Servicios;