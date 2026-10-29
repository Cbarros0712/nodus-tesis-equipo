using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NODUS.Data;
using NODUS.Models;

namespace NODUS.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UsosInsumoController : ControllerBase
    {
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
            if (uso.Cantidad <= 0)
                return BadRequest("La cantidad debe ser mayor a 0.");

            var ot = await _db.OrdenesTrabajo.FindAsync(uso.IdOT);
            if (ot == null) return BadRequest("La OT seleccionada no existe.");
            if (ot.Estado == "Anulada")
                return BadRequest("No se pueden registrar insumos consumidos en una OT anulada.");

            var insumo = await _db.Insumos.FindAsync(uso.IdInsumo);
            if (insumo == null) return BadRequest("El insumo seleccionado no existe.");
            if (insumo.StockActual < uso.Cantidad)
                return BadRequest($"Stock insuficiente. Disponible: {insumo.StockActual}, solicitado: {uso.Cantidad}.");

            insumo.StockActual -= uso.Cantidad;

            _db.UsosInsumo.Add(uso);
            await _db.SaveChangesAsync();

            return CreatedAtAction(nameof(GetUso), new { id = uso.IdUso }, uso);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> PutUso(int id, UsoInsumo uso)
        {
            if (id != uso.IdUso) return BadRequest();
            if (uso.Cantidad <= 0) return BadRequest("La cantidad debe ser mayor a 0.");

            var usoAnterior = await _db.UsosInsumo.AsNoTracking().FirstOrDefaultAsync(u => u.IdUso == id);
            if (usoAnterior == null) return NotFound();

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

            try { await _db.SaveChangesAsync(); }
            catch (DbUpdateConcurrencyException)
            {
                if (!await _db.UsosInsumo.AnyAsync(u => u.IdUso == id)) return NotFound();
                throw;
            }

            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteUso(int id)
        {
            var uso = await _db.UsosInsumo.FindAsync(id);
            if (uso == null) return NotFound();

            var insumo = await _db.Insumos.FindAsync(uso.IdInsumo);
            if (insumo != null)
            {
                insumo.StockActual += uso.Cantidad;
            }

            _db.UsosInsumo.Remove(uso);
            await _db.SaveChangesAsync();
            return NoContent();
        }
    }
}