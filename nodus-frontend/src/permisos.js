export const ROL_PERSONAL_ASISTENCIAL = 'Personal asistencial';
export const ROL_TECNICO = 'Técnico';
export const ROL_BIOINGENIERO = 'Bioingeniero';

export const ROLES = [ROL_PERSONAL_ASISTENCIAL, ROL_TECNICO, ROL_BIOINGENIERO];

export const ACCESO_MODULOS = {
  'Bioingeniero':         ['patrimonial', 'mantenimiento', 'insumos', 'prestamos', 'reportes', 'administracion'],
  'Técnico':              ['mantenimiento'],
  'Personal asistencial': [],
};

export function puedeVerModulo(rol, modulo) {
  return ACCESO_MODULOS[rol]?.includes(modulo) ?? false;
}

export const ACCIONES = {
  'crear_ot':                 ['Bioingeniero'],
  'gestionar_mantenimiento':  ['Bioingeniero'],
  'editar_activo':            ['Bioingeniero'],
  'gestionar_usuarios':       ['Bioingeniero'],
  'ver_ficha_qr':             ['Bioingeniero', 'Técnico', 'Personal asistencial'],
  'reportar_falla':           ['Bioingeniero', 'Técnico', 'Personal asistencial'],
  'ver_ficha_completa':       ['Bioingeniero', 'Técnico'],
  'gestionar_reportes_falla': ['Bioingeniero'],
};

export function puedeHacer(rol, accion) {
  return ACCIONES[accion]?.includes(rol) ?? false;
}