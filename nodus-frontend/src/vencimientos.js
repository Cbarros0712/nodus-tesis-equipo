const diaUTC = (iso) => {
  const [y, m, d] = iso.split('T')[0].split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};

const diasHasta = (iso) => {
  const hoy = new Date();
  return Math.round((diaUTC(iso) - Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())) / 86400000);
};

export const DIAS_AVISO = 2;

export const EVENTO_PRESTAMOS_ACTUALIZADOS = 'nodus:prestamos-actualizados';

export const diasParaVencer = (p) => {
  if (p.estado !== 'En préstamo' || p.fechaDevolucionReal || !p.fechaEstimadaDevolucion) return null;
  return diasHasta(p.fechaEstimadaDevolucion);
};

export const estaVencido = (p) => { const d = diasParaVencer(p); return d !== null && d < 0; };
export const estaPorVencer = (p) => { const d = diasParaVencer(p); return d !== null && d >= 0 && d <= DIAS_AVISO; };
export const textoVence = (dias) => dias === 0 ? 'Vence hoy' : dias === 1 ? 'Vence mañana' : `Vence en ${dias} días`;

const atrasoAlProrrogar = (pr) => {
  if (!pr.fechaAnterior) return 0;
  const s = new Date(pr.fechaSolicitud);
  return Math.max(0, Math.round((Date.UTC(s.getFullYear(), s.getMonth(), s.getDate()) - diaUTC(pr.fechaAnterior)) / 86400000));
};

export const prorrogasConVencido = (p) => (p.prorrogas || []).filter(pr => atrasoAlProrrogar(pr) > 0).length;

export const diasAtraso = (p) => {
  if (!p.fechaEstimadaDevolucion) return null;
  const previos = (p.prorrogas || []).reduce((acc, pr) => acc + atrasoAlProrrogar(pr), 0);
  if (p.fechaDevolucionReal)
    return previos + Math.max(0, Math.round((diaUTC(p.fechaDevolucionReal) - diaUTC(p.fechaEstimadaDevolucion)) / 86400000));
  if (p.estado !== 'En préstamo') return null;
  return previos + Math.max(0, -diasHasta(p.fechaEstimadaDevolucion));
};

export const DIAS_AVISO_GARANTIA = 15;
export const ID_ESTADO_BAJA = 5;

export const EVENTO_EQUIPOS_ACTUALIZADOS = 'nodus:equipos-actualizados';

export const diasParaVencerGarantia = (e) => {
  if (!e.vencimientoGarantia || e.idEstado === ID_ESTADO_BAJA) return null;
  return diasHasta(e.vencimientoGarantia);
};

export const garantiaVencida = (e) => { const d = diasParaVencerGarantia(e); return d !== null && d < 0; };
export const garantiaPorVencer = (e) => { const d = diasParaVencerGarantia(e); return d !== null && d >= 0 && d <= DIAS_AVISO_GARANTIA; };
