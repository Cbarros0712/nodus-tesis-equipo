namespace NODUS.Models
{
    public class Equipo
    {
        public int IdEquipo { get; set; }
        public string Modelo { get; set; } = string.Empty;
        public string NroSerie { get; set; } = string.Empty;
        public DateTime FechaAdquisicion { get; set; }
        public DateTime? VencimientoGarantia { get; set; }

        public int IdMarca { get; set; }
        public Marca? Marca { get; set; }

        public int IdTipo { get; set; }
        public TipoActivo? TipoActivo { get; set; }

        public int IdEstado { get; set; }
        public EstadoEquipo? EstadoEquipo { get; set; }

        public ICollection<OrdenTrabajo> OrdenesTrabajo { get; set; } = new List<OrdenTrabajo>();
        public ICollection<Ubicacion> Ubicaciones { get; set; } = new List<Ubicacion>();
        public ICollection<BajaPatrimonial> Bajas { get; set; } = new List<BajaPatrimonial>();
        public ICollection<Alerta> Alertas { get; set; } = new List<Alerta>();
        public ICollection<EquipoComponente> EquipoComponentes { get; set; } = new List<EquipoComponente>();
        public ICollection<Prestamo> Prestamos { get; set; } = new List<Prestamo>();
    }
}