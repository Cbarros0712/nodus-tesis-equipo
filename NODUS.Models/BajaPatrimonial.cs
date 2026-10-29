namespace NODUS.Models
{
    public class BajaPatrimonial
    {
        public int IdBaja { get; set; }
        public DateTime Fecha { get; set; }
        public string Motivo { get; set; } = string.Empty;
        public string InformeObsolescencia { get; set; } = string.Empty;

        public int IdEquipo { get; set; }
        public Equipo? Equipo { get; set; }

        public int IdUsuario { get; set; }
        public Usuario? Usuario { get; set; }
    }
}
