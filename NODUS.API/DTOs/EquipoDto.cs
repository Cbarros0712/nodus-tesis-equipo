namespace NODUS.API.DTOs
{
    public class EquipoDto
    {
        public int IdEquipo { get; set; }
        public string Modelo { get; set; } = string.Empty;
        public string NroSerie { get; set; } = string.Empty;
        public DateTime? FechaAdquisicion { get; set; }
        public DateTime? VencimientoGarantia { get; set; }

        public int IdMarca { get; set; }
        public int IdTipo { get; set; }
        public int IdEstado { get; set; }

        public MarcaDto? Marca { get; set; }
        public TipoActivoDto? TipoActivo { get; set; }
        public EstadoEquipoDto? EstadoEquipo { get; set; }

        public List<string> Componentes { get; set; } = new();

        public string? UbicacionActual { get; set; }
    }

    public class MarcaDto
    {
        public int IdMarca { get; set; }
        public string Nombre { get; set; } = string.Empty;
    }

    public class TipoActivoDto
    {
        public int IdTipo { get; set; }
        public string Nombre { get; set; } = string.Empty;
    }

    public class EstadoEquipoDto
    {
        public int IdEstado { get; set; }
        public string Nombre { get; set; } = string.Empty;
        public string? ColorSemaforo { get; set; }
    }
}