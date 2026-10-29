namespace NODUS.Models
{
    public class Alerta
    {
        public int IdAlerta { get; set; }
        public string Tipo { get; set; } = string.Empty;
        public DateTime FechaGeneracion { get; set; }
        public string Estado { get; set; } = "No leída";

        public int? IdEquipo { get; set; }
        public Equipo? Equipo { get; set; }

        public int IdUsuario { get; set; }
        public Usuario? Usuario { get; set; }
    }
}