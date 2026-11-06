using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NODUS.API.DTOs;
using NODUS.API.Services;
using NODUS.Data;
using NODUS.Models;

namespace NODUS.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class HospitalesExternosController : ControllerBase
    {
        private const int MAX_NOMBRE = 150;
        private const int MAX_LOCALIDAD = 100;
        private const int MAX_DIRECCION = 200;
        private const int MAX_CONTACTO = 100;
        private const int MAX_TELEFONO = 30;
        private const int MAX_EMAIL = 100;

        private static readonly Regex RegexTelefono = new(@"^[0-9+()\-\s]{6,30}$", RegexOptions.Compiled);
        private static readonly Regex RegexEmail = new(@"^[^\s@]+@[^\s@]+\.[^\s@]+$", RegexOptions.Compiled);

        private const string MSJ_NO_GUARDADO =
            "No se pudo guardar el hospital. Revisá los datos e intentá de nuevo.";

        // Nominatim permite una consulta por segundo: no se admiten dos búsquedas automáticas a la vez.
        private static readonly SemaphoreSlim BloqueoGeocodificacion = new(1, 1);

        private readonly NodusDbContext _db;
        private readonly GeocodingService _geocoding;

        public HospitalesExternosController(NodusDbContext db, GeocodingService geocoding)
        {
            _db = db;
            _geocoding = geocoding;
        }

        private static HospitalExternoDto ToDto(HospitalExterno h) => new HospitalExternoDto
        {
            IdHospital = h.IdHospital,
            Nombre = h.Nombre,
            Localidad = h.Localidad,
            Direccion = h.Direccion,
            Contacto = h.Contacto,
            Telefono = h.Telefono,
            Email = h.Email,
            Latitud = h.Latitud,
            Longitud = h.Longitud,
            Activo = h.Activo
        };

        [HttpGet]
        public async Task<ActionResult<IEnumerable<HospitalExternoDto>>> GetHospitales()
        {
            var hospitales = await _db.HospitalesExternos
                .OrderBy(h => h.Nombre)
                .ToListAsync();

            return Ok(hospitales.Select(ToDto));
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<HospitalExternoDto>> GetHospital(int id)
        {
            var h = await _db.HospitalesExternos.FindAsync(id);
            if (h == null) return NotFound();

            return Ok(ToDto(h));
        }

        [HttpPost]
        public async Task<ActionResult<HospitalExterno>> PostHospital(HospitalExterno entrada)
        {
            var error = await ValidarHospital(entrada, null);
            if (error != null) return BadRequest(error);

            // Se copian solo los campos conocidos: así no se pueden colar préstamos u otros objetos anidados.
            var hospital = new HospitalExterno
            {
                Nombre = entrada.Nombre,
                Localidad = entrada.Localidad,
                Direccion = entrada.Direccion,
                Contacto = entrada.Contacto,
                Telefono = entrada.Telefono,
                Email = entrada.Email,
                Latitud = entrada.Latitud,
                Longitud = entrada.Longitud,
                Activo = true
            };

            _db.HospitalesExternos.Add(hospital);
            try { await _db.SaveChangesAsync(); }
            catch (DbUpdateException) { return BadRequest(MSJ_NO_GUARDADO); }

            return CreatedAtAction(nameof(GetHospital), new { id = hospital.IdHospital }, ToDto(hospital));
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> PutHospital(int id, HospitalExterno hospital)
        {
            if (id != hospital.IdHospital) return BadRequest();

            var existente = await _db.HospitalesExternos.FindAsync(id);
            if (existente == null) return NotFound();

            var error = await ValidarHospital(hospital, id);
            if (error != null) return BadRequest(error);

            if (existente.Activo && !hospital.Activo && await TienePrestamosEnCurso(id))
                return BadRequest("No se puede desactivar el hospital: tiene equipos prestados que todavía no fueron devueltos.");

            var cambioUbicacion = existente.Direccion != hospital.Direccion || existente.Localidad != hospital.Localidad;

            existente.Nombre = hospital.Nombre;
            existente.Localidad = hospital.Localidad;
            existente.Direccion = hospital.Direccion;
            existente.Contacto = hospital.Contacto;
            existente.Telefono = hospital.Telefono;
            existente.Email = hospital.Email;
            existente.Activo = hospital.Activo;

            if (cambioUbicacion)
            {
                existente.Latitud = null;
                existente.Longitud = null;
            }

            try { await _db.SaveChangesAsync(); }
            catch (DbUpdateException) { return BadRequest(MSJ_NO_GUARDADO); }
            return NoContent();
        }

        [HttpPut("{id}/coordenadas")]
        public async Task<IActionResult> PutCoordenadas(int id, CoordenadasInputDto input)
        {
            if (input.Latitud == null || input.Longitud == null)
                return BadRequest("Completá la latitud y la longitud.");
            if (input.Latitud is < -90 or > 90 || input.Longitud is < -180 or > 180)
                return BadRequest("Coordenadas fuera de rango.");

            var hospital = await _db.HospitalesExternos.FindAsync(id);
            if (hospital == null) return NotFound();

            hospital.Latitud = input.Latitud;
            hospital.Longitud = input.Longitud;
            try { await _db.SaveChangesAsync(); }
            catch (DbUpdateException) { return BadRequest("No se pudieron guardar las coordenadas."); }
            return NoContent();
        }

        [HttpPost("geocodificar")]
        public async Task<ActionResult<GeocodificacionResultadoDto>> Geocodificar(CancellationToken ct)
        {
            if (!await BloqueoGeocodificacion.WaitAsync(0, ct))
                return Conflict("Ya hay una búsqueda de coordenadas en curso. Esperá a que termine.");

            try
            {
                var pendientes = await _db.HospitalesExternos
                    .Where(h => h.Activo && (h.Latitud == null || h.Longitud == null))
                    .OrderBy(h => h.IdHospital)
                    .ToListAsync(ct);

                var resultado = new GeocodificacionResultadoDto();

                foreach (var h in pendientes)
                {
                    var item = new GeocodificacionItemDto { IdHospital = h.IdHospital, Nombre = h.Nombre, Direccion = h.Direccion };

                    try
                    {
                        var r = await _geocoding.GeocodificarHospitalAsync(h, ct);

                        if (r == null)
                        {
                            resultado.SinResultado.Add(item);
                            continue;
                        }

                        h.Latitud = r.Latitud;
                        h.Longitud = r.Longitud;

                        await _db.SaveChangesAsync(ct);

                        item.Latitud = r.Latitud;
                        item.Longitud = r.Longitud;
                        item.Fuente = r.Fuente;
                        item.Encontrado = r.DisplayName;
                        resultado.Geocodificados.Add(item);
                    }
                    catch (Exception ex) when (ex is HttpRequestException || (ex is OperationCanceledException && !ct.IsCancellationRequested))
                    {
                        // El servicio externo no respondió: este hospital queda sin resultado y se sigue con el resto.
                        resultado.SinResultado.Add(item);
                    }
                }

                return Ok(resultado);
            }
            finally
            {
                BloqueoGeocodificacion.Release();
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteHospital(int id)
        {
            var hospital = await _db.HospitalesExternos.FindAsync(id);
            if (hospital == null) return NotFound();

            if (await TienePrestamosEnCurso(id))
                return BadRequest("No se puede eliminar ni desactivar el hospital: tiene equipos prestados que todavía no fueron devueltos.");

            var tienePrestamos = await _db.Prestamos.AnyAsync(p => p.IdHospital == id);
            try
            {
                if (tienePrestamos)
                {
                    hospital.Activo = false;
                    await _db.SaveChangesAsync();
                    return Ok(new { mensaje = "El hospital tiene préstamos registrados. Se desactivó en lugar de eliminarlo." });
                }

                _db.HospitalesExternos.Remove(hospital);
                await _db.SaveChangesAsync();
                return NoContent();
            }
            catch (DbUpdateException)
            {
                return BadRequest("No se pudo eliminar el hospital porque tiene registros asociados.");
            }
        }

        private Task<bool> TienePrestamosEnCurso(int idHospital) =>
            _db.Prestamos.AnyAsync(p =>
                p.IdHospital == idHospital && p.Estado == "En préstamo" && p.FechaDevolucionReal == null);

        private static string? Limpiar(string? texto)
        {
            var t = texto?.Trim();
            return string.IsNullOrEmpty(t) ? null : t;
        }

        // Valida y normaliza (recorta espacios, vacío = sin dato). idActual es null al crear.
        private async Task<string?> ValidarHospital(HospitalExterno h, int? idActual)
        {
            h.Nombre = (h.Nombre ?? string.Empty).Trim();
            h.Localidad = Limpiar(h.Localidad);
            h.Direccion = Limpiar(h.Direccion);
            h.Contacto = Limpiar(h.Contacto);
            h.Telefono = Limpiar(h.Telefono);
            h.Email = Limpiar(h.Email);

            if (h.Nombre.Length == 0)
                return "El nombre del hospital es obligatorio.";
            if (h.Nombre.Length > MAX_NOMBRE)
                return $"El nombre no puede superar los {MAX_NOMBRE} caracteres.";
            if (h.Localidad != null && h.Localidad.Length > MAX_LOCALIDAD)
                return $"La localidad no puede superar los {MAX_LOCALIDAD} caracteres.";
            if (h.Direccion != null && h.Direccion.Length > MAX_DIRECCION)
                return $"La dirección no puede superar los {MAX_DIRECCION} caracteres.";
            if (h.Contacto != null && h.Contacto.Length > MAX_CONTACTO)
                return $"El contacto no puede superar los {MAX_CONTACTO} caracteres.";
            if (h.Telefono != null && (h.Telefono.Length > MAX_TELEFONO || !RegexTelefono.IsMatch(h.Telefono)))
                return "El teléfono no es válido (solo números, espacios y los símbolos + - ( ), entre 6 y 30 caracteres).";
            if (h.Email != null && (h.Email.Length > MAX_EMAIL || !RegexEmail.IsMatch(h.Email)))
                return "El email no es válido.";

            if (h.Latitud.HasValue != h.Longitud.HasValue)
                return "Completá la latitud y la longitud, o dejá ambas vacías.";
            if (h.Latitud is < -90 or > 90 || h.Longitud is < -180 or > 180)
                return "Coordenadas fuera de rango.";

            var nombre = h.Nombre.ToLower();
            var localidad = (h.Localidad ?? string.Empty).ToLower();
            var duplicado = await _db.HospitalesExternos.AnyAsync(x =>
                x.Nombre.Trim().ToLower() == nombre &&
                (x.Localidad ?? "").Trim().ToLower() == localidad &&
                (idActual == null || x.IdHospital != idActual));
            if (duplicado)
                return "Ya existe un hospital con ese nombre en esa localidad.";

            return null;
        }
    }
}
