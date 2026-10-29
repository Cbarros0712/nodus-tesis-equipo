const catalogoComponentesRespiratorios = {
  "Oxigenoterapia de Alto Flujo (OAF)": [
    {
      "componente": "Unidad generadora / Turbina de flujo",
      "categoria": "Unidad Principal",
      "requerimiento": "Obligatorio",
      "tipoMaterial": "Electrónico",
      "notas": "Verificar horas de motor y filtros"
    },
    {
      "componente": "Cable de alimentación eléctrica",
      "categoria": "Eléctrico",
      "requerimiento": "Obligatorio",
      "tipoMaterial": "Eléctrico",
      "notas": "Revisar integridad del aislamiento y clavija"
    },
    {
      "componente": "Base humidificadora integrada/externa",
      "categoria": "Humidificación",
      "requerimiento": "Obligatorio",
      "tipoMaterial": "Electromecánico",
      "notas": "Comprobar placa calefactora"
    },
    {
      "componente": "Cámara de humidificación (autofill)",
      "categoria": "Insumo / Consumible",
      "requerimiento": "Obligatorio",
      "tipoMaterial": "Descartable/Reusable",
      "notas": "Verificar flotador y sello de agua"
    },
    {
      "componente": "Cánula nasal de alto flujo (diferentes tamaños)",
      "categoria": "Interface",
      "requerimiento": "Obligatorio",
      "tipoMaterial": "Descartable",
      "notas": "Elegir calibre adecuado (<50% narina)"
    },
    {
      "componente": "Tubo respiratorio calefaccionado (Circuit)",
      "categoria": "Circuito",
      "requerimiento": "Obligatorio",
      "tipoMaterial": "Descartable/Reusable",
      "notas": "Conector de cable calefactor integrado"
    },
    {
      "componente": "Sensor / Cable adaptador de temperatura",
      "categoria": "Sensado",
      "requerimiento": "Obligatorio",
      "tipoMaterial": "Electrónico",
      "notas": "Limpiar contactos de conexión"
    },
    {
      "componente": "Adaptador / Trampa para fuente de O2",
      "categoria": "Conexión Gases",
      "requerimiento": "Obligatorio",
      "tipoMaterial": "Neumático",
      "notas": "Manguera verde de O2 de alta presión (4 bar)"
    },
    {
      "componente": "Filtro de aire de entrada (HEPA)",
      "categoria": "Mantenimiento",
      "requerimiento": "Obligatorio",
      "tipoMaterial": "Consumible",
      "notas": "Cambio periódico según manual"
    },
    {
      "componente": "Soporte para suero / Acondicionador de agua",
      "categoria": "Soporte",
      "requerimiento": "Opcional",
      "tipoMaterial": "Accesorio",
      "notas": "Soporta la bolsa de agua destilada"
    }
  ],
  "Ventilación No Invasiva Portátil (VNI Portátil)": [
    {
      "componente": "Unidad principal VNI (Turbina)",
      "categoria": "Unidad Principal",
      "requerimiento": "Obligatorio",
      "tipoMaterial": "Electrónico",
      "notas": "Calibrar sensores de presión"
    },
    {
      "componente": "Fuente de alimentación externa y cable C13",
      "categoria": "Eléctrico",
      "requerimiento": "Obligatorio",
      "tipoMaterial": "Eléctrico",
      "notas": "Verificar voltaje e integridad del transformador"
    },
    {
      "componente": "Batería interna / externa de litio",
      "categoria": "Energía Reserva",
      "requerimiento": "Obligatorio",
      "tipoMaterial": "Batería",
      "notas": "Verificar porcentaje de carga antes de uso"
    },
    {
      "componente": "Tubuladura monopaciente (con/sin válvula exhalatoria)",
      "categoria": "Circuito",
      "requerimiento": "Obligatorio",
      "tipoMaterial": "Descartable",
      "notas": "Verificar fuga intencionada si es monotubo"
    },
    {
      "componente": "Interface: Máscara Oronasal / Nasal / Total Face",
      "categoria": "Interface",
      "requerimiento": "Obligatorio",
      "tipoMaterial": "Reutilizable/Descartable",
      "notas": "Revisar sellado de silicona y arnés"
    },
    {
      "componente": "Arnés de fijación (Headgear)",
      "categoria": "Accesorio",
      "requerimiento": "Obligatorio",
      "tipoMaterial": "Textil",
      "notas": "Ajustar con velcro sin excesiva presión"
    },
    {
      "componente": "Filtro antibacteriano / antiviral (HMEF / HEPA)",
      "categoria": "Protección",
      "requerimiento": "Obligatorio",
      "tipoMaterial": "Descartable",
      "notas": "Colocar en salida del equipo o entrada de interfaz"
    },
    {
      "componente": "Línea de presión (Proximal pressure line)",
      "categoria": "Sensado",
      "requerimiento": "Según modelo",
      "tipoMaterial": "Descartable",
      "notas": "Asegurar que no tenga condensación"
    },
    {
      "componente": "Sensor de O2 / Conector enriquecimiento de O2",
      "categoria": "Accesorio/Sensado",
      "requerimiento": "Opcional",
      "tipoMaterial": "Neumático",
      "notas": "Entrada lateral o puerto para oxígeno suplementario"
    },
    {
      "componente": "Bolso / Estuche de transporte rígido",
      "categoria": "Transporte",
      "requerimiento": "Opcional",
      "tipoMaterial": "Accesorio",
      "notas": "Protección para traslados terrestres/aéreos"
    }
  ],
  "Ventilador Mecánico de Terapia Intensiva": [
    {
      "componente": "Unidad de control y pantalla táctil",
      "categoria": "Unidad Principal",
      "requerimiento": "Obligatorio",
      "tipoMaterial": "Electrónico",
      "notas": "Limpieza con amonio cuaternario / verificación táctil"
    },
    {
      "componente": "Cable de alimentación eléctrica trifásico con tierra",
      "categoria": "Eléctrico",
      "requerimiento": "Obligatorio",
      "tipoMaterial": "Eléctrico",
      "notas": "Conectar a red de emergencia (UPS/Grupo electrógeno)"
    },
    {
      "componente": "Mangueras de alta presión O2 y Aire Comprimido (DISS/NIST)",
      "categoria": "Gases Médicos",
      "requerimiento": "Obligatorio",
      "tipoMaterial": "Pneumático",
      "notas": "Revisar o-rings y presiones (3.5 - 5 bar)"
    },
    {
      "componente": "Sensor de flujo inspiratorio / expiratorio (Escompatible/Galvano)",
      "categoria": "Sensado",
      "requerimiento": "Obligatorio",
      "tipoMaterial": "Electrónico",
      "notas": "Calibración de cero antes de cada paciente"
    },
    {
      "componente": "Válvula espiratoria y membrana reutilizable/descartable",
      "categoria": "Mecanismo Espiratorio",
      "requerimiento": "Obligatorio",
      "tipoMaterial": "Mecánico",
      "notas": "Esterilizar en autoclave (si es reusable)"
    },
    {
      "componente": "Circuito doble rama (Inspiratoria y Espiratoria)",
      "categoria": "Circuito",
      "requerimiento": "Obligatorio",
      "tipoMaterial": "Descartable/Siliconado",
      "notas": "Comprobar distensibilidad y fugas en test inicial"
    },
    {
      "componente": "Trampas de agua para condensado",
      "categoria": "Circuito",
      "requerimiento": "Obligatorio",
      "tipoMaterial": "Mecánico",
      "notas": "Vaciar periódicamente en circuito cerrado"
    },
    {
      "componente": "Sensor de celda de Oxígeno (O2 Cell)",
      "categoria": "Sensado",
      "requerimiento": "Obligatorio",
      "tipoMaterial": "Químico/Ultrasónico",
      "notas": "Calibrar al 21% y 100% FI O2"
    },
    {
      "componente": "Brazo articulado soporte de tubuladura",
      "categoria": "Soporte",
      "requerimiento": "Recomendado",
      "tipoMaterial": "Mecánico",
      "notas": "Evitar tracción sobre el tubo endotraqueal"
    },
    {
      "componente": "Filtro espiratorio HEPA de alta eficiencia",
      "categoria": "Protección",
      "requerimiento": "Obligatorio",
      "tipoMaterial": "Descartable",
      "notas": "Protege el módulo espiratorio de la contaminación"
    },
    {
      "componente": "Módulo de Capnografía (Sensor Mainstream / Sidestream + cable)",
      "categoria": "Monitorización",
      "requerimiento": "Opcional",
      "tipoMaterial": "Electrónico",
      "notas": "Verificar celda de calibración de CO2"
    }
  ],
  "Ventilación de Alta Frecuencia Oscilatoria (VAFO)": [
    {
      "componente": "Unidad principal con pistón/oscilador",
      "categoria": "Unidad Principal",
      "requerimiento": "Obligatorio",
      "tipoMaterial": "Electromecánico",
      "notas": "Verificar centrado de diafragma de pistón"
    },
    {
      "componente": "Cable de alimentación y conexión a red",
      "categoria": "Eléctrico",
      "requerimiento": "Obligatorio",
      "tipoMaterial": "Eléctrico",
      "notas": "Uso exclusivo en toma de fuerza estabilizada"
    },
    {
      "componente": "Manguera de suministro de gases (O2 y Aire)",
      "categoria": "Gases Médicos",
      "requerimiento": "Obligatorio",
      "tipoMaterial": "Neumático",
      "notas": "Presión constante de entrada requerida"
    },
    {
      "componente": "Circuito rígido especial de VAFO (Baja complianza)",
      "categoria": "Circuito",
      "requerimiento": "Obligatorio",
      "tipoMaterial": "Descartable",
      "notas": "Circuito especial para evitar amortiguación de onda"
    },
    {
      "componente": "Válvula de presión media / Válvula de sesgo (Bias flow)",
      "categoria": "Control Presión",
      "requerimiento": "Obligatorio",
      "tipoMaterial": "Neumático/Mecánico",
      "notas": "Ajustar límite de presión media en vía aérea (MAP)"
    },
    {
      "componente": "Cartucho de diafragma / Membrana osciladora",
      "categoria": "Mecanismo",
      "requerimiento": "Obligatorio",
      "tipoMaterial": "Descartable/Reusable",
      "notas": "Inspeccionar por ruptura o fatiga de material"
    },
    {
      "componente": "Sensor / Línea de presión proximal de alta frecuencia",
      "categoria": "Sensado",
      "requerimiento": "Obligatorio",
      "tipoMaterial": "Sensado",
      "notas": "Sin presencia de agua o bloqueos"
    },
    {
      "componente": "Sistema de enfriamiento/Ventilador de pistón",
      "categoria": "Refrigeración",
      "requerimiento": "Obligatorio",
      "tipoMaterial": "Mecánico",
      "notas": "Limpieza de filtros de polvo del equipo"
    },
    {
      "componente": "Humidificador activo compatible con alto flujo VAFO",
      "categoria": "Humidificación",
      "requerimiento": "Obligatorio",
      "tipoMaterial": "Electrónico",
      "notas": "Temperatura óptima para evitar resecamiento"
    }
  ],
  "Membrana de Oxigenación Extracorpórea (ECMO)": [
    {
      "componente": "Consola / Unidad de control de bomba (Centrífuga)",
      "categoria": "Unidad Principal",
      "requerimiento": "Obligatorio",
      "tipoMaterial": "Electrónico",
      "notas": "Verificar funcionamiento de motor principal y backup manual"
    },
    {
      "componente": "Cable de alimentación + Batería de alto rendimiento",
      "categoria": "Energía",
      "requerimiento": "Obligatorio",
      "tipoMaterial": "Electrónico",
      "notas": "Revisión diaria de autonomía de batería interna"
    },
    {
      "componente": "Sonda / Sensor de flujo electromagnético o ultrasónico",
      "categoria": "Sensado",
      "requerimiento": "Obligatorio",
      "tipoMaterial": "Electrónico",
      "notas": "Sensor no invasivo acoplado a la tubuladura"
    },
    {
      "componente": "Oxigenador de membrana (Polimetilpenteno - PMP)",
      "categoria": "Intercambiador Gas",
      "requerimiento": "Obligatorio",
      "tipoMaterial": "Descartable Biocompatible",
      "notas": "Monitorizar gradiente de presión (ΔP)"
    },
    {
      "componente": "Cánulas arteriales y venosas de alto flujo",
      "categoria": "Acceso Vascular",
      "requerimiento": "Obligatorio",
      "tipoMaterial": "Descartable Quirúrgico",
      "notas": "Fijación rigurosa a piel del paciente"
    },
    {
      "componente": "Mezclador de gases (Blender O2/Aire) para el Sweep Gas",
      "categoria": "Suministro Gas",
      "requerimiento": "Obligatorio",
      "tipoMaterial": "Neumático",
      "notas": "Control estricto del flujo de gas de barrido"
    },
    {
      "componente": "Unidad intercambiadora de calor (Heater-Cooler unit)",
      "categoria": "Termorregulación",
      "requerimiento": "Obligatorio",
      "tipoMaterial": "Electromecánico",
      "notas": "Mantiene la temperatura del circuito de sangre"
    },
    {
      "componente": "Mangueras de agua del intercambiador térmico",
      "categoria": "Termorregulación",
      "requerimiento": "Obligatorio",
      "tipoMaterial": "Reusable/Higiene",
      "notas": "Conexiones rápidas sin fugas"
    },
    {
      "componente": "Sensores de presión del circuito (Pre-membrana, Post-membrana, Venosa)",
      "categoria": "Sensado",
      "requerimiento": "Obligatorio",
      "tipoMaterial": "Electrónico/Descartable",
      "notas": "Monitoreo continuo para detectar trombos"
    },
    {
      "componente": "Manivela de emergencia (Hand crank)",
      "categoria": "Emergencia",
      "requerimiento": "Obligatorio",
      "tipoMaterial": "Mecánico",
      "notas": "Uso en caso de fallo eléctrico/motor total"
    }
  ],
  "Sistema de Administración de Óxido Nítrico (iNO)": [
    {
      "componente": "Módulo de control e inyección de NO",
      "categoria": "Unidad Principal",
      "requerimiento": "Obligatorio",
      "tipoMaterial": "Electrónico",
      "notas": "Verificar autochequeo e inyección precisa"
    },
    {
      "componente": "Cable de alimentación y batería interna de respaldo",
      "categoria": "Eléctrico",
      "requerimiento": "Obligatorio",
      "tipoMaterial": "Eléctrico",
      "notas": "Batería garantizada para transporte intraclínico"
    },
    {
      "componente": "Tubos/Cilindros de gas Óxido Nítrico (NO / N2)",
      "categoria": "Insumo Médico",
      "requerimiento": "Obligatorio",
      "tipoMaterial": "Medicamento/Gas",
      "notas": "Verificar concentración (e.g. 800 ppm) y vencimiento"
    },
    {
      "componente": "Reguladores de presión y manguera de alta presión para NO",
      "categoria": "Gases",
      "requerimiento": "Obligatorio",
      "tipoMaterial": "Neumático",
      "notas": "Específico para gas NO con trampas de impurezas"
    },
    {
      "componente": "Módulo de monitoreo continuo (Sensores NO, NO2 y O2)",
      "categoria": "Sensado",
      "requerimiento": "Obligatorio",
      "tipoMaterial": "Electroquímico",
      "notas": "Calibración con gas patrón antes de uso"
    },
    {
      "componente": "Muestra de gas / Detección de línea (Sample line con filtro)",
      "categoria": "Sensado",
      "requerimiento": "Obligatorio",
      "tipoMaterial": "Descartable",
      "notas": "Extrae muestra continua de la rama inspiratoria"
    },
    {
      "componente": "Inyector proporcional / Módulo de integración al ventilador",
      "categoria": "Integración",
      "requerimiento": "Obligatorio",
      "tipoMaterial": "Electromecánico",
      "notas": "Se conecta en la rama inspiratoria previa al humidificador"
    },
    {
      "componente": "Sistema/Trampa de purga y barrido de aire",
      "categoria": "Seguridad",
      "requerimiento": "Obligatorio",
      "tipoMaterial": "Mecánico",
      "notas": "Evita la formación de NO2 tóxico previo a conexión"
    }
  ],
  "Base Humidificadora Calefaccionada": [
    {
      "componente": "Base calefactora microprocesada",
      "categoria": "Unidad Principal",
      "requerimiento": "Obligatorio",
      "tipoMaterial": "Electrónico",
      "notas": "Ajuste de modos (Vía Aérea Invasiva / No Invasiva)"
    },
    {
      "componente": "Cable de alimentación eléctrica",
      "categoria": "Eléctrico",
      "requerimiento": "Obligatorio",
      "tipoMaterial": "Eléctrico",
      "notas": "Revisar enchufe con toma a tierra"
    },
    {
      "componente": "Cable adaptador de doble calefactor (Heated wire adapter)",
      "categoria": "Eléctrico/Control",
      "requerimiento": "Obligatorio",
      "tipoMaterial": "Electrónico",
      "notas": "Conecta la base con las resistencias del circuito"
    },
    {
      "componente": "Cable sensor de temperatura dual (Airway & Chamber probe)",
      "categoria": "Sensado",
      "requerimiento": "Obligatorio",
      "tipoMaterial": "Electrónico",
      "notas": "Mide temp a la salida de cámara y cerca del paciente"
    },
    {
      "componente": "Cámara de humidificación auto-rellenable (Autofill)",
      "categoria": "Insumo / Consumible",
      "requerimiento": "Obligatorio",
      "tipoMaterial": "Descartable/Reusable",
      "notas": "Conectar a guía de suero con agua destilada"
    },
    {
      "componente": "Soporte/Pinza de fijación al respirador o carro",
      "categoria": "Soporte",
      "requerimiento": "Recomendado",
      "tipoMaterial": "Mecánico",
      "notas": "Mantener vertical por debajo del nivel del paciente"
    }
  ]
};

export default catalogoComponentesRespiratorios;
