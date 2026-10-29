import { useState, useEffect, useMemo } from 'react';
import api from '../api';
import { urlDocumento, urlRemito } from '../documentosPrestamo';

const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const mensajeApi = (err, porDefecto) => {
  const r = err.response;
  if (!r) return 'No se pudo conectar con el servidor. Verificá que la API esté corriendo.';
  if (typeof r.data === 'string' && r.data.trim()) return r.data;
  if (r.data?.errors) return Object.values(r.data.errors).flat().join(' ');
  if (r.data?.title) return r.data.title;
  if (r.status === 404) return 'El servidor no encontró esta función (404). Puede que la API no esté actualizada.';
  if (r.status === 413) return 'El archivo es demasiado grande para el servidor.';
  return `${porDefecto} (error ${r.status})`;
};

const TAMANIO_MAXIMO_ESCANEO = 10 * 1024 * 1024;

const errorEscaneo = (archivo) => {
  if (!archivo) return 'Adjuntá la foto o el PDF del remito firmado.';
  if (!['image/jpeg', 'image/png', 'application/pdf'].includes(archivo.type)) return 'Formato no admitido. Subí una foto (JPG o PNG) o un PDF.';
  if (archivo.size > TAMANIO_MAXIMO_ESCANEO) return 'El archivo supera los 10 MB. Probá con una foto de menor resolución.';
  return null;
};

function SelectorEscaneo({ archivo, onChange }) {
  const preview = useMemo(() => (archivo?.type.startsWith('image/') ? URL.createObjectURL(archivo) : null), [archivo]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  return (
    <div>
      <label style={{ ...zonaArchivo, borderColor: archivo ? '#9FD8C3' : '#C8DCEA', background: archivo ? '#F2FBF7' : '#FAFBFC' }}>
        <input
          type="file" accept="image/jpeg,image/png,application/pdf"
          onChange={e => onChange(e.target.files?.[0] || null)}
          style={{ display: 'none' }}
        />
        {archivo ? (
          <>
            <span style={{ fontSize: 22 }}>{archivo.type === 'application/pdf' ? '📄' : '🖼'}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#2D3748', wordBreak: 'break-all' }}>{archivo.name}</span>
            <span style={{ fontSize: 11, color: '#6B7C8C' }}>{(archivo.size / 1024 / 1024).toFixed(2)} MB · click para cambiarlo</span>
          </>
        ) : (
          <>
            <span style={{ fontSize: 22 }}>📎</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#2C7DA0' }}>Elegir foto o PDF del remito firmado</span>
            <span style={{ fontSize: 11, color: '#6B7C8C' }}>JPG, PNG o PDF · hasta 10 MB</span>
          </>
        )}
      </label>
      {preview && <img src={preview} alt="Vista previa del remito firmado" style={{ marginTop: 10, maxHeight: 220, maxWidth: '100%', borderRadius: 8, border: '1px solid #E5EDF3', display: 'block' }} />}
    </div>
  );
}

function EncabezadoModal({ icono, fondo, titulo, prestamo, onCerrar }) {
  return (
    <div style={modalHeaderStyle}>
      <div style={{ width: 52, height: 52, borderRadius: 12, background: fondo, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>{icono}</div>
      <div style={{ flex: 1 }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1a1a1a' }}>{titulo}</h3>
        <p style={{ margin: '4px 0 0', color: '#6B7C8C', fontSize: 13 }}>
          {prestamo.equipo?.modelo} · {prestamo.hospital?.nombre}
        </p>
      </div>
      <button onClick={onCerrar} style={btnCerrarX}>✕</button>
    </div>
  );
}

const REMITOS = {
  salida: {
    titulo: 'Remito de salida firmado',
    numero: (p) => p.numeroRemito,
    url: (p) => urlRemito(p.idPrestamo),
    ayuda: 'firmado por quien retiró el equipo',
    reemplaza: (p) => p.tieneFirmaSalida
  },
  devolucion: {
    titulo: 'Remito de devolución firmado',
    numero: (p) => p.numeroRemitoDevolucion,
    url: (p) => urlDocumento(p.idPrestamo, 'remito-devolucion'),
    ayuda: 'firmado por quien entregó y quien recibió el equipo',
    reemplaza: (p) => p.tieneFirmaDevolucion
  }
};

export function ModalSubirFirmado({ prestamo, tipo, onCerrar, onSubido }) {
  const r = REMITOS[tipo];
  const [archivo, setArchivo] = useState(null);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const cerrar = () => { if (!enviando) onCerrar(); };

  const subir = async () => {
    const e = errorEscaneo(archivo);
    if (e) { setError(e); return; }

    const form = new FormData();
    form.append('archivo', archivo);
    setEnviando(true);
    try {
      await api.post(`/remitos/${prestamo.idPrestamo}/subir-firma-${tipo}`, form);
      onSubido();
    } catch (err) {
      setError(mensajeApi(err, 'No se pudo subir el remito firmado.'));
      setEnviando(false);
    }
  };

  return (
    <div onClick={cerrar} className="rwd-modal-overlay" style={overlayStyle}>
      <div onClick={e => e.stopPropagation()} className="rwd-modal-box" style={{ ...modalStyle, maxWidth: 480 }}>
        <EncabezadoModal icono="✍" fondo="linear-gradient(135deg, #E6F1FB 0%, #D3E6F5 100%)" titulo={r.titulo} prestamo={prestamo} onCerrar={cerrar} />

        <div style={{ padding: '20px 28px 24px' }}>
          {error && <div style={bannerError}>⚠ {error}</div>}
          <p style={{ fontSize: 13, color: '#4A5868', margin: '0 0 12px' }}>
            Subí el remito <b style={{ fontFamily: 'monospace' }}>{r.numero(prestamo)}</b> {r.ayuda}.{' '}
            <a href={r.url(prestamo)} target="_blank" rel="noreferrer" style={lnkDoc}>Ver remito</a>
          </p>
          {r.reemplaza(prestamo) && (
            <p style={{ fontSize: 12, color: '#8A4B00', margin: '0 0 12px' }}>Ya hay un escaneo cargado: el nuevo lo reemplaza.</p>
          )}
          <SelectorEscaneo archivo={archivo} onChange={(f) => { setArchivo(f); setError(''); }} />
        </div>

        <div style={modalFooterStyle}>
          <button onClick={cerrar} disabled={enviando} style={btnGhost}>Cancelar</button>
          <button onClick={subir} disabled={enviando || !archivo} style={{ ...btnSave, opacity: enviando || !archivo ? 0.5 : 1 }}>
            {enviando ? 'Subiendo...' : '⬆ Subir firmado'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ModalDevolucion({ prestamo, onCerrar, onRegistrado }) {
  const [fecha, setFecha] = useState(hoyISO());
  const [obs, setObs] = useState('');
  const [registrado, setRegistrado] = useState(null);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const cerrar = () => { if (!enviando) onCerrar(); };

  const registrar = async () => {
    if (!fecha) { setError('Elegí la fecha de devolución.'); return; }
    setEnviando(true);
    setError('');
    try {
      const r = await api.post(`/prestamos/${prestamo.idPrestamo}/devolucion`, { fechaDevolucion: fecha, observaciones: obs.trim() || null });
      setRegistrado(r.data);
      onRegistrado?.(r.data);
    } catch (err) {
      setError(mensajeApi(err, 'No se pudo registrar la devolución.'));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div onClick={cerrar} className="rwd-modal-overlay" style={overlayStyle}>
      <div onClick={e => e.stopPropagation()} className="rwd-modal-box" style={{ ...modalStyle, maxWidth: 480 }}>
        <EncabezadoModal icono="↩" fondo="linear-gradient(135deg, #E1F5EE 0%, #CFEEE1 100%)" titulo={registrado ? 'Devolución registrada' : 'Registrar devolución'} prestamo={prestamo} onCerrar={cerrar} />

        {registrado ? (
          <div style={{ padding: '20px 28px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#6B7C8C', letterSpacing: '0.5px' }}>N° DE REMITO DE DEVOLUCIÓN</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: '#0F6E56', margin: '4px 0 12px', fontFamily: 'monospace' }}>{registrado.numeroRemitoDevolucion}</div>
            <p style={{ fontSize: 12, color: '#6B7C8C', margin: 0 }}>
              Imprimilo para que lo firmen quien entrega y quien recibe el equipo. Después subí el escaneo desde Remitos con "Subir firmado".
            </p>
          </div>
        ) : (
          <div style={{ padding: '20px 28px 24px' }}>
            {error && <div style={bannerError}>⚠ {error}</div>}
            <label style={lblStyle}>Fecha de devolución *</label>
            <input type="date" value={fecha} max={hoyISO()} onChange={e => setFecha(e.target.value)} style={inpStyle} />

            <label style={{ ...lblStyle, marginTop: 12 }}>Estado en que vuelve el equipo</label>
            <textarea
              value={obs} onChange={e => setObs(e.target.value)}
              placeholder="Novedades, faltantes, daños... (se imprime en el remito de devolución)"
              rows={2}
              style={{ ...inpStyle, resize: 'vertical', fontFamily: 'inherit' }}
            />
            <p style={{ fontSize: 12, color: '#6B7C8C', margin: '10px 0 0' }}>
              El préstamo se cierra, el equipo vuelve a servicio y se genera el remito de devolución.
            </p>
          </div>
        )}

        <div style={modalFooterStyle}>
          {registrado ? (
            <>
              <button onClick={onCerrar} style={btnGhost}>Cerrar</button>
              <a href={urlDocumento(prestamo.idPrestamo, 'remito-devolucion', true)} style={{ ...btnGhost, textDecoration: 'none' }}>⬇ Descargar</a>
              <a href={urlDocumento(prestamo.idPrestamo, 'remito-devolucion')} target="_blank" rel="noreferrer" style={{ ...btnSave, textDecoration: 'none' }}>🖨 Ver / imprimir</a>
            </>
          ) : (
            <>
              <button onClick={cerrar} disabled={enviando} style={btnGhost}>Cancelar</button>
              <button onClick={registrar} disabled={enviando} style={{ ...btnSave, opacity: enviando ? 0.5 : 1 }}>
                {enviando ? 'Registrando...' : '✓ Registrar devolución'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const lblStyle = { display: 'block', fontSize: 11, fontWeight: 600, color: '#4A5868', marginBottom: 6 };
const inpStyle = { width: '100%', padding: '10px 12px', border: '1.5px solid #E5EDF3', borderRadius: 8, fontSize: 13, background: '#FAFBFC', outline: 'none', boxSizing: 'border-box' };
const btnGhost = { background: 'white', color: '#6B7C8C', border: '1px solid #E5EDF3', padding: '10px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' };
const btnSave = { background: 'linear-gradient(135deg, #2C7DA0 0%, #4A9BB8 100%)', color: 'white', border: 'none', padding: '10px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' };
const btnCerrarX = { background: '#F4F7FA', border: 'none', width: 32, height: 32, borderRadius: 8, fontSize: 18, cursor: 'pointer', color: '#6B7C8C' };
const overlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(20,25,40,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 };
const modalStyle = { background: 'white', borderRadius: 16, width: '100%', maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' };
const modalHeaderStyle = { padding: '24px 28px 20px', borderBottom: '1px solid #F0F3F7', display: 'flex', alignItems: 'center', gap: 16 };
const modalFooterStyle = { padding: '16px 28px', borderTop: '1px solid #F0F3F7', background: '#FAFBFC', borderBottomLeftRadius: 16, borderBottomRightRadius: 16, display: 'flex', justifyContent: 'flex-end', gap: 10 };
const bannerError = { background: '#FDECEE', border: '1px solid #F5C2C7', color: '#842029', padding: '12px 14px', borderRadius: 10, fontSize: 13, marginBottom: 16 };
const zonaArchivo = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '18px 14px', border: '1.5px dashed', borderRadius: 10, cursor: 'pointer', textAlign: 'center' };
const lnkDoc = { color: '#2C7DA0', fontSize: 12, fontWeight: 600, textDecoration: 'none' };
