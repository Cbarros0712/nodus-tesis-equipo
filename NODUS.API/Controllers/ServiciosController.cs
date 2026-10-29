using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NODUS.API.DTOs;
using NODUS.API.Services;
using NODUS.Data;
using NODUS.Models;

namespace NODUS.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ServiciosController : ControllerBase
    {
        private readonly NodusDbContext _db;

        public ServiciosController(NodusDbContext db)
        {
            _db = db;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Servicio>>> GetServicios()
        {
            var servicios = await _db.Servicios
                .OrderBy(s => s.Nombre)
                .ToListAsync();
            return Ok(servicios);
        }

        [HttpGet("catalogo")]
        [Authorize(Policy = Politicas.CualquierUsuario)]
        public async Task<ActionResult<IEnumerable<ServicioCatalogoDto>>> GetCatalogo()
        {
            var servicios = await _db.Servicios
                .AsNoTracking()
                .OrderBy(s => s.Nombre)
                .Select(s => new ServicioCatalogoDto { IdServicio = s.IdServicio, Nombre = s.Nombre })
                .ToListAsync();
            return Ok(servicios);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Servicio>> GetServicio(int id)
        {
            var servicio = await _db.Servicios.FindAsync(id);
            if (servicio == null)
                return NotFound();
            return Ok(servicio);
        }

        [HttpPost]
        public async Task<ActionResult<Servicio>> PostServicio(Servicio servicio)
        {
            if (string.IsNullOrWhiteSpace(servicio.Nombre))
                return BadRequest("El nombre del servicio es obligatorio.");

            _db.Servicios.Add(servicio);
            await _db.SaveChangesAsync();

            return CreatedAtAction(nameof(GetServicio), new { id = servicio.IdServicio }, servicio);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> PutServicio(int id, Servicio servicio)
        {
            if (id != servicio.IdServicio)
                return BadRequest();

            _db.Entry(servicio).State = EntityState.Modified;

            try
            {
                await _db.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!await _db.Servicios.AnyAsync(s => s.IdServicio == id))
                    return NotFound();
                throw;
            }

            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteServicio(int id)
        {
            var servicio = await _db.Servicios.FindAsync(id);
            if (servicio == null)
                return NotFound();

            var enUso = await _db.OrdenesTrabajo.AnyAsync(o => o.IdServicio == id)
                     || await _db.Ubicaciones.AnyAsync(u => u.IdServicio == id);

            if (enUso)
                return BadRequest("No se puede eliminar: el servicio está referenciado en órdenes de trabajo o traslados.");

            _db.Servicios.Remove(servicio);
            await _db.SaveChangesAsync();
            return NoContent();
        }
    }
}
