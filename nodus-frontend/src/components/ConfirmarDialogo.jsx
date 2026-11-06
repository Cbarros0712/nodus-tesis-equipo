import { useEffect, useRef } from 'react';

function ConfirmarDialogo({
  abierto,
  titulo = '¿Confirmar acción?',
  mensaje,
  textoConfirmar = 'Confirmar',
  textoCancelar = 'Cancelar',
  destructivo = true,
  onConfirmar,
  onCancelar
}) {
  const botonCancelar = useRef(null);

  useEffect(() => {
    if (!abierto) return;
    botonCancelar.current?.focus();
    const handleEsc = (e) => { if (e.key === 'Escape') onCancelar(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [abierto, onCancelar]);

  if (!abierto) return null;

  const color = destructivo ? '#A32D2D' : '#2C7DA0';

  return (
    <div
      onClick={onCancelar}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(20,25,40,0.6)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1500, padding: 20
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirmar-titulo"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'white', borderRadius: 14, maxWidth: 420, width: '100%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden'
        }}
      >
        <div style={{ padding: '22px 24px 8px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <span aria-hidden="true" style={{
            flexShrink: 0, width: 36, height: 36, borderRadius: '50%',
            background: destructivo ? '#FCEBEB' : '#E6F1FB', color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 700
          }}>{destructivo ? '⚠' : '?'}</span>
          <div>
            <h3 id="confirmar-titulo" style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1a1a1a' }}>
              {titulo}
            </h3>
            {mensaje && (
              <p style={{ margin: '6px 0 0', fontSize: 13, color: '#4A5868', lineHeight: 1.5 }}>
                {mensaje}
              </p>
            )}
          </div>
        </div>

        <div style={{
          padding: '16px 24px', marginTop: 12, background: '#FAFBFC',
          borderTop: '1px solid #F0F3F7',
          display: 'flex', justifyContent: 'flex-end', gap: 10
        }}>
          <button
            ref={botonCancelar}
            type="button"
            onClick={onCancelar}
            style={{
              background: 'white', color: '#4A5868', border: '1px solid #E5EDF3',
              padding: '10px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer'
            }}
          >{textoCancelar}</button>
          <button
            type="button"
            onClick={onConfirmar}
            style={{
              background: color, color: 'white', border: 'none',
              padding: '10px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer'
            }}
          >{textoConfirmar}</button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmarDialogo;