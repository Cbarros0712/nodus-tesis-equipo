using System.Security.Cryptography;
using Microsoft.AspNetCore.Mvc;
using NODUS.API.Services;
using NODUS.Data;
using NODUS.Models;

namespace NODUS.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class RemitosController : ControllerBase
    {
        private const string CarpetaFirmados = "Firmados";

        private readonly NodusDbContext _db;
        private readonly AlmacenamientoService _almacenamiento;

        public RemitosController(NodusDbContext db, AlmacenamientoService almacenamiento)
        {
            _db = db;
            _almacenamiento = almacenamiento;
        }

        [HttpPost("{id}/subir-firma-salida")]
        [RequestSizeLimit(AlmacenamientoService.TamanioMaximoEscaneo + 1024 * 1024)]
        public async Task<IActionResult> SubirFirmaSalida(int id, IFormFile? archivo)
        {
            var prestamo = await _db.Prestamos.FindAsync(id);
            if (prestamo == null) return NotFound();

            return await GuardarFirmaAsync(prestamo, archivo, prestamo.NumeroRemito, prestamo.RutaRemitoPdf,
                p => p.RutaRemitoSalidaFirmado,
                (p, ruta) => { p.RutaRemitoSalidaFirmado = ruta; p.FechaCargaFirmaSalida = DateTime.UtcNow; });
        }

        [HttpPost("{id}/subir-firma-devolucion")]
        [RequestSizeLimit(AlmacenamientoService.TamanioMaximoEscaneo + 1024 * 1024)]
        public async Task<IActionResult> SubirFirmaDevolucion(int id, IFormFile? archivo)
        {
            var prestamo = await _db.Prestamos.FindAsync(id);
            if (prestamo == null) return NotFound();
            if (prestamo.NumeroRemitoDevolucion == null)
                return BadRequest("Este préstamo todavía no tiene remito de devolución: primero registrá la devolución.");

            return await GuardarFirmaAsync(prestamo, archivo, prestamo.NumeroRemitoDevolucion, prestamo.RutaRemitoDevolucionPdf,
                p => p.RutaRemitoDevolucionFirmado,
                (p, ruta) => { p.RutaRemitoDevolucionFirmado = ruta; p.FechaCargaFirmaDevolucion = DateTime.UtcNow; });
        }

        [HttpGet("{id}/firma-salida")]
        public async Task<IActionResult> GetFirmaSalida(int id, [FromQuery] bool descargar = false)
        {
            var prestamo = await _db.Prestamos.FindAsync(id);
            if (prestamo == null) return NotFound();
            return Firmado(prestamo.RutaRemitoSalidaFirmado, prestamo.NumeroRemito, descargar);
        }

        [HttpGet("{id}/firma-devolucion")]
        public async Task<IActionResult> GetFirmaDevolucion(int id, [FromQuery] bool descargar = false)
        {
            var prestamo = await _db.Prestamos.FindAsync(id);
            if (prestamo == null) return NotFound();
            return Firmado(prestamo.RutaRemitoDevolucionFirmado, prestamo.NumeroRemitoDevolucion, descargar);
        }

        private async Task<IActionResult> GuardarFirmaAsync(Prestamo prestamo, IFormFile? archivo, string numero, string? rutaPdfGenerado,
            Func<Prestamo, string?> rutaActual, Action<Prestamo, string> asignar)
        {
            var (escaneo, error) = await AlmacenamientoService.ValidarEscaneoAsync(archivo);
            if (escaneo == null) return BadRequest(error);

            var pdfGenerado = _almacenamiento.RutaExistente(rutaPdfGenerado);
            if (pdfGenerado != null && MismoContenido(escaneo.Contenido, await System.IO.File.ReadAllBytesAsync(pdfGenerado)))
                return BadRequest($"El archivo es el remito {numero} tal como lo generó el sistema, sin firmar. Subí el escaneo o la foto del remito firmado.");

            var anterior = rutaActual(prestamo);
            var ruta = await _almacenamiento.GuardarAsync(CarpetaFirmados, $"{numero}-firmado{escaneo.Extension}", escaneo.Contenido);
            asignar(prestamo, ruta);

            try { await _db.SaveChangesAsync(); }
            catch { if (ruta != anterior) _almacenamiento.Eliminar(ruta); throw; }

            if (anterior != null && anterior != ruta) _almacenamiento.Eliminar(anterior);

            return NoContent();
        }

        private static bool MismoContenido(byte[] a, byte[] b) =>
            SHA256.HashData(a).AsSpan().SequenceEqual(SHA256.HashData(b));

        private IActionResult Firmado(string? rutaRelativa, string? numero, bool descargar)
        {
            var ruta = _almacenamiento.RutaExistente(rutaRelativa);
            if (ruta == null) return NotFound("El remito firmado no está cargado.");
            return this.Archivo(ruta, $"{numero}-firmado{Path.GetExtension(ruta)}", descargar);
        }
    }
}
