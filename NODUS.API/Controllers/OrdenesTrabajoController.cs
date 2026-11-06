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

        private const int MIN_SINTOMA = 10;
        private const int MAX_SINTOMA = 1000;

        private const string MSJ_NO_GUARDADA =
            "No se pudo guardar la orden de trabajo. Revisá los datos e intentá de nuevo.";

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
            LimpiarNavegacion(ot);
            var errorCampos = await ValidarCampos(ot);
            if (errorCampos != null) return BadRequest(errorCampos);

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

            try
            {
                await using var tx = await _db.Database.BeginTransactionAsync();
                _db.OrdenesTrabajo.Add(ot);
                await _db.SaveChangesAsync();
                await _estados.RecalcularEstadoEquipo(ot.IdEquipo);
                await _db.SaveChangesAsync();
                await tx.CommitAsync();
            }
            catch (DbUpdateException)
            {
                return BadRequest(MSJ_NO_GUARDADA);
            }

            return CreatedAtAction(nameof(GetOT), new { id = ot.IdOT }, ot);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> PutOT(int id, OrdenTrabajo ot)
        {
            if (id != ot.IdOT) return BadRequest();
            LimpiarNavegacion(ot);
            var errorCampos = await ValidarCampos(ot);
            if (errorCampos != null) return BadRequest(errorCampos);

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

            var aperturaDia = DateTime.SpecifyKind(ot.FechaApertura.Date, DateTimeKind.Utc);
            if (await _db.Intervenciones.AnyAsync(i => i.IdOT == id && i.Fecha < aperturaDia))
                return BadRequest("La fecha de apertura no puede ser posterior a la de tareas ya registradas en esta OT.");

            _db.Entry(ot).State = EntityState.Modified;

            try
            {
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
            }
            catch (DbUpdateException ex) when (ex is not DbUpdateConcurrencyException)
            {
                return BadRequest(MSJ_NO_GUARDADA);
            }

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

        private static DateTime HoyArgentina() => DateTime.UtcNow.AddHours(-3).Date;

        // Evita que el cliente cuele objetos anidados que EF intentaría insertar o modificar.
        private static void LimpiarNavegacion(OrdenTrabajo ot)
        {
            ot.Equipo = null;
            ot.Servicio = null;
            ot.Usuario = null;
            ot.Intervenciones?.Clear();
            ot.UsosInsumo?.Clear();
        }

        private async Task<string?> ValidarCampos(OrdenTrabajo ot)
        {
            ot.Tipo = (ot.Tipo ?? string.Empty).Trim();
            if (ot.Tipo.Length == 0 || !TIPOS_VALIDOS.Contains(ot.Tipo))
                return $"Tipo de OT inválido. Valores permitidos: {string.Join(", ", TIPOS_VALIDOS)}.";

            ot.Sintoma = (ot.Sintoma ?? string.Empty).Trim();
            if (ot.Sintoma.Length == 0)
                return "El síntoma o descripción del trabajo es obligatorio.";
            if (ot.Sintoma.Length < MIN_SINTOMA)
                return $"La descripción del trabajo debe tener al menos {MIN_SINTOMA} caracteres.";
            if (ot.Sintoma.Length > MAX_SINTOMA)
                return $"La descripción del trabajo no puede superar los {MAX_SINTOMA} caracteres.";

            if (ot.FechaApertura == default)
                return "La fecha de apertura es obligatoria.";
            if (ot.FechaApertura.Date > HoyArgentina())
                return "La fecha de apertura no puede ser futura.";

            if (!await _db.Servicios.AnyAsync(s => s.IdServicio == ot.IdServicio))
                return "El servicio seleccionado no existe.";
            if (!await _db.Usuarios.AnyAsync(u => u.IdUsuario == ot.IdUsuario))
                return "El responsable seleccionado no existe.";

            return null;
        }
    }
}