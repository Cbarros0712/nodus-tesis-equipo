namespace NODUS.Models
{
    public class Marca
    {
        public int IdMarca { get; set; }

        public string Nombre { get; set; } = string.Empty;

        public string? PaisOrigen { get; set; }

        public string? ContactoSoporte { get; set; }

        public string? TelefonoSoporte { get; set; }

        public string? EmailSoporte { get; set; }

        public ICollection<Equipo> Equipos { get; set; } = new List<Equipo>();
    }
}
