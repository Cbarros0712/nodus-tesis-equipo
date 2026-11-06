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

  const [alertasFallaron, setAlertasFallaron] = useState(false);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    setError('');
    setAlertasFallaron(false);
    setEquipo(null);
    setAlertas([]);

    api.get(`/equipos/${idEquipo}`)
      .then(async (rEq) => {
        if (cancelado) return;
        setEquipo(rEq.data);
        try {
          const rAl = await api.get('/alertas');
          if (cancelado) return;
          const id = Number(idEquipo);
          setAlertas(rAl.data.filter(a => a.idEquipo === id && (a.estado === 'No leída' || a.estado === 'Leída')));
        } catch {
          if (!cancelado) setAlertasFallaron(true);
        }
      })
      .catch(err => {
        if (cancelado) return;
        setError(err.response?.status === 404
          ? 'No se encontró el equipo. Verificá que el código QR sea correcto.'
          : 'No se pudo cargar la ficha del equipo. Revisá la conexión e intentá de nuevo.');
      })
      .finally(() => { if (!cancelado) setCargando(false); });

    return () => { cancelado = true; };
  }, [idEquipo, intento]);

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
    return <div role="status" style={{ textAlign: 'center', padding: 60, color: '#5C6B7A' }}>Cargando ficha del equipo...</div>;
  }

  if (error) {
    return (
      <div role="alert" style={{ maxWidth: 480, margin: '60px auto', textAlign: 'center', padding: '0 20px' }}>
        <div aria-hidden="true" style={{ fontSize: 40, marginBottom: 12, color: '#712B13' }}>!</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#712B13', marginBottom: 14 }}>{error}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {!error.startsWith('No se encontró') && (
            <button type="button" onClick={() => setIntento(n => n + 1)} style={btnSave}>Reintentar</button>
          )}
          <button type="button" onClick={() => navigate('/activos')} style={btnGhost}>Ir a Activos</button>
        </div>
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
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, color: '#1F6E8F'
        }} aria-hidden="true">+</div>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a', margin: 0, overflowWrap: 'anywhere' }}>{equipo.modelo}</h1>
        <div style={{ fontSize: 13, color: '#5C6B7A', fontFamily: 'monospace', marginTop: 2 }}>S/N {equipo.nroSerie}</div>
        <span style={{
          display: 'inline-block', marginTop: 10, padding: '5px 14px', borderRadius: 999,
          background: ce.bg, color: ce.fg, fontSize: 12, fontWeight: 600
        }}>{equipo.estadoEquipo?.nombre || '-'}</span>
      </div>

      {alertasFallaron && (
        <div role="status" style={{
          background: '#FAEEDA', border: '1px solid #F2D9AE', borderRadius: 10,
          padding: '10px 14px', fontSize: 12.5, color: '#633806', marginBottom: 16
        }}>
          No se pudieron consultar las alertas de este equipo.
        </div>
      )}

      {alertas.length > 0 && (
        <div role="status" style={{
          background: '#FCE8EF', border: '1px solid #FCD4DE', borderRadius: 10,
          padding: '10px 14px', fontSize: 12.5, color: '#7A1B3E', marginBottom: 16
        }}>
          Este equipo tiene {alertas.length} alerta{alertas.length !== 1 ? 's' : ''} pendiente{alertas.length !== 1 ? 's' : ''}.
        </div>
      )}

      <div style={cardStyle}>
        <div style={tituloCard}>Identificación</div>
        <FilaDato label="Marca" valor={equipo.marca?.nombre} />
        <FilaDato label="Tipo de activo" valor={equipo.tipoActivo?.nombre} />
        <FilaDato label="Fecha de adquisición" valor={fechaDMY(equipo.fechaAdquisicion)} />
        <FilaDato label="Vencimiento de garantía" valor={fechaDMY(equipo.vencimientoGarantia)} />
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
          <button type="button" onClick={() => navigate(`/ordenestrabajo?equipo=${equipo.idEquipo}`)} style={btnSave}>
            + Registrar Orden de Trabajo
          </button>
        )}
        <button type="button" onClick={() => navigate('/hojasdevida')} style={btnGhost}>Ver hoja de vida</button>
        <button type="button" onClick={() => navigate('/activos')} style={btnGhost}>Volver a Activos</button>
      </div>
    </div>
  );
}

function FilaDato({ label, valor }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '7px 0', borderBottom: '1px solid #F8FAFC', fontSize: 13 }}>
      <span style={{ color: '#5C6B7A', flexShrink: 0 }}>{label}</span>
      <span style={{ color: '#1a1a1a', fontWeight: 500, textAlign: 'right', overflowWrap: 'anywhere' }}>{valor || '-'}</span>
    </div>
  );
}

const fechaDMY = (v) => {
  if (!v) return null;
  const [a, m, d] = String(v).split('T')[0].split('-');
  return a && m && d ? `${d}/${m}/${a}` : null;
};

const cardStyle = {
  background: 'white', border: '1px solid #EEF1F4', borderRadius: 14,
  padding: '16px 18px', marginBottom: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
};
const tituloCard = { fontSize: 13, fontWeight: 700, color: '#1a1a1a', marginBottom: 10 };
const btnGhost = {
  background: 'white', color: '#5C6B7A', border: '1px solid #8493A2',
  padding: '12px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', width: '100%'
};
const btnSave = {
  background: 'linear-gradient(135deg, #1B6585 0%, #1F6E8F 100%)',
  color: 'white', border: 'none', padding: '12px 18px', borderRadius: 10,
  fontSize: 13, fontWeight: 600, cursor: 'pointer', width: '100%'
};

export default FichaEquipo;