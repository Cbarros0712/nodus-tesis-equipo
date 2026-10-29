import { useState, useEffect } from 'react';
import api from '../api';
import { useToast, mensajeDeError } from '../components/Toast';

function Sectores() {
  const toast = useToast();
  const [sectores, setSectores] = useState([]);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [activo, setActivo] = useState(true);
  const [editando, setEditando] = useState(null);

  useEffect(() => {
    cargarSectores();
  }, []);

  const cargarSectores = async () => {
    const r = await api.get('/sectores');
    setSectores(r.data);
  };

  const guardar = async () => {
    if (!nombre.trim()) {
      toast.warning('Falta el nombre', 'El nombre del sector es obligatorio.');
      return;
    }
    const data = {
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || null,
      activo
    };
    try {
      if (editando) {
        await api.put(`/sectores/${editando}`, { idSector: editando, ...data });
      } else {
        await api.post('/sectores', data);
      }
      limpiar();
      cargarSectores();
    } catch (err) {
      toast.error('No se pudo guardar', mensajeDeError(err, 'Error al guardar el sector.'));
    }
  };

  const editar = (s) => {
    setNombre(s.nombre);
    setDescripcion(s.descripcion || '');
    setActivo(s.activo);
    setEditando(s.idSector);
  };

  const eliminar = async (id) => {
    if (!window.confirm('¿Eliminar este sector?')) return;
    try {
      await api.delete(`/sectores/${id}`);
      cargarSectores();
    } catch (err) {
      toast.error('No se pudo eliminar', mensajeDeError(err, 'Error al eliminar el sector.'));
    }
  };

  const limpiar = () => {
    setNombre('');
    setDescripcion('');
    setActivo(true);
    setEditando(null);
  };

  return (
    <>
      <header className="topbar">
        <h2>SECTORES</h2>
        <span className="badge" style={{background:'rgba(45,212,160,0.15)',color:'#2DD4A0',borderColor:'rgba(45,212,160,0.3)'}}>CATÁLOGO</span>
        <span className="desc">Lugares físicos del hospital</span>
      </header>
      <div className="page-content">
        <div className="form-card">
          <h3>{editando ? '✏ Editar sector' : '+ Nuevo sector'}</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Nombre *</label>
              <input
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                placeholder="Ej: Quirófano 3"
                maxLength={100}
              />
            </div>
            <div className="form-group">
              <label>Descripción</label>
              <input
                value={descripcion}
                onChange={e => setDescripcion(e.target.value)}
                placeholder="Ej: Quirófano de cirugía cardiovascular - piso 2"
                maxLength={250}
              />
            </div>
            <div className="form-group">
              <label>Estado</label>
              <select value={activo ? 'true' : 'false'} onChange={e => setActivo(e.target.value === 'true')}>
                <option value="true">Activo</option>
                <option value="false">Inactivo</option>
              </select>
            </div>
          </div>
          <div className="form-actions">
            <button className="btn-primary" onClick={guardar}>{editando ? 'Actualizar' : 'Guardar'}</button>
            {editando && <button className="btn-ghost" onClick={limpiar}>Cancelar</button>}
          </div>
        </div>
        <div className="table-card">
          <div className="table-header"><span>{sectores.length} registros</span></div>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Descripción</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {sectores.map(s => (
                <tr key={s.idSector}>
                  <td className="td-id">#{s.idSector}</td>
                  <td><strong>{s.nombre}</strong></td>
                  <td className="wrap-cell">{s.descripcion || '—'}</td>
                  <td>
                    <span
                      className="estado-chip"
                      style={{
                        background: s.activo ? 'rgba(45,212,160,0.15)' : 'rgba(158,156,187,0.15)',
                        color: s.activo ? '#2DD4A0' : '#9E9CBB',
                        border: `1px solid ${s.activo ? 'rgba(45,212,160,0.3)' : 'rgba(158,156,187,0.3)'}`
                      }}
                    >
                      {s.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    <button className="btn-edit" onClick={() => editar(s)}>✏</button>
                    <button className="btn-delete" onClick={() => eliminar(s.idSector)}>✕</button>
                  </td>
                </tr>
              ))}
              {sectores.length === 0 && (
                <tr><td colSpan="5" className="empty">No hay sectores registrados.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export default Sectores;