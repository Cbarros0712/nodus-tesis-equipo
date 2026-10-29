using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NODUS.API.DTOs;
using NODUS.API.Services;
using NODUS.Data;
using NODUS.Models;
using System.Text;

namespace NODUS.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PrestamosController : ControllerBase
    {
        private readonly NodusDbContext _db;
        private readonly RemitoService _remitos;
        private readonly AlmacenamientoService _almacenamiento;
        private readonly ILogger<PrestamosController> _logger;

        private const int ID_ESTADO_EN_SERVICIO = 1;
        private const int ID_ESTADO_EN_PRESTAMO = 4;

        public PrestamosController(NodusDbContext db, RemitoService remitos, AlmacenamientoService almacenamiento, ILogger<PrestamosController> logger)
        {
            _db = db;
            _remitos = remitos;
            _almacenamiento = almacenamiento;
            _logger = logger;
        }

        private Task<Prestamo?> CargarParaRemitoAsync(int id) => _db.Prestamos
            .Include(x => x.Equipo).ThenInclude(e => e!.Marca)
            .Include(x => x.Equipo).ThenInclude(e => e!.TipoActivo)
            .Include(x => x.Hospital)
            .Include(x => x.Usuario)
            .Include(x => x.PrestamoComponentes)
            .Include(x => x.Prorrogas).ThenInclude(pr => pr.Usuario)
            .FirstOrDefaultAsync(x => x.IdPrestamo == id);

        private static PrestamoDto ToDto(Prestamo p) => new PrestamoDto
        {
            IdPrestamo = p.IdPrestamo,
            FechaPrestamo = p.FechaPrestamo,
            FechaEstimadaDevolucion = p.FechaEstimadaDevolucion,
            FechaEstimadaDevolucionOriginal = p.FechaEstimadaDevolucionOriginal,
            FechaDevolucionReal = p.FechaDevolucionReal,
            Estado = p.Estado,
            Motivo = p.Motivo,
            Observaciones = p.Observaciones,
            NumeroRemito = p.NumeroRemito,
            TieneRemitoPdf = !string.IsNullOrEmpty(p.RutaRemitoPdf),
            FechaEmisionRemito = p.FechaEmisionRemito,
            TieneFirmaSalida = !string.IsNullOrEmpty(p.RutaRemitoSalidaFirmado),
            FechaCargaFirmaSalida = p.FechaCargaFirmaSalida,
            NumeroRemitoDevolucion = p.NumeroRemitoDevolucion,
            ObservacionesDevolucion = p.ObservacionesDevolucion,
            TieneFirmaDevolucion = !string.IsNullOrEmpty(p.RutaRemitoDevolucionFirmado),
            FechaCargaFirmaDevolucion = p.FechaCargaFirmaDevolucion,
            IdEquipo = p.IdEquipo,
            IdHospital = p.IdHospital,
            IdUsuario = p.IdUsuario,
            Equipo = p.Equipo == null ? null : new EquipoResumenDto
            {
                IdEquipo = p.Equipo.IdEquipo,
                Modelo = p.Equipo.Modelo,
                NroSerie = p.Equipo.NroSerie
            },
            Hospital = p.Hospital == null ? null : new HospitalExternoDto
            {
                IdHospital = p.Hospital.IdHospital,
                Nombre = p.Hospital.Nombre,
                Localidad = p.Hospital.Localidad,
                Direccion = p.Hospital.Direccion,
                Contacto = p.Hospital.Contacto,
                Telefono = p.Hospital.Telefono,
                Email = p.Hospital.Email,
                Latitud = p.Hospital.Latitud,
                Longitud = p.Hospital.Longitud,
                Activo = p.Hospital.Activo
            },
            Usuario = p.Usuario == null ? null : new UsuarioResumenDto
            {
                IdUsuario = p.Usuario.IdUsuario,
                Nombre = p.Usuario.Nombre
            },
            Componentes = p.PrestamoComponentes.Select(c => c.Componente).ToList(),
            Prorrogas = p.Prorrogas
                .OrderBy(pr => pr.FechaSolicitud)
                .Select(pr => new ProrrogaDto
                {
                    IdProrroga = pr.IdProrroga,
                    FechaAnterior = pr.FechaAnterior,
                    FechaNueva = pr.FechaNueva,
                    Motivo = pr.Motivo,
                    FechaSolicitud = pr.FechaSolicitud,
                    AutorizadoPor = pr.Usuario?.Nombre
                })
                .ToList()
        };

        [HttpGet]
        public async Task<ActionResult<IEnumerable<PrestamoDto>>> GetPrestamos()
        {
            var prestamos = await _db.Prestamos
                .Include(p => p.Equipo)
                .Include(p => p.Hospital)
                .Include(p => p.Usuario)
                .Include(p => p.PrestamoComponentes)
                .Include(p => p.Prorrogas).ThenInclude(pr => pr.Usuario)
                .AsSplitQuery()
                .OrderByDescending(p => p.FechaPrestamo)
                .ToListAsync();

            return Ok(prestamos.Select(ToDto));
        }

        [HttpGet("mapa")]
        public async Task<ActionResult<IEnumerable<PrestamoMapaDto>>> GetMapa()
        {
            var activos = await _db.Prestamos
                .Where(p => p.FechaDevolucionReal == null && p.Estado != "Devuelto")
                .OrderBy(p => p.FechaPrestamo)
                .Select(p => new PrestamoMapaDto
                {
                    IdPrestamo = p.IdPrestamo,
                    FechaPrestamo = p.FechaPrestamo,
                    FechaEstimadaDevolucion = p.FechaEstimadaDevolucion,
                    Motivo = p.Motivo,
                    IdEquipo = p.IdEquipo,
                    Modelo = p.Equipo!.Modelo,
                    NroSerie = p.Equipo.NroSerie,
                    Marca = p.Equipo.Marca!.Nombre,
                    TipoActivo = p.Equipo.TipoActivo!.Nombre,
                    Componentes = p.PrestamoComponentes.Select(c => c.Componente).ToList(),
                    IdHospital = p.IdHospital,
                    Hospital = p.Hospital!.Nombre,
                    Direccion = p.Hospital.Direccion,
                    Localidad = p.Hospital.Localidad,
                    Latitud = p.Hospital.Latitud,
                    Longitud = p.Hospital.Longitud,
                    Contacto = p.Hospital.Contacto,
                    Telefono = p.Hospital.Telefono,
                    Responsable = p.Usuario!.Nombre
                })
                .ToListAsync();

            return Ok(activos);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<PrestamoDto>> GetPrestamo(int id)
        {
            var p = await CargarParaRemitoAsync(id);

            if (p == null) return NotFound();
            return Ok(ToDto(p));
        }

        [HttpPost]
        public async Task<ActionResult<PrestamoDto>> PostPrestamo(PrestamoInputDto input)
        {
            var equipo = await _db.Equipos.FindAsync(input.IdEquipo);
            if (equipo == null) return BadRequest("El equipo indicado no existe.");

            if (equipo.IdEstado != ID_ESTADO_EN_SERVICIO)
                return BadRequest("El equipo no está en servicio, no se puede prestar en su estado actual.");

            var hospital = await _db.HospitalesExternos.FindAsync(input.IdHospital);
            if (hospital == null) return BadRequest("El hospital indicado no existe.");

            if (input.FechaEstimadaDevolucion.HasValue && input.FechaEstimadaDevolucion.Value < input.FechaPrestamo)
                return BadRequest("La fecha estimada de devolución no puede ser anterior a la fecha de préstamo.");

            await using var tx = await _db.Database.BeginTransactionAsync();

            var fechaPrestamo = DateTime.SpecifyKind(input.FechaPrestamo, DateTimeKind.Utc);
            var numeroRemito = await _remitos.ReservarNumeroAsync(_db, RemitoService.TipoSalida, fechaPrestamo.Year);

            var prestamo = new Prestamo
            {
                NumeroRemito = numeroRemito,
                IdEquipo = input.IdEquipo,
                IdHospital = input.IdHospital,
                IdUsuario = input.IdUsuario,
                FechaPrestamo = fechaPrestamo,
                FechaEstimadaDevolucion = input.FechaEstimadaDevolucion.HasValue
                    ? DateTime.SpecifyKind(input.FechaEstimadaDevolucion.Value, DateTimeKind.Utc)
                    : null,
                FechaEstimadaDevolucionOriginal = input.FechaEstimadaDevolucion.HasValue
                    ? DateTime.SpecifyKind(input.FechaEstimadaDevolucion.Value, DateTimeKind.Utc)
                    : null,
                Observaciones = input.Observaciones,
                Motivo = input.Motivo,
                Estado = "En préstamo",
                PrestamoComponentes = (input.Componentes ?? new List<string>())
                    .Select(nombre => new PrestamoComponente { Componente = nombre })
                    .ToList()
            };

            _db.Prestamos.Add(prestamo);

            equipo.IdEstado = ID_ESTADO_EN_PRESTAMO;

            await _db.SaveChangesAsync();
            await tx.CommitAsync();

            var creado = (await CargarParaRemitoAsync(prestamo.IdPrestamo))!;

            try
            {
                creado.RutaRemitoPdf = await _remitos.GenerarPdfAsync(creado);
                await _db.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "No se pudo generar el PDF del remito {Numero}", creado.NumeroRemito);
            }

            return CreatedAtAction(nameof(GetPrestamo), new { id = prestamo.IdPrestamo }, ToDto(creado));
        }

        [HttpGet("{id}/remito")]
        public async Task<IActionResult> GetRemito(int id, [FromQuery] bool descargar = false)
        {
            var prestamo = await CargarParaRemitoAsync(id);
            if (prestamo == null) return NotFound();

            var ruta = _almacenamiento.RutaExistente(prestamo.RutaRemitoPdf);
            if (ruta == null)
            {
                prestamo.RutaRemitoPdf = await _remitos.GenerarPdfAsync(prestamo);
                await _db.SaveChangesAsync();
                ruta = _almacenamiento.RutaExistente(prestamo.RutaRemitoPdf)!;
            }

            return this.Archivo(ruta, $"{prestamo.NumeroRemito}.pdf", descargar);
        }

        [HttpPost("{id}/devolucion")]
        public async Task<ActionResult<PrestamoDto>> RegistrarDevolucion(int id, RemitoDevolucionInputDto input)
        {
            var prestamo = await CargarParaRemitoAsync(id);
            if (prestamo == null) return NotFound();

            if (prestamo.Estado == "Devuelto")
                return BadRequest("Este préstamo ya fue registrado como devuelto.");

            var fecha = DateTime.SpecifyKind(input.FechaDevolucion.Date, DateTimeKind.Utc);
            if (fecha.Date < prestamo.FechaPrestamo.Date)
                return BadRequest("La fecha de devolución no puede ser anterior a la fecha de préstamo.");
            if (fecha.Date > ZonaHoraria.AhoraArgentina().Date)
                return BadRequest("La fecha de devolución no puede ser futura.");

            await using var tx = await _db.Database.BeginTransactionAsync();

            prestamo.NumeroRemitoDevolucion = await _remitos.ReservarNumeroAsync(_db, RemitoService.TipoDevolucion, fecha.Year);
            prestamo.FechaDevolucionReal = fecha;
            prestamo.Estado = "Devuelto";
            prestamo.ObservacionesDevolucion = string.IsNullOrWhiteSpace(input.Observaciones) ? null : input.Observaciones.Trim();
            if (prestamo.ObservacionesDevolucion != null)
            {
                prestamo.Observaciones = string.IsNullOrWhiteSpace(prestamo.Observaciones)
                    ? $"Devolución: {prestamo.ObservacionesDevolucion}"
                    : $"{prestamo.Observaciones}\n---\nDevolución: {prestamo.ObservacionesDevolucion}";
            }

            if (prestamo.Equipo != null)
                prestamo.Equipo.IdEstado = ID_ESTADO_EN_SERVICIO;

            await _db.SaveChangesAsync();
            await tx.CommitAsync();

            try
            {
                prestamo.RutaRemitoDevolucionPdf = await _remitos.GenerarPdfDevolucionAsync(prestamo);
                await _db.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "No se pudo generar el PDF del remito {Numero}", prestamo.NumeroRemitoDevolucion);
            }

            return Ok(ToDto(prestamo));
        }

        [HttpGet("{id}/remito-devolucion")]
        public async Task<IActionResult> GetRemitoDevolucion(int id, [FromQuery] bool descargar = false)
        {
            var prestamo = await CargarParaRemitoAsync(id);
            if (prestamo == null) return NotFound();
            if (prestamo.NumeroRemitoDevolucion == null || prestamo.FechaDevolucionReal == null)
                return NotFound("Este préstamo no tiene remito de devolución.");

            var ruta = _almacenamiento.RutaExistente(prestamo.RutaRemitoDevolucionPdf);
            if (ruta == null)
            {
                prestamo.RutaRemitoDevolucionPdf = await _remitos.GenerarPdfDevolucionAsync(prestamo);
                await _db.SaveChangesAsync();
                ruta = _almacenamiento.RutaExistente(prestamo.RutaRemitoDevolucionPdf)!;
            }

            return this.Archivo(ruta, $"{prestamo.NumeroRemitoDevolucion}.pdf", descargar);
        }

        [HttpPost("{id}/prorrogar")]
        public async Task<ActionResult<PrestamoDto>> Prorrogar(int id, ProrrogaInputDto input)
        {
            var prestamo = await _db.Prestamos.FindAsync(id);
            if (prestamo == null) return NotFound();

            if (prestamo.Estado != "En préstamo" || prestamo.FechaDevolucionReal != null)
                return BadRequest("Solo se puede prorrogar un préstamo que no fue devuelto.");

            var motivo = input.Motivo?.Trim() ?? string.Empty;
            if (motivo.Length == 0) return BadRequest("Indicá el motivo de la prórroga.");
            if (motivo.Length > 300) return BadRequest("El motivo no puede superar los 300 caracteres.");

            if (!await _db.Usuarios.AnyAsync(u => u.IdUsuario == input.IdUsuario))
                return BadRequest("El usuario que autoriza la prórroga no existe.");

            var fechaNueva = DateTime.SpecifyKind(input.FechaNueva.Date, DateTimeKind.Utc);
            var hoy = ZonaHoraria.AhoraArgentina().Date;

            if (prestamo.FechaEstimadaDevolucion.HasValue && fechaNueva.Date <= prestamo.FechaEstimadaDevolucion.Value.Date)
                return BadRequest($"La nueva fecha tiene que ser posterior a la devolución estimada actual ({prestamo.FechaEstimadaDevolucion.Value:dd/MM/yyyy}).");
            if (fechaNueva.Date < hoy)
                return BadRequest("La nueva fecha no puede ser anterior a hoy: el préstamo seguiría vencido.");
            if (fechaNueva.Date < prestamo.FechaPrestamo.Date)
                return BadRequest("La nueva fecha no puede ser anterior a la fecha de préstamo.");

            _db.ProrrogasPrestamo.Add(new ProrrogaPrestamo
            {
                IdPrestamo = prestamo.IdPrestamo,
                FechaAnterior = prestamo.FechaEstimadaDevolucion,
                FechaNueva = fechaNueva,
                Motivo = motivo,
                FechaSolicitud = DateTime.UtcNow,
                IdUsuario = input.IdUsuario
            });

            prestamo.FechaEstimadaDevolucion = fechaNueva;

            await _db.SaveChangesAsync();

            return Ok(ToDto((await CargarParaRemitoAsync(id))!));
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeletePrestamo(int id)
        {
            var prestamo = await _db.Prestamos.Include(p => p.Equipo).FirstOrDefaultAsync(p => p.IdPrestamo == id);
            if (prestamo == null) return NotFound();

            if (prestamo.Estado == "En préstamo" && prestamo.Equipo != null)
                prestamo.Equipo.IdEstado = ID_ESTADO_EN_SERVICIO;

            _db.Prestamos.Remove(prestamo);
            await _db.SaveChangesAsync();
            return NoContent();
        }
    }
}
