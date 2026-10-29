namespace NODUS.API.DTOs
{
    public class EquipoInputDto
    {
        public int IdEquipo { get; set; }
        public string Modelo { get; set; } = null!;
        public string NroSerie { get; set; } = null!;
        public DateTime FechaAdquisicion { get; set; }
        public DateTime? VencimientoGarantia { get; set; }
        public int IdMarca { get; set; }
        public int IdTipo { get; set; }
        public int IdEstado { get; set; }

        public List<string> Componentes { get; set; } = new();
    }
}