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
        public async Task<ActionResult<Sector>> PostSector(Sector sector)
        {
            if (string.IsNullOrWhiteSpace(sector.Nombre))
                return BadRequest("El nombre del sector es obligatorio.");

            var existe = await _db.Sectores.AnyAsync(s => s.Nombre.ToLower() == sector.Nombre.ToLower());
            if (existe)
                return BadRequest("Ya existe un sector con ese nombre.");

            _db.Sectores.Add(sector);
            await _db.SaveChangesAsync();

            return CreatedAtAction(nameof(GetSector), new { id = sector.IdSector }, sector);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> PutSector(int id, Sector sector)
        {
            if (id != sector.IdSector)
                return BadRequest();

            _db.Entry(sector).State = EntityState.Modified;

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
            await _db.SaveChangesAsync();
            return NoContent();
        }
    }
}