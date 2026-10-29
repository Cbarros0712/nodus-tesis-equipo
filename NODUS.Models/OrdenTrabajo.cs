namespace NODUS.Models
{
    public class OrdenTrabajo
    {
        public int IdOT { get; set; }
        public DateTime FechaApertura { get; set; }
        public string Tipo { get; set; } = string.Empty;
        public string Sintoma { get; set; } = string.Empty;
        public string Estado { get; set; } = "Pendiente";
        public DateTime? FechaCierre { get; set; }

        public int IdEquipo { get; set; }
        public Equipo? Equipo { get; set; }

        public int IdServicio { get; set; }
        public Servicio? Servicio { get; set; }

        public int IdUsuario { get; set; }
        public Usuario? Usuario { get; set; }

        public ICollection<Intervencion> Intervenciones { get; set; } = new List<Intervencion>();
        public ICollection<UsoInsumo> UsosInsumo { get; set; } = new List<UsoInsumo>();
    }
}