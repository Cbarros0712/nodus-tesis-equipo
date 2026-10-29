namespace NODUS.Models
{
    public class ReporteFalla
    {
        public const string ESTADO_PENDIENTE = "Pendiente";
        public const string ESTADO_CONVERTIDO = "Convertido en OT";
        public const string ESTADO_DESCARTADO = "Descartado";

        public const string INDICE_UNO_POR_DIA = "ux_reporte_falla_equipo_dia";

        public int IdReporteFalla { get; set; }

        public int IdEquipo { get; set; }
        public Equipo? Equipo { get; set; }

        public int IdUsuario { get; set; }
        public Usuario? Usuario { get; set; }

        public string NombreCompleto { get; set; } = string.Empty;
        public string Legajo { get; set; } = string.Empty;
        public string Descripcion { get; set; } = string.Empty;

        public int? IdServicio { get; set; }
        public Servicio? Servicio { get; set; }

        public DateTime FechaReporte { get; set; }
        public DateOnly FechaDia { get; set; }
        public string Estado { get; set; } = ESTADO_PENDIENTE;

        public int? IdOT { get; set; }
        public OrdenTrabajo? OrdenTrabajo { get; set; }
    }
}
