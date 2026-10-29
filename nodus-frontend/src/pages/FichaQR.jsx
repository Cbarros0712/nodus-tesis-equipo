import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { puedeHacer, ROL_PERSONAL_ASISTENCIAL } from '../permisos';
import { useToast, mensajeDeError } from '../components/Toast';

export const CLAVE_ULTIMO_QR = 'nodus_ultimo_qr';

const MAX = { nombreCompleto: 100, legajo: 30, descripcion: 1000 };
const MSJ_DUPLICADO = 'Este equipo ya tiene una falla reportada hoy. Mantenimiento ya fue notificado.';
const FORM_VACIO = { nombreCompleto: '', legajo: '', servicioId: '', descripcion: '' };
const NO_ENCONTRADO = 'no_encontrado';

function FichaQR(props) {
  const { idEquipo } = useParams();
  return <FichaQREquipo key={idEquipo} idEquipo={idEquipo} {...props} />;
}

function FichaQREquipo({ idEquipo, auth, onLogout }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [ficha, setFicha] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(FORM_VACIO);
  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);

  const [aviso, setAviso] = useState(null);

  const [servicios, setServicios] = useState(null);
  const [errorServicios, setErrorServicios] = useState(false);

  const rol = auth?.usuario?.rol;
  const esPersonalAsistencial = rol === ROL_PERSONAL_ASISTENCIAL;
  const puedeReportar = puedeHacer(rol, 'reportar_falla');

  useEffect(() => {
    let cancelado = false;
    api.get(`/equipos/${idEquipo}/ficha-qr`)
      .then(r => {
        if (cancelado) return;

        try { sessionStorage.setItem(CLAVE_ULTIMO_QR, idEquipo); } catch {  }
        setFicha(r.data);
        if (r.data.reportadoHoy) setAviso('cargado');
      })
      .catch(err => {
        if (cancelado) return;
        setError(err.response?.status === 404
          ? NO_ENCONTRADO
          : 'No se pudo cargar la ficha del equipo. Intentá de nuevo.');
      })
      .finally(() => { if (!cancelado) setCargando(false); });
    return () => { cancelado = true; };
  }, [idEquipo]);

  useEffect(() => {
    if (!puedeReportar) return;
    let cancelado = false;
    api.get('/servicios/catalogo')
      .then(r => { if (!cancelado) setServicios(r.data); })
      .catch(() => { if (!cancelado) setErrorServicios(true); });
    return () => { cancelado = true; };
  }, [puedeReportar]);

  const sinServicios = errorServicios || servicios?.length === 0;

  const cambiar = (campo, valor) => {
    setForm(f => ({ ...f, [campo]: valor }));
    if (errores[campo]) setErrores(e => { const n = { ...e }; delete n[campo]; return n; });
  };

  const validar = () => {
    const e = {};
    const etiquetas = { nombreCompleto: 'el nombre completo', legajo: 'el legajo o matrícula', descripcion: 'la descripción del problema' };
    for (const campo of Object.keys(MAX)) {
      const v = form[campo].trim();
      if (!v) e[campo] = `Falta completar ${etiquetas[campo]}`;
      else if (v.length > MAX[campo]) e[campo] = `Máximo ${MAX[campo]} caracteres`;
    }
    if (!form.servicioId) e.servicioId = 'Falta completar el servicio';
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const enviar = async (e) => {
    e.preventDefault();
    if (enviando || aviso || sinServicios || !validar()) return;
    setEnviando(true);
    try {
      await api.post(`/equipos/${idEquipo}/reportes-falla`, {
        nombreCompleto: form.nombreCompleto.trim(),
        legajo: form.legajo.trim(),
        servicioId: parseInt(form.servicioId),
        descripcion: form.descripcion.trim()
      });
      toast.success('Reporte enviado', 'Mantenimiento recibió tu aviso');
      setForm(FORM_VACIO);
      setAviso('cargado');
    } catch (err) {
      if (err.response?.status === 409) {
        toast.warning('Falla ya reportada', MSJ_DUPLICADO);
        setAviso('conflicto');
      } else {
        toast.error('No se pudo enviar el reporte', mensajeDeError(err, 'Error de conexión con el servidor.'));
      }
    } finally {
      setEnviando(false);
    }
  };

  const cerrarAviso = () => {
    setForm(FORM_VACIO);
    setAviso('cargado');
  };

  const barraSuperior = (
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 12 }}>
      {esPersonalAsistencial && (
        <button onClick={onLogout} style={{ ...btnGhost, width: 'auto', padding: '8px 14px' }}>Cerrar sesión</button>
      )}
    </div>
  );

  if (cargando) {
    return (
      <div style={contenedor}>
        {barraSuperior}
        <div style={{ textAlign: 'center', padding: 60, color: '#9E9CBB' }}>Cargando ficha del equipo...</div>
      </div>
    );
  }

  if (error === NO_ENCONTRADO) {
    return (
      <div style={contenedor}>
        {barraSuperior}
        <div style={{ ...cardStyle, textAlign: 'center', marginTop: 24, padding: '28px 20px' }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#712B13', marginBottom: 8 }}>Equipo no encontrado</div>
          <div style={{ fontSize: 13.5, color: '#6B7C8C', lineHeight: 1.5, marginBottom: 20 }}>
            El código QR no corresponde a ningún equipo registrado. Verificá que sea el QR pegado en el equipo.
          </div>
          {}
          <button onClick={() => navigate('/', { replace: true, state: { inicio: true } })} style={btnSave}>
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={contenedor}>
        {barraSuperior}
        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#712B13', marginBottom: 8 }}>{error}</div>
        </div>
      </div>
    );
  }

  const ce = chipEstado(ficha.colorEstado);

  return (
    <div style={contenedor}>
      {barraSuperior}

      {}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{
          width: 60, height: 60, borderRadius: 16, margin: '0 auto 12px',
          background: 'linear-gradient(135deg, #EEF3FB 0%, #DCE7F5 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28
        }}>+</div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a', margin: 0, overflowWrap: 'anywhere' }}>{ficha.nombre}</h2>
        <div style={{ fontSize: 13, color: '#9E9CBB', fontFamily: 'monospace', marginTop: 2 }}>S/N {ficha.nroSerie}</div>
        <span style={{
          display: 'inline-block', marginTop: 10, padding: '5px 14px', borderRadius: 999,
          background: ce.bg, color: ce.fg, fontSize: 12, fontWeight: 600
        }}>{ficha.estado || '-'}</span>
      </div>

      <div style={cardStyle}>
        <div style={tituloCard}>Identificación</div>
        <FilaDato label="Marca" valor={ficha.marca} />
        <FilaDato label="Tipo de activo" valor={ficha.tipoActivo} />
        <FilaDato label="Nº de serie" valor={ficha.nroSerie} />
        <FilaDato label="Ubicación" valor={ficha.ubicacion} />
        <FilaDato label="Origen" valor={ficha.origen} />
        <FilaDato label="Fecha de alta" valor={fechaDMY(ficha.fechaAlta)} />
        <FilaDato label="Alertas registradas" valor={ficha.alertas?.length ? ficha.alertas.join(', ') : 'Ninguna'} ultima />
      </div>

      {puedeReportar && (
        <div style={cardStyle}>
          <div style={{ ...tituloCard, marginBottom: 2, letterSpacing: 0.4 }}>REPORTAR FALLA</div>
          <div style={{ fontSize: 12, color: '#9E9CBB', marginBottom: 14 }}>Todos los campos son obligatorios</div>

          {aviso && (
            <div role="alert" style={{
              background: '#FAEEDA', border: '1px solid #F2D9AE', borderLeft: '4px solid #A37715',
              borderRadius: 10, padding: '12px 14px', fontSize: 13.5, color: '#633806', lineHeight: 1.45,
              marginBottom: aviso === 'conflicto' ? 12 : 0
            }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span aria-hidden="true" style={{ fontSize: 16, lineHeight: 1.2 }}>⚠</span>
                <div style={{ flex: 1, fontWeight: 600 }}>{MSJ_DUPLICADO}</div>
              </div>
              {aviso === 'conflicto' && (
                <button type="button" onClick={cerrarAviso} style={{ ...btnGhost, marginTop: 10, padding: '9px 14px' }}>
                  Cerrar aviso
                </button>
              )}
            </div>
          )}

          {}
          {aviso !== 'cargado' && (
            <form onSubmit={enviar} noValidate>
              <Campo label="Nombre completo" error={errores.nombreCompleto}>
                <input
                  type="text" value={form.nombreCompleto} maxLength={MAX.nombreCompleto}
                  onChange={e => cambiar('nombreCompleto', e.target.value)}
                  disabled={!!aviso} autoComplete="name" style={inputStyle(errores.nombreCompleto)}
                />
              </Campo>
              <Campo label="Legajo / matrícula" error={errores.legajo}>
                <input
                  type="text" value={form.legajo} maxLength={MAX.legajo}
                  onChange={e => cambiar('legajo', e.target.value)}
                  disabled={!!aviso} style={inputStyle(errores.legajo)}
                />
              </Campo>
              <Campo label="Servicio" error={errores.servicioId}>
                <select
                  value={form.servicioId} onChange={e => cambiar('servicioId', e.target.value)}
                  disabled={!!aviso || !servicios?.length}
                  style={{ ...inputStyle(errores.servicioId), ...selectStyle }}
                >
                  <option value="">{servicios === null && !errorServicios ? 'Cargando servicios...' : 'Seleccionar...'}</option>
                  {servicios?.map(s => <option key={s.idServicio} value={s.idServicio}>{s.nombre}</option>)}
                </select>
              </Campo>
              {sinServicios && (
                <div role="alert" style={{
                  background: '#FAECE7', border: '1px solid #F0C9BC', borderRadius: 10, padding: '10px 12px',
                  fontSize: 13, color: '#712B13', lineHeight: 1.45, marginTop: -4, marginBottom: 12
                }}>
                  {errorServicios
                    ? 'No se pudo cargar la lista de servicios. Recargá la página para poder enviar el reporte.'
                    : 'No hay servicios cargados en el sistema. Avisá a mantenimiento para poder enviar el reporte.'}
                </div>
              )}
              <Campo label="Descripción del problema" error={errores.descripcion}
                ayuda={`${form.descripcion.length}/${MAX.descripcion}`}>
                <textarea
                  value={form.descripcion} maxLength={MAX.descripcion} rows={4}
                  onChange={e => cambiar('descripcion', e.target.value)}
                  disabled={!!aviso} style={{ ...inputStyle(errores.descripcion), resize: 'vertical', minHeight: 96 }}
                />
              </Campo>
              <button type="submit" disabled={enviando || !!aviso || sinServicios}
                style={{ ...btnSave, opacity: enviando || aviso || sinServicios ? 0.6 : 1, cursor: enviando || aviso || sinServicios ? 'not-allowed' : 'pointer' }}>
                {enviando ? 'Enviando...' : 'Enviar reporte'}
              </button>
            </form>
          )}
        </div>
      )}

      {!esPersonalAsistencial && puedeHacer(rol, 'ver_ficha_completa') && (
        <button onClick={() => navigate(`/ficha/${ficha.idEquipo}`)} style={{ ...btnGhost, marginTop: 6 }}>
          Ver ficha completa
        </button>
      )}
    </div>
  );
}

function FilaDato({ label, valor, ultima }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', gap: 12, padding: '7px 0',
      borderBottom: ultima ? 'none' : '1px solid #F8FAFC', fontSize: 13
    }}>
      <span style={{ color: '#9E9CBB', flexShrink: 0 }}>{label}</span>
      <span style={{ color: '#1a1a1a', fontWeight: 500, textAlign: 'right', overflowWrap: 'anywhere' }}>{valor || '-'}</span>
    </div>
  );
}

function Campo({ label, error, ayuda, children }) {
  return (
    <label style={{ display: 'block', marginBottom: 12 }}>
      <span style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, fontWeight: 600, color: '#4A5868', marginBottom: 5 }}>
        <span>{label} <span style={{ color: '#D14343' }}>*</span></span>
        {ayuda && <span style={{ fontWeight: 400, color: '#9E9CBB' }}>{ayuda}</span>}
      </span>
      {children}
      {error && <span style={{ display: 'block', fontSize: 12, color: '#A32D2D', marginTop: 4 }}>⚠ {error}</span>}
    </label>
  );
}

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

const fechaDMY = (iso) => iso ? iso.split('T')[0].split('-').reverse().join('/') : null;

const contenedor = { maxWidth: 560, margin: '0 auto', padding: '16px 16px 60px', boxSizing: 'border-box', width: '100%' };
const cardStyle = {
  background: 'white', border: '1px solid #EEF1F4', borderRadius: 14,
  padding: '16px 18px', marginBottom: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
};
const tituloCard = { fontSize: 13, fontWeight: 700, color: '#1a1a1a', marginBottom: 10 };

const inputStyle = (error) => ({
  width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10, fontSize: 16,
  border: `1px solid ${error ? '#E8A5A5' : '#E5EDF3'}`, background: 'white', color: '#1a1a1a',
  fontFamily: 'inherit', outline: 'none'
});

const selectStyle = {
  appearance: 'none', WebkitAppearance: 'none', paddingRight: 36, cursor: 'pointer',
  backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2 4l4 4 4-4' fill='none' stroke='%236B7C8C' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center'
};
const btnGhost = {
  background: 'white', color: '#6B7C8C', border: '1px solid #E5EDF3',
  padding: '12px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', width: '100%'
};
const btnSave = {
  background: 'linear-gradient(135deg, #2C7DA0 0%, #4A9BB8 100%)',
  color: 'white', border: 'none', padding: '12px 18px', borderRadius: 10,
  fontSize: 13, fontWeight: 600, cursor: 'pointer', width: '100%'
};

export default FichaQR;
