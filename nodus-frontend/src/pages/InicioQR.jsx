import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconQrcode, IconSearch } from '@tabler/icons-react';
import api from '../api';
import EscanerQR from '../components/EscanerQR';

const MAX_CODIGO = 100;

function InicioQR({ onLogout }) {
  const navigate = useNavigate();
  const [escaneando, setEscaneando] = useState(false);
  const [codigo, setCodigo] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [errorBusqueda, setErrorBusqueda] = useState('');

  const cerrarEscaner = useCallback(() => setEscaneando(false), []);
  const alDetectar = useCallback((ruta) => {
    setEscaneando(false);
    navigate(ruta);
  }, [navigate]);

  const buscar = async (e) => {
    e.preventDefault();
    const texto = codigo.trim();
    if (buscando) return;
    if (!texto) { setErrorBusqueda('Ingresá el número de serie o ID del equipo'); return; }
    setBuscando(true);
    setErrorBusqueda('');
    try {
      const r = await api.get('/equipos/buscar-qr', { params: { codigo: texto } });
      navigate(`/equipos/${r.data.idEquipo}/qr`);
    } catch (err) {
      setErrorBusqueda(err.response?.status === 404
        ? 'No se encontró ningún equipo con ese número de serie o ID.'
        : 'No se pudo buscar el equipo. Revisá la conexión e intentá de nuevo.');
    } finally {
      setBuscando(false);
    }
  };

  return (
    <div style={contenedor}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button type="button" onClick={onLogout} style={{ ...btnGhost, width: 'auto', padding: '8px 14px' }}>Cerrar sesión</button>
      </div>

      <div style={{ textAlign: 'center', padding: '28px 4px 24px' }}>
        <div style={{
          width: 72, height: 72, borderRadius: 20, margin: '0 auto 16px',
          background: 'linear-gradient(135deg, #EEF3FB 0%, #DCE7F5 100%)', color: '#2C7DA0',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <IconQrcode size={38} stroke={1.6} />
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a', marginBottom: 8 }}>Escaneá el código QR del equipo</div>
        <div style={{ fontSize: 14, color: '#6B7C8C', lineHeight: 1.5 }}>
          Con el código QR pegado en el equipo vas a ver su ficha y vas a poder reportar una falla.
        </div>
      </div>

      <button type="button" onClick={() => setEscaneando(true)} style={btnEscanear}>
        <IconQrcode size={24} stroke={2} />
        Escanear QR del equipo
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0 16px', color: '#9E9CBB', fontSize: 12 }}>
        <div style={{ flex: 1, height: 1, background: '#E5EDF3' }} />
        ¿No podés escanear?
        <div style={{ flex: 1, height: 1, background: '#E5EDF3' }} />
      </div>

      <form onSubmit={buscar} style={cardStyle} noValidate>
        <label htmlFor="codigo-equipo" style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#1a1a1a', marginBottom: 4 }}>
          Buscar por número de serie o ID
        </label>
        <div style={{ fontSize: 12.5, color: '#9E9CBB', marginBottom: 10 }}>
          Lo encontrás en la etiqueta del equipo, debajo del código QR.
        </div>
        <input
          id="codigo-equipo"
          value={codigo}
          onChange={(e) => { setCodigo(e.target.value); if (errorBusqueda) setErrorBusqueda(''); }}
          maxLength={MAX_CODIGO}
          placeholder="Ej.: SN-48213 o 125"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          enterKeyHint="search"
          aria-invalid={!!errorBusqueda}
          style={inputStyle(!!errorBusqueda)}
        />
        {errorBusqueda && (
          <div role="alert" style={{ fontSize: 12.5, color: '#A32D2D', marginTop: 6 }}>⚠ {errorBusqueda}</div>
        )}
        <button type="submit" disabled={buscando} style={{ ...btnSave, marginTop: 12, opacity: buscando ? 0.7 : 1 }}>
          <IconSearch size={18} stroke={2} />
          {buscando ? 'Buscando...' : 'Buscar equipo'}
        </button>
      </form>

      {escaneando && <EscanerQR onDetectado={alDetectar} onCancelar={cerrarEscaner} />}
    </div>
  );
}

const contenedor = { maxWidth: 480, margin: '0 auto', padding: '16px 16px 60px', boxSizing: 'border-box', width: '100%' };
const cardStyle = {
  background: 'white', border: '1px solid #EEF1F4', borderRadius: 14,
  padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)', margin: 0
};

const inputStyle = (error) => ({
  width: '100%', boxSizing: 'border-box', padding: '12px 12px', borderRadius: 10, fontSize: 16,
  border: `1px solid ${error ? '#E8A5A5' : '#E5EDF3'}`, background: 'white', color: '#1a1a1a',
  fontFamily: 'inherit', outline: 'none'
});
const btnGhost = {
  background: 'white', color: '#6B7C8C', border: '1px solid #E5EDF3',
  padding: '12px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', width: '100%'
};
const btnSave = {
  background: 'linear-gradient(135deg, #2C7DA0 0%, #4A9BB8 100%)',
  color: 'white', border: 'none', padding: '12px 18px', borderRadius: 10,
  fontSize: 14, fontWeight: 600, cursor: 'pointer', width: '100%',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
};
const btnEscanear = {
  ...btnSave,
  minHeight: 64, fontSize: 17, fontWeight: 700, borderRadius: 14, gap: 10,
  boxShadow: '0 6px 18px rgba(44, 125, 160, 0.28)'
};

export default InicioQR;
