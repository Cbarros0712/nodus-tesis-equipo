namespace NODUS.Models
{
    public class HojaDeVida
    {
        public int IdHoja { get; set; }
        public DateTime FechaApertura { get; set; }

        public int IdEquipo { get; set; }
        public Equipo? Equipo { get; set; }
    }
}
