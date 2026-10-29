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
        private readonly NodusDbContext _db;

        public TiposActivoController(NodusDbContext db)
        {
            _db = db;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<TipoActivo>>> GetTipos()
        {
            return await _db.TiposActivo.ToListAsync();
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<TipoActivo>> GetTipo(int id)
        {
            var tipo = await _db.TiposActivo.FindAsync(id);
            if (tipo == null) return NotFound();
            return tipo;
        }

        [HttpPost]
        public async Task<ActionResult<TipoActivo>> PostTipo(TipoActivo tipo)
        {
            if (string.IsNullOrWhiteSpace(tipo.Nombre))
                return BadRequest("El nombre es obligatorio.");

            _db.TiposActivo.Add(tipo);
            await _db.SaveChangesAsync();
            return CreatedAtAction(nameof(GetTipo), new { id = tipo.IdTipo }, tipo);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> PutTipo(int id, TipoActivo tipo)
        {
            if (id != tipo.IdTipo) return BadRequest();
            _db.Entry(tipo).State = EntityState.Modified;
            await _db.SaveChangesAsync();
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
            await _db.SaveChangesAsync();
            return NoContent();
        }
    }
}