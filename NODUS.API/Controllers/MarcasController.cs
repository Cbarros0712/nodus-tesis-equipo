using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NODUS.Data;
using NODUS.Models;

namespace NODUS.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class MarcasController : ControllerBase
    {
        private const int MAX_NOMBRE = 100;
        private const int MAX_PAIS = 60;


        private const string MSJ_NO_GUARDADA =
            "No se pudo guardar la marca. Revisá los datos e intentá de nuevo.";

        private readonly NodusDbContext _db;

        public MarcasController(NodusDbContext db)
        {
            _db = db;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Marca>>> GetMarcas()
        {
            return await _db.Marcas.ToListAsync();
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Marca>> GetMarca(int id)
        {
            var marca = await _db.Marcas.FindAsync(id);
            if (marca == null) return NotFound();
            return marca;
        }

        [HttpPost]
        public async Task<ActionResult<Marca>> PostMarca(Marca entrada)
        {
            var error = await ValidarMarca(entrada, null);
            if (error != null) return BadRequest(error);

            // Se copian solo los campos conocidos: así no se pueden colar equipos u otros objetos anidados.
            var marca = new Marca
            {
                Nombre = entrada.Nombre,
                PaisOrigen = entrada.PaisOrigen
            };

            _db.Marcas.Add(marca);
            try { await _db.SaveChangesAsync(); }
            catch (DbUpdateException) { return BadRequest(MSJ_NO_GUARDADA); }

            return CreatedAtAction(nameof(GetMarca), new { id = marca.IdMarca }, marca);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> PutMarca(int id, Marca entrada)
        {
            if (id != entrada.IdMarca) return BadRequest();

            var marca = await _db.Marcas.FindAsync(id);
            if (marca == null) return NotFound();

            var error = await ValidarMarca(entrada, id);
            if (error != null) return BadRequest(error);

            marca.Nombre = entrada.Nombre;
            marca.PaisOrigen = entrada.PaisOrigen;

            try
            {
                await _db.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!_db.Marcas.Any(e => e.IdMarca == id)) return NotFound();
                throw;
            }
            catch (DbUpdateException)
            {
                return BadRequest(MSJ_NO_GUARDADA);
            }

            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteMarca(int id)
        {
            var marca = await _db.Marcas.FindAsync(id);
            if (marca == null) return NotFound();

            var tieneEquipos = await _db.Equipos.AnyAsync(e => e.IdMarca == id);
            if (tieneEquipos)
                return BadRequest("No se puede eliminar: tiene equipos asociados.");

            _db.Marcas.Remove(marca);
            try { await _db.SaveChangesAsync(); }
            catch (DbUpdateException)
            {
                return BadRequest("No se puede eliminar la marca porque tiene registros asociados.");
            }
            return NoContent();
        }

        // Valida y normaliza (recorta espacios). idActual es null al crear.
        private async Task<string?> ValidarMarca(Marca m, int? idActual)
        {
            m.Nombre = (m.Nombre ?? string.Empty).Trim();
            m.PaisOrigen = (m.PaisOrigen ?? string.Empty).Trim();

            if (m.Nombre.Length == 0)
                return "El nombre de la marca es obligatorio.";
            if (m.Nombre.Length > MAX_NOMBRE)
                return $"El nombre no puede superar los {MAX_NOMBRE} caracteres.";
            if (m.PaisOrigen.Length > MAX_PAIS)
                return $"El país de origen no puede superar los {MAX_PAIS} caracteres.";

            var nombre = m.Nombre.ToLower();
            var duplicada = await _db.Marcas.AnyAsync(x =>
                x.Nombre.Trim().ToLower() == nombre && (idActual == null || x.IdMarca != idActual));
            if (duplicada)
                return "Ya existe una marca con ese nombre.";

            return null;
        }
    }
}