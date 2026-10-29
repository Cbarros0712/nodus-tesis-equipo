namespace NODUS.API.DTOs
{
    public class FichaQrDto
    {
        public int IdEquipo { get; set; }
        public string Nombre { get; set; } = string.Empty;
        public string NroSerie { get; set; } = string.Empty;
        public string? Estado { get; set; }
        public string? ColorEstado { get; set; }
        public string? Marca { get; set; }
        public string Modelo { get; set; } = string.Empty;
        public string? TipoActivo { get; set; }
        public string? Ubicacion { get; set; }
        public string? Origen { get; set; }
        public DateTime FechaAlta { get; set; }

        public List<string> Alertas { get; set; } = new();
        public List<string> Componentes { get; set; } = new();
        public bool ReportadoHoy { get; set; }
    }

    public class ReporteFallaInputDto
    {
        public string? NombreCompleto { get; set; }
        public string? Legajo { get; set; }
        public string? Descripcion { get; set; }

        public int? ServicioId { get; set; }
    }

    public class ServicioCatalogoDto
    {
        public int IdServicio { get; set; }
        public string Nombre { get; set; } = string.Empty;
    }

    public class ConvertirEnOTInputDto
    {
        public int? IdServicio { get; set; }
    }

    public class ReporteFallaDto
    {
        public int IdReporteFalla { get; set; }
        public int IdEquipo { get; set; }
        public string? Equipo { get; set; }
        public string? NroSerie { get; set; }
        public string NombreCompleto { get; set; } = string.Empty;
        public string Legajo { get; set; } = string.Empty;
        public string? Usuario { get; set; }
        public string Descripcion { get; set; } = string.Empty;
        public string? Servicio { get; set; }
        public DateTime FechaReporte { get; set; }
        public string Estado { get; set; } = string.Empty;
        public int? IdOT { get; set; }
        public int? IdServicioSugerido { get; set; }
    }
}
