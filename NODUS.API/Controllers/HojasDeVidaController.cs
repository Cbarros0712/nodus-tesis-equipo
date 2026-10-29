using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NODUS.Data;
using NODUS.Models;

namespace NODUS.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class HojasDeVidaController : ControllerBase
    {
        private readonly NodusDbContext _db;

        public HojasDeVidaController(NodusDbContext db) { _db = db; }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<HojaDeVida>>> GetHojas()
        {
            var hojas = await _db.HojasDeVida
                .Include(h => h.Equipo).ThenInclude(e => e!.Marca)
                .Include(h => h.Equipo).ThenInclude(e => e!.TipoActivo)
                .Include(h => h.Equipo).ThenInclude(e => e!.EstadoEquipo)
                .OrderByDescending(h => h.FechaApertura)
                .ToListAsync();
            return Ok(hojas);
        }

        [HttpPost]
        public async Task<ActionResult<HojaDeVida>> PostHoja(HojaDeVida hoja)
        {
            var yaExiste = await _db.HojasDeVida.AnyAsync(h => h.IdEquipo == hoja.IdEquipo);
            if (yaExiste) return BadRequest("Este equipo ya tiene una hoja de vida.");

            hoja.FechaApertura = DateTime.SpecifyKind(hoja.FechaApertura, DateTimeKind.Utc);
            _db.HojasDeVida.Add(hoja);
            await _db.SaveChangesAsync();
            return Ok(hoja);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteHoja(int id)
        {
            var hoja = await _db.HojasDeVida.FindAsync(id);
            if (hoja == null) return NotFound();
            _db.HojasDeVida.Remove(hoja);
            await _db.SaveChangesAsync();
            return NoContent();
        }

        [HttpPost("generar-para-todos")]
        public async Task<ActionResult<object>> GenerarParaTodos()
        {
            var equiposSinHoja = await _db.Equipos
                .Where(e => !_db.HojasDeVida.Any(h => h.IdEquipo == e.IdEquipo))
                .ToListAsync();

            var ahora = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Utc);
            int creadas = 0;
            foreach (var eq in equiposSinHoja)
            {
                var fechaApertura = eq.FechaAdquisicion != default
                    ? DateTime.SpecifyKind(eq.FechaAdquisicion, DateTimeKind.Utc)
                    : ahora;

                _db.HojasDeVida.Add(new HojaDeVida
                {
                    IdEquipo = eq.IdEquipo,
                    FechaApertura = fechaApertura
                });
                creadas++;
            }
            await _db.SaveChangesAsync();
            return Ok(new { creadas, mensaje = $"Se generaron {creadas} hoja(s) de vida automáticamente." });
        }

        [HttpGet("equipo/{idEquipo}/historia")]
        public async Task<ActionResult<object>> GetHistoria(int idEquipo)
        {
            var equipo = await _db.Equipos
                .Include(e => e.Marca)
                .Include(e => e.TipoActivo)
                .Include(e => e.EstadoEquipo)
                .FirstOrDefaultAsync(e => e.IdEquipo == idEquipo);

            if (equipo == null) return NotFound();

            var hoja = await _db.HojasDeVida
                .FirstOrDefaultAsync(h => h.IdEquipo == idEquipo);

            var ubicaciones = await _db.Ubicaciones
                .Include(u => u.SectorAnterior)
                .Include(u => u.SectorNuevo)
                .Include(u => u.Servicio)
                .Include(u => u.Usuario)
                .Where(u => u.IdEquipo == idEquipo)
                .OrderBy(u => u.FechaTraslado)
                .ToListAsync();

            var ots = await _db.OrdenesTrabajo
                .Include(o => o.Servicio)
                .Include(o => o.Usuario)
                .Include(o => o.Intervenciones).ThenInclude(i => i.Usuario)
                .Include(o => o.UsosInsumo).ThenInclude(u => u.Insumo)
                .Where(o => o.IdEquipo == idEquipo)
                .OrderBy(o => o.FechaApertura)
                .ToListAsync();

            var alertas = await _db.Alertas
                .Include(a => a.Usuario)
                .Where(a => a.IdEquipo == idEquipo)
                .OrderBy(a => a.FechaGeneracion)
                .ToListAsync();

            var baja = await _db.BajasPatrimoniales
                .Include(b => b.Usuario)
                .FirstOrDefaultAsync(b => b.IdEquipo == idEquipo);

            var totalOTs = ots.Count;
            var totalIntervenciones = ots.Sum(o => o.Intervenciones.Count);
            var totalMinutosIntervencion = ots.SelectMany(o => o.Intervenciones).Sum(i => i.TiempoEmpleado);
            var antiguedadAnios = equipo.FechaAdquisicion != default
                ? (int)Math.Floor((DateTime.UtcNow - equipo.FechaAdquisicion).TotalDays / 365.25)
                : 0;
            var garantiaVigente = equipo.VencimientoGarantia.HasValue && equipo.VencimientoGarantia.Value > DateTime.UtcNow;

            return Ok(new
            {
                equipo,
                hojaDeVida = hoja,
                ubicaciones,
                ots,
                alertas,
                baja,
                metricas = new
                {
                    antiguedadAnios,
                    totalOTs,
                    totalIntervenciones,
                    totalMinutosIntervencion,
                    totalTraslados = ubicaciones.Count,
                    totalAlertas = alertas.Count,
                    garantiaVigente,
                    diasParaVencimientoGarantia = equipo.VencimientoGarantia.HasValue
                        ? (int)(equipo.VencimientoGarantia.Value - DateTime.UtcNow).TotalDays
                        : (int?)null,
                    dadoDeBaja = baja != null
                }
            });
        }
    }
}