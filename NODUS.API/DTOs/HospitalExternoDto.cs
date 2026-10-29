namespace NODUS.API.DTOs
{
    public class HospitalExternoDto
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
        public bool Activo { get; set; }
    }

    public class CoordenadasInputDto
    {
        public double Latitud { get; set; }
        public double Longitud { get; set; }
    }

    public class GeocodificacionItemDto
    {
        public int IdHospital { get; set; }
        public string Nombre { get; set; } = string.Empty;
        public string? Direccion { get; set; }
        public double? Latitud { get; set; }
        public double? Longitud { get; set; }
        public string? Fuente { get; set; }
        public string? Encontrado { get; set; }
    }

    public class GeocodificacionResultadoDto
    {
        public List<GeocodificacionItemDto> Geocodificados { get; set; } = new();
        public List<GeocodificacionItemDto> SinResultado { get; set; } = new();
    }
}