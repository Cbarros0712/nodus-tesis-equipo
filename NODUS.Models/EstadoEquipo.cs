namespace NODUS.Models
{
    public class EstadoEquipo
    {
        public int IdEstado { get; set; }

        public string Nombre { get; set; } = string.Empty;

        public string? Descripcion { get; set; }

        public string ColorSemaforo { get; set; } = "verde";

        public bool InhabilitaOperacion { get; set; } = false;

        public ICollection<Equipo> Equipos { get; set; } = new List<Equipo>();
    }
}
