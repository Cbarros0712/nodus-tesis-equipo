namespace NODUS.API.DTOs
{
    public class ProrrogaInputDto
    {
        public DateTime FechaNueva { get; set; }
        public string Motivo { get; set; } = string.Empty;
        public int IdUsuario { get; set; }
    }
}
