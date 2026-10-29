namespace NODUS.Models
{
    public class HospitalExterno
    {
        public int IdHospital { get; set; }
        public string Nombre { get; set; } = string.Empty;
        public string? Localidad { get; set; }
        public string? Direccion { get; set; }
        public string? Contacto { get; set; }
        public string? Telefono { get; set; }
        public string? Email { get; set; }
        public double? Latitud { get; set; }
        public double? Longitud { get; set; }
        public bool Activo { get; set; } = true;

        public ICollection<Prestamo> Prestamos { get; set; } = new List<Prestamo>();
    }
}
