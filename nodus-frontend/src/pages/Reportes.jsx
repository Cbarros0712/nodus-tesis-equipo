import { useState, useEffect, useMemo, useRef, forwardRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../api';
import { useToast } from '../components/Toast';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { FiCalendar } from 'react-icons/fi';
import {
  PieChart, Pie, Cell,
  LineChart, Line,
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import { estaVencido, diasAtraso, prorrogasConVencido } from '../vencimientos';

const AZUL = '#0C447C';
const AZUL_MEDIO = '#2C7DA0';
const VERDE = '#0F6E56';
const NARANJA = '#A37715';
const ROJO = '#B93B1B';
const VIOLETA = '#5e51d6';
const TEAL = '#0F9E8E';

const promedio = (valores) => valores.length === 0 ? 0 : Math.round((valores.reduce((a, v) => a + v, 0) / valores.length) * 10) / 10;
const fmtDias = (v) => v.toLocaleString('es-AR', { maximumFractionDigits: 1 });

const CustomDateInputMini = forwardRef(({ value, onClick, placeholder }, ref) => (
  <div
    onClick={onClick}
    ref={ref}
    style={{
      width: '100%', height: 38, border: '1px solid #E5EDF3', borderRadius: 8,
      padding: '0 10px', display: 'flex', alignItems: 'center', gap: 8,
      boxSizing: 'border-box', background: '#FAFBFC', cursor: 'pointer'
    }}
  >
    <span style={{ flex: 1, fontSize: 12, color: value ? '#1F2937' : '#9CA3AF' }}>
      {value || placeholder || 'dd/mm/aaaa'}
    </span>
    <FiCalendar color="#6B7C8C" size={14} />
  </div>
));

function Reportes() {
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [equipos, setEquipos] = useState([]);
  const [ots, setOts] = useState([]);
  const [intervenciones, setIntervenciones] = useState([]);
  const [usosInsumo, setUsosInsumo] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [sectores, setSectores] = useState([]);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [insumos, setInsumos] = useState([]);
  const [estadosEquipo, setEstadosEquipo] = useState([]);
  const [prestamos, setPrestamos] = useState([]);
  const [cargando, setCargando] = useState(true);

  const [periodoRapido, setPeriodoRapido] = useState('30');
  const [fechaDesde, setFechaDesde] = useState(null);
  const [fechaHasta, setFechaHasta] = useState(null);

  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [mostrarExportar, setMostrarExportar] = useState(false);
  const [exportando, setExportando] = useState(false);

  const [vista, setVista] = useState(location.pathname.endsWith('/listados') ? 'listados' : 'resumen');
  const [listadoTipo, setListadoTipo] = useState('activos');
  const [busquedaListado, setBusquedaListado] = useState('');

  useEffect(() => {
    setVista(location.pathname.endsWith('/listados') ? 'listados' : 'resumen');
  }, [location.pathname]);

  const irAVista = (v) => {
    navigate(v === 'listados' ? '/reportes/listados' : '/reportes');
  };

  const dashboardRef = useRef();

  useEffect(() => { cargarTodo(); }, []);

  const cargarTodo = async () => {
    try {
      const [rEq, rOt, rIn, rUi, rSe, rEs, rSec, rUb, rIns, rPr] = await Promise.all([
        api.get('/equipos'),
        api.get('/ordenestrabajo'),
        api.get('/intervenciones'),
        api.get('/usosinsumo'),
        api.get('/servicios'),
        api.get('/estadosequipo'),
        api.get('/sectores'),
        api.get('/ubicaciones'),
        api.get('/insumos'),
        api.get('/prestamos')
      ]);
      setEquipos(rEq.data);
      setOts(rOt.data);
      setIntervenciones(rIn.data);
      setUsosInsumo(rUi.data);
      setServicios(rSe.data);
      setEstadosEquipo(rEs.data);
      setSectores(rSec.data);
      setUbicaciones(rUb.data);
      setInsumos(rIns.data);
      setPrestamos(rPr.data);
    } catch (err) {
      console.error(err);
    } finally {
      setCargando(false);
    }
  };

  const hoy = new Date();

  const sectorActualPorEquipo = useMemo(() => {
    const map = {};
    equipos.forEach(eq => {
      const traslados = ubicaciones
        .filter(u => u.idEquipo === eq.idEquipo)
        .sort((a, b) => new Date(b.fechaTraslado) - new Date(a.fechaTraslado));
      if (traslados[0]) map[eq.idEquipo] = traslados[0].idSectorNuevo;
    });
    return map;
  }, [equipos, ubicaciones]);

  const { fechaInicio, fechaFin, duracionDias } = useMemo(() => {
    if (periodoRapido === 'personalizado' && fechaDesde && fechaHasta) {
      const dias = Math.max(1, Math.round((fechaHasta - fechaDesde) / (1000 * 60 * 60 * 24)) + 1);
      return { fechaInicio: fechaDesde, fechaFin: fechaHasta, duracionDias: dias };
    }
    if (periodoRapido === 'todos') {
      return { fechaInicio: null, fechaFin: hoy, duracionDias: null };
    }
    const dias = parseInt(periodoRapido);
    const d = new Date();
    d.setDate(d.getDate() - dias);
    return { fechaInicio: d, fechaFin: hoy, duracionDias: dias };
  }, [periodoRapido, fechaDesde, fechaHasta]);

  const fechaInicioAnterior = useMemo(() => {
    if (!fechaInicio || !duracionDias) return null;
    const d = new Date(fechaInicio);
    d.setDate(d.getDate() - duracionDias);
    return d;
  }, [fechaInicio, duracionDias]);

  const otsFiltradas = useMemo(() => {
    return ots.filter(o => {
      if (fechaInicio && new Date(o.fechaApertura) < fechaInicio) return false;
      if (fechaFin && new Date(o.fechaApertura) > fechaFin) return false;
      return true;
    });
  }, [ots, fechaInicio, fechaFin]);

  const intervencionesFiltradas = useMemo(() => {
    return intervenciones.filter(i => {
      if (fechaInicio && new Date(i.fecha) < fechaInicio) return false;
      if (fechaFin && new Date(i.fecha) > fechaFin) return false;
      return true;
    });
  }, [intervenciones, fechaInicio, fechaFin]);

  const usosFiltrados = useMemo(() => {
    return usosInsumo.filter(u => {
      const ot = ots.find(o => o.idOT === u.idOT);
      if (!ot) return false;
      if (fechaInicio && new Date(ot.fechaApertura) < fechaInicio) return false;
      if (fechaFin && new Date(ot.fechaApertura) > fechaFin) return false;
      return true;
    });
  }, [usosInsumo, ots, fechaInicio, fechaFin]);

  const otsAnteriores = useMemo(() => {
    if (!fechaInicioAnterior || !fechaInicio) return [];
    return ots.filter(o => {
      const f = new Date(o.fechaApertura);
      return f >= fechaInicioAnterior && f < fechaInicio;
    });
  }, [ots, fechaInicio, fechaInicioAnterior]);

  const totalActivos = equipos.length;
  const activosOperativos = equipos.filter(e => e.idEstado !== 5).length;
  const totalOTs = otsFiltradas.length;
  const otPendientes = otsFiltradas.filter(o => o.estado === 'Pendiente' || o.estado === 'En curso').length;

  const tiempoPromResolucion = useMemo(() => {
    const cerradas = otsFiltradas.filter(o => o.estado === 'Cerrada' && o.fechaCierre);
    if (cerradas.length === 0) return 0;
    const totalHoras = cerradas.reduce((acc, o) => {
      const h = (new Date(o.fechaCierre) - new Date(o.fechaApertura)) / (1000 * 60 * 60);
      return acc + Math.max(h, 0);
    }, 0);
    return Math.round((totalHoras / cerradas.length) * 10) / 10;
  }, [otsFiltradas]);

  const pctPreventivo = useMemo(() => {
    if (totalOTs === 0) return 0;
    const prev = otsFiltradas.filter(o => o.tipo === 'Preventiva').length;
    return Math.round((prev / totalOTs) * 100);
  }, [otsFiltradas, totalOTs]);

  const calcDelta = (actual, anterior) => {
    if (!duracionDias) return null;
    if (anterior === 0) return actual > 0 ? 100 : 0;
    return Math.round(((actual - anterior) / anterior) * 100);
  };

  const totalOTsAnterior = otsAnteriores.length;
  const otPendientesAnterior = otsAnteriores.filter(o => o.estado === 'Pendiente' || o.estado === 'En curso').length;
  const cerradasAnteriores = otsAnteriores.filter(o => o.estado === 'Cerrada' && o.fechaCierre);
  const tiempoPromAnterior = cerradasAnteriores.length > 0
    ? Math.round((cerradasAnteriores.reduce((acc, o) => acc + Math.max((new Date(o.fechaCierre) - new Date(o.fechaApertura)) / (1000 * 60 * 60), 0), 0) / cerradasAnteriores.length) * 10) / 10
    : 0;
  const pctPreventivoAnterior = otsAnteriores.length > 0
    ? Math.round((otsAnteriores.filter(o => o.tipo === 'Preventiva').length / otsAnteriores.length) * 100)
    : 0;

  const activosAdquiridosHastaAnterior = fechaInicio
    ? equipos.filter(e => e.fechaAdquisicion && new Date(e.fechaAdquisicion) < fechaInicio).length
    : totalActivos;
  const operativosHastaAnterior = fechaInicio
    ? equipos.filter(e => e.fechaAdquisicion && new Date(e.fechaAdquisicion) < fechaInicio && e.idEstado !== 5).length
    : activosOperativos;

  const deltaTotalActivos = calcDelta(totalActivos, activosAdquiridosHastaAnterior);
  const deltaOperativos = calcDelta(activosOperativos, operativosHastaAnterior);
  const deltaOTs = calcDelta(totalOTs, totalOTsAnterior);
  const deltaPendientes = calcDelta(otPendientes, otPendientesAnterior);
  const deltaTiempo = calcDelta(tiempoPromResolucion, tiempoPromAnterior);
  const deltaPreventivo = calcDelta(pctPreventivo, pctPreventivoAnterior);

  const meses = useMemo(() => {
    const arr = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
      const finMes = new Date(hoy.getFullYear(), hoy.getMonth() - i + 1, 0);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      arr.push({ key, inicio: d, fin: finMes });
    }
    return arr;
  }, []);

  const sparkTotalActivos = useMemo(() =>
    meses.map(m => equipos.filter(e => e.fechaAdquisicion && new Date(e.fechaAdquisicion) <= m.fin).length),
    [meses, equipos]
  );
  const sparkOperativos = useMemo(() =>
    meses.map(m => equipos.filter(e => e.fechaAdquisicion && new Date(e.fechaAdquisicion) <= m.fin && e.idEstado !== 5).length),
    [meses, equipos]
  );
  const sparkOTs = useMemo(() =>
    meses.map(m => ots.filter(o => new Date(o.fechaApertura) >= m.inicio && new Date(o.fechaApertura) <= m.fin).length),
    [meses, ots]
  );
  const sparkPendientes = useMemo(() =>
    meses.map(m => ots.filter(o => (o.estado === 'Pendiente' || o.estado === 'En curso') && new Date(o.fechaApertura) >= m.inicio && new Date(o.fechaApertura) <= m.fin).length),
    [meses, ots]
  );
  const sparkPrestamosActivos = useMemo(() =>
    meses.map(m => prestamos.filter(p => new Date(p.fechaPrestamo) >= m.inicio && new Date(p.fechaPrestamo) <= m.fin).length),
    [meses, prestamos]
  );

  const prestamosActivos = useMemo(() => prestamos.filter(p => p.estado === 'En préstamo'), [prestamos]);
  const prestamosVencidos = useMemo(() => prestamosActivos.filter(estaVencido), [prestamosActivos]);

  const prestamosConAtraso = useMemo(() =>
    prestamos.map(p => ({ ...p, diasAtraso: diasAtraso(p) })).filter(p => p.diasAtraso > 0),
    [prestamos]
  );
  const promedioDiasAtraso = promedio(prestamosConAtraso.map(p => p.diasAtraso));

  const sparkAtraso = useMemo(() =>
    meses.map((m, i) => promedio(prestamosConAtraso
      .filter(p => p.fechaDevolucionReal ? p.fechaDevolucionReal.slice(0, 7) === m.key : i === meses.length - 1)
      .map(p => p.diasAtraso))),
    [meses, prestamosConAtraso]
  );
  const sparkTiempo = useMemo(() =>
    meses.map(m => {
      const cerradas = ots.filter(o => o.estado === 'Cerrada' && o.fechaCierre && new Date(o.fechaCierre) >= m.inicio && new Date(o.fechaCierre) <= m.fin);
      if (cerradas.length === 0) return 0;
      return Math.round(cerradas.reduce((acc, o) => acc + Math.max((new Date(o.fechaCierre) - new Date(o.fechaApertura)) / (1000 * 60 * 60), 0), 0) / cerradas.length);
    }),
    [meses, ots]
  );
  const sparkPreventivo = useMemo(() =>
    meses.map(m => {
      const delMes = ots.filter(o => new Date(o.fechaApertura) >= m.inicio && new Date(o.fechaApertura) <= m.fin);
      if (delMes.length === 0) return 0;
      return Math.round((delMes.filter(o => o.tipo === 'Preventiva').length / delMes.length) * 100);
    }),
    [meses, ots]
  );

  const dataIntervencionesPeriodo = useMemo(() => {
    const dias = duracionDias || 30;
    const arr = [];
    for (let i = dias - 1; i >= 0; i -= Math.max(1, Math.floor(dias / 10))) {
      const d = new Date(fechaFin);
      d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
      const cant = intervencionesFiltradas.filter(iv => new Date(iv.fecha).toDateString() === d.toDateString()).length;
      arr.push({ fecha: label, Intervenciones: cant });
    }
    return arr;
  }, [intervencionesFiltradas, duracionDias, fechaFin]);

  const dataEstadoActivos = useMemo(() => {
    const grupos = { Operativos: 0, 'En mantenimiento': 0, 'Fuera de servicio': 0 };
    equipos.forEach(e => {
      const color = e.estadoEquipo?.colorSemaforo;
      if (color === 'verde') grupos['Operativos']++;
      else if (color === 'amarillo') grupos['En mantenimiento']++;
      else grupos['Fuera de servicio']++;
    });
    return Object.entries(grupos).map(([name, value]) => ({ name, value }));
  }, [equipos]);

  const dataTipoMantenimiento = useMemo(() => {
    const preventivo = otsFiltradas.filter(o => o.tipo === 'Preventiva').length;
    const correctivo = otsFiltradas.length - preventivo;
    return [
      { name: 'Preventivo', value: preventivo },
      { name: 'Correctivo', value: correctivo }
    ];
  }, [otsFiltradas]);

  const dataUsoInsumosPeriodo = useMemo(() => {
    const dias = duracionDias || 30;
    const arr = [];
    for (let i = dias - 1; i >= 0; i -= Math.max(1, Math.floor(dias / 10))) {
      const d = new Date(fechaFin);
      d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
      const cant = usosFiltrados.filter(u => {
        const ot = ots.find(o => o.idOT === u.idOT);
        return ot && new Date(ot.fechaApertura).toDateString() === d.toDateString();
      }).reduce((acc, u) => acc + (u.cantidad || 0), 0);
      arr.push({ fecha: label, Insumos: cant });
    }
    return arr;
  }, [usosFiltrados, ots, duracionDias, fechaFin]);

  const insumosMasUtilizados = useMemo(() => {
    const map = {};
    usosFiltrados.forEach(u => {
      const nombre = u.insumo?.nombre || 'Insumo';
      map[nombre] = (map[nombre] || 0) + (u.cantidad || 0);
    });
    return Object.entries(map)
      .map(([nombre, cantidad]) => ({ nombre, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5);
  }, [usosFiltrados]);

  const activosMasIntervenciones = useMemo(() => {
    const map = {};
    intervencionesFiltradas.forEach(iv => {
      const ot = ots.find(o => o.idOT === iv.idOT);
      const nombre = ot?.equipo?.modelo || `OT ${iv.idOT}`;
      map[nombre] = (map[nombre] || 0) + 1;
    });
    return Object.entries(map)
      .map(([nombre, cantidad]) => ({ nombre, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5);
  }, [intervencionesFiltradas, ots]);

  const insumosStockBajo = useMemo(() => {
    return insumos
      .filter(i => i.stockActual < i.stockMinimo)
      .map(i => ({ nombre: i.nombre, actual: i.stockActual, minimo: i.stockMinimo }))
      .sort((a, b) => (a.actual / (a.minimo || 1)) - (b.actual / (b.minimo || 1)));
  }, [insumos]);

  const activosListado = useMemo(() => {
    const q = busquedaListado.trim().toLowerCase();
    return equipos
      .map(e => ({
        id: e.idEquipo,
        marca: e.marca?.nombre || '—',
        modelo: e.modelo || '—',
        nroSerie: e.nroSerie || '—',
        estado: e.estadoEquipo?.nombre || '—',
        sector: sectores.find(s => s.idSector === sectorActualPorEquipo[e.idEquipo])?.nombre || '—',
        fechaAlta: e.fechaAdquisicion?.split('T')[0] || '—'
      }))
      .filter(r => !q || [r.marca, r.modelo, r.nroSerie, r.estado, r.sector].join(' ').toLowerCase().includes(q));
  }, [equipos, sectores, sectorActualPorEquipo, busquedaListado]);

  const otsListado = useMemo(() => {
    const q = busquedaListado.trim().toLowerCase();
    return otsFiltradas
      .map(o => ({
        id: o.idOT,
        tipo: o.tipo || '—',
        estado: o.estado || '—',
        equipo: o.equipo?.modelo || '—',
        apertura: o.fechaApertura?.split('T')[0] || '—',
        cierre: o.fechaCierre?.split('T')[0] || '—'
      }))
      .filter(r => !q || [r.tipo, r.estado, r.equipo].join(' ').toLowerCase().includes(q));
  }, [otsFiltradas, busquedaListado]);

  const insumosListado = useMemo(() => {
    const q = busquedaListado.trim().toLowerCase();
    return insumos
      .map(i => ({
        nombre: i.nombre || '—',
        actual: i.stockActual,
        minimo: i.stockMinimo,
        estadoStock: i.stockActual < i.stockMinimo ? 'Bajo' : 'Normal'
      }))
      .filter(r => !q || r.nombre.toLowerCase().includes(q))
      .sort((a, b) => (a.estadoStock === 'Bajo' ? -1 : 1) - (b.estadoStock === 'Bajo' ? -1 : 1));
  }, [insumos, busquedaListado]);

  const prestamosListado = useMemo(() => {
    const q = busquedaListado.trim().toLowerCase();
    return prestamos
      .map(p => ({
        equipo: p.equipo?.modelo || '—',
        nroSerie: p.equipo?.nroSerie || '—',
        hospital: p.hospital?.nombre || '—',
        motivo: p.motivo || '—',
        apertura: p.fechaPrestamo?.split('T')[0] || '—',
        estimada: p.fechaEstimadaDevolucion?.split('T')[0] || '—',
        cierre: p.fechaDevolucionReal?.split('T')[0] || '—',
        estado: p.estado || '—'
      }))
      .filter(r => !q || [r.equipo, r.nroSerie, r.hospital, r.motivo].join(' ').toLowerCase().includes(q));
  }, [prestamos, busquedaListado]);

  const cumplimientoHospitalListado = useMemo(() => {
    const q = busquedaListado.trim().toLowerCase();
    const map = {};
    prestamos.forEach(p => {
      const g = map[p.idHospital] ??= { hospital: p.hospital?.nombre || '—', total: 0, atrasos: [] };
      g.total++;
      const dias = diasAtraso(p);
      if (dias > 0) g.atrasos.push(dias);
    });
    return Object.values(map)
      .map(g => ({
        hospital: g.hospital,
        total: g.total,
        vencidos: g.atrasos.length,
        pctVencidos: `${Math.round((g.atrasos.length / g.total) * 100)}%`,
        promedio: g.atrasos.length > 0 ? fmtDias(promedio(g.atrasos)) : '—'
      }))
      .filter(r => !q || r.hospital.toLowerCase().includes(q))
      .sort((a, b) => b.vencidos - a.vencidos || a.hospital.localeCompare(b.hospital));
  }, [prestamos, busquedaListado]);

  const prestamosAtrasoListado = useMemo(() => {
    const q = busquedaListado.trim().toLowerCase();
    return prestamosConAtraso
      .map(p => ({
        equipo: p.equipo?.modelo || '—',
        nroSerie: p.equipo?.nroSerie || '—',
        hospital: p.hospital?.nombre || '—',
        apertura: p.fechaPrestamo?.split('T')[0] || '—',

        original: (p.fechaEstimadaDevolucionOriginal || p.prorrogas?.[0]?.fechaAnterior || p.fechaEstimadaDevolucion)?.split('T')[0] || '—',
        vigente: p.fechaEstimadaDevolucion?.split('T')[0] || '—',
        cierre: p.fechaDevolucionReal?.split('T')[0] || '—',
        dias: p.diasAtraso,
        prorrogas: p.prorrogas?.length > 0
          ? `Sí (${p.prorrogas.length})${prorrogasConVencido(p) > 0 ? ` · ${prorrogasConVencido(p)} con vencido` : ''}`
          : 'No',
        estado: p.fechaDevolucionReal ? 'Devuelto' : estaVencido(p) ? 'En préstamo (vencido)' : 'En préstamo'
      }))
      .filter(r => !q || [r.equipo, r.nroSerie, r.hospital].join(' ').toLowerCase().includes(q))
      .sort((a, b) => b.dias - a.dias);
  }, [prestamosConAtraso, busquedaListado]);

  const rangoLabel = useMemo(() => {
    const finLbl = fechaFin.toLocaleDateString('es-AR');
    if (!fechaInicio) return `Todos los registros — ${finLbl}`;
    return `${fechaInicio.toLocaleDateString('es-AR')} - ${finLbl}`;
  }, [fechaInicio, fechaFin]);

  const seleccionarPeriodoRapido = (val) => {
    setPeriodoRapido(val);
    setFechaDesde(null);
    setFechaHasta(null);
  };

  const limpiarFiltros = () => {
    setPeriodoRapido('30');
    setFechaDesde(null);
    setFechaHasta(null);
  };

  const fmtMoneda = (v) => v.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

  const exportarExcel = () => {
    const wb = XLSX.utils.book_new();
    const resumen = [
      ['NODUS · Dashboard de Gestión Patrimonial'],
      ['Fecha de emisión', new Date().toLocaleDateString('es-AR')],
      ['Período', rangoLabel],
      [],
      ['INDICADORES CLAVE'],
      ['Total de activos', totalActivos],
      ['Activos operativos', activosOperativos],
      ['Órdenes de trabajo', totalOTs],
      ['OT pendientes', otPendientes],
      ['Tiempo promedio resolución (h)', tiempoPromResolucion],
      ['% Mantenimiento preventivo', pctPreventivo],
      ['Insumos con stock bajo', insumosStockBajo.length]
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resumen), 'Resumen');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(equipos.map(e => ({
      ID: e.idEquipo, Marca: e.marca?.nombre || '', Modelo: e.modelo, 'N° Serie': e.nroSerie,
      Estado: e.estadoEquipo?.nombre || '', 'Fecha adquisición': e.fechaAdquisicion?.split('T')[0] || ''
    }))), 'Activos');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(otsFiltradas.map(o => ({
      ID: o.idOT, Tipo: o.tipo, Estado: o.estado, Equipo: o.equipo?.modelo || '',
      'Fecha apertura': o.fechaApertura?.split('T')[0] || '', 'Fecha cierre': o.fechaCierre?.split('T')[0] || ''
    }))), 'OTs');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(usosFiltrados.map(u => ({
      Insumo: u.insumo?.nombre || '', Cantidad: u.cantidad, OT: `OT ${u.idOT}`
    }))), 'Insumos');
    XLSX.writeFile(wb, `NODUS_Dashboard_${new Date().toISOString().split('T')[0]}.xlsx`);
    setMostrarExportar(false);
  };

  const exportarPDF = async () => {
    setExportando(true);
    setMostrarExportar(false);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const ancho = pdf.internal.pageSize.getWidth();

      pdf.setFillColor(12, 68, 124);
      pdf.rect(0, 0, ancho, 25, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text('NODUS', 15, 15);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Dashboard de Gestión Patrimonial Hospitalaria', 15, 21);
      pdf.setFontSize(9);
      pdf.text(`Fecha: ${new Date().toLocaleDateString('es-AR')}`, ancho - 45, 15);

      pdf.setTextColor(30, 30, 30);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Período: ${rangoLabel}`, 15, 34);

      let y = 44;
      const kpisPdf = [
        { label: 'Total activos', valor: totalActivos, color: [12, 68, 124] },
        { label: 'Operativos', valor: activosOperativos, color: [15, 110, 86] },
        { label: 'OTs', valor: totalOTs, color: [163, 119, 21] },
        { label: 'OT pendientes', valor: otPendientes, color: [185, 59, 27] }
      ];
      const anchoBox = (ancho - 40) / 4;
      kpisPdf.forEach((b, i) => {
        const x = 15 + i * (anchoBox + 2);
        pdf.setFillColor(...b.color);
        pdf.roundedRect(x, y, anchoBox, 18, 2, 2, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${b.valor}`, x + 3, y + 9);
        pdf.setFontSize(6);
        pdf.setFont('helvetica', 'normal');
        pdf.text(b.label, x + 3, y + 14);
      });
      y += 26;

      try {
        const canvas = await html2canvas(dashboardRef.current, { scale: 1.5, logging: false, useCORS: true, background: '#FFFFFF' });
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = ancho - 30;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        pdf.addPage();
        pdf.text('Análisis gráfico', 15, 15);
        pdf.addImage(imgData, 'PNG', 15, 20, imgWidth, imgHeight);
      } catch (err) {
        console.error('Error capturando gráficos:', err);
      }

      const totalPages = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text(`NODUS · Página ${i} de ${totalPages}`, ancho / 2, 290, { align: 'center' });
      }
      pdf.save(`NODUS_Dashboard_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error(err);
      toast.error('No se pudo exportar', 'Error al exportar el PDF.');
    } finally {
      setExportando(false);
    }
  };

  const CONFIG_LISTADOS = {
    activos: {
      titulo: 'Listado de Activos',
      columnas: ['ID', 'Marca', 'Modelo', 'N° Serie', 'Estado', 'Sector', 'Fecha alta'],
      filas: activosListado.map(r => [r.id, r.marca, r.modelo, r.nroSerie, r.estado, r.sector, r.fechaAlta])
    },
    ots: {
      titulo: 'Listado de Órdenes de Trabajo',
      columnas: ['OT', 'Tipo', 'Estado', 'Equipo', 'Apertura', 'Cierre'],
      filas: otsListado.map(r => [r.id, r.tipo, r.estado, r.equipo, r.apertura, r.cierre])
    },
    insumos: {
      titulo: 'Listado de Insumos',
      columnas: ['Insumo', 'Stock actual', 'Stock mínimo', 'Estado'],
      filas: insumosListado.map(r => [r.nombre, r.actual, r.minimo, r.estadoStock]),
      resaltar: (j, val) => j === 3 && val === 'Bajo'
    },
    prestamos: {
      titulo: 'Listado de Préstamos',
      columnas: ['Equipo', 'N° Serie', 'Hospital', 'Motivo', 'Fecha préstamo', 'Devol. estimada', 'Devol. real', 'Estado'],
      filas: prestamosListado.map(r => [r.equipo, r.nroSerie, r.hospital, r.motivo, r.apertura, r.estimada, r.cierre, r.estado])
    },
    cumplimiento: {
      titulo: 'Cumplimiento de Préstamos por Hospital',
      columnas: ['Hospital', 'Préstamos totales', 'Vencidos', '% vencidos', 'Promedio días de atraso'],
      filas: cumplimientoHospitalListado.map(r => [r.hospital, r.total, r.vencidos, r.pctVencidos, r.promedio]),
      resaltar: (j, val) => j === 2 && val > 0
    },
    atrasos: {
      titulo: 'Préstamos con Atraso',
      columnas: ['Equipo', 'N° Serie', 'Hospital', 'Fecha préstamo', 'Devol. original', 'Devol. vigente', 'Devol. real', 'Días de atraso', 'Prórrogas', 'Estado'],
      filas: prestamosAtrasoListado.map(r => [r.equipo, r.nroSerie, r.hospital, r.apertura, r.original, r.vigente, r.cierre, r.dias, r.prorrogas, r.estado]),
      resaltar: (j) => j === 7
    }
  };

  const exportarListadoExcel = (tipo) => {
    const cfg = CONFIG_LISTADOS[tipo];
    const wb = XLSX.utils.book_new();
    const hoja = [cfg.columnas, ...cfg.filas];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(hoja), cfg.titulo.slice(0, 31));
    XLSX.writeFile(wb, `NODUS_${cfg.titulo.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportarListadoPDF = (tipo) => {
    const cfg = CONFIG_LISTADOS[tipo];
    const pdf = new jsPDF('p', 'mm', 'a4');
    const ancho = pdf.internal.pageSize.getWidth();

    pdf.setFillColor(12, 68, 124);
    pdf.rect(0, 0, ancho, 25, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('NODUS', 15, 15);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(cfg.titulo, 15, 21);
    pdf.setFontSize(9);
    pdf.text(`Fecha: ${new Date().toLocaleDateString('es-AR')}`, ancho - 45, 15);

    autoTable(pdf, {
      startY: 32,
      head: [cfg.columnas],
      body: cfg.filas,
      headStyles: { fillColor: [12, 68, 124], fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [244, 247, 250] }
    });

    const totalPages = pdf.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      pdf.text(`NODUS · Página ${i} de ${totalPages}`, ancho / 2, 290, { align: 'center' });
    }
    pdf.save(`NODUS_${cfg.titulo.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const COLORES_ESTADO = ['#0F6E56', '#A37715', '#B93B1B'];
  const COLORES_TIPO = [AZUL_MEDIO, NARANJA];

  if (cargando) {
    return <div style={{ textAlign: 'center', padding: 60, color: '#9E9CBB' }}>Cargando dashboard...</div>;
  }

  return (
    <div className="rwd-page-header" style={{ padding: '20px 24px', background: '#FAFBFC', minHeight: '100vh' }}>

      {}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>Dashboard</h2>
          <p style={{ fontSize: 13, color: '#6B7C8C', margin: '4px 0 10px' }}>Bienvenido al panel de control de NODUS</p>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => irAVista('resumen')} style={{
              padding: '7px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              border: vista === 'resumen' ? `1.5px solid ${AZUL_MEDIO}` : '1.5px solid #E5EDF3',
              background: vista === 'resumen' ? '#E6F1FB' : 'white',
              color: vista === 'resumen' ? AZUL_MEDIO : '#6B7C8C'
            }}>Resumen</button>
            <button onClick={() => irAVista('listados')} style={{
              padding: '7px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              border: vista === 'listados' ? `1.5px solid ${AZUL_MEDIO}` : '1.5px solid #E5EDF3',
              background: vista === 'listados' ? '#E6F1FB' : 'white',
              color: vista === 'listados' ? AZUL_MEDIO : '#6B7C8C'
            }}>Listados</button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, position: 'relative' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'white', border: '1px solid #E5EDF3', borderRadius: 8,
            padding: '8px 14px', fontSize: 12, color: '#4A5868'
          }}>📅 {rangoLabel}</div>

          <div style={{ position: 'relative' }}>
            <button onClick={() => { setMostrarFiltros(!mostrarFiltros); setMostrarExportar(false); }} style={btnHeader}>
              🔽 Filtros avanzados
            </button>
            {mostrarFiltros && (
              <div style={{ ...panelDropdown, minWidth: 320 }}>

                {}
                <label style={lblFiltro}>Período</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                  {[
                    { val: '7', label: '7 días' },
                    { val: '30', label: '30 días' },
                    { val: '60', label: '60 días' },
                    { val: '90', label: '90 días' },
                    { val: 'todos', label: 'Todos' }
                  ].map(op => (
                    <button
                      key={op.val}
                      onClick={() => seleccionarPeriodoRapido(op.val)}
                      style={{
                        padding: '6px 12px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                        border: periodoRapido === op.val ? `1.5px solid ${AZUL_MEDIO}` : '1.5px solid #E5EDF3',
                        background: periodoRapido === op.val ? '#E6F1FB' : 'white',
                        color: periodoRapido === op.val ? AZUL_MEDIO : '#6B7C8C',
                        cursor: 'pointer'
                      }}
                    >{op.label}</button>
                  ))}
                </div>

                {}
                <div className="rwd-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                  <div>
                    <label style={lblFiltro}>Desde</label>
                    <DatePicker
                      selected={fechaDesde}
                      onChange={(date) => { setFechaDesde(date); setPeriodoRapido('personalizado'); }}
                      dateFormat="dd/MM/yyyy"
                      maxDate={fechaHasta || hoy}
                      customInput={<CustomDateInputMini />}
                    />
                  </div>
                  <div>
                    <label style={lblFiltro}>Hasta</label>
                    <DatePicker
                      selected={fechaHasta}
                      onChange={(date) => { setFechaHasta(date); setPeriodoRapido('personalizado'); }}
                      dateFormat="dd/MM/yyyy"
                      minDate={fechaDesde}
                      maxDate={hoy}
                      customInput={<CustomDateInputMini />}
                    />
                  </div>
                </div>

                <button onClick={limpiarFiltros} style={{
                  width: '100%', background: '#F4F7FA', color: '#6B7C8C', border: 'none',
                  borderRadius: 8, padding: '9px 0', fontSize: 12, fontWeight: 600, cursor: 'pointer'
                }}>Limpiar filtros</button>
              </div>
            )}
          </div>

          <div style={{ position: 'relative' }}>
            <button onClick={() => { setMostrarExportar(!mostrarExportar); setMostrarFiltros(false); }} disabled={exportando} style={{ ...btnHeader, background: AZUL, color: 'white' }}>
              {exportando ? '⏳ Generando...' : '⬇ Exportar'}
            </button>
            {mostrarExportar && (
              <div style={{ ...panelDropdown, minWidth: 160 }}>
                <button onClick={exportarExcel} style={btnDropdownItem}>📊 Excel (.xlsx)</button>
                <button onClick={exportarPDF} style={btnDropdownItem}>📄 PDF</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {vista === 'resumen' && (
        <>
          {}
          {periodoRapido === 'personalizado' && fechaDesde && fechaHasta && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              <ChipFiltro texto={`Rango: ${fechaDesde.toLocaleDateString('es-AR')} - ${fechaHasta.toLocaleDateString('es-AR')}`} onQuitar={() => seleccionarPeriodoRapido('30')} />
            </div>
          )}

          <div ref={dashboardRef}>

            {}
            <SeccionTitulo titulo="Gestión Patrimonial" />
            <div className="rwd-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.4fr', gap: 14, marginBottom: 28 }}>
              <KPICardSpark icono="📦" iconoBg="#E6F1FB" label="Total de activos" valor={totalActivos}
                sub={`${totalActivos > 0 ? 100 : 0}% del total`} subColor="#6B7C8C" color={AZUL_MEDIO} sparkData={sparkTotalActivos} />
              <KPICardSpark icono="✅" iconoBg="#E1F5EE" label="Activos operativos" valor={activosOperativos}
                sub={`${totalActivos > 0 ? Math.round((activosOperativos / totalActivos) * 100) : 0}% del total`} subColor={VERDE} color={VERDE} sparkData={sparkOperativos} />
              <DonutConLeyenda titulo="Estado de los activos" data={dataEstadoActivos} colores={COLORES_ESTADO} total={totalActivos} />
            </div>

            {}
            <SeccionTitulo titulo="Gestión de Mantenimiento" />
            <div className="rwd-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <KPICardSpark icono="🔧" iconoBg="#FAEEDA" label="Órdenes de trabajo" valor={totalOTs}
                sub={deltaOTs === null ? '—' : `${deltaOTs >= 0 ? '+' : ''}${deltaOTs}% vs período anterior`} subColor={deltaOTs >= 0 ? VERDE : ROJO} color={NARANJA} sparkData={sparkOTs} />
              <KPICardSpark icono="⏳" iconoBg="#FDECEE" label="OT pendientes" valor={otPendientes}
                sub={deltaPendientes === null ? '—' : `${deltaPendientes >= 0 ? '+' : ''}${deltaPendientes}% vs período anterior`} subColor={deltaPendientes <= 0 ? VERDE : ROJO} color={ROJO} sparkData={sparkPendientes} />
            </div>
            <div className="rwd-grid" style={{ display: 'grid', gridTemplateColumns: '0.8fr 1.2fr', gap: 14, marginBottom: 28 }}>
              <DonutConLeyenda titulo="Tipo de mantenimiento" data={dataTipoMantenimiento} colores={COLORES_TIPO} total={totalOTs} />
              <TablaRanking titulo="Activos con más intervenciones" filas={activosMasIntervenciones} colNombre="Activo" colValor="Intervenciones" onVerTodos={() => navigate('/ordenestrabajo')} />
            </div>

            {}
            <SeccionTitulo titulo="Gestión de Préstamos" />
            <div className="rwd-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 28 }}>
              <KPICardSpark icono="🤝" iconoBg="#E6F1FB" label="Préstamos activos" valor={prestamosActivos.length}
                sub="En curso actualmente" subColor="#6B7C8C" color={AZUL_MEDIO} sparkData={sparkPrestamosActivos} />
              <KPICardSpark icono="⏰" iconoBg="#FAECE7" label="Préstamos vencidos" valor={prestamosVencidos.length}
                sub={prestamosVencidos.length > 0 ? 'Requieren seguimiento' : 'Sin vencimientos'}
                subColor={prestamosVencidos.length > 0 ? ROJO : VERDE} color={ROJO} sparkData={sparkPrestamosActivos} />
              <KPICardSpark icono="📉" iconoBg="#FAEEDA" label="Promedio días de atraso"
                valor={prestamosConAtraso.length > 0 ? `${fmtDias(promedioDiasAtraso)} ${promedioDiasAtraso === 1 ? 'día' : 'días'}` : '0 días'}
                sub={prestamosConAtraso.length > 0 ? `Sobre ${prestamosConAtraso.length} ${prestamosConAtraso.length === 1 ? 'préstamo' : 'préstamos'} con atraso` : 'Todas las devoluciones a término'}
                subColor={prestamosConAtraso.length > 0 ? NARANJA : VERDE} color={NARANJA} sparkData={sparkAtraso} />
            </div>

            {}
            <SeccionTitulo titulo="Gestión de Insumos" />
            <div className="rwd-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
              <TablaRanking titulo="Insumos más utilizados" filas={insumosMasUtilizados} colNombre="Insumo" colValor="Cantidad" onVerTodos={() => navigate('/insumos')} />

              <div style={cardStyle}>
                <TituloCard titulo="Insumos con stock bajo" />
                <div style={{ fontSize: 26, fontWeight: 700, color: insumosStockBajo.length > 0 ? ROJO : VERDE, marginTop: 4 }}>
                  {insumosStockBajo.length}
                </div>
                <div style={{ fontSize: 11, color: '#9E9CBB', marginBottom: 12 }}>de {insumos.length} insumos totales</div>
                {insumosStockBajo.length === 0 ? (
                  <div style={{ fontSize: 11, color: VERDE, background: '#E1F5EE', borderRadius: 8, padding: '8px 10px' }}>
                    ✅ Todo el inventario dentro de niveles normales.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {insumosStockBajo.slice(0, 4).map((i, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#2D3748' }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: NARANJA }}></span>
                          {i.nombre}
                        </span>
                        <span style={{ color: NARANJA, fontWeight: 600 }}>{i.actual}/{i.minimo}</span>
                      </div>
                    ))}
                  </div>
                )}
                <button onClick={() => navigate('/insumos')} style={{
                  marginTop: 12, background: '#F0F6FA', color: AZUL_MEDIO, border: 'none',
                  borderRadius: 8, padding: '8px 0', fontSize: 11, fontWeight: 600, cursor: 'pointer', width: '100%'
                }}>Ver todos</button>
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'center', fontSize: 11, color: '#9E9CBB', marginTop: 20, fontStyle: 'italic' }}>
            Los datos mostrados corresponden al período seleccionado y se actualizan en tiempo real.
          </div>
        </>
      )}

      {vista === 'listados' && (
        <div>
          {}
          <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
            {[
              { val: 'activos', label: '📦 Activos' },
              { val: 'ots', label: '🔧 Órdenes de trabajo' },
              { val: 'insumos', label: '🧪 Insumos' },
              { val: 'prestamos', label: '🤝 Préstamos' },
              { val: 'cumplimiento', label: '⏰ Cumplimiento por hospital' },
              { val: 'atrasos', label: '⚠ Préstamos con atraso' }
            ].map(op => (
              <button
                key={op.val}
                onClick={() => { setListadoTipo(op.val); setBusquedaListado(''); }}
                style={{
                  padding: '8px 16px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  border: listadoTipo === op.val ? `1.5px solid ${AZUL_MEDIO}` : '1.5px solid #E5EDF3',
                  background: listadoTipo === op.val ? '#E6F1FB' : 'white',
                  color: listadoTipo === op.val ? AZUL_MEDIO : '#6B7C8C'
                }}
              >{op.label}</button>
            ))}
          </div>

          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a' }}>{CONFIG_LISTADOS[listadoTipo].titulo}</div>
                <div style={{ fontSize: 11, color: '#9E9CBB', marginTop: 2 }}>{CONFIG_LISTADOS[listadoTipo].filas.length} registros</div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={busquedaListado}
                  onChange={(e) => setBusquedaListado(e.target.value)}
                  style={{
                    padding: '8px 12px', border: '1.5px solid #E5EDF3', borderRadius: 8,
                    fontSize: 12, outline: 'none', minWidth: 180
                  }}
                />
                <button onClick={() => exportarListadoExcel(listadoTipo)} style={btnHeader}>📊 Excel</button>
                <button onClick={() => exportarListadoPDF(listadoTipo)} style={{ ...btnHeader, background: AZUL, color: 'white' }}>📄 PDF</button>
              </div>
            </div>

            <div className="rwd-table-wrap" style={{ overflowX: 'auto' }}>
              <table className="rwd-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: Math.max(600, CONFIG_LISTADOS[listadoTipo].columnas.length * 130) }}>
                <thead>
                  <tr>
                    {CONFIG_LISTADOS[listadoTipo].columnas.map((col, i) => (
                      <th key={i} style={{
                        textAlign: 'left', padding: '8px 10px', color: '#6B7C8C', fontWeight: 600,
                        borderBottom: '1.5px solid #EEF1F4', whiteSpace: 'nowrap'
                      }}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {CONFIG_LISTADOS[listadoTipo].filas.length === 0 ? (
                    <tr><td colSpan={CONFIG_LISTADOS[listadoTipo].columnas.length} style={{ textAlign: 'center', padding: 24, color: '#C4C9D1' }}>Sin resultados</td></tr>
                  ) : CONFIG_LISTADOS[listadoTipo].filas.map((fila, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #F8FAFC' }}>
                      {fila.map((val, j) => {
                        const resaltado = CONFIG_LISTADOS[listadoTipo].resaltar?.(j, val);
                        return (
                          <td key={j} style={{
                            padding: '8px 10px', color: resaltado ? ROJO : '#2D3748',
                            fontWeight: resaltado ? 600 : 400,
                            whiteSpace: 'nowrap'
                          }}>{val}</td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Sparkline({ data, color }) {
  if (!data || data.length === 0) return <div style={{ height: 40 }} />;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const w = 100, h = 32;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1 || 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(' ');
  const areaPoints = `0,${h} ${points} ${w},${h}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height: 34, display: 'block' }}>
      <polygon points={areaPoints} fill={color} opacity="0.12" />
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function KPICardSpark({ icono, iconoBg, label, valor, sub, subColor, color, sparkData }) {
  return (
    <div style={{ background: 'white', border: '1px solid #EEF1F4', borderRadius: 14, padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{ width: 30, height: 30, borderRadius: 9, background: iconoBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>{icono}</div>
        <div style={{ fontSize: 11, color: '#6B7C8C', fontWeight: 500, lineHeight: 1.2 }}>{label}</div>
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a' }}>{valor}</div>
      <div style={{ fontSize: 10, color: subColor, fontWeight: 600, marginBottom: 6 }}>{sub}</div>
      <Sparkline data={sparkData} color={color} />
    </div>
  );
}

function TituloCard({ titulo }) {
  return <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a', marginBottom: 10 }}>{titulo}</div>;
}

function SeccionTitulo({ titulo }) {
  return (
    <div style={{
      fontSize: 15, fontWeight: 700, color: AZUL, marginBottom: 12,
      paddingBottom: 8, borderBottom: '2px solid #E5EDF3'
    }}>{titulo}</div>
  );
}

function DonutConLeyenda({ titulo, data, colores, total }) {
  return (
    <div style={cardStyle}>
      <TituloCard titulo={titulo} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ position: 'relative', width: 110, height: 110, flexShrink: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={35} outerRadius={52} paddingAngle={2}>
                {data.map((entry, i) => <Cell key={i} fill={colores[i % colores.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            textAlign: 'center', pointerEvents: 'none'
          }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a' }}>{total}</div>
            <div style={{ fontSize: 8, color: '#9E9CBB' }}>Total</div>
          </div>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {data.map((d, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: colores[i % colores.length], flexShrink: 0 }}></span>
              <span style={{ color: '#4A5868', flex: 1 }}>{d.name}</span>
              <span style={{ color: '#1a1a1a', fontWeight: 600 }}>
                {d.value} ({total > 0 ? Math.round((d.value / total) * 100) : 0}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TablaRanking({ titulo, filas, colNombre, colValor, onVerTodos }) {
  return (
    <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column' }}>
      <TituloCard titulo={titulo} />
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, flex: 1 }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '4px 0', color: '#9E9CBB', fontWeight: 600, borderBottom: '1px solid #F1F4F7' }}>{colNombre}</th>
            <th style={{ textAlign: 'right', padding: '4px 0', color: '#9E9CBB', fontWeight: 600, borderBottom: '1px solid #F1F4F7' }}>{colValor}</th>
          </tr>
        </thead>
        <tbody>
          {filas.length === 0 ? (
            <tr><td colSpan={2} style={{ textAlign: 'center', padding: 16, color: '#C4C9D1' }}>Sin datos</td></tr>
          ) : filas.map((f, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #F8FAFC' }}>
              <td style={{ padding: '6px 0', color: '#2D3748' }}>{f.nombre}</td>
              <td style={{ padding: '6px 0', textAlign: 'right', color: '#1a1a1a', fontWeight: 600 }}>{f.cantidad}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={onVerTodos} style={{
        marginTop: 10, background: '#F0F6FA', color: AZUL_MEDIO, border: 'none',
        borderRadius: 8, padding: '8px 0', fontSize: 11, fontWeight: 600, cursor: 'pointer'
      }}>Ver todos</button>
    </div>
  );
}

function AccesoRapido({ icono, titulo, onClick }) {
  return (
    <div onClick={onClick} style={{
      ...cardStyle, display: 'flex', alignItems: 'center', gap: 12,
      cursor: 'pointer', transition: 'all 0.15s'
    }}
      onMouseOver={(e) => { e.currentTarget.style.borderColor = '#C8DCEA'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)'; }}
      onMouseOut={(e) => { e.currentTarget.style.borderColor = '#EEF1F4'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)'; }}
    >
      <div style={{ width: 38, height: 38, borderRadius: 10, background: '#F0F6FA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{icono}</div>
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a' }}>{titulo}</div>
        <div style={{ fontSize: 11, color: AZUL_MEDIO, fontWeight: 500 }}>Ver detalle →</div>
      </div>
    </div>
  );
}

function ChipFiltro({ texto, onQuitar }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      background: '#E6F1FB', color: AZUL, border: '1px solid #C8DCEA',
      borderRadius: 999, padding: '5px 10px', fontSize: 11, fontWeight: 500
    }}>
      {texto}
      <span onClick={onQuitar} style={{ cursor: 'pointer', fontWeight: 700 }}>✕</span>
    </div>
  );
}

const cardStyle = { background: 'white', borderRadius: 14, padding: '16px 18px', border: '1px solid #EEF1F4', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' };
const btnHeader = { background: 'white', border: '1px solid #E5EDF3', borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#4A5868' };
const panelDropdown = { position: 'absolute', top: '110%', right: 0, background: 'white', border: '1px solid #E5EDF3', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.1)', padding: 16, zIndex: 20, minWidth: 220 };
const btnDropdownItem = { display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '8px 6px', fontSize: 12, color: '#2D3748', cursor: 'pointer', borderRadius: 6 };
const lblFiltro = { display: 'block', fontSize: 10, fontWeight: 600, color: '#6B7C8C', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 };
const inpFiltro = { width: '100%', padding: '8px 10px', border: '1.5px solid #E5EDF3', borderRadius: 8, fontSize: 12, background: 'white', outline: 'none', cursor: 'pointer' };

export default Reportes;