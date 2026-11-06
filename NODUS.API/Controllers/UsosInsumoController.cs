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
    public class UsosInsumoController : ControllerBase
    {
        private const int MAX_CANTIDAD = 1_000_000;

        private const string MSJ_OT_FINALIZADA =
            "No se pueden registrar, modificar ni eliminar insumos de una OT cerrada o anulada: los registros finalizados son inalterables por auditoría.";
        private const string MSJ_CONFLICTO =
            "Otro usuario modificó el stock al mismo tiempo. Actualizá la pantalla e intentá de nuevo.";
        private const string MSJ_NO_GUARDADO =
            "No se pudo guardar el uso de insumo. Revisá los datos e intentá de nuevo.";

        private readonly NodusDbContext _db;

        public UsosInsumoController(NodusDbContext db)
        {
            _db = db;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<UsoInsumo>>> GetUsos()
        {
            var usos = await _db.UsosInsumo
                .Include(u => u.Insumo)
                .Include(u => u.OrdenTrabajo).ThenInclude(o => o!.Equipo)
                .OrderByDescending(u => u.IdUso)
                .ToListAsync();
            return Ok(usos);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<UsoInsumo>> GetUso(int id)
        {
            var uso = await _db.UsosInsumo
                .Include(u => u.Insumo)
                .Include(u => u.OrdenTrabajo).ThenInclude(o => o!.Equipo)
                .FirstOrDefaultAsync(u => u.IdUso == id);

            if (uso == null) return NotFound();
            return Ok(uso);
        }

        [HttpGet("ot/{idOT}")]
        public async Task<ActionResult<IEnumerable<UsoInsumo>>> GetPorOT(int idOT)
        {
            var lista = await _db.UsosInsumo
                .Include(u => u.Insumo)
                .Where(u => u.IdOT == idOT)
                .ToListAsync();
            return Ok(lista);
        }

        [HttpPost]
        public async Task<ActionResult<UsoInsumo>> PostUso(UsoInsumo uso)
        {
            LimpiarNavegacion(uso);
            uso.IdUso = 0;

            var errorCantidad = ValidarCantidad(uso.Cantidad);
            if (errorCantidad != null) return BadRequest(errorCantidad);

            try
            {
                // Transacción serializable: dos registros simultáneos no pueden dejar el stock en negativo.
                await using var tx = await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable);

                var errorOT = await ValidarOTAbierta(uso.IdOT);
                if (errorOT != null) return BadRequest(errorOT);

                var insumo = await _db.Insumos.FindAsync(uso.IdInsumo);
                if (insumo == null) return BadRequest("El insumo seleccionado no existe.");
                if (insumo.StockActual < uso.Cantidad)
                    return BadRequest($"Stock insuficiente. Disponible: {insumo.StockActual}, solicitado: {uso.Cantidad}.");

                insumo.StockActual -= uso.Cantidad;

                _db.UsosInsumo.Add(uso);
                await _db.SaveChangesAsync();
                await tx.CommitAsync();
            }
            catch (Exception ex) when (EsConflictoDeConcurrencia(ex))
            {
                return Conflict(MSJ_CONFLICTO);
            }
            catch (DbUpdateException)
            {
                return BadRequest(MSJ_NO_GUARDADO);
            }

            return CreatedAtAction(nameof(GetUso), new { id = uso.IdUso }, uso);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> PutUso(int id, UsoInsumo uso)
        {
            if (id != uso.IdUso) return BadRequest();
            LimpiarNavegacion(uso);

            var errorCantidad = ValidarCantidad(uso.Cantidad);
            if (errorCantidad != null) return BadRequest(errorCantidad);

            try
            {
                await using var tx = await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable);

                var usoAnterior = await _db.UsosInsumo.AsNoTracking().FirstOrDefaultAsync(u => u.IdUso == id);
                if (usoAnterior == null) return NotFound();

                var errorOTAnterior = await ValidarOTAbierta(usoAnterior.IdOT);
                if (errorOTAnterior != null) return BadRequest(errorOTAnterior);
                if (uso.IdOT != usoAnterior.IdOT)
                {
                    var errorOTNueva = await ValidarOTAbierta(uso.IdOT);
                    if (errorOTNueva != null) return BadRequest(errorOTNueva);
                }

                if (usoAnterior.IdInsumo == uso.IdInsumo)
                {
                    var diferencia = uso.Cantidad - usoAnterior.Cantidad;
                    if (diferencia != 0)
                    {
                        var insumo = await _db.Insumos.FindAsync(uso.IdInsumo);
                        if (insumo == null) return BadRequest("Insumo no encontrado.");
                        if (insumo.StockActual - diferencia < 0)
                            return BadRequest($"Stock insuficiente para la nueva cantidad. Disponible: {insumo.StockActual}, ajuste requerido: {diferencia}.");
                        insumo.StockActual -= diferencia;
                    }
                }
                else
                {
                    var insumoAnterior = await _db.Insumos.FindAsync(usoAnterior.IdInsumo);
                    var insumoNuevo = await _db.Insumos.FindAsync(uso.IdInsumo);
                    if (insumoAnterior == null || insumoNuevo == null)
                        return BadRequest("Insumo no encontrado.");
                    if (insumoNuevo.StockActual < uso.Cantidad)
                        return BadRequest($"Stock insuficiente del nuevo insumo. Disponible: {insumoNuevo.StockActual}, solicitado: {uso.Cantidad}.");

                    insumoAnterior.StockActual += usoAnterior.Cantidad;
                    insumoNuevo.StockActual -= uso.Cantidad;
                }

                _db.Entry(uso).State = EntityState.Modified;

                await _db.SaveChangesAsync();
                await tx.CommitAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!await _db.UsosInsumo.AnyAsync(u => u.IdUso == id)) return NotFound();
                throw;
            }
            catch (Exception ex) when (EsConflictoDeConcurrencia(ex))
            {
                return Conflict(MSJ_CONFLICTO);
            }
            catch (DbUpdateException)
            {
                return BadRequest(MSJ_NO_GUARDADO);
            }

            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteUso(int id)
        {
            try
            {
                await using var tx = await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable);

                var uso = await _db.UsosInsumo.FindAsync(id);
                if (uso == null) return NotFound();

                var errorOT = await ValidarOTAbierta(uso.IdOT);
                if (errorOT != null) return BadRequest(errorOT);

                var insumo = await _db.Insumos.FindAsync(uso.IdInsumo);
                if (insumo != null)
                {
                    insumo.StockActual += uso.Cantidad;
                }

                _db.UsosInsumo.Remove(uso);
                await _db.SaveChangesAsync();
                await tx.CommitAsync();
            }
            catch (Exception ex) when (EsConflictoDeConcurrencia(ex))
            {
                return Conflict(MSJ_CONFLICTO);
            }
            catch (DbUpdateException)
            {
                return BadRequest("No se pudo eliminar el uso de insumo. Intentá de nuevo.");
            }

            return NoContent();
        }

        // Evita que el cliente cuele objetos anidados que EF intentaría insertar o modificar.
        private static void LimpiarNavegacion(UsoInsumo uso)
        {
            uso.Insumo = null;
            uso.OrdenTrabajo = null;
        }

        private static string? ValidarCantidad(int cantidad)
        {
            if (cantidad <= 0)
                return "La cantidad debe ser mayor a 0.";
            if (cantidad > MAX_CANTIDAD)
                return $"La cantidad no puede superar {MAX_CANTIDAD:N0}.";
            return null;
        }

        private async Task<string?> ValidarOTAbierta(int idOT)
        {
            var ot = await _db.OrdenesTrabajo.AsNoTracking().FirstOrDefaultAsync(o => o.IdOT == idOT);
            if (ot == null) return "La OT seleccionada no existe.";
            if (!EstadosOTService.EsAbierta(ot.Estado)) return MSJ_OT_FINALIZADA;
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