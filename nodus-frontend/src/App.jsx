import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate, useLocation, useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  IconStethoscope,
  IconMapPin,
  IconArchive,
  IconClipboardList,
  IconSettings,
  IconFileText,
  IconPackage,
  IconArrowBarDown,
  IconUsers,
  IconLogout,
  IconLayoutDashboard,
  IconTools,
  IconMedicalCross,
  IconShieldLock,
  IconChartBar,
  IconList,
  IconArrowsExchange,
  IconBuildingHospital,
  IconMap2,
  IconMenu2,
  IconX,
  IconAlertTriangle,
  IconTag,
  IconBuilding,
  IconHeartbeat
} from '@tabler/icons-react';
import api, { configurarSesion } from './api';
import { cargarSesion, guardarSesion, borrarSesion, destinoSeguro } from './sesion';
import { puedeVerModulo, puedeHacer, ROL_PERSONAL_ASISTENCIAL } from './permisos';
import {
  EVENTO_PRESTAMOS_ACTUALIZADOS, DIAS_AVISO, estaPorVencer,
  EVENTO_EQUIPOS_ACTUALIZADOS, DIAS_AVISO_GARANTIA, garantiaPorVencer
} from './vencimientos';
import Login from './pages/Login';
import Marcas from './pages/Marcas';
import Activos from './pages/Activos';
import Usuarios from './pages/Usuarios';
import Sectores from './pages/Sectores';
import Servicios from './pages/Servicios';
import Ubicaciones from './pages/Ubicaciones';
import Insumos from './pages/Insumos';
import OrdenesTrabajo from './pages/OrdenesTrabajo';
import Intervenciones from './pages/Intervenciones';
import UsosInsumo from './pages/UsosInsumo';
import Alertas from './pages/Alertas';
import BajasPatrimoniales from './pages/BajasPatrimoniales';
import HojasDeVida from './pages/HojasDeVida';
import Bienvenida from './pages/Bienvenida';
import Reportes from './pages/Reportes';
import Prestamos from './pages/Prestamos';
import HospitalesExternos from './pages/HospitalesExternos';
import MapaPrestamos from './pages/MapaPrestamos';
import Remitos from './pages/Remitos';
import FichaEquipo from './pages/FichaEquipo';
import FichaQR, { CLAVE_ULTIMO_QR } from './pages/FichaQR';
import ReportesFalla from './pages/ReportesFalla';
import InicioQR from './pages/InicioQR';
import './App.css';

function Sidebar({ auth, onLogout, mobileOpen, onNavigate }) {
  const location = useLocation();
  const rol = auth.usuario.rol;
  const iniciales = auth.usuario.nombre?.charAt(0).toUpperCase() || 'U';

  const moduloDeRuta = {
    '/activos': 'patrimonial',
    '/ubicaciones': 'patrimonial',
    '/bajaspatrimoniales': 'patrimonial',
    '/ordenestrabajo': 'mantenimiento',
    '/intervenciones': 'mantenimiento',
    '/hojasdevida': 'mantenimiento',
    '/reportesfalla': 'mantenimiento',
    '/insumos': 'insumos',
    '/usosinsumo': 'insumos',
    '/reportes': 'reportes',
    '/reportes/listados': 'reportes',
    '/prestamos': 'prestamos',
    '/hospitalesexternos': 'prestamos',
    '/mapaprestamos': 'prestamos',
    '/remitos': 'prestamos',
    '/usuarios': 'admin',
    '/marcas': 'admin',
    '/sectores': 'admin',
    '/servicios': 'admin'
  };

  const moduloActivo = moduloDeRuta[location.pathname];

  const [abiertos, setAbiertos] = useState({
    patrimonial: moduloActivo === 'patrimonial',
    mantenimiento: moduloActivo === 'mantenimiento',
    insumos: moduloActivo === 'insumos',
    reportes: moduloActivo === 'reportes',
    prestamos: moduloActivo === 'prestamos',
    admin: moduloActivo === 'admin'
  });

  useEffect(() => {
    if (moduloActivo) {
      setAbiertos(prev => ({ ...prev, [moduloActivo]: true }));
    }
  }, [location.pathname, moduloActivo]);

  const toggle = (mod) => {
    setAbiertos(prev => ({ ...prev, [mod]: !prev[mod] }));
  };

  // Propiedades para que el título de grupo se use con mouse y teclado (Tab + Enter/Espacio)
  const propsGrupo = (mod) => ({
    className: 'sn-group-title sn-group-clickable',
    role: 'button',
    tabIndex: 0,
    'aria-expanded': !!abiertos[mod],
    onClick: () => toggle(mod),
    onKeyDown: (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(mod); }
    }
  });

  const veePrestamos = puedeVerModulo(rol, 'prestamos');
  const [porVencer, setPorVencer] = useState(0);

  useEffect(() => {
    if (!veePrestamos) return;
    api.get('/prestamos')
      .then(r => setPorVencer(r.data.filter(estaPorVencer).length))
      .catch(() => {  });
  }, [veePrestamos, location.pathname]);

  useEffect(() => {
    const alActualizar = (e) => setPorVencer(e.detail.filter(estaPorVencer).length);
    window.addEventListener(EVENTO_PRESTAMOS_ACTUALIZADOS, alActualizar);
    return () => window.removeEventListener(EVENTO_PRESTAMOS_ACTUALIZADOS, alActualizar);
  }, []);

  const badgePorVencer = porVencer > 0 && (
    <b className="sn-badge" title={`${porVencer} préstamo(s) vencen en los próximos ${DIAS_AVISO} días`}>{porVencer}</b>
  );

  const veePatrimonial = puedeVerModulo(rol, 'patrimonial');
  const [garantiasPorVencer, setGarantiasPorVencer] = useState(0);

  useEffect(() => {
    if (!veePatrimonial) return;
    api.get('/equipos')
      .then(r => setGarantiasPorVencer(r.data.filter(garantiaPorVencer).length))
      .catch(() => {  });
  }, [veePatrimonial, location.pathname]);

  useEffect(() => {
    const alActualizar = (e) => setGarantiasPorVencer(e.detail.filter(garantiaPorVencer).length);
    window.addEventListener(EVENTO_EQUIPOS_ACTUALIZADOS, alActualizar);
    return () => window.removeEventListener(EVENTO_EQUIPOS_ACTUALIZADOS, alActualizar);
  }, []);

  const badgeGarantias = garantiasPorVencer > 0 && (
    <b className="sn-badge" title={`${garantiasPorVencer} activo(s) con garantía que vence en los próximos ${DIAS_AVISO_GARANTIA} días`}>{garantiasPorVencer}</b>
  );

  return (
    <aside className={`sidebar-nodus no-print${mobileOpen ? ' sn-open' : ''}`}>

      {}
      <NavLink to="/" className="sn-logo" style={{ textDecoration: 'none' }} onClick={onNavigate}>
        <div className="sn-logo-icon">
          <img src="/logonodus.jpg" alt="NODUS" />
        </div>
        <div className="sn-logo-text">
          <div className="sn-logo-name">NODUS</div>
        </div>
      </NavLink>

      {}
      <nav
        aria-label="Menú principal"
        className="sn-nav"
        onClick={(e) => { if (e.target.closest('.sn-item')) onNavigate?.(); }}
      >

        {}
        {puedeVerModulo(rol, 'patrimonial') && (
          <>
            <div {...propsGrupo('patrimonial')}>
              <IconLayoutDashboard size={14} stroke={2} />
              <span>Gestión patrimonial</span>
              {!abiertos.patrimonial && badgeGarantias}
            </div>
            {abiertos.patrimonial && (
              <div className="sn-group-content">
                <NavLink to="/activos" className="sn-item">
                  <IconStethoscope size={16} stroke={2} />
                  <span>Activos</span>
                  {badgeGarantias}
                </NavLink>
                <NavLink to="/ubicaciones" className="sn-item">
                  <IconMapPin size={16} stroke={2} />
                  <span>Ubicaciones</span>
                </NavLink>
                {puedeHacer(rol, 'editar_activo') && (
                  <NavLink to="/bajaspatrimoniales" className="sn-item">
                    <IconArchive size={16} stroke={2} />
                    <span>Bajas patrimoniales</span>
                  </NavLink>
                )}
              </div>
            )}
          </>
        )}

        {}
        {puedeVerModulo(rol, 'mantenimiento') && (
          <>
            <div {...propsGrupo('mantenimiento')}>
              <IconTools size={14} stroke={2} />
              <span>Gestión de mantenimiento</span>
            </div>
            {abiertos.mantenimiento && (
              <div className="sn-group-content">
                <NavLink to="/ordenestrabajo" className="sn-item">
                  <IconClipboardList size={16} stroke={2} />
                  <span>Órdenes de trabajo</span>
                </NavLink>
                <NavLink to="/intervenciones" className="sn-item">
                  <IconSettings size={16} stroke={2} />
                  <span>Tareas de mantenimiento</span>
                </NavLink>
                <NavLink to="/hojasdevida" className="sn-item">
                  <IconFileText size={16} stroke={2} />
                  <span>Hojas de vida</span>
                </NavLink>
                {puedeHacer(rol, 'gestionar_reportes_falla') && (
                  <NavLink to="/reportesfalla" className="sn-item">
                    <IconAlertTriangle size={16} stroke={2} />
                    <span>Registros de falla</span>
                  </NavLink>
                )}
              </div>
            )}
          </>
        )}

        {}
        {puedeVerModulo(rol, 'insumos') && (
          <>
            <div {...propsGrupo('insumos')}>
              <IconPackage size={14} stroke={2} />
              <span>Gestión de insumos</span>
            </div>
            {abiertos.insumos && (
              <div className="sn-group-content">
                <NavLink to="/insumos" className="sn-item">
                  <IconMedicalCross size={16} stroke={2} />
                  <span>Insumos</span>
                </NavLink>
                <NavLink to="/usosinsumo" className="sn-item">
                  <IconArrowBarDown size={16} stroke={2} />
                  <span>Uso de insumos</span>
                </NavLink>
              </div>
            )}
          </>
        )}

        {}
        {puedeVerModulo(rol, 'prestamos') && (
          <>
            <div {...propsGrupo('prestamos')}>
              <IconArrowsExchange size={14} stroke={2} />
              <span>Gestión de préstamos</span>
              {!abiertos.prestamos && badgePorVencer}
            </div>
            {abiertos.prestamos && (
              <div className="sn-group-content">
                <NavLink to="/prestamos" className="sn-item">
                  <IconArrowsExchange size={16} stroke={2} />
                  <span>Préstamos</span>
                  {badgePorVencer}
                </NavLink>
                <NavLink to="/hospitalesexternos" className="sn-item">
                  <IconBuildingHospital size={16} stroke={2} />
                  <span>Hospitales externos</span>
                </NavLink>
                <NavLink to="/mapaprestamos" className="sn-item">
                  <IconMap2 size={16} stroke={2} />
                  <span>Mapa de préstamos</span>
                </NavLink>
                <NavLink to="/remitos" className="sn-item">
                  <IconFileText size={16} stroke={2} />
                  <span>Remitos</span>
                </NavLink>
              </div>
            )}
          </>
        )}

        {}
        {puedeVerModulo(rol, 'reportes') && (
          <>
            <div {...propsGrupo('reportes')}>
              <IconChartBar size={14} stroke={2} />
              <span>Reportes</span>
            </div>
            {abiertos.reportes && (
              <div className="sn-group-content">
                <NavLink to="/reportes" end className="sn-item">
                  <IconLayoutDashboard size={16} stroke={2} />
                  <span>Dashboard</span>
                </NavLink>
                <NavLink to="/reportes/listados" className="sn-item">
                  <IconList size={16} stroke={2} />
                  <span>Listados</span>
                </NavLink>
              </div>
            )}
          </>
        )}

        {}
        {puedeVerModulo(rol, 'administracion') && (
          <>
            <div {...propsGrupo('admin')}>
              <IconShieldLock size={14} stroke={2} />
              <span>Administración</span>
            </div>
            {abiertos.admin && (
              <div className="sn-group-content">
                <NavLink to="/usuarios" className="sn-item">
                  <IconUsers size={16} stroke={2} />
                  <span>Usuarios</span>
                </NavLink>
                <NavLink to="/marcas" className="sn-item">
                  <IconTag size={16} stroke={2} />
                  <span>Marcas</span>
                </NavLink>
                <NavLink to="/sectores" className="sn-item">
                  <IconBuilding size={16} stroke={2} />
                  <span>Sectores</span>
                </NavLink>
                <NavLink to="/servicios" className="sn-item">
                  <IconHeartbeat size={16} stroke={2} />
                  <span>Servicios</span>
                </NavLink>
              </div>
            )}
          </>
        )}

      </nav>

      {}
      <div className="sn-footer">
        <div className="sn-avatar">{iniciales}</div>
        <div className="sn-user-info">
          <div className="sn-user-name">{auth.usuario.nombre}</div>
          <div className="sn-user-role">{auth.usuario.rol}</div>
        </div>
        <button className="sn-logout-btn" onClick={onLogout} title="Cerrar sesión" aria-label="Cerrar sesión">
          <IconLogout size={18} stroke={2} />
        </button>
      </div>

    </aside>
  );
}

function RutaProtegida({ auth, modulo, accion, children }) {
  const rol = auth?.usuario?.rol;
  const permitido = accion ? puedeHacer(rol, accion) : puedeVerModulo(rol, modulo);
  if (!permitido) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function RedirigirFichaVieja() {
  const { idEquipo } = useParams();
  return <Navigate to={`/equipos/${idEquipo}/qr`} replace />;
}

function RedirigirAQR({ onLogout }) {
  const location = useLocation();
  let ultimo = null;
  try { ultimo = sessionStorage.getItem(CLAVE_ULTIMO_QR); } catch {  }
  if (ultimo && !location.state?.inicio) return <Navigate to={`/equipos/${ultimo}/qr`} replace />;
  return <InicioQR onLogout={onLogout} />;
}

function RedirigirALogin() {
  const { pathname, search, hash } = useLocation();
  const destino = destinoSeguro(pathname + search + hash);
  const to = destino && destino !== '/' ? `/login?redirect=${encodeURIComponent(destino)}` : '/login';
  return <Navigate to={to} replace />;
}

function SalirDelLogin() {
  const [params] = useSearchParams();
  return <Navigate to={destinoSeguro(params.get('redirect')) || '/'} replace />;
}

function App() {
  return (
    <BrowserRouter>
      <AppRutas />
    </BrowserRouter>
  );
}

const sesionVencida = { avisar: null };
const alExpirarSesion = () => sesionVencida.avisar?.();

function AppRutas() {
  const navigate = useNavigate();
  const location = useLocation();

  const [auth, setAuth] = useState(() => {
    const sesion = cargarSesion();
    configurarSesion(sesion?.token ?? null, sesion ? alExpirarSesion : null);
    return sesion;
  });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const cerrar = () => { borrarSesion(); configurarSesion(null); setAuth(null); };

  const handleLogout = () => {
    cerrar();
    try { sessionStorage.removeItem(CLAVE_ULTIMO_QR); } catch {  }
    navigate('/login', { replace: true });
  };

  const handleExpira = () => cerrar();
  useEffect(() => { sesionVencida.avisar = handleExpira; });

  const handleLogin = (data) => {
    guardarSesion(data);
    configurarSesion(data.token, alExpirarSesion);
    setAuth(data);
  };

  if (!auth) {
    return (
      <Routes>
        <Route path="/login" element={<Login onLogin={handleLogin} />} />
        <Route path="*" element={<RedirigirALogin />} />
      </Routes>
    );
  }

  if (location.pathname === '/login') {
    return <SalirDelLogin />;
  }

  if (auth.usuario.rol === ROL_PERSONAL_ASISTENCIAL) {
    return (
      <main style={{ minHeight: '100vh', background: '#F4F7FA' }}>
        <Routes>
          <Route path="/equipos/:idEquipo/qr" element={<FichaQR auth={auth} onLogout={handleLogout} />} />
          {}
          <Route path="/ficha/:idEquipo" element={<RedirigirFichaVieja />} />
          <Route path="*" element={<RedirigirAQR onLogout={handleLogout} />} />
        </Routes>
      </main>
    );
  }

  return (
    <div className="app">
      <button
        className="sn-hamburger no-print"
        onClick={() => setMobileNavOpen(o => !o)}
        aria-label={mobileNavOpen ? 'Cerrar menú' : 'Abrir menú'}
      >
        {mobileNavOpen ? <IconX size={22} /> : <IconMenu2 size={22} />}
      </button>
      {mobileNavOpen && (
        <div className="sn-overlay no-print" onClick={() => setMobileNavOpen(false)} />
      )}
      <Sidebar
        auth={auth}
        onLogout={handleLogout}
        mobileOpen={mobileNavOpen}
        onNavigate={() => setMobileNavOpen(false)}
      />
      <main className="content">
        <Routes>
          <Route path="/" element={<Bienvenida auth={auth} />} />
          <Route path="/marcas" element={<RutaProtegida auth={auth} modulo="administracion"><Marcas /></RutaProtegida>} />
          <Route path="/sectores" element={<RutaProtegida auth={auth} modulo="administracion"><Sectores /></RutaProtegida>} />
          <Route path="/servicios" element={<RutaProtegida auth={auth} modulo="administracion"><Servicios /></RutaProtegida>} />
          <Route path="/activos" element={<RutaProtegida auth={auth} modulo="patrimonial"><Activos /></RutaProtegida>} />
          <Route path="/ficha/:idEquipo" element={<FichaEquipo auth={auth} />} />
          <Route path="/equipos/:idEquipo/qr" element={<FichaQR auth={auth} onLogout={handleLogout} />} />
          <Route path="/reportesfalla" element={<RutaProtegida auth={auth} accion="gestionar_reportes_falla"><ReportesFalla /></RutaProtegida>} />
          <Route path="/equipos" element={<Navigate to="/activos" />} />
          <Route path="/ubicaciones" element={<RutaProtegida auth={auth} modulo="patrimonial"><Ubicaciones /></RutaProtegida>} />
          <Route path="/insumos" element={<RutaProtegida auth={auth} modulo="insumos"><Insumos /></RutaProtegida>} />
          <Route path="/ordenestrabajo" element={<RutaProtegida auth={auth} modulo="mantenimiento"><OrdenesTrabajo auth={auth} /></RutaProtegida>} />
          <Route path="/intervenciones" element={<RutaProtegida auth={auth} modulo="mantenimiento"><Intervenciones auth={auth} /></RutaProtegida>} />
          <Route path="/usosinsumo" element={<RutaProtegida auth={auth} modulo="insumos"><UsosInsumo /></RutaProtegida>} />
          <Route path="/alertas" element={<RutaProtegida auth={auth} modulo="patrimonial"><Alertas auth={auth} /></RutaProtegida>} />
          <Route path="/bajaspatrimoniales" element={<RutaProtegida auth={auth} modulo="patrimonial"><BajasPatrimoniales /></RutaProtegida>} />
          <Route path="/hojasdevida" element={<RutaProtegida auth={auth} modulo="mantenimiento"><HojasDeVida auth={auth} /></RutaProtegida>} />
          <Route path="/usuarios" element={<RutaProtegida auth={auth} modulo="administracion"><Usuarios /></RutaProtegida>} />
          <Route path="/prestamos" element={<RutaProtegida auth={auth} modulo="prestamos"><Prestamos auth={auth} /></RutaProtegida>} />
          <Route path="/hospitalesexternos" element={<RutaProtegida auth={auth} modulo="prestamos"><HospitalesExternos /></RutaProtegida>} />
          <Route path="/mapaprestamos" element={<RutaProtegida auth={auth} modulo="prestamos"><MapaPrestamos /></RutaProtegida>} />
          <Route path="/remitos" element={<RutaProtegida auth={auth} modulo="prestamos"><Remitos /></RutaProtegida>} />
          <Route path="/reportes" element={<RutaProtegida auth={auth} modulo="reportes"><Reportes /></RutaProtegida>} />
          <Route path="/reportes/listados" element={<RutaProtegida auth={auth} modulo="reportes"><Reportes /></RutaProtegida>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;