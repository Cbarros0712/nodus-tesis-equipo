using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NODUS.Data;
using NODUS.Models;

namespace NODUS.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class InsumosController : ControllerBase
    {
        private const int MAX_NOMBRE = 100;
        private const int MAX_TIPO = 50;
        private const int MAX_STOCK = 1_000_000;

        private const string MSJ_NO_GUARDADO =
            "No se pudo guardar el insumo. Revisá los datos e intentá de nuevo.";

        private readonly NodusDbContext _db;

        public InsumosController(NodusDbContext db)
        {
            _db = db;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Insumo>>> GetInsumos()
        {
            var insumos = await _db.Insumos
                .OrderBy(i => i.Nombre)
                .ToListAsync();
            return Ok(insumos);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Insumo>> GetInsumo(int id)
        {
            var insumo = await _db.Insumos.FindAsync(id);
            if (insumo == null) return NotFound();
            return Ok(insumo);
        }

        [HttpGet("criticos")]
        public async Task<ActionResult<IEnumerable<Insumo>>> GetCriticos()
        {
            var criticos = await _db.Insumos
                .Where(i => i.StockActual < i.StockMinimo)
                .OrderBy(i => i.StockActual)
                .ToListAsync();
            return Ok(criticos);
        }

        [HttpPost]
        public async Task<ActionResult<Insumo>> PostInsumo(Insumo insumo)
        {
            insumo.IdInsumo = 0;
            var error = await ValidarInsumo(insumo, null);
            if (error != null) return BadRequest(error);

            _db.Insumos.Add(insumo);
            try { await _db.SaveChangesAsync(); }
            catch (DbUpdateException) { return BadRequest(MSJ_NO_GUARDADO); }

            return CreatedAtAction(nameof(GetInsumo), new { id = insumo.IdInsumo }, insumo);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> PutInsumo(int id, Insumo insumo)
        {
            if (id != insumo.IdInsumo) return BadRequest();

            if (!await _db.Insumos.AnyAsync(i => i.IdInsumo == id))
                return NotFound();

            var error = await ValidarInsumo(insumo, id);
            if (error != null) return BadRequest(error);

            _db.Entry(insumo).State = EntityState.Modified;

            try { await _db.SaveChangesAsync(); }
            catch (DbUpdateConcurrencyException)
            {
                if (!await _db.Insumos.AnyAsync(i => i.IdInsumo == id))
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
        public async Task<IActionResult> DeleteInsumo(int id)
        {
            var insumo = await _db.Insumos.FindAsync(id);
            if (insumo == null) return NotFound();

            var enUso = await _db.UsosInsumo.AnyAsync(u => u.IdInsumo == id);
            if (enUso)
                return BadRequest("No se puede eliminar: el insumo está referenciado en órdenes de trabajo. Considere ajustar su stock a 0 en lugar de eliminarlo.");

            _db.Insumos.Remove(insumo);
            try { await _db.SaveChangesAsync(); }
            catch (DbUpdateException)
            {
                return BadRequest("No se puede eliminar el insumo porque tiene registros asociados.");
            }
            return NoContent();
        }

        // Valida y normaliza (recorta espacios) los datos. idActual es null al crear.
        private async Task<string?> ValidarInsumo(Insumo insumo, int? idActual)
        {
            insumo.Nombre = (insumo.Nombre ?? string.Empty).Trim();
            insumo.Tipo = (insumo.Tipo ?? string.Empty).Trim();

            if (insumo.Nombre.Length == 0)
                return "El nombre del insumo es obligatorio.";
            if (insumo.Nombre.Length > MAX_NOMBRE)
                return $"El nombre no puede superar los {MAX_NOMBRE} caracteres.";
            if (insumo.Tipo.Length == 0)
                return "El tipo de insumo es obligatorio.";
            if (insumo.Tipo.Length > MAX_TIPO)
                return $"El tipo no puede superar los {MAX_TIPO} caracteres.";

            if (insumo.StockActual < 0 || insumo.StockMinimo < 0)
                return "Los valores de stock no pueden ser negativos.";
            if (insumo.StockActual > MAX_STOCK || insumo.StockMinimo > MAX_STOCK)
                return $"Los valores de stock no pueden superar {MAX_STOCK:N0}.";

            var nombre = insumo.Nombre.ToLower();
            var duplicado = await _db.Insumos.AnyAsync(i =>
                i.Nombre.Trim().ToLower() == nombre && (idActual == null || i.IdInsumo != idActual));
            if (duplicado)
                return "Ya existe un insumo con ese nombre.";

            return null;
        }
    }
}