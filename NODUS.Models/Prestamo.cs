namespace NODUS.Models
{
    public class Prestamo
    {
        public int IdPrestamo { get; set; }
        public DateTime FechaPrestamo { get; set; }
        public DateTime? FechaEstimadaDevolucion { get; set; }

        public DateTime? FechaEstimadaDevolucionOriginal { get; set; }
        public DateTime? FechaDevolucionReal { get; set; }
        public string Estado { get; set; } = "En préstamo";
        public string? Motivo { get; set; }
        public string? Observaciones { get; set; }

        public string NumeroRemito { get; set; } = string.Empty;
        public string? RutaRemitoPdf { get; set; }

        public DateTime? FechaEmisionRemito { get; set; }

        public string? RutaRemitoSalidaFirmado { get; set; }
        public DateTime? FechaCargaFirmaSalida { get; set; }

        public string? NumeroRemitoDevolucion { get; set; }
        public string? RutaRemitoDevolucionPdf { get; set; }

        public string? ObservacionesDevolucion { get; set; }
        public string? RutaRemitoDevolucionFirmado { get; set; }
        public DateTime? FechaCargaFirmaDevolucion { get; set; }

        public int IdEquipo { get; set; }
        public Equipo? Equipo { get; set; }

        public int IdHospital { get; set; }
        public HospitalExterno? Hospital { get; set; }

        public int IdUsuario { get; set; }
        public Usuario? Usuario { get; set; }

        public ICollection<PrestamoComponente> PrestamoComponentes { get; set; } = new List<PrestamoComponente>();
        public ICollection<ProrrogaPrestamo> Prorrogas { get; set; } = new List<ProrrogaPrestamo>();
    }
}