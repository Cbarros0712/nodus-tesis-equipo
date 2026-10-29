namespace NODUS.Models
{
    public class PrestamoComponente
    {
        public int IdPrestamoComponente { get; set; }
        public string Componente { get; set; } = string.Empty;

        public int IdPrestamo { get; set; }
        public Prestamo? Prestamo { get; set; }
    }
}
