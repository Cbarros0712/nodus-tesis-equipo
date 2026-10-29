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
        public async Task<ActionResult<HospitalExterno>> PostHospital(HospitalExterno hospital)
        {
            if (string.IsNullOrWhiteSpace(hospital.Nombre))
                return BadRequest("El nombre del hospital es obligatorio.");

            hospital.Activo = true;
            _db.HospitalesExternos.Add(hospital);
            await _db.SaveChangesAsync();
            return CreatedAtAction(nameof(GetHospital), new { id = hospital.IdHospital }, hospital);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> PutHospital(int id, HospitalExterno hospital)
        {
            if (id != hospital.IdHospital) return BadRequest();
            if (string.IsNullOrWhiteSpace(hospital.Nombre))
                return BadRequest("El nombre del hospital es obligatorio.");

            var existente = await _db.HospitalesExternos.FindAsync(id);
            if (existente == null) return NotFound();

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

            await _db.SaveChangesAsync();
            return NoContent();
        }

        [HttpPut("{id}/coordenadas")]
        public async Task<IActionResult> PutCoordenadas(int id, CoordenadasInputDto input)
        {
            if (input.Latitud is < -90 or > 90 || input.Longitud is < -180 or > 180)
                return BadRequest("Coordenadas fuera de rango.");

            var hospital = await _db.HospitalesExternos.FindAsync(id);
            if (hospital == null) return NotFound();

            hospital.Latitud = input.Latitud;
            hospital.Longitud = input.Longitud;
            await _db.SaveChangesAsync();
            return NoContent();
        }

        [HttpPost("geocodificar")]
        public async Task<ActionResult<GeocodificacionResultadoDto>> Geocodificar(CancellationToken ct)
        {
            var pendientes = await _db.HospitalesExternos
                .Where(h => h.Activo && (h.Latitud == null || h.Longitud == null))
                .OrderBy(h => h.IdHospital)
                .ToListAsync(ct);

            var resultado = new GeocodificacionResultadoDto();

            foreach (var h in pendientes)
            {
                var r = await _geocoding.GeocodificarHospitalAsync(h, ct);
                var item = new GeocodificacionItemDto { IdHospital = h.IdHospital, Nombre = h.Nombre, Direccion = h.Direccion };

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

            return Ok(resultado);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteHospital(int id)
        {
            var hospital = await _db.HospitalesExternos.FindAsync(id);
            if (hospital == null) return NotFound();

            var tienePrestamos = await _db.Prestamos.AnyAsync(p => p.IdHospital == id);
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
    }
}
