namespace NODUS.Models
{
    public class EquipoComponente
    {
        public int IdEquipoComponente { get; set; }
        public string Componente { get; set; } = string.Empty;
        public string? Categoria { get; set; }
        public string? Requerimiento { get; set; }

        public int IdEquipo { get; set; }
        public Equipo? Equipo { get; set; }
    }
}
