using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NODUS.API.Services;
using NODUS.Data;
using NODUS.Models;

namespace NODUS.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class UsuariosController : ControllerBase
    {
        private readonly NodusDbContext _db;

        public UsuariosController(NodusDbContext db)
        {
            _db = db;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<object>>> GetUsuarios()
        {
            var usuarios = await _db.Usuarios
                .Select(u => new
                {
                    u.IdUsuario,
                    u.Nombre,
                    u.Rol,
                    u.Email
                })
                .ToListAsync();
            return Ok(usuarios);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<object>> GetUsuario(int id)
        {
            var usuario = await _db.Usuarios
                .Where(u => u.IdUsuario == id)
                .Select(u => new { u.IdUsuario, u.Nombre, u.Rol, u.Email })
                .FirstOrDefaultAsync();
            if (usuario == null) return NotFound();
            return Ok(usuario);
        }

        [HttpPost]
        public async Task<ActionResult> PostUsuario([FromBody] UsuarioCreateRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Nombre))
                return BadRequest("El nombre es obligatorio.");
            if (string.IsNullOrWhiteSpace(request.Email))
                return BadRequest("El email es obligatorio.");
            if (string.IsNullOrWhiteSpace(request.Rol))
                return BadRequest("El rol es obligatorio.");
            if (!Roles.Todos.Contains(request.Rol))
                return BadRequest("El rol seleccionado no es válido.");
            if (string.IsNullOrWhiteSpace(request.Password))
                return BadRequest("La contraseña es obligatoria.");

            var existe = await _db.Usuarios.AnyAsync(u => u.Email == request.Email);
            if (existe) return BadRequest("Ya existe un usuario con ese email.");

            var usuario = new Usuario
            {
                Nombre = request.Nombre,
                Email = request.Email,
                Rol = request.Rol,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password)
            };

            _db.Usuarios.Add(usuario);
            await _db.SaveChangesAsync();

            return CreatedAtAction(nameof(GetUsuario), new { id = usuario.IdUsuario },
                new { usuario.IdUsuario, usuario.Nombre, usuario.Rol, usuario.Email });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> PutUsuario(int id, [FromBody] UsuarioUpdateRequest request)
        {
            var usuario = await _db.Usuarios.FindAsync(id);
            if (usuario == null) return NotFound();

            if (!string.IsNullOrWhiteSpace(request.Rol) && !Roles.Todos.Contains(request.Rol))
                return BadRequest("El rol seleccionado no es válido.");

            if (!string.IsNullOrWhiteSpace(request.Nombre)) usuario.Nombre = request.Nombre;
            if (!string.IsNullOrWhiteSpace(request.Email)) usuario.Email = request.Email;
            if (!string.IsNullOrWhiteSpace(request.Rol)) usuario.Rol = request.Rol;
            if (!string.IsNullOrWhiteSpace(request.Password))
                usuario.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);

            await _db.SaveChangesAsync();
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteUsuario(int id)
        {
            var usuario = await _db.Usuarios.FindAsync(id);
            if (usuario == null) return NotFound();

            _db.Usuarios.Remove(usuario);
            await _db.SaveChangesAsync();
            return NoContent();
        }
    }

    public class UsuarioCreateRequest
    {
        public string Nombre { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Rol { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }

    public class UsuarioUpdateRequest
    {
        public string? Nombre { get; set; }
        public string? Email { get; set; }
        public string? Rol { get; set; }
        public string? Password { get; set; }
    }
}