using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NODUS.Data;
using NODUS.Models;

namespace NODUS.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AlertasController : ControllerBase
    {
        private readonly NodusDbContext _db;

        private const string MSJ_NO_GUARDADO =
            "No se pudo guardar la alerta. Revisá los datos e intentá de nuevo.";

        private static readonly string[] TIPOS_VALIDOS = {
            "Garantía por vencer",
            "Mantenimiento preventivo",
            "Falla recurrente",
            "Calibración pendiente",
            "Stock crítico",
            "Otro"
        };

        private static readonly string[] ESTADOS_VALIDOS = {
            "No leída", "Leída", "Resuelta", "Descartada"
        };

        private const int DIAS_AVISO_GARANTIA = 30;

        public AlertasController(NodusDbContext db)
        {
            _db = db;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Alerta>>> GetAlertas()
        {
            var alertas = await _db.Alertas
                .Include(a => a.Equipo).ThenInclude(e => e!.Marca)
                .Include(a => a.Usuario)
                .OrderByDescending(a => a.FechaGeneracion)
                .ToListAsync();
            return Ok(alertas);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Alerta>> GetAlerta(int id)
        {
            var a = await _db.Alertas
                .Include(x => x.Equipo).ThenInclude(e => e!.Marca)
                .Include(x => x.Usuario)
                .FirstOrDefaultAsync(x => x.IdAlerta == id);
            if (a == null) return NotFound();
            return Ok(a);
        }

        [HttpGet("pendientes")]
        public async Task<ActionResult<IEnumerable<Alerta>>> GetPendientes()
        {
            var pendientes = await _db.Alertas
                .Include(a => a.Equipo)
                .Where(a => a.Estado == "No leída" || a.Estado == "Leída")
                .OrderByDescending(a => a.FechaGeneracion)
                .ToListAsync();
            return Ok(pendientes);
        }

        [HttpPost]
        public async Task<ActionResult<Alerta>> PostAlerta(Alerta entrada)
        {
            // Al crear, un estado vacío o desconocido se toma como "No leída".
            var estado = (entrada.Estado ?? string.Empty).Trim();
            if (!ESTADOS_VALIDOS.Contains(estado)) estado = "No leída";
            entrada.Estado = estado;

            var error = await ValidarAlerta(entrada);
            if (error != null) return BadRequest(error);

            // Solo se copian los campos conocidos (evita overposting de Equipo/Usuario anidados).
            var alerta = new Alerta
            {
                Tipo = entrada.Tipo,
                FechaGeneracion = DateTime.SpecifyKind(entrada.FechaGeneracion, DateTimeKind.Utc),
                Estado = entrada.Estado,
                IdEquipo = entrada.IdEquipo,
                IdUsuario = entrada.IdUsuario
            };

            _db.Alertas.Add(alerta);
            try { await _db.SaveChangesAsync(); }
            catch (DbUpdateException) { return BadRequest(MSJ_NO_GUARDADO); }

            return CreatedAtAction(nameof(GetAlerta), new { id = alerta.IdAlerta }, alerta);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> PutAlerta(int id, Alerta entrada)
        {
            if (id != entrada.IdAlerta) return BadRequest();

            var alerta = await _db.Alertas.FindAsync(id);
            if (alerta == null) return NotFound();

            entrada.Estado = (entrada.Estado ?? string.Empty).Trim();
            if (!ESTADOS_VALIDOS.Contains(entrada.Estado))
                return BadRequest($"Estado inválido. Valores permitidos: {string.Join(", ", ESTADOS_VALIDOS)}.");

            var error = await ValidarAlerta(entrada);
            if (error != null) return BadRequest(error);

            alerta.Tipo = entrada.Tipo;
            alerta.FechaGeneracion = DateTime.SpecifyKind(entrada.FechaGeneracion, DateTimeKind.Utc);
            alerta.Estado = entrada.Estado;
            alerta.IdEquipo = entrada.IdEquipo;
            alerta.IdUsuario = entrada.IdUsuario;

            try { await _db.SaveChangesAsync(); }
            catch (DbUpdateConcurrencyException)
            {
                if (!await _db.Alertas.AnyAsync(a => a.IdAlerta == id)) return NotFound();
                throw;
            }
            catch (DbUpdateException) { return BadRequest(MSJ_NO_GUARDADO); }

            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteAlerta(int id)
        {
            var a = await _db.Alertas.FindAsync(id);
            if (a == null) return NotFound();

            _db.Alertas.Remove(a);
            try { await _db.SaveChangesAsync(); }
            catch (DbUpdateException)
            {
                return BadRequest("No se puede eliminar la alerta porque tiene registros asociados.");
            }
            return NoContent();
        }

        [HttpPost("generar-automaticas")]
        public async Task<ActionResult<object>> GenerarAutomaticas([FromQuery] int idUsuarioReportador)
        {
            var usuario = await _db.Usuarios.FindAsync(idUsuarioReportador);
            if (usuario == null)
                return BadRequest("Usuario reportador no válido.");

            int creadas = 0;
            int omitidas = 0;
            var ahora = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Utc);
            var limiteGarantia = ahora.AddDays(DIAS_AVISO_GARANTIA);

            var equiposGarantia = await _db.Equipos
                .Where(e => e.VencimientoGarantia.HasValue
                         && e.VencimientoGarantia.Value <= limiteGarantia
                         && e.VencimientoGarantia.Value >= ahora)
                .ToListAsync();

            foreach (var eq in equiposGarantia)
            {
                bool yaExiste = await _db.Alertas.AnyAsync(a =>
                    a.IdEquipo == eq.IdEquipo
                    && a.Tipo == "Garantía por vencer"
                    && (a.Estado == "No leída" || a.Estado == "Leída"));

                if (yaExiste) { omitidas++; continue; }

                _db.Alertas.Add(new Alerta
                {
                    Tipo = "Garantía por vencer",
                    FechaGeneracion = ahora,
                    Estado = "No leída",
                    IdEquipo = eq.IdEquipo,
                    IdUsuario = idUsuarioReportador
                });
                creadas++;
            }

            // Stock crítico: una sola alerta general (sin equipo) cada 24 hs mientras haya algún insumo bajo el mínimo.
            bool hayStockCritico = await _db.Insumos.AnyAsync(i => i.StockActual < i.StockMinimo);
            if (hayStockCritico)
            {
                var hace24hs = ahora.AddHours(-24);
                bool yaExiste = await _db.Alertas.AnyAsync(a =>
                    a.Tipo == "Stock crítico"
                    && a.FechaGeneracion >= hace24hs
                    && (a.Estado == "No leída" || a.Estado == "Leída"));

                if (yaExiste) omitidas++;
                else
                {
                    _db.Alertas.Add(new Alerta
                    {
                        Tipo = "Stock crítico",
                        FechaGeneracion = ahora,
                        Estado = "No leída",
                        IdEquipo = null,
                        IdUsuario = idUsuarioReportador
                    });
                    creadas++;
                }
            }

            try { await _db.SaveChangesAsync(); }
            catch (DbUpdateException)
            {
                return BadRequest("No se pudieron generar las alertas automáticas. Intentá de nuevo.");
            }

            return Ok(new
            {
                creadas,
                omitidas,
                mensaje = creadas == 0
                    ? "No se detectaron nuevas condiciones de alerta."
                    : $"Se generaron {creadas} alerta(s) automática(s). {omitidas} omitida(s) por ya existir."
            });
        }

        // Valida tipo, fecha y referencias. El estado ya viene normalizado por el llamador.
        private async Task<string?> ValidarAlerta(Alerta a)
        {
            a.Tipo = (a.Tipo ?? string.Empty).Trim();
            if (!TIPOS_VALIDOS.Contains(a.Tipo))
                return $"Tipo de alerta inválido. Valores permitidos: {string.Join(", ", TIPOS_VALIDOS)}.";

            if (a.FechaGeneracion == default)
                return "La fecha de generación es obligatoria.";
            // Límite = fecha UTC de hoy (>= la fecha local argentina), para tolerar el desfase del navegador.
            if (a.FechaGeneracion.Date > DateTime.UtcNow.Date)
                return "La fecha de generación no puede ser futura.";

            if (a.IdUsuario <= 0 || !await _db.Usuarios.AnyAsync(u => u.IdUsuario == a.IdUsuario))
                return "El usuario reportador no existe.";

            if (a.IdEquipo.HasValue && !await _db.Equipos.AnyAsync(e => e.IdEquipo == a.IdEquipo.Value))
                return "El equipo seleccionado no existe.";

            return null;
        }
    }
}
