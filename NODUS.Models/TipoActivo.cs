namespace NODUS.Models
{
    public class TipoActivo
    {
        public int IdTipo { get; set; }

        public string Nombre { get; set; } = string.Empty;

        public string Categoria { get; set; } = string.Empty;

        public ICollection<Equipo> Equipos { get; set; } = new List<Equipo>();
    }
}
