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
            if (string.IsNullOrWhiteSpace(input.Modelo))
                return BadRequest("El modelo es obligatorio.");
            if (string.IsNullOrWhiteSpace(input.NroSerie))
                return BadRequest("El número de serie es obligatorio.");

            var duplicado = await _db.Equipos.AnyAsync(e => e.NroSerie == input.NroSerie);
            if (duplicado)
                return BadRequest("El número de serie ya existe en otro equipo.");

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
                EquipoComponentes = (input.Componentes ?? new List<string>())
                    .Select(nombre => new EquipoComponente { Componente = nombre })
                    .ToList()
            };

            _db.Equipos.Add(equipo);
            await _db.SaveChangesAsync();
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

            var duplicado = await _db.Equipos.AnyAsync(e => e.NroSerie == input.NroSerie && e.IdEquipo != id);
            if (duplicado)
                return BadRequest("El número de serie ya existe en otro equipo.");

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
            equipo.EquipoComponentes = (input.Componentes ?? new List<string>())
                .Select(nombre => new EquipoComponente { IdEquipo = id, Componente = nombre })
                .ToList();

            try { await _db.SaveChangesAsync(); }
            catch (DbUpdateConcurrencyException)
            {
                if (!_db.Equipos.Any(e => e.IdEquipo == id)) return NotFound();
                throw;
            }
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

            var motivos = new List<string>();
            if (tieneOTs) motivos.Add("órdenes de trabajo");
            if (tieneUbicaciones) motivos.Add("traslados/ubicaciones");
            if (tieneHojaDeVida) motivos.Add("hoja de vida");
            if (tieneAlertas) motivos.Add("alertas");
            if (tieneBaja) motivos.Add("baja patrimonial");

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
            catch (DbUpdateException ex)
            {
                return BadRequest($"No se puede eliminar el equipo por restricciones de integridad: {ex.InnerException?.Message ?? ex.Message}");
            }
        }
    }
}