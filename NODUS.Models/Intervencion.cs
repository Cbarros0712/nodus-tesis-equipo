namespace NODUS.Models
{
    public class Intervencion
    {
        public int IdIntervencion { get; set; }
        public string TareasRealizadas { get; set; } = string.Empty;
        public int TiempoEmpleado { get; set; }
        public string ResultadoSegElectrica { get; set; } = string.Empty;
        public DateTime Fecha { get; set; }
        public DateTime? FechaFin { get; set; }

        public int IdOT { get; set; }
        public OrdenTrabajo? OrdenTrabajo { get; set; }

        public int IdUsuario { get; set; }
        public Usuario? Usuario { get; set; }
    }
}
