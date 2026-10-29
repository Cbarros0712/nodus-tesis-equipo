using Microsoft.AspNetCore.Mvc;
using NODUS.API.Services;

namespace NODUS.API.Controllers
{
    internal static class ArchivoResultExtensions
    {
        public static IActionResult Archivo(this ControllerBase controller, string rutaAbsoluta, string nombre, bool descargar)
        {
            var contentType = AlmacenamientoService.ContentType(rutaAbsoluta);
            if (descargar)
                return controller.PhysicalFile(rutaAbsoluta, contentType, nombre);

            controller.Response.Headers.ContentDisposition = $"inline; filename=\"{nombre}\"";
            return controller.PhysicalFile(rutaAbsoluta, contentType);
        }
    }
}
