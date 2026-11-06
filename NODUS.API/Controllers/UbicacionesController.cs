using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NODUS.API.Services;
using NODUS.Data;
using NODUS.Models;

namespace NODUS.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UbicacionesController : ControllerBase
    {
        private const string MSJ_NO_GUARDADA =
            "No se pudo guardar el traslado. Revisá los datos e intentá de nuevo.";
        private const string MSJ_SOLO_ULTIMO =
            "Solo se puede modificar o eliminar el último traslado de cada equipo, para no alterar el historial de ubicaciones.";

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
            LimpiarNavegacion(ubicacion);
            ubicacion.IdUbicacion = 0;

            var equipo = await _db.Equipos.FindAsync(ubicacion.IdEquipo);
            if (equipo == null)
                return BadRequest("El equipo seleccionado no existe.");
            if (equipo.IdEstado == EstadosOTService.ID_ESTADO_BAJA_PATRIMONIAL)
                return BadRequest("No se puede trasladar un equipo dado de baja.");
            if (equipo.IdEstado == EstadosOTService.ID_ESTADO_EN_PRESTAMO)
                return BadRequest("El equipo está en préstamo externo. Registrá la devolución antes de trasladarlo.");

            var error = await ValidarTraslado(ubicacion, null);
            if (error != null) return BadRequest(error);

            ubicacion.FechaTraslado = DateTime.SpecifyKind(ubicacion.FechaTraslado, DateTimeKind.Utc);

            _db.Ubicaciones.Add(ubicacion);
            try { await _db.SaveChangesAsync(); }
            catch (DbUpdateException) { return BadRequest(MSJ_NO_GUARDADA); }

            return CreatedAtAction(nameof(GetUbicacion), new { id = ubicacion.IdUbicacion }, ubicacion);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> PutUbicacion(int id, Ubicacion ubicacion)
        {
            if (id != ubicacion.IdUbicacion)
                return BadRequest();
            LimpiarNavegacion(ubicacion);

            var anterior = await _db.Ubicaciones.AsNoTracking().FirstOrDefaultAsync(u => u.IdUbicacion == id);
            if (anterior == null)
                return NotFound();

            if (ubicacion.IdEquipo != anterior.IdEquipo)
                return BadRequest("No se puede cambiar el equipo de un traslado ya registrado.");

            var ultima = await UltimaDelEquipo(anterior.IdEquipo, null);
            if (ultima == null || ultima.IdUbicacion != id)
                return BadRequest(MSJ_SOLO_ULTIMO);

            var error = await ValidarTraslado(ubicacion, id);
            if (error != null) return BadRequest(error);

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
            catch (DbUpdateException)
            {
                return BadRequest(MSJ_NO_GUARDADA);
            }

            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteUbicacion(int id)
        {
            var ubicacion = await _db.Ubicaciones.FindAsync(id);
            if (ubicacion == null)
                return NotFound();

            var ultima = await UltimaDelEquipo(ubicacion.IdEquipo, null);
            if (ultima == null || ultima.IdUbicacion != id)
                return BadRequest(MSJ_SOLO_ULTIMO);

            _db.Ubicaciones.Remove(ubicacion);
            try { await _db.SaveChangesAsync(); }
            catch (DbUpdateException)
            {
                return BadRequest("No se puede eliminar el traslado porque tiene registros asociados.");
            }
            return NoContent();
        }

        private static DateTime HoyArgentina() => DateTime.UtcNow.AddHours(-3).Date;

        // Evita que el cliente cuele objetos anidados que EF intentaría insertar o modificar.
        private static void LimpiarNavegacion(Ubicacion u)
        {
            u.Equipo = null;
            u.Servicio = null;
            u.Usuario = null;
            u.SectorAnterior = null;
            u.SectorNuevo = null;
        }

        private Task<Ubicacion?> UltimaDelEquipo(int idEquipo, int? excluirId) =>
            _db.Ubicaciones.AsNoTracking()
                .Where(u => u.IdEquipo == idEquipo && (excluirId == null || u.IdUbicacion != excluirId))
                .OrderByDescending(u => u.FechaTraslado).ThenByDescending(u => u.IdUbicacion)
                .FirstOrDefaultAsync();

        // idActual es null al crear; al editar es el traslado que se modifica (se compara con el anterior a él).
        private async Task<string?> ValidarTraslado(Ubicacion u, int? idActual)
        {
            if (u.FechaTraslado == default)
                return "La fecha del traslado es obligatoria.";
            if (u.FechaTraslado.Date > HoyArgentina())
                return "La fecha del traslado no puede ser futura.";

            if (await _db.Servicios.FindAsync(u.IdServicio) == null)
                return "El servicio seleccionado no existe.";
            if (await _db.Usuarios.FindAsync(u.IdUsuario) == null)
                return "El usuario responsable seleccionado no existe.";

            if (u.IdSectorAnterior == u.IdSectorNuevo)
                return "El sector de origen y el sector destino no pueden ser iguales.";
            if (await _db.Set<Sector>().FindAsync(u.IdSectorAnterior) == null)
                return "El sector de origen seleccionado no existe.";
            var destino = await _db.Set<Sector>().FindAsync(u.IdSectorNuevo);
            if (destino == null)
                return "El sector destino seleccionado no existe.";

            var previa = await UltimaDelEquipo(u.IdEquipo, idActual);
            if (previa != null)
            {
                if (u.FechaTraslado.Date < previa.FechaTraslado.Date)
                    return $"La fecha del traslado no puede ser anterior a la del traslado previo ({previa.FechaTraslado:dd/MM/yyyy}).";

                if (previa.IdSectorNuevo != u.IdSectorAnterior)
                {
                    var actual = await _db.Set<Sector>().FindAsync(previa.IdSectorNuevo);
                    return $"El sector de origen no coincide con la ubicación actual del equipo ({actual?.Nombre ?? "otro sector"}).";
                }
            }

            return null;
        }
    }
}