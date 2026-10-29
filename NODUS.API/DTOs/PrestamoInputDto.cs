namespace NODUS.API.DTOs
{
    public class PrestamoInputDto
    {
        public int IdEquipo { get; set; }
        public int IdHospital { get; set; }
        public int IdUsuario { get; set; }
        public DateTime FechaPrestamo { get; set; }
        public DateTime? FechaEstimadaDevolucion { get; set; }
        public string? Motivo { get; set; }
        public string? Observaciones { get; set; }

        public List<string> Componentes { get; set; } = new();
    }
}