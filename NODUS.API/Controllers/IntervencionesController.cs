using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NODUS.API.Services;
using NODUS.Data;
using NODUS.Models;

namespace NODUS.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class IntervencionesController : ControllerBase
    {
        private readonly NodusDbContext _db;
        private readonly EstadosOTService _estados;

        private static readonly string[] RESULTADOS_VALIDOS = {
            "Aprobado",
            "Aprobado con observaciones",
            "Desaprobado"
        };

        private static readonly string MSJ_RESULTADO_INVALIDO =
            $"Resultado inválido. Valores permitidos: {string.Join(", ", RESULTADOS_VALIDOS)}.";

        private const string MSJ_OT_CERRADA =
            "No se pueden registrar tareas nuevas en una OT cerrada. Si hay que reabrirla, editá su última tarea con resultado Desaprobado.";
        private const string MSJ_OT_ANULADA =
            "No se pueden registrar ni modificar tareas en una OT anulada.";
        private const string MSJ_NO_GUARDADA =
            "No se pudo guardar la tarea. Revisá los datos e intentá de nuevo.";
        private const string MSJ_ELIMINAR_OT_FINALIZADA =
            "No se pueden eliminar tareas de una OT cerrada o anulada.";
        private const string MSJ_MOVER_OT_FINALIZADA =
            "No se puede mover una tarea desde o hacia una OT cerrada o anulada.";

        private const int MIN_TAREAS = 20;
        private const int MAX_TAREAS = 2000;
        private const int MAX_MINUTOS = 480;

        public IntervencionesController(NodusDbContext db, EstadosOTService estados)
        {
            _db = db;
            _estados = estados;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Intervencion>>> GetIntervenciones()
        {
            var intervenciones = await _db.Intervenciones
                .Include(i => i.OrdenTrabajo).ThenInclude(o => o!.Equipo)
                .Include(i => i.Usuario)
                .OrderByDescending(i => i.Fecha)
                .ToListAsync();
            return Ok(intervenciones);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Intervencion>> GetIntervencion(int id)
        {
            var i = await _db.Intervenciones
                .Include(x => x.OrdenTrabajo).ThenInclude(o => o!.Equipo)
                .Include(x => x.Usuario)
                .FirstOrDefaultAsync(x => x.IdIntervencion == id);

            if (i == null) return NotFound();
            return Ok(i);
        }

        [HttpGet("ot/{idOT}")]
        public async Task<ActionResult<IEnumerable<Intervencion>>> GetPorOT(int idOT)
        {
            var lista = await _db.Intervenciones
                .Include(i => i.Usuario)
                .Where(i => i.IdOT == idOT)
                .OrderBy(i => i.Fecha)
                .ToListAsync();
            return Ok(lista);
        }

        [HttpPost]
        public async Task<ActionResult<Intervencion>> PostIntervencion(Intervencion i)
        {
            LimpiarNavegacion(i);
            var errorCampos = await ValidarCampos(i);
            if (errorCampos != null) return BadRequest(errorCampos);
            if (!RESULTADOS_VALIDOS.Contains(i.ResultadoSegElectrica))
                return BadRequest(MSJ_RESULTADO_INVALIDO);

            var ot = await _db.OrdenesTrabajo.AsNoTracking().FirstOrDefaultAsync(o => o.IdOT == i.IdOT);
            if (ot == null) return BadRequest("La OT seleccionada no existe.");
            if (ot.Estado == "Anulada") return BadRequest(MSJ_OT_ANULADA);
            if (ot.Estado == "Cerrada") return BadRequest(MSJ_OT_CERRADA);

            NormalizarFechas(i);
            var error = ValidarFechas(i, ot);
            if (error != null) return BadRequest(error);

            string? aviso;
            try
            {
                await using var tx = await _db.Database.BeginTransactionAsync();
                _db.Intervenciones.Add(i);
                await _db.SaveChangesAsync();
                aviso = await _estados.RecalcularEstadoOT(i.IdOT, i.IdIntervencion);
                await tx.CommitAsync();
            }
            catch (DbUpdateException)
            {
                return BadRequest(MSJ_NO_GUARDADA);
            }

            return CreatedAtAction(nameof(GetIntervencion), new { id = i.IdIntervencion }, new { intervencion = i, mensaje = aviso });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> PutIntervencion(int id, Intervencion i)
        {
            if (id != i.IdIntervencion) return BadRequest();
            LimpiarNavegacion(i);
            var errorCampos = await ValidarCampos(i);
            if (errorCampos != null) return BadRequest(errorCampos);

            if (i.ResultadoSegElectrica == "Reprobado")
                i.ResultadoSegElectrica = "Desaprobado";
            if (!RESULTADOS_VALIDOS.Contains(i.ResultadoSegElectrica))
                return BadRequest(MSJ_RESULTADO_INVALIDO);

            var anterior = await _db.Intervenciones.AsNoTracking().FirstOrDefaultAsync(x => x.IdIntervencion == id);
            if (anterior == null) return NotFound();

            var otAnterior = await _db.OrdenesTrabajo.AsNoTracking().FirstAsync(o => o.IdOT == anterior.IdOT);
            if (otAnterior.Estado == "Anulada") return BadRequest(MSJ_OT_ANULADA);

            var ot = await _db.OrdenesTrabajo.AsNoTracking().FirstOrDefaultAsync(o => o.IdOT == i.IdOT);
            if (ot == null) return BadRequest("La OT asociada no existe.");
            if (anterior.IdOT != i.IdOT
                && (!EstadosOTService.EsAbierta(otAnterior.Estado) || !EstadosOTService.EsAbierta(ot.Estado)))
                return BadRequest(MSJ_MOVER_OT_FINALIZADA);

            NormalizarFechas(i);
            var error = ValidarFechas(i, ot);
            if (error != null) return BadRequest(error);

            _db.Entry(i).State = EntityState.Modified;

            string? aviso;
            try
            {
                await using var tx = await _db.Database.BeginTransactionAsync();
                await _db.SaveChangesAsync();
                aviso = await _estados.RecalcularEstadoOT(i.IdOT, i.IdIntervencion);
                if (anterior.IdOT != i.IdOT)
                    await _estados.RecalcularEstadoOT(anterior.IdOT);
                await tx.CommitAsync();
            }
            catch (DbUpdateException)
            {
                return BadRequest(MSJ_NO_GUARDADA);
            }

            return Ok(new { mensaje = aviso });
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteIntervencion(int id)
        {
            var i = await _db.Intervenciones.FindAsync(id);
            if (i == null) return NotFound();

            var ot = await _db.OrdenesTrabajo.AsNoTracking().FirstAsync(o => o.IdOT == i.IdOT);
            if (!EstadosOTService.EsAbierta(ot.Estado)) return BadRequest(MSJ_ELIMINAR_OT_FINALIZADA);

            await using var tx = await _db.Database.BeginTransactionAsync();
            _db.Intervenciones.Remove(i);
            await _db.SaveChangesAsync();
            await _estados.RecalcularEstadoOT(i.IdOT);
            await tx.CommitAsync();
            return NoContent();
        }

        private static DateTime HoyArgentina() => DateTime.UtcNow.AddHours(-3).Date;

        private static void LimpiarNavegacion(Intervencion i)
        {
            i.OrdenTrabajo = null;
            i.Usuario = null;
        }

        private async Task<string?> ValidarCampos(Intervencion i)
        {
            i.TareasRealizadas = (i.TareasRealizadas ?? string.Empty).Trim();
            if (i.TareasRealizadas.Length == 0)
                return "Las tareas realizadas son obligatorias.";
            if (i.TareasRealizadas.Length < MIN_TAREAS)
                return $"La descripción de las tareas debe tener al menos {MIN_TAREAS} caracteres.";
            if (i.TareasRealizadas.Length > MAX_TAREAS)
                return $"La descripción de las tareas no puede superar los {MAX_TAREAS} caracteres.";

            if (i.TiempoEmpleado <= 0)
                return "El tiempo empleado debe ser mayor a 0 minutos.";
            if (i.TiempoEmpleado > MAX_MINUTOS)
                return $"El tiempo empleado no puede superar las 8 horas ({MAX_MINUTOS} minutos).";

            if (i.Fecha == default)
                return "La fecha de inicio es obligatoria.";
            var hoy = HoyArgentina();
            if (i.Fecha.Date > hoy)
                return "La fecha de inicio no puede ser futura.";
            if (i.FechaFin.HasValue && i.FechaFin.Value.Date > hoy)
                return "La fecha de fin no puede ser futura.";

            if (!await _db.Usuarios.AnyAsync(u => u.IdUsuario == i.IdUsuario))
                return "El técnico responsable seleccionado no existe.";

            return null;
        }

        private static void NormalizarFechas(Intervencion i)
        {
            i.Fecha = DateTime.SpecifyKind(i.Fecha, DateTimeKind.Utc);
            if (i.FechaFin.HasValue)
                i.FechaFin = DateTime.SpecifyKind(i.FechaFin.Value, DateTimeKind.Utc);
        }

        private static string? ValidarFechas(Intervencion i, OrdenTrabajo ot)
        {
            if (i.Fecha.Date < ot.FechaApertura.Date)
                return $"La fecha de inicio de la tarea ({i.Fecha:dd/MM/yyyy}) no puede ser anterior a la apertura de la OT ({ot.FechaApertura:dd/MM/yyyy}).";
            if (i.FechaFin.HasValue && i.FechaFin.Value.Date < i.Fecha.Date)
                return $"La fecha de fin ({i.FechaFin.Value:dd/MM/yyyy}) no puede ser anterior a la fecha de inicio ({i.Fecha:dd/MM/yyyy}).";
            return null;
        }
    }
}