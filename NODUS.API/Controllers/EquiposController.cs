using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NODUS.API.DTOs;
using NODUS.Data;
using NODUS.Models;

namespace NODUS.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class EquiposController : ControllerBase
    {
        private const int ID_ESTADO_EN_SERVICIO = 1;

        private const int MAX_MODELO = 100;
        private const int MAX_NRO_SERIE = 50;
        private const int MAX_COMPONENTE = 150;
        private const int MAX_COMPONENTES = 50;

        private const string MSJ_NO_GUARDADO =
            "No se pudo guardar el equipo. Revisá los datos (por ejemplo, que el número de serie no esté repetido) e intentá de nuevo.";

        private readonly NodusDbContext _db;

        public EquiposController(NodusDbContext db)
        {
            _db = db;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<EquipoDto>>> GetEquipos()
        {
            var equipos = await _db.Equipos
                .Include(e => e.Marca)
                .Include(e => e.TipoActivo)
                .Include(e => e.EstadoEquipo)
                .Include(e => e.EquipoComponentes)
                .Select(e => new EquipoDto
                {
                    IdEquipo = e.IdEquipo,
                    Modelo = e.Modelo,
                    NroSerie = e.NroSerie,
                    FechaAdquisicion = e.FechaAdquisicion,
                    VencimientoGarantia = e.VencimientoGarantia,
                    IdMarca = e.IdMarca,
                    IdTipo = e.IdTipo,
                    IdEstado = e.IdEstado,
                    Marca = e.Marca == null ? null : new MarcaDto
                    {
                        IdMarca = e.Marca.IdMarca,
                        Nombre = e.Marca.Nombre
                    },
                    TipoActivo = e.TipoActivo == null ? null : new TipoActivoDto
                    {
                        IdTipo = e.TipoActivo.IdTipo,
                        Nombre = e.TipoActivo.Nombre
                    },
                    EstadoEquipo = e.EstadoEquipo == null ? null : new EstadoEquipoDto
                    {
                        IdEstado = e.EstadoEquipo.IdEstado,
                        Nombre = e.EstadoEquipo.Nombre,
                        ColorSemaforo = e.EstadoEquipo.ColorSemaforo
                    },
                    Componentes = e.EquipoComponentes
                        .Select(c => c.Componente)
                        .ToList(),
                    UbicacionActual = e.Prestamos
                        .Where(p => p.Estado == "En préstamo" && p.FechaDevolucionReal == null)
                        .Select(p => "Prestado a " + p.Hospital!.Nombre)
                        .FirstOrDefault()
                        ?? e.Ubicaciones
                            .OrderByDescending(u => u.FechaTraslado).ThenByDescending(u => u.IdUbicacion)
                            .Select(u => u.SectorNuevo!.Nombre)
                            .FirstOrDefault()
                })
                .ToListAsync();

            return Ok(equipos);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<EquipoDto>> GetEquipo(int id)
        {
            var equipo = await _db.Equipos
                .Include(e => e.Marca)
                .Include(e => e.TipoActivo)
                .Include(e => e.EstadoEquipo)
                .Include(e => e.EquipoComponentes)
                .Where(e => e.IdEquipo == id)
                .Select(e => new EquipoDto
                {
                    IdEquipo = e.IdEquipo,
                    Modelo = e.Modelo,
                    NroSerie = e.NroSerie,
                    FechaAdquisicion = e.FechaAdquisicion,
                    VencimientoGarantia = e.VencimientoGarantia,
                    IdMarca = e.IdMarca,
                    IdTipo = e.IdTipo,
                    IdEstado = e.IdEstado,
                    Marca = e.Marca == null ? null : new MarcaDto
                    {
                        IdMarca = e.Marca.IdMarca,
                        Nombre = e.Marca.Nombre
                    },
                    TipoActivo = e.TipoActivo == null ? null : new TipoActivoDto
                    {
                        IdTipo = e.TipoActivo.IdTipo,
                        Nombre = e.TipoActivo.Nombre
                    },
                    EstadoEquipo = e.EstadoEquipo == null ? null : new EstadoEquipoDto
                    {
                        IdEstado = e.EstadoEquipo.IdEstado,
                        Nombre = e.EstadoEquipo.Nombre,
                        ColorSemaforo = e.EstadoEquipo.ColorSemaforo
                    },
                    Componentes = e.EquipoComponentes
                        .Select(c => c.Componente)
                        .ToList()
                })
                .FirstOrDefaultAsync();

            if (equipo == null) return NotFound();
            return Ok(equipo);
        }

        [HttpPost]
        public async Task<ActionResult<Equipo>> PostEquipo(EquipoInputDto input)
        {
            var error = await ValidarInput(input, null);
            if (error != null) return BadRequest(error);

            var equipo = new Equipo
            {
                Modelo = input.Modelo,
                NroSerie = input.NroSerie,
                FechaAdquisicion = input.FechaAdquisicion != default
                    ? DateTime.SpecifyKind(input.FechaAdquisicion, DateTimeKind.Utc)
                    : input.FechaAdquisicion,
                VencimientoGarantia = input.VencimientoGarantia.HasValue
                    ? DateTime.SpecifyKind(input.VencimientoGarantia.Value, DateTimeKind.Utc)
                    : null,
                IdMarca = input.IdMarca,
                IdTipo = input.IdTipo,

                IdEstado = ID_ESTADO_EN_SERVICIO,
                EquipoComponentes = LimpiarComponentes(input.Componentes)
                    .Select(nombre => new EquipoComponente { Componente = nombre })
                    .ToList()
            };

            _db.Equipos.Add(equipo);
            try { await _db.SaveChangesAsync(); }
            catch (DbUpdateException) { return BadRequest(MSJ_NO_GUARDADO); }
            return CreatedAtAction(nameof(GetEquipo), new { id = equipo.IdEquipo }, equipo);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> PutEquipo(int id, EquipoInputDto input)
        {
            if (id != input.IdEquipo) return BadRequest();

            var equipo = await _db.Equipos
                .Include(e => e.EquipoComponentes)
                .FirstOrDefaultAsync(e => e.IdEquipo == id);

            if (equipo == null) return NotFound();

            var error = await ValidarInput(input, id);
            if (error != null) return BadRequest(error);

            equipo.Modelo = input.Modelo;
            equipo.NroSerie = input.NroSerie;
            equipo.FechaAdquisicion = input.FechaAdquisicion != default
                ? DateTime.SpecifyKind(input.FechaAdquisicion, DateTimeKind.Utc)
                : input.FechaAdquisicion;
            equipo.VencimientoGarantia = input.VencimientoGarantia.HasValue
                ? DateTime.SpecifyKind(input.VencimientoGarantia.Value, DateTimeKind.Utc)
                : null;
            equipo.IdMarca = input.IdMarca;
            equipo.IdTipo = input.IdTipo;

            _db.RemoveRange(equipo.EquipoComponentes);
            equipo.EquipoComponentes = LimpiarComponentes(input.Componentes)
                .Select(nombre => new EquipoComponente { IdEquipo = id, Componente = nombre })
                .ToList();

            try { await _db.SaveChangesAsync(); }
            catch (DbUpdateConcurrencyException)
            {
                if (!_db.Equipos.Any(e => e.IdEquipo == id)) return NotFound();
                throw;
            }
            catch (DbUpdateException) { return BadRequest(MSJ_NO_GUARDADO); }
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteEquipo(int id)
        {
            var equipo = await _db.Equipos.FindAsync(id);
            if (equipo == null) return NotFound();

            var tieneOTs = await _db.OrdenesTrabajo.AnyAsync(o => o.IdEquipo == id);
            var tieneUbicaciones = await _db.Ubicaciones.AnyAsync(u => u.IdEquipo == id);
            var tieneHojaDeVida = await _db.HojasDeVida.AnyAsync(h => h.IdEquipo == id);
            var tieneAlertas = await _db.Alertas.AnyAsync(a => a.IdEquipo == id);
            var tieneBaja = await _db.BajasPatrimoniales.AnyAsync(b => b.IdEquipo == id);
            var tienePrestamos = await _db.Set<Prestamo>().AnyAsync(p => p.IdEquipo == id);
            var tieneReportes = await _db.ReportesFalla.AnyAsync(r => r.IdEquipo == id);

            var motivos = new List<string>();
            if (tieneOTs) motivos.Add("órdenes de trabajo");
            if (tieneUbicaciones) motivos.Add("traslados/ubicaciones");
            if (tieneHojaDeVida) motivos.Add("hoja de vida");
            if (tieneAlertas) motivos.Add("alertas");
            if (tieneBaja) motivos.Add("baja patrimonial");
            if (tienePrestamos) motivos.Add("préstamos");
            if (tieneReportes) motivos.Add("reportes de falla");

            if (motivos.Any())
            {
                return BadRequest(
                    $"No se puede eliminar este equipo: tiene historial registrado en {string.Join(", ", motivos)}. " +
                    "Para retirar el equipo del sistema, registrá una baja patrimonial en su lugar.");
            }

            try
            {
                _db.Equipos.Remove(equipo);
                await _db.SaveChangesAsync();
                return NoContent();
            }
            catch (DbUpdateException)
            {
                return BadRequest("No se puede eliminar el equipo porque tiene registros asociados. Para retirarlo del sistema, registrá una baja patrimonial.");
            }
        }

        private static DateTime HoyArgentina() => DateTime.UtcNow.AddHours(-3).Date;

        private static List<string> LimpiarComponentes(IEnumerable<string>? componentes) =>
            (componentes ?? Enumerable.Empty<string>())
                .Select(c => (c ?? string.Empty).Trim())
                .Where(c => c.Length > 0)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

        // Valida y normaliza (recorta espacios) los datos recibidos. idActual es null al crear.
        private async Task<string?> ValidarInput(EquipoInputDto input, int? idActual)
        {
            input.Modelo = (input.Modelo ?? string.Empty).Trim();
            input.NroSerie = (input.NroSerie ?? string.Empty).Trim();

            if (input.Modelo.Length == 0)
                return "El modelo es obligatorio.";
            if (input.Modelo.Length > MAX_MODELO)
                return $"El modelo no puede superar los {MAX_MODELO} caracteres.";
            if (input.NroSerie.Length == 0)
                return "El número de serie es obligatorio.";
            if (input.NroSerie.Length > MAX_NRO_SERIE)
                return $"El número de serie no puede superar los {MAX_NRO_SERIE} caracteres.";

            var serie = input.NroSerie.ToLower();
            var duplicado = await _db.Equipos.AnyAsync(e =>
                e.NroSerie.Trim().ToLower() == serie && (idActual == null || e.IdEquipo != idActual));
            if (duplicado)
                return "El número de serie ya existe en otro equipo.";

            if (input.FechaAdquisicion == default)
                return "La fecha de adquisición es obligatoria.";
            if (input.FechaAdquisicion.Date > HoyArgentina())
                return "La fecha de adquisición no puede ser futura.";
            if (input.VencimientoGarantia.HasValue && input.VencimientoGarantia.Value.Date < input.FechaAdquisicion.Date)
                return "El vencimiento de la garantía no puede ser anterior a la fecha de adquisición.";

            if (!await _db.Set<Marca>().AnyAsync(m => m.IdMarca == input.IdMarca))
                return "La marca seleccionada no existe.";
            if (!await _db.Set<TipoActivo>().AnyAsync(t => t.IdTipo == input.IdTipo))
                return "El tipo de activo seleccionado no existe.";

            var componentes = LimpiarComponentes(input.Componentes);
            if (componentes.Count > MAX_COMPONENTES)
                return $"Un equipo no puede tener más de {MAX_COMPONENTES} componentes.";
            if (componentes.Any(c => c.Length > MAX_COMPONENTE))
                return $"Cada componente puede tener hasta {MAX_COMPONENTE} caracteres.";

            return null;
        }
    }
}