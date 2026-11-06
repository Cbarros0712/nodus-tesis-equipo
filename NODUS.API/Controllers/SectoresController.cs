using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NODUS.Data;
using NODUS.Models;

namespace NODUS.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SectoresController : ControllerBase
    {
        private const int MAX_NOMBRE = 100;
        private const int MAX_DESCRIPCION = 250;

        private const string MSJ_NO_GUARDADO =
            "No se pudo guardar el sector. Revisá los datos e intentá de nuevo.";

        private readonly NodusDbContext _db;

        public SectoresController(NodusDbContext db)
        {
            _db = db;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Sector>>> GetSectores()
        {
            var sectores = await _db.Sectores
                .OrderBy(s => s.Nombre)
                .ToListAsync();
            return Ok(sectores);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Sector>> GetSector(int id)
        {
            var sector = await _db.Sectores.FindAsync(id);
            if (sector == null)
                return NotFound();
            return Ok(sector);
        }

        [HttpPost]
        public async Task<ActionResult<Sector>> PostSector(Sector entrada)
        {
            var error = await ValidarSector(entrada, null);
            if (error != null) return BadRequest(error);

            // Se copian solo los campos conocidos: así no se pueden colar traslados u otros objetos anidados.
            var sector = new Sector
            {
                Nombre = entrada.Nombre,
                Descripcion = entrada.Descripcion,
                Activo = entrada.Activo
            };

            _db.Sectores.Add(sector);
            try { await _db.SaveChangesAsync(); }
            catch (DbUpdateException) { return BadRequest(MSJ_NO_GUARDADO); }

            return CreatedAtAction(nameof(GetSector), new { id = sector.IdSector }, sector);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> PutSector(int id, Sector entrada)
        {
            if (id != entrada.IdSector)
                return BadRequest();

            var sector = await _db.Sectores.FindAsync(id);
            if (sector == null)
                return NotFound();

            var error = await ValidarSector(entrada, id);
            if (error != null) return BadRequest(error);

            sector.Nombre = entrada.Nombre;
            sector.Descripcion = entrada.Descripcion;
            sector.Activo = entrada.Activo;

            try
            {
                await _db.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!await _db.Sectores.AnyAsync(s => s.IdSector == id))
                    return NotFound();
                throw;
            }
            catch (DbUpdateException)
            {
                return BadRequest(MSJ_NO_GUARDADO);
            }

            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteSector(int id)
        {
            var sector = await _db.Sectores.FindAsync(id);
            if (sector == null)
                return NotFound();

            var enUso = await _db.Ubicaciones.AnyAsync(u =>
                u.IdSectorAnterior == id || u.IdSectorNuevo == id);

            if (enUso)
                return BadRequest("No se puede eliminar: el sector está referenciado en al menos un traslado. Considere darlo de baja desactivando su estado en lugar de eliminarlo.");

            _db.Sectores.Remove(sector);
            try { await _db.SaveChangesAsync(); }
            catch (DbUpdateException)
            {
                return BadRequest("No se puede eliminar el sector porque tiene registros asociados.");
            }
            return NoContent();
        }

        private static string? Limpiar(string? texto)
        {
            var t = texto?.Trim();
            return string.IsNullOrEmpty(t) ? null : t;
        }

        // Valida y normaliza (recorta espacios, vacío = sin dato). idActual es null al crear.
        private async Task<string?> ValidarSector(Sector s, int? idActual)
        {
            s.Nombre = (s.Nombre ?? string.Empty).Trim();
            s.Descripcion = Limpiar(s.Descripcion);

            if (s.Nombre.Length == 0)
                return "El nombre del sector es obligatorio.";
            if (s.Nombre.Length > MAX_NOMBRE)
                return $"El nombre no puede superar los {MAX_NOMBRE} caracteres.";
            if (s.Descripcion != null && s.Descripcion.Length > MAX_DESCRIPCION)
                return $"La descripción no puede superar los {MAX_DESCRIPCION} caracteres.";

            var nombre = s.Nombre.ToLower();
            var duplicado = await _db.Sectores.AnyAsync(x =>
                x.Nombre.Trim().ToLower() == nombre && (idActual == null || x.IdSector != idActual));
            if (duplicado)
                return "Ya existe un sector con ese nombre.";

            return null;
        }
    }
}