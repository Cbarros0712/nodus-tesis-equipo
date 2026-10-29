namespace NODUS.Models
{
    public class UsoInsumo
    {
        public int IdUso { get; set; }
        public int Cantidad { get; set; }

        public int IdInsumo { get; set; }
        public Insumo? Insumo { get; set; }

        public int IdOT { get; set; }
        public OrdenTrabajo? OrdenTrabajo { get; set; }
    }
}
