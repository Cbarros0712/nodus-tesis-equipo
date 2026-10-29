import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { puedeHacer } from '../permisos';

function FichaEquipo({ auth }) {
  const { idEquipo } = useParams();
  const navigate = useNavigate();
  const [equipo, setEquipo] = useState(null);
  const [alertas, setAlertas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const rol = auth?.usuario?.rol;
  const puedeCargarOT = puedeHacer(rol, 'crear_ot');

  useEffect(() => {
    cargarDatos();
  }, [idEquipo]);

  const cargarDatos = async () => {
    setCargando(true);
    setError('');
    try {
      const [rEq, rAl] = await Promise.all([
        api.get(`/equipos/${idEquipo}`),
        api.get('/alertas')
      ]);
      setEquipo(rEq.data);
      setAlertas(rAl.data.filter(a => a.idEquipo === parseInt(idEquipo) && (a.estado === 'No leida' || a.estado === 'Leida')));
    } catch {
      setError('No se encontro el equipo. Verifica que el codigo QR sea correcto.');
    } finally {
      setCargando(false);
    }
  };

  const chipEstado = (color) => {
    const map = {
      verde: { bg: '#E1F5EE', fg: '#0F6E56' },
      amarillo: { bg: '#FAEEDA', fg: '#633806' },
      gris: { bg: '#F1EFE8', fg: '#444441' },
      rojo: { bg: '#FAECE7', fg: '#712B13' },
      azul: { bg: '#E6F1FB', fg: '#0C447C' }
    };
    return map[color] || map.gris;
  };

  if (cargando) {
    return <div style={{ textAlign: 'center', padding: 60, color: '#9E9CBB' }}>Cargando ficha del equipo...</div>;
  }

  if (error) {
    return (
      <div style={{ maxWidth: 480, margin: '60px auto', textAlign: 'center', padding: '0 20px' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>!</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#712B13', marginBottom: 8 }}>{error}</div>
        <button onClick={() => navigate('/activos')} style={btnGhost}>Ir a Activos</button>
      </div>
    );
  }

  const ce = chipEstado(equipo.estadoEquipo?.colorSemaforo);

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '24px 16px 60px' }}>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{
          width: 60, height: 60, borderRadius: 16, margin: '0 auto 12px',
          background: 'linear-gradient(135deg, #EEF3FB 0%, #DCE7F5 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28
        }}>+</div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>{equipo.modelo}</h2>
        <div style={{ fontSize: 13, color: '#9E9CBB', fontFamily: 'monospace', marginTop: 2 }}>S/N {equipo.nroSerie}</div>
        <span style={{
          display: 'inline-block', marginTop: 10, padding: '5px 14px', borderRadius: 999,
          background: ce.bg, color: ce.fg, fontSize: 12, fontWeight: 600
        }}>{equipo.estadoEquipo?.nombre || '-'}</span>
      </div>

      {alertas.length > 0 && (
        <div style={{
          background: '#FCE8EF', border: '1px solid #FCD4DE', borderRadius: 10,
          padding: '10px 14px', fontSize: 12.5, color: '#7A1B3E', marginBottom: 16
        }}>
          Este equipo tiene {alertas.length} alerta{alertas.length !== 1 ? 's' : ''} pendiente{alertas.length !== 1 ? 's' : ''}.
        </div>
      )}

      <div style={cardStyle}>
        <div style={tituloCard}>Identificacion</div>
        <FilaDato label="Marca" valor={equipo.marca?.nombre} />
        <FilaDato label="Tipo de activo" valor={equipo.tipoActivo?.nombre} />
        <FilaDato label="Fecha de adquisicion" valor={equipo.fechaAdquisicion?.split('T')[0]} />
        <FilaDato label="Vencimiento garantia" valor={equipo.vencimientoGarantia?.split('T')[0] || '-'} />
      </div>

      {equipo.componentes && equipo.componentes.length > 0 && (
        <div style={cardStyle}>
          <div style={tituloCard}>Componentes registrados</div>
          {equipo.componentes.map((c, idx) => (
            <div key={idx} style={{
              padding: '8px 0', borderBottom: idx < equipo.componentes.length - 1 ? '1px solid #F1F4F7' : 'none',
              fontSize: 13, color: '#2D3748'
            }}>{c}</div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>
        {puedeCargarOT && (
          <button onClick={() => navigate(`/ordenestrabajo?equipo=${equipo.idEquipo}`)} style={btnSave}>
            + Registrar Orden de Trabajo
          </button>
        )}
        <button onClick={() => navigate('/hojasdevida')} style={btnGhost}>Ver hoja de vida</button>
        <button onClick={() => navigate('/activos')} style={btnGhost}>Volver a Activos</button>
      </div>
    </div>
  );
}

function FilaDato({ label, valor }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #F8FAFC', fontSize: 13 }}>
      <span style={{ color: '#9E9CBB' }}>{label}</span>
      <span style={{ color: '#1a1a1a', fontWeight: 500 }}>{valor || '-'}</span>
    </div>
  );
}

const cardStyle = {
  background: 'white', border: '1px solid #EEF1F4', borderRadius: 14,
  padding: '16px 18px', marginBottom: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
};
const tituloCard = { fontSize: 13, fontWeight: 700, color: '#1a1a1a', marginBottom: 10 };
const btnGhost = {
  background: 'white', color: '#6B7C8C', border: '1px solid #E5EDF3',
  padding: '12px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', width: '100%'
};
const btnSave = {
  background: 'linear-gradient(135deg, #2C7DA0 0%, #4A9BB8 100%)',
  color: 'white', border: 'none', padding: '12px 18px', borderRadius: 10,
  fontSize: 13, fontWeight: 600, cursor: 'pointer', width: '100%'
};

export default FichaEquipo;
