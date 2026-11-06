import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { DIAS_AVISO, DIAS_AVISO_GARANTIA, garantiaPorVencer, estaPorVencer, estaVencido } from '../vencimientos';
import { puedeVerModulo, puedeHacer } from '../permisos';
import { useToast, mensajeDeError } from '../components/Toast';

function Bienvenida({ auth }) {
  const navigate = useNavigate();
  const toast = useToast();
  const rol = auth?.usuario?.rol;
  const nombreUsuario = auth?.usuario?.nombre?.split(' ')[0] || 'Bienvenido';

  // Cada rol ve (y carga) solo lo que puede abrir
  const veePatrimonial = puedeVerModulo(rol, 'patrimonial');
  const veeMantenimiento = puedeVerModulo(rol, 'mantenimiento');
  const veePrestamos = puedeVerModulo(rol, 'prestamos');
  const veeFallas = puedeHacer(rol, 'gestionar_reportes_falla');
  const veeVencimientos = veePatrimonial || veePrestamos;

  const [equipos, setEquipos] = useState([]);
  const [ots, setOts] = useState([]);
  const [fallas, setFallas] = useState([]);
  const [prestamos, setPrestamos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(false);

  useEffect(() => {
    cargarTodo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cargarTodo = async () => {
    setCargando(true);
    setErrorCarga(false);
    const vacio = Promise.resolve({ data: [] });
    try {
      const [rEq, rOt, rFa, rPr] = await Promise.all([
        veePatrimonial ? api.get('/equipos') : vacio,
        veeMantenimiento ? api.get('/ordenestrabajo') : vacio,
        veeFallas ? api.get('/reportes-falla', { params: { estado: 'Pendiente' } }) : vacio,
        veePrestamos ? api.get('/prestamos') : vacio
      ]);
      setEquipos(rEq.data);
      setOts(rOt.data);
      setFallas(rFa.data);
      setPrestamos(rPr.data);
    } catch (err) {
      setErrorCarga(true);
      toast.error('No se pudieron cargar los indicadores', mensajeDeError(err, 'Revisá la conexión e intentá de nuevo.'));
    } finally {
      setCargando(false);
    }
  };

  const kpis = useMemo(() => ({
    fallasSinAtender: fallas.filter(f => f.estado === 'Pendiente').length,
    otsPendientes: ots.filter(o => o.estado === 'Pendiente' || o.estado === 'En curso').length,
    garantias: equipos.filter(garantiaPorVencer).length,
    prestamosPorVencer: prestamos.filter(estaPorVencer).length,
    prestamosVencidos: prestamos.filter(estaVencido).length
  }), [equipos, ots, fallas, prestamos]);

  const totalVencimientos = kpis.garantias + kpis.prestamosPorVencer + kpis.prestamosVencidos;
  const listo = !cargando && !errorCarga;
  const valor = (n) => (listo ? n : '—');

  const descripcionVencimientos = () => {
    if (!listo) return 'Garantías y préstamos';
    if (totalVencimientos === 0) return 'Nada por vencer';
    const partes = [];
    if (kpis.prestamosVencidos > 0) partes.push(`⚠ ${kpis.prestamosVencidos} préstamo${kpis.prestamosVencidos !== 1 ? 's' : ''} vencido${kpis.prestamosVencidos !== 1 ? 's' : ''}`);
    if (kpis.prestamosPorVencer > 0) partes.push(`${kpis.prestamosPorVencer} préstamo${kpis.prestamosPorVencer !== 1 ? 's' : ''} por vencer`);
    if (kpis.garantias > 0) partes.push(`${kpis.garantias} garantía${kpis.garantias !== 1 ? 's' : ''} por vencer`);
    return partes.join(' · ');
  };

  // Si hay préstamos que atender, llevamos a Préstamos; si solo hay garantías, a Activos
  const destinoVencimientos = veePrestamos && (kpis.prestamosVencidos + kpis.prestamosPorVencer > 0 || !veePatrimonial)
    ? '/prestamos'
    : '/activos';

  const hayTarjetas = veeFallas || veeMantenimiento || veeVencimientos;

  return (
    <div className="rwd-page-header" style={{
      background: 'linear-gradient(135deg, #FAFBFC 0%, #F4F7FA 100%)',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '40px 20px'
    }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <img
          src="/logonodus.jpg"
          alt="NODUS"
          style={{
            maxWidth: 520,
            width: '90%',
            height: 'auto',
            marginBottom: 24,
            filter: 'drop-shadow(0 6px 20px rgba(12, 68, 124, 0.18))'
          }}
        />
        <h1 style={{
          fontSize: 24,
          fontWeight: 500,
          color: '#4A5868',
          margin: '0 0 8px',
          letterSpacing: '0.5px'
        }}>
          Sistema de Control Patrimonial Hospitalario
        </h1>
        <p style={{ fontSize: 15, color: '#5C6B7A', margin: '0 0 20px' }}>
          Bioingeniería · Trazabilidad de equipos médicos
        </p>
        {auth?.usuario?.nombre && (
          <div style={{
            display: 'inline-block',
            background: '#F0F6FA',
            color: '#0C447C',
            border: '1px solid #C8DCEA',
            padding: '8px 18px',
            borderRadius: 999,
            fontSize: 14,
            fontWeight: 500
          }}>
            <span aria-hidden="true">👋 </span>Hola, <strong>{nombreUsuario}</strong>
          </div>
        )}
      </div>

      {errorCarga && (
        <div role="alert" style={{
          background: '#FDECEE', border: '1px solid #F5C2C7', color: '#842029',
          padding: '12px 16px', borderRadius: 10, fontSize: 13, marginBottom: 18,
          display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', justifyContent: 'center'
        }}>
          <span>⚠ No se pudieron cargar los indicadores.</span>
          <button
            type="button" onClick={cargarTodo}
            style={{
              background: 'white', border: '1px solid #F5C2C7', color: '#842029',
              borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer'
            }}
          >Reintentar</button>
        </div>
      )}

      {hayTarjetas && (
        <section aria-labelledby="titulo-hoy" style={{ width: '100%', maxWidth: 960 }}>
          <h2 id="titulo-hoy" style={{
            fontSize: 12, fontWeight: 700, color: '#4A5868', letterSpacing: '0.1em',
            textTransform: 'uppercase', margin: '0 0 12px', textAlign: 'center'
          }}>
            Para hoy
          </h2>
          <div
            aria-busy={cargando}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 300px))',
              justifyContent: 'center',
              gap: 18
            }}
          >
            {veeFallas && (
              <KPICard
                icono="📣"
                label="Fallas sin atender"
                valor={valor(kpis.fallasSinAtender)}
                descripcion={listo && kpis.fallasSinAtender === 0 ? 'Sin fallas pendientes' : 'Esperan convertirse en OT'}
                gradient="linear-gradient(135deg, #EEEDFE 0%, #DEDCFB 100%)"
                colorValor="#3C3489"
                onClick={() => navigate('/reportesfalla')}
                destacar={kpis.fallasSinAtender > 0}
              />
            )}
            {veeMantenimiento && (
              <KPICard
                icono="🔧"
                label="OTs pendientes"
                valor={valor(kpis.otsPendientes)}
                descripcion={listo && kpis.otsPendientes === 0 ? 'Sin pendientes' : 'Pendientes o en curso'}
                gradient="linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%)"
                colorValor="#7A4A00"
                onClick={() => navigate('/ordenestrabajo')}
                destacar={kpis.otsPendientes > 0}
              />
            )}
            {veeVencimientos && (
              <KPICard
                icono="⏰"
                label="Vencimientos próximos"
                valor={valor(totalVencimientos)}
                descripcion={descripcionVencimientos()}
                gradient="linear-gradient(135deg, #E6F1FB 0%, #C8DCEA 100%)"
                colorValor="#0C447C"
                onClick={() => navigate(destinoVencimientos)}
                destacar={kpis.prestamosVencidos > 0}
                ayuda={`Garantías: próximos ${DIAS_AVISO_GARANTIA} días · Préstamos: próximos ${DIAS_AVISO} días`}
              />
            )}
          </div>
        </section>
      )}

      <div style={{ marginTop: 40, textAlign: 'center', fontSize: 12, color: '#5C6B7A' }}>
        NODUS · {new Date().toLocaleDateString('es-AR', {
          day: '2-digit', month: 'long', year: 'numeric'
        })}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.3); }
        }
        @media (prefers-reduced-motion: reduce) {
          .kpi-pulso { animation: none !important; }
          .kpi-card { transition: none !important; }
        }
        .kpi-card:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.08); }
        .kpi-card:focus-visible { outline: 3px solid #1F6E8F; outline-offset: 3px; }
      `}</style>
    </div>
  );
}

function KPICard({ icono, label, valor, descripcion, gradient, colorValor, onClick, destacar, ayuda }) {
  return (
    <button
      type="button"
      className="kpi-card"
      onClick={onClick}
      title={ayuda}
      aria-label={`${label}: ${valor}. ${descripcion}. Abrir`}
      style={{
        background: gradient,
        borderRadius: 16,
        padding: '24px 26px',
        cursor: 'pointer',
        transition: 'transform 0.15s, box-shadow 0.15s',
        border: '1px solid rgba(255,255,255,0.5)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        position: 'relative',
        overflow: 'hidden',
        textAlign: 'left',
        font: 'inherit',
        width: '100%'
      }}
    >
      {destacar && (
        <div
          className="kpi-pulso"
          aria-hidden="true"
          style={{
            position: 'absolute', top: 14, right: 14,
            width: 9, height: 9, borderRadius: '50%',
            background: colorValor,
            animation: 'pulse 2s ease-in-out infinite'
          }}
        ></div>
      )}
      <div aria-hidden="true" style={{ fontSize: 24, marginBottom: 10 }}>{icono}</div>
      <div style={{
        fontSize: 11, fontWeight: 700, color: colorValor,
        textTransform: 'uppercase', letterSpacing: '0.08em',
        marginBottom: 8
      }}>{label}</div>
      <div style={{
        fontSize: 44, fontWeight: 700, color: colorValor,
        lineHeight: 1, marginBottom: 8
      }}>{valor}</div>
      <div style={{ fontSize: 12.5, color: '#4A5868', lineHeight: 1.4 }}>{descripcion}</div>
    </button>
  );
}

export default Bienvenida;