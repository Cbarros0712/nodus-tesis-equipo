namespace NODUS.Models
{
    public class ProrrogaPrestamo
    {
        public int IdProrroga { get; set; }

        public int IdPrestamo { get; set; }
        public Prestamo? Prestamo { get; set; }

        public DateTime? FechaAnterior { get; set; }
        public DateTime FechaNueva { get; set; }
        public string Motivo { get; set; } = string.Empty;
        public DateTime FechaSolicitud { get; set; }

        public int IdUsuario { get; set; }
        public Usuario? Usuario { get; set; }
    }
}
