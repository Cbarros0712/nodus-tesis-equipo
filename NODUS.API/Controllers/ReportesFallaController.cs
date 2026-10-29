using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using NODUS.API.DTOs;
using NODUS.API.Services;

namespace NODUS.API.Controllers
{
    [ApiController]
    public class ReportesFallaController : ControllerBase
    {
        private readonly ReportesFallaService _reportes;

        public ReportesFallaController(ReportesFallaService reportes)
        {
            _reportes = reportes;
        }

        [HttpGet("api/equipos/{id:int}/ficha-qr")]
        [Authorize(Policy = Politicas.CualquierUsuario)]
        public async Task<ActionResult<FichaQrDto>> GetFichaQr(int id)
        {
            var ficha = await _reportes.ObtenerFichaQr(id);
            if (ficha == null) return NotFound("El equipo no existe.");
            return Ok(ficha);
        }

        [HttpGet("api/equipos/buscar-qr")]
        [Authorize(Policy = Politicas.CualquierUsuario)]
        public async Task<IActionResult> BuscarParaQr([FromQuery] string? codigo)
        {
            if (string.IsNullOrWhiteSpace(codigo) || codigo.Length > 100)
                return BadRequest("Ingresá un número de serie o ID válido.");

            var idEquipo = await _reportes.BuscarIdEquipo(codigo);
            if (idEquipo == null) return NotFound("No se encontró ningún equipo con ese número de serie o ID.");
            return Ok(new { idEquipo });
        }

        [HttpPost("api/equipos/{id:int}/reportes-falla")]
        [Authorize(Policy = Politicas.CualquierUsuario)]
        [EnableRateLimiting(LimitesTasa.ReportesFalla)]
        public async Task<IActionResult> PostReporte(int id, [FromBody] ReporteFallaInputDto input)
        {
            var idUsuario = IdUsuarioDelToken();
            if (idUsuario == null) return Unauthorized();

            var r = await _reportes.Crear(id, idUsuario.Value, input);
            if (r.Resultado != ResultadoReporte.Ok) return Respuesta(r);

            return StatusCode(StatusCodes.Status201Created, new { r.Reporte!.IdReporteFalla, r.Reporte.Estado });
        }

        [HttpGet("api/reportes-falla")]
        [Authorize(Roles = Roles.GestionReportesFalla)]
        public async Task<ActionResult<IEnumerable<ReporteFallaDto>>> GetReportes([FromQuery] string? estado)
        {
            return Ok(await _reportes.Listar(estado));
        }

        [HttpPost("api/reportes-falla/{id:int}/convertir-en-ot")]
        [Authorize(Roles = Roles.GestionReportesFalla)]
        public async Task<IActionResult> ConvertirEnOT(int id, [FromBody] ConvertirEnOTInputDto? input)
        {
            var idUsuario = IdUsuarioDelToken();
            if (idUsuario == null) return Unauthorized();

            var r = await _reportes.ConvertirEnOT(id, idUsuario.Value, input?.IdServicio);
            if (r.Resultado != ResultadoReporte.Ok) return Respuesta(r);
            return Ok(new { r.Reporte!.IdReporteFalla, r.Reporte.Estado, r.Reporte.IdOT });
        }

        [HttpPut("api/reportes-falla/{id:int}/descartar")]
        [Authorize(Roles = Roles.GestionReportesFalla)]
        public async Task<IActionResult> Descartar(int id)
        {
            var r = await _reportes.Descartar(id);
            if (r.Resultado != ResultadoReporte.Ok) return Respuesta(r);
            return Ok(new { r.Reporte!.IdReporteFalla, r.Reporte.Estado });
        }

        private int? IdUsuarioDelToken() =>
            int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

        private IActionResult Respuesta(RespuestaReporte r) => r.Resultado switch
        {
            ResultadoReporte.NoEncontrado => NotFound(r.Mensaje),
            ResultadoReporte.Duplicado or ResultadoReporte.Conflicto => Conflict(r.Mensaje),
            _ => BadRequest(r.Mensaje)
        };
    }
}
