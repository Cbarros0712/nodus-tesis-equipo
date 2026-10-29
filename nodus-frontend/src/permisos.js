export const ACCESO_MODULOS = {
  'Administrador':      ['patrimonial', 'mantenimiento', 'insumos', 'prestamos', 'reportes', 'administracion'],
  'Jefe patrimonio':     ['patrimonial', 'mantenimiento', 'insumos', 'prestamos', 'reportes'],
  'Técnico biomédico':   ['patrimonial', 'mantenimiento', 'prestamos', 'reportes'],
  'Médico':              ['mantenimiento'],
  'Residente':           ['mantenimiento'],
  'Enfermero':           ['mantenimiento'],
  'Jefe servicio':       ['patrimonial', 'mantenimiento', 'reportes'],
  'Auditor ANMAT':       ['reportes'],

  'Personal asistencial': [],
};

export const ROL_PERSONAL_ASISTENCIAL = 'Personal asistencial';

export function puedeVerModulo(rol, modulo) {
  return ACCESO_MODULOS[rol]?.includes(modulo) ?? false;
}

export const ACCIONES = {
  'crear_ot': ['Administrador', 'Jefe patrimonio', 'Técnico biomédico', 'Médico', 'Residente', 'Enfermero', 'Jefe servicio', 'Auditor ANMAT'],
  'editar_activo': ['Administrador', 'Jefe patrimonio', 'Técnico biomédico'],
  'gestionar_usuarios': ['Administrador'],
  'ver_ficha_qr': ['Administrador', 'Jefe patrimonio', 'Técnico biomédico', 'Médico', 'Residente', 'Enfermero', 'Jefe servicio', 'Auditor ANMAT', 'Personal asistencial'],
  'reportar_falla': ['Administrador', 'Jefe patrimonio', 'Técnico biomédico', 'Médico', 'Residente', 'Enfermero', 'Jefe servicio', 'Auditor ANMAT', 'Personal asistencial'],
  'ver_ficha_completa': ['Administrador', 'Jefe patrimonio', 'Técnico biomédico', 'Médico', 'Residente', 'Enfermero', 'Jefe servicio', 'Auditor ANMAT'],
  'gestionar_reportes_falla': ['Administrador', 'Jefe patrimonio', 'Jefe servicio'],
};

export function puedeHacer(rol, accion) {
  return ACCIONES[accion]?.includes(rol) ?? false;
}
