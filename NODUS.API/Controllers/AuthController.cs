using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using NODUS.Data;

namespace NODUS.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private const int MAX_USUARIO = 150;
        private const int MAX_PASSWORD = 128;
        private const int MINUTOS_TOKEN_POR_DEFECTO = 60;

        // Hash de relleno: se verifica contra él cuando el usuario no existe, para que la respuesta
        // tarde lo mismo y no se pueda averiguar qué usuarios están registrados midiendo tiempos.
        private static readonly string HashFicticio = BCrypt.Net.BCrypt.HashPassword("nodus-usuario-inexistente");

        private readonly NodusDbContext _db;
        private readonly IConfiguration _config;
        private readonly ILogger<AuthController> _log;

        public AuthController(NodusDbContext db, IConfiguration config, ILogger<AuthController> log)
        {
            _db = db;
            _config = config;
            _log = log;
        }

        public class LoginRequest
        {
            public string Usuario { get; set; } = string.Empty;
            public string Password { get; set; } = string.Empty;
        }

        [AllowAnonymous]
        [EnableRateLimiting("Login")]
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            var texto = (request.Usuario ?? string.Empty).Trim();
            var password = request.Password ?? string.Empty;

            if (texto.Length == 0 || password.Length == 0)
                return BadRequest("Usuario y contraseña son obligatorios.");
            if (texto.Length > MAX_USUARIO || password.Length > MAX_PASSWORD)
                return Unauthorized("Credenciales inválidas.");

            var buscado = texto.ToLower();
            var usuario = await _db.Usuarios
                .FirstOrDefaultAsync(u => u.Nombre.ToLower() == buscado || u.Email.ToLower() == buscado);

            var passwordValido = BCrypt.Net.BCrypt.Verify(password, usuario?.PasswordHash ?? HashFicticio);

            if (usuario == null || !passwordValido)
            {
                _log.LogWarning("Intento de inicio de sesión fallido desde {Ip}", HttpContext.Connection.RemoteIpAddress);
                return Unauthorized("Credenciales inválidas.");
            }

            var token = GenerarToken(usuario.IdUsuario, usuario.Nombre, usuario.Rol, usuario.Email);

            return Ok(new
            {
                token,
                usuario = new
                {
                    usuario.IdUsuario,
                    usuario.Nombre,
                    usuario.Rol,
                    usuario.Email
                }
            });
        }

        private string GenerarToken(int id, string nombre, string rol, string email)
        {
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));
            var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, id.ToString()),
                new Claim(ClaimTypes.Name, nombre),
                new Claim(ClaimTypes.Role, rol),
                new Claim(ClaimTypes.Email, email)
            };

            var minutos = int.TryParse(_config["Jwt:ExpireMinutes"], out var m) && m > 0
                ? m
                : MINUTOS_TOKEN_POR_DEFECTO;

            var token = new JwtSecurityToken(
                issuer: _config["Jwt:Issuer"],
                audience: _config["Jwt:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(minutos),
                signingCredentials: credentials
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}