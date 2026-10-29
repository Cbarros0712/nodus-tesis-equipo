import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { IconCameraOff, IconLock, IconX } from '@tabler/icons-react';
import { useToast } from './Toast';

const ID_VISOR = 'nodus-visor-qr';
const MSJ_NO_NODUS = 'Este código no corresponde a un equipo de NODUS';

const ESPERA_AVISO_MS = 3000;

const ERRORES = {
  https: {
    icono: IconLock,
    titulo: 'La cámara solo funciona con conexión segura (HTTPS)',
    detalle: 'Abrí NODUS desde una dirección que empiece con https://.'
  },
  permiso: {
    icono: IconLock,
    titulo: 'Habilitá el permiso de cámara en el navegador',
    detalle: 'Tocá el candado junto a la dirección del sitio, permití la cámara y volvé a intentar.'
  },
  no_disponible: {
    icono: IconCameraOff,
    titulo: 'No hay una cámara disponible',
    detalle: 'Este dispositivo no tiene cámara o el navegador no permite usarla.'
  },
  en_uso: {
    icono: IconCameraOff,
    titulo: 'No se pudo iniciar la cámara',
    detalle: 'Puede que otra aplicación la esté usando. Cerrala y volvé a intentar.'
  }
};

export function rutaDeQR(texto) {
  let url;
  try { url = new URL(String(texto).trim()); } catch { return null; }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;

  const m = url.pathname.match(/^\/(?:equipos\/(\d+)\/qr|ficha\/(\d+))\/?$/);
  return m ? `/equipos/${m[1] || m[2]}/qr` : null;
}

function clasificarError(err) {
  const texto = `${err?.name || ''} ${err?.message || ''} ${typeof err === 'string' ? err : ''}`;
  if (/NotAllowed|Permission|SecurityError/i.test(texto)) return 'permiso';
  if (/NotFound|DevicesNotFound|Requested device not found|Overconstrained|not supported|streaming/i.test(texto)) return 'no_disponible';
  return 'en_uso';
}

function errorPrevio() {
  if (!window.isSecureContext) return 'https';
  if (!navigator.mediaDevices?.getUserMedia) return 'no_disponible';
  return null;
}

async function detener(escaner) {
  if (!escaner) return;
  try {
    const estado = escaner.getState();
    if (estado === Html5QrcodeScannerState.SCANNING || estado === Html5QrcodeScannerState.PAUSED) {
      await escaner.stop();
    }
    escaner.clear();
  } catch {  }
}

let fila = Promise.resolve();

export default function EscanerQR({ onDetectado, onCancelar }) {
  const toast = useToast();
  const [error, setError] = useState(errorPrevio);
  const [iniciando, setIniciando] = useState(true);
  const [intento, setIntento] = useState(0);
  const ultimoAviso = useRef({ texto: null, hora: 0 });

  const alDetectar = useRef(onDetectado);
  useEffect(() => { alDetectar.current = onDetectado; }, [onDetectado]);

  useEffect(() => {
    if (error) return undefined;
    let activo = true;
    let escaner = null;
    let resuelto = false;

    const leido = (texto) => {
      if (!activo || resuelto) return;
      const ruta = rutaDeQR(texto);
      if (ruta) {
        resuelto = true;
        alDetectar.current(ruta);
        return;
      }
      const ahora = Date.now();
      const previo = ultimoAviso.current;
      if (previo.texto !== texto || ahora - previo.hora > ESPERA_AVISO_MS) {
        ultimoAviso.current = { texto, hora: ahora };
        toast.error(MSJ_NO_NODUS, 'Apuntá la cámara al código QR pegado en el equipo.');
      }
    };

    fila = fila.then(async () => {
      if (!activo) return;
      escaner = new Html5Qrcode(ID_VISOR, {
        verbose: false,
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE]
      });
      try {
        await escaner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: (ancho, alto) => {
              const lado = Math.max(120, Math.floor(Math.min(ancho, alto) * 0.7));
              return { width: lado, height: lado };
            }
          },
          leido,
          () => {  }
        );
        if (activo) setIniciando(false);
      } catch (err) {
        escaner = null;
        if (activo) setError(clasificarError(err));
      }
    });

    return () => {
      activo = false;
      fila = fila.then(() => detener(escaner));
    };
  }, [error, intento, toast]);

  useEffect(() => {
    const tecla = (e) => { if (e.key === 'Escape') onCancelar(); };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [onCancelar]);

  const reintentar = () => {
    setIniciando(true);
    setError(errorPrevio());
    setIntento(n => n + 1);
  };

  const info = error ? ERRORES[error] : null;

  return (
    <div role="dialog" aria-modal="true" aria-label="Escanear QR del equipo" style={fondo}>
      <div style={caja}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a' }}>Escanear QR del equipo</div>
          <button type="button" onClick={onCancelar} aria-label="Cerrar" style={btnIcono}>
            <IconX size={18} stroke={2} />
          </button>
        </div>

        {info ? (
          <div style={{ textAlign: 'center', padding: '20px 4px 8px' }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%', background: '#FCEBEB', color: '#A32D2D',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px'
            }}>
              <info.icono size={26} stroke={1.8} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#712B13', marginBottom: 6, lineHeight: 1.35 }}>{info.titulo}</div>
            <div style={{ fontSize: 13, color: '#6B7C8C', lineHeight: 1.45, marginBottom: 6 }}>{info.detalle}</div>
            <div style={{ fontSize: 13, color: '#6B7C8C', lineHeight: 1.45 }}>
              También podés buscar el equipo por su número de serie o ID.
            </div>
          </div>
        ) : (
          <>
            <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: '#0F1720', minHeight: 260 }}>
              <div id={ID_VISOR} style={{ width: '100%' }} />
              {iniciando && (
                <div style={{
                  position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#C9D4DE', fontSize: 13, textAlign: 'center', padding: 20
                }}>
                  Iniciando cámara... Si el navegador lo pide, permití el acceso.
                </div>
              )}
            </div>
            <div style={{ fontSize: 13, color: '#6B7C8C', textAlign: 'center', marginTop: 12, lineHeight: 1.45 }}>
              Apuntá al código QR pegado en el equipo. Se lee solo, no hace falta sacar foto.
            </div>
          </>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          {info && error !== 'https' && (
            <button type="button" onClick={reintentar} style={btnPrimario}>Reintentar</button>
          )}
          <button type="button" onClick={onCancelar} style={btnGhost}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

const fondo = {
  position: 'fixed', inset: 0, zIndex: 1500, background: 'rgba(15, 23, 32, 0.6)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, boxSizing: 'border-box'
};
const caja = {
  background: 'white', borderRadius: 16, padding: 16, width: '100%', maxWidth: 440,
  maxHeight: 'calc(100vh - 32px)', overflowY: 'auto', boxSizing: 'border-box',
  boxShadow: '0 12px 32px rgba(16, 24, 40, 0.2)'
};
const btnIcono = {
  width: 34, height: 34, border: 'none', borderRadius: 8, background: '#F4F7FA', color: '#6B7C8C',
  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
};
const btnGhost = {
  background: 'white', color: '#6B7C8C', border: '1px solid #E5EDF3',
  padding: '12px 18px', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', flex: 1
};
const btnPrimario = {
  background: 'linear-gradient(135deg, #2C7DA0 0%, #4A9BB8 100%)',
  color: 'white', border: 'none', padding: '12px 18px', borderRadius: 10,
  fontSize: 14, fontWeight: 600, cursor: 'pointer', flex: 1
};
