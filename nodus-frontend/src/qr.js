export const AVISO_QR_LOCALHOST =
  'Este QR apunta a localhost y no funcionará desde otros dispositivos. Configurá la dirección pública del sistema.';

export function baseUrlPublica() {
  const configurada = (import.meta.env.VITE_PUBLIC_BASE_URL || '').trim().replace(/\/+$/, '');
  return configurada || window.location.origin;
}

export function urlQrEquipo(idEquipo) {
  return `${baseUrlPublica()}/equipos/${idEquipo}/qr`;
}

export function apuntaALocalhost(url) {
  const texto = (url || '').toLowerCase();
  return texto.includes('localhost') || texto.includes('127.0.0.1');
}

export function imagenQr(url, tamanio = 260) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${tamanio}x${tamanio}&data=${encodeURIComponent(url)}`;
}
