using System.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NODUS.API.Services;
using NODUS.Data;
using NODUS.Models;
using Npgsql;

namespace NODUS.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class BajasPatrimonialesController : ControllerBase
    {
        private readonly NodusDbContext _db;
        private readonly EstadosOTService _estados;

        private const int ESTADO_EN_SERVICIO = 1;
        private const int ESTADO_BAJA_PATRIMONIAL = 5;

        private const int MIN_INFORME = 20;
        private const int MAX_INFORME = 2000;

        private const string MSJ_CONFLICTO =
            "Otro usuario modificó este equipo al mismo tiempo. Actualizá la pantalla e intentá de nuevo.";
        private const string MSJ_NO_GUARDADA =
            "No se pudo guardar la baja patrimonial. Revisá los datos e intentá de nuevo.";

        private static readonly string[] MOTIVOS_VALIDOS = {
            "Obsolescencia tecnológica",
            "Falla irreparable",
            "Vida útil agotada",
            "Daño físico irreversible",
            "Robo / extravío",
            "Decisión administrativa"
        };

        public BajasPatrimonialesController(NodusDbContext db, EstadosOTService estados)
        {
            _db = db;
            _estados = estados;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<BajaPatrimonial>>> GetBajas()
        {
            var bajas = await _db.BajasPatrimoniales
                .Include(b => b.Equipo).ThenInclude(e => e!.Marca)
                .Include(b => b.Equipo).ThenInclude(e => e!.TipoActivo)
                .Include(b => b.Usuario)
                .OrderByDescending(b => b.Fecha)
                .ToListAsync();
            return Ok(bajas);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<BajaPatrimonial>> GetBaja(int id)
        {
            var b = await _db.BajasPatrimoniales
                .Include(x => x.Equipo).ThenInclude(e => e!.Marca)
                .Include(x => x.Equipo).ThenInclude(e => e!.TipoActivo)
                .Include(x => x.Usuario)
                .FirstOrDefaultAsync(x => x.IdBaja == id);

            if (b == null) return NotFound();
            return Ok(b);
        }

        [HttpPost]
        public async Task<ActionResult<BajaPatrimonial>> PostBaja(BajaPatrimonial baja)
        {
            LimpiarNavegacion(baja);
            baja.IdBaja = 0;

            try
            {
                // Transacción serializable: dos bajas simultáneas del mismo equipo no pueden registrarse a la vez.
                await using var tx = await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable);

                var equipo = await _db.Equipos.FindAsync(baja.IdEquipo);
                if (equipo == null) return BadRequest("El equipo seleccionado no existe.");

                var error = await ValidarCampos(baja, equipo, true);
                if (error != null) return BadRequest(error);

                var yaTieneBaja = await _db.BajasPatrimoniales.AnyAsync(b => b.IdEquipo == baja.IdEquipo);
                if (yaTieneBaja)
                    return BadRequest("Este equipo ya tiene una baja patrimonial registrada. No se puede dar de baja dos veces.");

                if (equipo.IdEstado == EstadosOTService.ID_ESTADO_EN_PRESTAMO)
                    return BadRequest("No se puede dar de baja: el equipo está en préstamo externo. Registrá la devolución antes de proceder.");

                var tieneOtsAbiertas = await _db.OrdenesTrabajo.AnyAsync(o =>
                    o.IdEquipo == baja.IdEquipo &&
                    (o.Estado == "Pendiente" || o.Estado == "En curso"));
                if (tieneOtsAbiertas)
                    return BadRequest("No se puede dar de baja: el equipo tiene órdenes de trabajo pendientes o en curso. Cerralas o anulalas antes de proceder.");

                baja.Fecha = DateTime.SpecifyKind(baja.Fecha, DateTimeKind.Utc);

                equipo.IdEstado = ESTADO_BAJA_PATRIMONIAL;

                _db.BajasPatrimoniales.Add(baja);
                await _db.SaveChangesAsync();
                await tx.CommitAsync();
            }
            catch (Exception ex) when (EsConflictoDeConcurrencia(ex))
            {
                return Conflict(MSJ_CONFLICTO);
            }
            catch (DbUpdateException)
            {
                return BadRequest(MSJ_NO_GUARDADA);
            }

            return CreatedAtAction(nameof(GetBaja), new { id = baja.IdBaja }, baja);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> PutBaja(int id, BajaPatrimonial baja)
        {
            if (id != baja.IdBaja) return BadRequest();
            LimpiarNavegacion(baja);

            var anterior = await _db.BajasPatrimoniales.AsNoTracking().FirstOrDefaultAsync(b => b.IdBaja == id);
            if (anterior == null) return NotFound();

            if (baja.IdEquipo != anterior.IdEquipo)
                return BadRequest("No se puede cambiar el equipo de una baja ya registrada.");

            var equipo = await _db.Equipos.AsNoTracking().FirstOrDefaultAsync(e => e.IdEquipo == anterior.IdEquipo);
            if (equipo == null) return BadRequest("El equipo asociado no existe.");

            var error = await ValidarCampos(baja, equipo, false);
            if (error != null) return BadRequest(error);

            baja.Fecha = DateTime.SpecifyKind(baja.Fecha, DateTimeKind.Utc);
            _db.Entry(baja).State = EntityState.Modified;

            try { await _db.SaveChangesAsync(); }
            catch (DbUpdateConcurrencyException)
            {
                if (!await _db.BajasPatrimoniales.AnyAsync(b => b.IdBaja == id))
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
        public async Task<IActionResult> DeleteBaja(int id)
        {
            try
            {
                await using var tx = await _db.Database.BeginTransactionAsync();

                var baja = await _db.BajasPatrimoniales.FindAsync(id);
                if (baja == null) return NotFound();

                var equipo = await _db.Equipos.FindAsync(baja.IdEquipo);
                if (equipo != null && equipo.IdEstado == ESTADO_BAJA_PATRIMONIAL)
                {
                    equipo.IdEstado = ESTADO_EN_SERVICIO;
                }

                _db.BajasPatrimoniales.Remove(baja);
                await _db.SaveChangesAsync();

                // Al revertir la baja, el estado real del equipo se recalcula (OTs abiertas, préstamos, etc.).
                await _estados.RecalcularEstadoEquipo(baja.IdEquipo);
                await _db.SaveChangesAsync();
                await tx.CommitAsync();
            }
            catch (DbUpdateException)
            {
                return BadRequest("No se pudo eliminar la baja. Intentá de nuevo.");
            }

            return NoContent();
        }

        private static DateTime HoyArgentina() => DateTime.UtcNow.AddHours(-3).Date;

        // Evita que el cliente cuele objetos anidados que EF intentaría insertar o modificar.
        private static void LimpiarNavegacion(BajaPatrimonial baja)
        {
            baja.Equipo = null;
            baja.Usuario = null;
        }

        private async Task<string?> ValidarCampos(BajaPatrimonial baja, Equipo equipo, bool esNueva)
        {
            baja.Motivo = (baja.Motivo ?? string.Empty).Trim();
            baja.InformeObsolescencia = (baja.InformeObsolescencia ?? string.Empty).Trim();

            if (baja.Motivo.Length == 0)
                return "El motivo de la baja es obligatorio.";
            if (!MOTIVOS_VALIDOS.Contains(baja.Motivo))
                return $"Motivo inválido. Valores permitidos: {string.Join(", ", MOTIVOS_VALIDOS)}.";

            if (baja.InformeObsolescencia.Length == 0)
                return "El informe técnico es obligatorio para dar de baja un equipo.";
            if (baja.InformeObsolescencia.Length < MIN_INFORME)
                return $"El informe técnico debe tener al menos {MIN_INFORME} caracteres.";
            if (baja.InformeObsolescencia.Length > MAX_INFORME)
                return $"El informe técnico no puede superar los {MAX_INFORME} caracteres.";

            if (baja.Fecha == default)
                return "La fecha de baja es obligatoria.";
            var hoy = HoyArgentina();
            if (baja.Fecha.Date > hoy)
                return "La fecha de baja no puede ser futura.";
            if (esNueva && baja.Fecha.Date != hoy)
                return "La baja debe registrarse en la fecha actual por auditoría patrimonial.";
            if (baja.Fecha.Date < equipo.FechaAdquisicion.Date)
                return "La fecha de baja no puede ser anterior a la fecha de adquisición del equipo.";

            if (!await _db.Usuarios.AnyAsync(u => u.IdUsuario == baja.IdUsuario))
                return "El responsable seleccionado no existe.";

            return null;
        }

        private static bool EsConflictoDeConcurrencia(Exception ex)
        {
            for (var e = ex; e != null; e = e.InnerException)
            {
                if (e is PostgresException pg &&
                    (pg.SqlState == PostgresErrorCodes.SerializationFailure || pg.SqlState == PostgresErrorCodes.DeadlockDetected))
                    return true;
            }
            return false;
        }
    }
}