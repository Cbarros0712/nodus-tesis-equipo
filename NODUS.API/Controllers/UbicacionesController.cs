using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NODUS.Data;
using NODUS.Models;

namespace NODUS.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UbicacionesController : ControllerBase
    {
        private readonly NodusDbContext _db;

        public UbicacionesController(NodusDbContext db)
        {
            _db = db;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Ubicacion>>> GetUbicaciones()
        {
            var ubicaciones = await _db.Ubicaciones
                .Include(u => u.Equipo)
                .Include(u => u.Servicio)
                .Include(u => u.Usuario)
                .Include(u => u.SectorAnterior)
                .Include(u => u.SectorNuevo)
                .OrderByDescending(u => u.FechaTraslado)
                .ToListAsync();

            return Ok(ubicaciones);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Ubicacion>> GetUbicacion(int id)
        {
            var ubicacion = await _db.Ubicaciones
                .Include(u => u.Equipo)
                .Include(u => u.Servicio)
                .Include(u => u.Usuario)
                .Include(u => u.SectorAnterior)
                .Include(u => u.SectorNuevo)
                .FirstOrDefaultAsync(u => u.IdUbicacion == id);

            if (ubicacion == null)
                return NotFound();

            return Ok(ubicacion);
        }

        [HttpPost]
        public async Task<ActionResult<Ubicacion>> PostUbicacion(Ubicacion ubicacion)
        {
            if (ubicacion.IdSectorAnterior == ubicacion.IdSectorNuevo)
                return BadRequest("El sector de origen y el sector destino no pueden ser iguales.");

            ubicacion.FechaTraslado = DateTime.SpecifyKind(ubicacion.FechaTraslado, DateTimeKind.Utc);

            _db.Ubicaciones.Add(ubicacion);
            await _db.SaveChangesAsync();

            return CreatedAtAction(nameof(GetUbicacion), new { id = ubicacion.IdUbicacion }, ubicacion);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> PutUbicacion(int id, Ubicacion ubicacion)
        {
            if (id != ubicacion.IdUbicacion)
                return BadRequest();

            if (ubicacion.IdSectorAnterior == ubicacion.IdSectorNuevo)
                return BadRequest("El sector de origen y el sector destino no pueden ser iguales.");

            ubicacion.FechaTraslado = DateTime.SpecifyKind(ubicacion.FechaTraslado, DateTimeKind.Utc);

            _db.Entry(ubicacion).State = EntityState.Modified;

            try
            {
                await _db.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!await _db.Ubicaciones.AnyAsync(u => u.IdUbicacion == id))
                    return NotFound();
                throw;
            }

            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteUbicacion(int id)
        {
            var ubicacion = await _db.Ubicaciones.FindAsync(id);
            if (ubicacion == null)
                return NotFound();

            _db.Ubicaciones.Remove(ubicacion);
            await _db.SaveChangesAsync();
            return NoContent();
        }
    }
}