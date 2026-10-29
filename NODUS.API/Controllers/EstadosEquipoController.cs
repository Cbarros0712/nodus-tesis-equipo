using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NODUS.Data;
using NODUS.Models;

namespace NODUS.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class EstadosEquipoController : ControllerBase
    {
        private readonly NodusDbContext _db;

        public EstadosEquipoController(NodusDbContext db)
        {
            _db = db;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<EstadoEquipo>>> GetEstados()
        {
            var estados = await _db.EstadosEquipo.ToListAsync();
            return Ok(estados);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<EstadoEquipo>> GetEstado(int id)
        {
            var estado = await _db.EstadosEquipo.FindAsync(id);
            if (estado == null) return NotFound();
            return Ok(estado);
        }
    }
}