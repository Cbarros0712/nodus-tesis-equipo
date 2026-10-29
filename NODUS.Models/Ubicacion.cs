namespace NODUS.Models
{
    public class Ubicacion
    {
        public int IdUbicacion { get; set; }
        public DateTime FechaTraslado { get; set; }

        public int IdSectorAnterior { get; set; }
        public Sector? SectorAnterior { get; set; }

        public int IdSectorNuevo { get; set; }
        public Sector? SectorNuevo { get; set; }

        public int IdEquipo { get; set; }
        public Equipo? Equipo { get; set; }

        public int IdServicio { get; set; }
        public Servicio? Servicio { get; set; }

        public int IdUsuario { get; set; }
        public Usuario? Usuario { get; set; }
    }
}