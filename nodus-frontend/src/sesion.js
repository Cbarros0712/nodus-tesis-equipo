const CLAVE_SESION = 'nodus_sesion';

function vencimientoDelToken(token) {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const { exp } = JSON.parse(atob(payload));
    return typeof exp === 'number' ? exp : null;
  } catch {
    return null;
  }
}

export function cargarSesion() {
  let datos = null;
  try { datos = JSON.parse(localStorage.getItem(CLAVE_SESION)); } catch {  }
  const exp = datos?.token ? vencimientoDelToken(datos.token) : null;
  if (!datos?.usuario || !exp || exp * 1000 <= Date.now()) {
    borrarSesion();
    return null;
  }
  return datos;
}

export function guardarSesion(datos) {
  try { localStorage.setItem(CLAVE_SESION, JSON.stringify({ token: datos.token, usuario: datos.usuario })); } catch {  }
}

export function borrarSesion() {
  try { localStorage.removeItem(CLAVE_SESION); } catch {  }
}

export function destinoSeguro(destino) {
  if (typeof destino !== 'string' || destino.length > 500) return null;
  if (!destino.startsWith('/') || destino.startsWith('//') || destino.includes('\\')) return null;

  if (/[\u0000-\u001F\u007F]/.test(destino)) return null;
  try {
    const url = new URL(destino, 'https://nodus.invalid');
    if (url.origin !== 'https://nodus.invalid') return null;
    if (url.pathname === '/login') return null;
  } catch {
    return null;
  }
  return destino;
}

export function esDestinoQR(destino) {
  return /^\/(equipos\/\d+\/qr|ficha\/\d+)\/?(\?|#|$)/.test(destino || '');
}
