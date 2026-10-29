using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NODUS.API.Services;
using NODUS.Data;
using NODUS.Models;

namespace NODUS.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class OrdenesTrabajoController : ControllerBase
    {
        private readonly NodusDbContext _db;
        private readonly EstadosOTService _estados;

        private const int ID_ESTADO_EN_PRESTAMO = EstadosOTService.ID_ESTADO_EN_PRESTAMO;
        private const int ID_ESTADO_BAJA_PATRIMONIAL = EstadosOTService.ID_ESTADO_BAJA_PATRIMONIAL;

        private const string MSJ_EQUIPO_EN_PRESTAMO =
            "El equipo está en préstamo. Registrá la devolución antes de crear una orden de trabajo.";

        private static readonly string[] TIPOS_VALIDOS = { "Correctiva", "Preventiva", "Calibración", "Verificación de seguridad eléctrica" };

        public OrdenesTrabajoController(NodusDbContext db, EstadosOTService estados)
        {
            _db = db;
            _estados = estados;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<OrdenTrabajo>>> GetOTs()
        {
            var ots = await _db.OrdenesTrabajo
                .Include(o => o.Equipo).ThenInclude(e => e!.Marca)
                .Include(o => o.Equipo).ThenInclude(e => e!.TipoActivo)
                .Include(o => o.Servicio)
                .Include(o => o.Usuario)
                .OrderByDescending(o => o.FechaApertura)
                .ToListAsync();
            return Ok(ots);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<OrdenTrabajo>> GetOT(int id)
        {
            var ot = await _db.OrdenesTrabajo
                .Include(o => o.Equipo).ThenInclude(e => e!.Marca)
                .Include(o => o.Equipo).ThenInclude(e => e!.TipoActivo)
                .Include(o => o.Servicio)
                .Include(o => o.Usuario)
                .Include(o => o.Intervenciones)
                .Include(o => o.UsosInsumo).ThenInclude(u => u.Insumo)
                .FirstOrDefaultAsync(o => o.IdOT == id);

            if (ot == null) return NotFound();
            return Ok(ot);
        }

        [HttpGet("abiertas")]
        public async Task<ActionResult<IEnumerable<OrdenTrabajo>>> GetAbiertas()
        {
            var ots = await _db.OrdenesTrabajo
                .Include(o => o.Equipo)
                .Include(o => o.Servicio)
                .Where(o => o.Estado == "Pendiente" || o.Estado == "En curso")
                .OrderBy(o => o.FechaApertura)
                .ToListAsync();
            return Ok(ots);
        }

        [HttpPost]
        public async Task<ActionResult<OrdenTrabajo>> PostOT(OrdenTrabajo ot)
        {
            if (string.IsNullOrWhiteSpace(ot.Tipo) || !TIPOS_VALIDOS.Contains(ot.Tipo))
                return BadRequest($"Tipo de OT inválido. Valores permitidos: {string.Join(", ", TIPOS_VALIDOS)}.");
            if (string.IsNullOrWhiteSpace(ot.Sintoma))
                return BadRequest("El síntoma o descripción del trabajo es obligatorio.");

            ot.Estado = "Pendiente";
            ot.FechaCierre = null;
            ot.FechaApertura = DateTime.SpecifyKind(ot.FechaApertura, DateTimeKind.Utc);

            var equipo = await _db.Equipos.FindAsync(ot.IdEquipo);

            if (equipo == null) return BadRequest("El equipo seleccionado no existe.");

            if (equipo.IdEstado == ID_ESTADO_BAJA_PATRIMONIAL)
            {
                return BadRequest("Error: Equipo inactivo por baja técnica definitiva.");
            }

            if (equipo.IdEstado == ID_ESTADO_EN_PRESTAMO)
                return BadRequest(MSJ_EQUIPO_EN_PRESTAMO);

            await using var tx = await _db.Database.BeginTransactionAsync();
            _db.OrdenesTrabajo.Add(ot);
            await _db.SaveChangesAsync();
            await _estados.RecalcularEstadoEquipo(ot.IdEquipo);
            await _db.SaveChangesAsync();
            await tx.CommitAsync();

            return CreatedAtAction(nameof(GetOT), new { id = ot.IdOT }, ot);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> PutOT(int id, OrdenTrabajo ot)
        {
            if (id != ot.IdOT) return BadRequest();
            if (!TIPOS_VALIDOS.Contains(ot.Tipo))
                return BadRequest($"Tipo de OT inválido.");

            var otAnterior = await _db.OrdenesTrabajo.AsNoTracking().FirstOrDefaultAsync(o => o.IdOT == id);
            if (otAnterior == null) return NotFound();

            if (otAnterior.Estado == "Cerrada" || otAnterior.Estado == "Anulada")
            {
                return BadRequest("Consulta: Los registros finalizados son inalterables por auditoría.");
            }

            bool cambioEquipo = ot.IdEquipo != otAnterior.IdEquipo;
            if (cambioEquipo)
            {
                var equipoNuevo = await _db.Equipos.FindAsync(ot.IdEquipo);

                if (equipoNuevo == null)
                    return BadRequest("El equipo seleccionado no existe.");

                if (equipoNuevo.IdEstado == ID_ESTADO_BAJA_PATRIMONIAL)
                {
                    return BadRequest("Error: Equipo inactivo por baja técnica definitiva.");
                }
            }

            if (cambioEquipo)
            {
                var equipoDestino = await _db.Equipos.FindAsync(ot.IdEquipo);
                if (equipoDestino?.IdEstado == ID_ESTADO_EN_PRESTAMO)
                    return BadRequest(MSJ_EQUIPO_EN_PRESTAMO);
            }

            ot.Estado = otAnterior.Estado;
            ot.FechaCierre = otAnterior.FechaCierre;
            ot.FechaApertura = DateTime.SpecifyKind(ot.FechaApertura, DateTimeKind.Utc);

            _db.Entry(ot).State = EntityState.Modified;

            await using var tx = await _db.Database.BeginTransactionAsync();
            try { await _db.SaveChangesAsync(); }
            catch (DbUpdateConcurrencyException)
            {
                if (!await _db.OrdenesTrabajo.AnyAsync(o => o.IdOT == id)) return NotFound();
                throw;
            }

            await _estados.RecalcularEstadoEquipo(ot.IdEquipo);
            if (cambioEquipo)
                await _estados.RecalcularEstadoEquipo(otAnterior.IdEquipo);
            await _db.SaveChangesAsync();
            await tx.CommitAsync();

            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteOT(int id)
        {
            var ot = await _db.OrdenesTrabajo.FindAsync(id);
            if (ot == null) return NotFound();

            if (ot.Estado == "Cerrada" || ot.Estado == "Anulada")
            {
                return BadRequest("Consulta: Los registros finalizados son inalterables por auditoría.");
            }

            var tieneIntervenciones = await _db.Intervenciones.AnyAsync(i => i.IdOT == id);
            var tieneUsoInsumo = await _db.UsosInsumo.AnyAsync(u => u.IdOT == id);
            if (tieneIntervenciones || tieneUsoInsumo)
                return BadRequest("No se puede eliminar: la OT tiene intervenciones o uso de insumos asociados. Considere anularla en lugar de eliminarla.");

            await using var tx = await _db.Database.BeginTransactionAsync();
            _db.OrdenesTrabajo.Remove(ot);
            await _db.SaveChangesAsync();
            await _estados.RecalcularEstadoEquipo(ot.IdEquipo);
            await _db.SaveChangesAsync();
            await tx.CommitAsync();
            return NoContent();
        }
    }
}