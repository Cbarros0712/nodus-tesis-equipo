using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NODUS.Data;
using NODUS.Models;

namespace NODUS.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class MarcasController : ControllerBase
    {
        private readonly NodusDbContext _db;

        public MarcasController(NodusDbContext db)
        {
            _db = db;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Marca>>> GetMarcas()
        {
            return await _db.Marcas.ToListAsync();
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Marca>> GetMarca(int id)
        {
            var marca = await _db.Marcas.FindAsync(id);
            if (marca == null) return NotFound();
            return marca;
        }

        [HttpPost]
        public async Task<ActionResult<Marca>> PostMarca(Marca marca)
        {
            if (string.IsNullOrWhiteSpace(marca.Nombre))
                return BadRequest("El nombre de la marca es obligatorio.");

            _db.Marcas.Add(marca);
            await _db.SaveChangesAsync();
            return CreatedAtAction(nameof(GetMarca), new { id = marca.IdMarca }, marca);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> PutMarca(int id, Marca marca)
        {
            if (id != marca.IdMarca) return BadRequest();
            if (string.IsNullOrWhiteSpace(marca.Nombre))
                return BadRequest("El nombre de la marca es obligatorio.");

            _db.Entry(marca).State = EntityState.Modified;

            try
            {
                await _db.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!_db.Marcas.Any(e => e.IdMarca == id)) return NotFound();
                throw;
            }

            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteMarca(int id)
        {
            var marca = await _db.Marcas.FindAsync(id);
            if (marca == null) return NotFound();

            var tieneEquipos = await _db.Equipos.AnyAsync(e => e.IdMarca == id);
            if (tieneEquipos)
                return BadRequest("No se puede eliminar: tiene equipos asociados.");

            _db.Marcas.Remove(marca);
            await _db.SaveChangesAsync();
            return NoContent();
        }
    }
}