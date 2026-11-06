using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NODUS.Data;
using NODUS.Models;

namespace NODUS.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TiposActivoController : ControllerBase
    {
        private const int MAX_NOMBRE = 100;

        private const string MSJ_NO_GUARDADO =
            "No se pudo guardar el tipo de activo. Revisá los datos e intentá de nuevo.";

        private readonly NodusDbContext _db;

        public TiposActivoController(NodusDbContext db)
        {
            _db = db;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<TipoActivo>>> GetTipos()
        {
            return await _db.TiposActivo.OrderBy(t => t.Nombre).ToListAsync();
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<TipoActivo>> GetTipo(int id)
        {
            var tipo = await _db.TiposActivo.FindAsync(id);
            if (tipo == null) return NotFound();
            return tipo;
        }

        [HttpPost]
        public async Task<ActionResult<TipoActivo>> PostTipo(TipoActivo entrada)
        {
            var error = await ValidarTipo(entrada, null);
            if (error != null) return BadRequest(error);

            // Solo se copian los campos conocidos (evita overposting de equipos anidados).
            var tipo = new TipoActivo { Nombre = entrada.Nombre };

            _db.TiposActivo.Add(tipo);
            try { await _db.SaveChangesAsync(); }
            catch (DbUpdateException) { return BadRequest(MSJ_NO_GUARDADO); }

            return CreatedAtAction(nameof(GetTipo), new { id = tipo.IdTipo }, tipo);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> PutTipo(int id, TipoActivo entrada)
        {
            if (id != entrada.IdTipo) return BadRequest();

            var tipo = await _db.TiposActivo.FindAsync(id);
            if (tipo == null) return NotFound();

            var error = await ValidarTipo(entrada, id);
            if (error != null) return BadRequest(error);

            tipo.Nombre = entrada.Nombre;

            try { await _db.SaveChangesAsync(); }
            catch (DbUpdateConcurrencyException)
            {
                if (!await _db.TiposActivo.AnyAsync(t => t.IdTipo == id)) return NotFound();
                throw;
            }
            catch (DbUpdateException) { return BadRequest(MSJ_NO_GUARDADO); }

            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTipo(int id)
        {
            var tipo = await _db.TiposActivo.FindAsync(id);
            if (tipo == null) return NotFound();

            var tieneEquipos = await _db.Equipos.AnyAsync(e => e.IdTipo == id);
            if (tieneEquipos)
                return BadRequest("No se puede eliminar: tiene equipos asociados.");

            _db.TiposActivo.Remove(tipo);
            try { await _db.SaveChangesAsync(); }
            catch (DbUpdateException)
            {
                return BadRequest("No se puede eliminar el tipo de activo porque tiene registros asociados.");
            }
            return NoContent();
        }

        private async Task<string?> ValidarTipo(TipoActivo t, int? idActual)
        {
            t.Nombre = (t.Nombre ?? string.Empty).Trim();

            if (t.Nombre.Length == 0)
                return "El nombre es obligatorio.";
            if (t.Nombre.Length > MAX_NOMBRE)
                return $"El nombre no puede superar los {MAX_NOMBRE} caracteres.";

            var nombre = t.Nombre.ToLower();
            var duplicado = await _db.TiposActivo.AnyAsync(x =>
                x.Nombre.Trim().ToLower() == nombre && (idActual == null || x.IdTipo != idActual));
            if (duplicado)
                return "Ya existe un tipo de activo con ese nombre.";

            return null;
        }
    }
}