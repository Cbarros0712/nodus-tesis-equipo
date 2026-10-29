import { API_URL } from './api';

const conDescarga = (url, descargar) => `${url}${descargar ? '?descargar=true' : ''}`;

export const urlDocumento = (idPrestamo, ruta, descargar = false) =>
  conDescarga(`${API_URL}/api/prestamos/${idPrestamo}/${ruta}`, descargar);
export const urlRemito = (idPrestamo, descargar = false) => urlDocumento(idPrestamo, 'remito', descargar);

export const urlFirmado = (idPrestamo, tipo, descargar = false) =>
  conDescarga(`${API_URL}/api/remitos/${idPrestamo}/firma-${tipo}`, descargar);

export const fechaDMY = (iso) => iso ? iso.split('T')[0].split('-').reverse().join('/') : '—';

export const fechaHora = (iso) => iso ? new Date(iso).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }) : '—';

export const faltaFirma = (p) => !p.tieneFirmaSalida || (!!p.numeroRemitoDevolucion && !p.tieneFirmaDevolucion);
