using System.ComponentModel.DataAnnotations;

namespace NODUS.Models
{
    public class Sector
    {
        public int IdSector { get; set; }

        [Required(ErrorMessage = "El nombre del sector es obligatorio")]
        [StringLength(100, ErrorMessage = "El nombre no puede superar los 100 caracteres")]
        public string Nombre { get; set; } = string.Empty;

        [StringLength(250)]
        public string? Descripcion { get; set; }

        public bool Activo { get; set; } = true;
    }
}