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
        private const int MAX_NOMBRE = 100;
        private const int MAX_SECTOR = 100;

        private const string MSJ_NO_GUARDADO =
            "No se pudo guardar el servicio. Revisá los datos e intentá de nuevo.";

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
        public async Task<ActionResult<Servicio>> PostServicio(Servicio entrada)
        {
            var error = await ValidarServicio(entrada, null);
            if (error != null) return BadRequest(error);

            // Se copian solo los campos conocidos: así no se pueden colar OTs, traslados u otros objetos anidados.
            var servicio = new Servicio
            {
                Nombre = entrada.Nombre,
                Sector = entrada.Sector
            };

            _db.Servicios.Add(servicio);
            try { await _db.SaveChangesAsync(); }
            catch (DbUpdateException) { return BadRequest(MSJ_NO_GUARDADO); }

            return CreatedAtAction(nameof(GetServicio), new { id = servicio.IdServicio }, servicio);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> PutServicio(int id, Servicio entrada)
        {
            if (id != entrada.IdServicio)
                return BadRequest();

            var servicio = await _db.Servicios.FindAsync(id);
            if (servicio == null)
                return NotFound();

            var error = await ValidarServicio(entrada, id);
            if (error != null) return BadRequest(error);

            servicio.Nombre = entrada.Nombre;
            servicio.Sector = entrada.Sector;

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
            catch (DbUpdateException)
            {
                return BadRequest(MSJ_NO_GUARDADO);
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
                     || await _db.Ubicaciones.AnyAsync(u => u.IdServicio == id)
                     || await _db.ReportesFalla.AnyAsync(r => r.IdServicio == id);

            if (enUso)
                return BadRequest("No se puede eliminar: el servicio está referenciado en órdenes de trabajo, traslados o reportes de falla.");

            _db.Servicios.Remove(servicio);
            try { await _db.SaveChangesAsync(); }
            catch (DbUpdateException)
            {
                return BadRequest("No se puede eliminar el servicio porque tiene registros asociados.");
            }
            return NoContent();
        }

        private static string? Limpiar(string? texto)
        {
            var t = texto?.Trim();
            return string.IsNullOrEmpty(t) ? null : t;
        }

        // Valida y normaliza (recorta espacios, vacío = sin dato). idActual es null al crear.
        private async Task<string?> ValidarServicio(Servicio s, int? idActual)
        {
            s.Nombre = (s.Nombre ?? string.Empty).Trim();
            s.Sector = Limpiar(s.Sector);

            if (s.Nombre.Length == 0)
                return "El nombre del servicio es obligatorio.";
            if (s.Nombre.Length > MAX_NOMBRE)
                return $"El nombre no puede superar los {MAX_NOMBRE} caracteres.";
            if (s.Sector != null && s.Sector.Length > MAX_SECTOR)
                return $"El sector no puede superar los {MAX_SECTOR} caracteres.";

            var nombre = s.Nombre.ToLower();
            var sector = (s.Sector ?? string.Empty).ToLower();
            var duplicado = await _db.Servicios.AnyAsync(x =>
                x.Nombre.Trim().ToLower() == nombre &&
                (x.Sector ?? "").Trim().ToLower() == sector &&
                (idActual == null || x.IdServicio != idActual));
            if (duplicado)
                return "Ya existe un servicio con ese nombre en ese sector.";

            return null;
        }
    }
}