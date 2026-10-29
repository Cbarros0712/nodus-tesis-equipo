import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

const TIPOS = {
  success: { color: '#0F6E56', fondo: '#E1F5EE', icono: '✓', duracion: 6000 },
  info:    { color: '#0C447C', fondo: '#E6F1FB', icono: 'i', duracion: 6000 },
  warning: { color: '#A37715', fondo: '#FAEEDA', icono: '⚠', duracion: 6000 },
  error:   { color: '#A32D2D', fondo: '#FCEBEB', icono: '✕', duracion: 8000 }
};

const MAX_VISIBLES = 4;

const ToastContext = createContext(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast() tiene que usarse dentro de <ToastProvider>');
  return ctx;
}

export function mensajeDeError(err, porDefecto) {
  const data = err?.response?.data;
  if (typeof data === 'string' && data.trim()) return data;
  if (data?.title) return data.title;
  return porDefecto;
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const siguienteId = useRef(1);

  const eliminar = useCallback((id) => {
    setToasts(lista => lista.filter(t => t.id !== id));
  }, []);

  const cerrar = useCallback((id) => {
    setToasts(lista => lista.map(t => (t.id === id ? { ...t, saliendo: true } : t)));
  }, []);

  const mostrar = useCallback((tipo, titulo, mensaje) => {
    const id = siguienteId.current++;
    setToasts(lista => [...lista, { id, tipo, titulo, mensaje, saliendo: false }].slice(-MAX_VISIBLES));
  }, []);

  const toast = useMemo(() => ({
    success: (titulo, mensaje) => mostrar('success', titulo, mensaje),
    info:    (titulo, mensaje) => mostrar('info', titulo, mensaje),
    warning: (titulo, mensaje) => mostrar('warning', titulo, mensaje),
    error:   (titulo, mensaje) => mostrar('error', titulo, mensaje)
  }), [mostrar]);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <style>{ESTILOS}</style>
      <div className="nodus-toasts" role="status" aria-live="polite">
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onCerrar={cerrar} onEliminar={eliminar} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onCerrar, onEliminar }) {
  const [pausado, setPausado] = useState(false);
  const tipo = TIPOS[toast.tipo] || TIPOS.info;

  return (
    <div
      className={`nodus-toast${toast.saliendo ? ' nodus-toast--salida' : ''}`}
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onAnimationEnd={(e) => {
        if (toast.saliendo && e.animationName.startsWith('nodusToastSalida')) onEliminar(toast.id);
      }}
      style={{
        position: 'relative', overflow: 'hidden',
        display: 'flex', alignItems: 'flex-start', gap: 12,
        background: 'white', borderRadius: 12,
        borderLeft: `4px solid ${tipo.color}`,
        boxShadow: '0 8px 24px rgba(16, 24, 40, 0.12), 0 2px 6px rgba(16, 24, 40, 0.06)',
        padding: '14px 12px 16px 14px',
        pointerEvents: 'auto'
      }}
    >
      <span aria-hidden="true" style={{
        flexShrink: 0, width: 28, height: 28, borderRadius: '50%',
        background: tipo.fondo, color: tipo.color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, fontWeight: 700,
        fontFamily: toast.tipo === 'info' ? 'Georgia, serif' : 'inherit',
        fontStyle: toast.tipo === 'info' ? 'italic' : 'normal'
      }}>{tipo.icono}</span>

      <div style={{ flex: 1, minWidth: 0, paddingTop: 3 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', lineHeight: 1.3 }}>{toast.titulo}</div>
        {toast.mensaje && (
          <div style={{ fontSize: 13, color: '#6B7C8C', lineHeight: 1.45, marginTop: 3, overflowWrap: 'anywhere' }}>
            {toast.mensaje}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => onCerrar(toast.id)}
        aria-label="Cerrar notificación"
        className="nodus-toast__cerrar"
        style={{
          flexShrink: 0, width: 26, height: 26, marginTop: 1,
          border: 'none', borderRadius: 8, background: 'transparent',
          color: '#9E9CBB', fontSize: 18, lineHeight: 1, cursor: 'pointer'
        }}
      >×</button>

      {}
      {!toast.saliendo && (
        <div
          onAnimationEnd={(e) => { e.stopPropagation(); onCerrar(toast.id); }}
          style={{
            position: 'absolute', left: 0, bottom: 0, height: 3, width: '100%',
            background: tipo.color, opacity: 0.35, transformOrigin: 'left',
            animation: `nodusToastProgreso ${tipo.duracion}ms linear forwards`,
            animationPlayState: pausado ? 'paused' : 'running'
          }}
        />
      )}
    </div>
  );
}

const ESTILOS = `
.nodus-toasts {
  position: fixed; top: 20px; right: 20px; z-index: 2000;
  width: 380px; max-width: calc(100vw - 40px);
  display: flex; flex-direction: column; gap: 10px;
  pointer-events: none;
}
.nodus-toast { animation: nodusToastEntrada 0.28s cubic-bezier(0.2, 0.9, 0.3, 1.2) both; }
.nodus-toast--salida { animation: nodusToastSalida 0.22s ease-in forwards; }
.nodus-toast__cerrar:hover { background: #F1F4F7 !important; color: #4A5868 !important; }
.nodus-toast__cerrar:focus-visible { outline: 2px solid #0C447C; outline-offset: 1px; }

@keyframes nodusToastEntrada { from { opacity: 0; transform: translateX(28px); } to { opacity: 1; transform: none; } }
@keyframes nodusToastSalida  { from { opacity: 1; transform: none; } to { opacity: 0; transform: translateX(28px); } }
@keyframes nodusToastEntradaMovil { from { opacity: 0; transform: translateY(-16px); } to { opacity: 1; transform: none; } }
@keyframes nodusToastSalidaMovil  { from { opacity: 1; transform: none; } to { opacity: 0; transform: translateY(-16px); } }
@keyframes nodusToastProgreso { from { transform: scaleX(1); } to { transform: scaleX(0); } }

@media (max-width: 600px) {
  .nodus-toasts { top: 12px; left: 12px; right: 12px; width: auto; max-width: none; }
  .nodus-toast { animation-name: nodusToastEntradaMovil; }
  .nodus-toast--salida { animation-name: nodusToastSalidaMovil; }
}

@media (prefers-reduced-motion: reduce) {
  .nodus-toast, .nodus-toast--salida { animation-duration: 1ms; }
}
`;
