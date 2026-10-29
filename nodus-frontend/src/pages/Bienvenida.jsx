import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { DIAS_AVISO_GARANTIA, garantiaPorVencer } from '../vencimientos';

function Bienvenida({ auth }) {
  const navigate = useNavigate();
  const nombreUsuario = auth?.usuario?.nombre?.split(' ')[0] || 'Bienvenido';

  const [equipos, setEquipos] = useState([]);
  const [ots, setOts] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarTodo();
  }, []);

  const cargarTodo = async () => {
    try {
      const [rEq, rOt] = await Promise.all([
        api.get('/equipos'),
        api.get('/ordenestrabajo')
      ]);
      setEquipos(rEq.data);
      setOts(rOt.data);
    } catch (err) {
      console.error('Error al cargar dashboard:', err);
    } finally {
      setCargando(false);
    }
  };

  const kpis = useMemo(() => {
    const totalActivos = equipos.filter(e => e.idEstado !== 5).length;

    const otsPendientes = ots.filter(o =>
      o.estado === 'Pendiente' || o.estado === 'En curso'
    ).length;

    const garantiasPorVencer = equipos.filter(garantiaPorVencer).length;

    return { totalActivos, otsPendientes, garantiasPorVencer };
  }, [equipos, ots]);

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
      {}
      <div style={{
        textAlign: 'center',
        marginBottom: 50
      }}>
        <img
          src="/logonodus.jpg"
          alt="NODUS"
          style={{
            maxWidth: 620,
            width: '90%',
            height: 'auto',
            marginBottom: 30,
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
        <p style={{
          fontSize: 15,
          color: '#9E9CBB',
          margin: '0 0 20px'
        }}>
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
            👋 Hola, <strong>{nombreUsuario}</strong>
          </div>
        )}
      </div>

      {}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 18,
        width: '100%',
        maxWidth: 900
      }}>
        <KPICard
          icono="🏥"
          label="Activos operativos"
          valor={cargando ? '—' : kpis.totalActivos}
          descripcion="Equipos en inventario"
          gradient="linear-gradient(135deg, #E6F1FB 0%, #C8DCEA 100%)"
          colorValor="#0C447C"
          onClick={() => navigate('/activos')}
        />
        <KPICard
          icono="🔧"
          label="OTs pendientes"
          valor={cargando ? '—' : kpis.otsPendientes}
          descripcion="Requieren atención"
          gradient="linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%)"
          colorValor="#A37715"
          onClick={() => navigate('/ordenestrabajo')}
          destacar={kpis.otsPendientes > 0}
        />
        <KPICard
          icono="🛡"
          label="Garantías por vencer"
          valor={cargando ? '—' : kpis.garantiasPorVencer}
          descripcion={`Próximos ${DIAS_AVISO_GARANTIA} días`}
          gradient="linear-gradient(135deg, #FAEEDA 0%, #F0DBAF 100%)"
          colorValor="#7A5410"
          onClick={() => navigate('/activos')}
        />
      </div>

      {}
      <div style={{
        marginTop: 50, textAlign: 'center',
        fontSize: 11, color: '#9E9CBB', fontStyle: 'italic'
      }}>
        NODUS · {new Date().toLocaleDateString('es-AR', {
          day: '2-digit', month: 'long', year: 'numeric'
        })}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.3); }
        }
      `}</style>
    </div>
  );
}

function KPICard({ icono, label, valor, descripcion, gradient, colorValor, onClick, destacar }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: gradient,
        borderRadius: 16,
        padding: '22px 24px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.15s, box-shadow 0.15s',
        border: '1px solid rgba(255,255,255,0.5)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        position: 'relative',
        overflow: 'hidden'
      }}
      onMouseOver={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.08)';
        }
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
      }}
    >
      {destacar && valor > 0 && (
        <div style={{
          position: 'absolute', top: 14, right: 14,
          width: 9, height: 9, borderRadius: '50%',
          background: colorValor,
          animation: 'pulse 2s ease-in-out infinite'
        }}></div>
      )}
      <div style={{ fontSize: 24, marginBottom: 10 }}>{icono}</div>
      <div style={{
        fontSize: 11, fontWeight: 700, color: colorValor,
        textTransform: 'uppercase', letterSpacing: '0.08em',
        marginBottom: 8
      }}>{label}</div>
      <div style={{
        fontSize: 38, fontWeight: 700, color: colorValor,
        lineHeight: 1, marginBottom: 6
      }}>{valor}</div>
      <div style={{ fontSize: 12, color: '#6B7C8C' }}>{descripcion}</div>
    </div>
  );
}

export default Bienvenida;