using System.Security.Claims;
using System.Text;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using NODUS.API.Services;
using NODUS.Data;

var builder = WebApplication.CreateBuilder(args);

var port = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrEmpty(port))
    builder.WebHost.UseUrls($"http://0.0.0.0:{port}");
else if (string.IsNullOrEmpty(Environment.GetEnvironmentVariable("ASPNETCORE_URLS")))
    builder.WebHost.UseUrls("http://0.0.0.0:5085");

var databaseUrl = Environment.GetEnvironmentVariable("DATABASE_URL");
if (!string.IsNullOrEmpty(databaseUrl))
{
    builder.Configuration["ConnectionStrings:NodusDB"] = ConvertirDatabaseUrl(databaseUrl);
}

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler =
            System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.CustomSchemaIds(type =>
    {
        var assembly = type.Assembly.GetName().Name?.Replace(".", "_") ?? "Unknown";
        return $"{assembly}_{type.Name}";
    });
});

builder.Services.AddDbContext<NodusDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("NodusDB")));

QuestPDF.Settings.License = QuestPDF.Infrastructure.LicenseType.Community;
builder.Services.AddSingleton<AlmacenamientoService>();
builder.Services.AddScoped<RemitoService>();
builder.Services.AddScoped<EstadosOTService>();
builder.Services.AddScoped<ReportesFallaService>();

builder.Services.AddHttpClient<GeocodingService>(client =>
{
    client.BaseAddress = new Uri("https://nominatim.openstreetmap.org/");
    client.DefaultRequestHeaders.UserAgent.ParseAdd("NODUS-GestionPrestamos/1.0");
    client.DefaultRequestHeaders.AcceptLanguage.ParseAdd("es");
    client.Timeout = TimeSpan.FromSeconds(15);
});

var claveJwt = builder.Configuration["Jwt:Key"];
if (string.IsNullOrWhiteSpace(claveJwt) || Encoding.UTF8.GetByteCount(claveJwt) < 32)
    throw new InvalidOperationException(
        "Falta configurar 'Jwt:Key' o es demasiado corta. Usá una clave de al menos 32 caracteres (variable de entorno Jwt__Key).");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ClockSkew = TimeSpan.FromMinutes(1),
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(claveJwt))
        };
    });

builder.Services.AddAuthorization(options =>
{
    var usuarioInterno = new AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser()
        .RequireAssertion(ctx => !ctx.User.IsInRole(Roles.PersonalAsistencial))
        .Build();
    options.AddPolicy(Politicas.UsuarioInterno, usuarioInterno);
    options.FallbackPolicy = usuarioInterno;

    options.AddPolicy(Politicas.CualquierUsuario, p => p.RequireAuthenticatedUser());
});

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.OnRejected = (ctx, _) =>
    {
        ctx.HttpContext.Response.ContentType = "text/plain; charset=utf-8";
        var esLogin = ctx.HttpContext.Request.Path.StartsWithSegments("/api/auth", StringComparison.OrdinalIgnoreCase);
        return new ValueTask(ctx.HttpContext.Response.WriteAsync(esLogin
            ? "Demasiados intentos de inicio de sesión. Esperá unos minutos y volvé a intentar."
            : "Enviaste demasiados reportes. Esperá unos minutos y volvé a intentar."));
    };

    // Freno a la fuerza bruta sobre el login: 8 intentos cada 5 minutos por dirección IP.
    options.AddPolicy("Login", http =>
        RateLimitPartition.GetFixedWindowLimiter(
            http.Connection.RemoteIpAddress?.ToString() ?? "anonimo",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 8,
                Window = TimeSpan.FromMinutes(5),
                QueueLimit = 0
            }));

    options.AddPolicy(LimitesTasa.ReportesFalla, http =>
        RateLimitPartition.GetFixedWindowLimiter(
            http.User.FindFirstValue(ClaimTypes.NameIdentifier) ?? http.Connection.RemoteIpAddress?.ToString() ?? "anonimo",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window = TimeSpan.FromMinutes(10),
                QueueLimit = 0
            }));
});

var origenesConfigurados = builder.Configuration.GetSection("Cors:Origenes").Get<string[]>() ?? Array.Empty<string>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("ReactApp", policy =>
    {
        // Si se configura Cors:Origenes (variable Cors__Origenes__0, Cors__Origenes__1...), solo esos orígenes
        // (más localhost) pueden usar la API. Sin configuración se mantiene el comportamiento anterior.
        policy.SetIsOriginAllowed(origin =>
                origin == "http://localhost:3000" ||
                origin == "http://localhost:5173" ||
                origin == "http://localhost:5174" ||
                origenesConfigurados.Contains(origin, StringComparer.OrdinalIgnoreCase) ||
                (origenesConfigurados.Length == 0 &&
                    (origin.EndsWith(".devtunnels.ms") || origin.EndsWith(".vercel.app"))))
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

const int intentosMigracion = 10;
for (var intento = 1; ; intento++)
{
    try
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<NodusDbContext>();
        db.Database.Migrate();
        break;
    }
    catch (Exception ex) when (intento < intentosMigracion)
    {
        app.Logger.LogWarning("No se pudo migrar la base (intento {Intento}/{Total}): {Mensaje}. Reintentando en 5 s...",
            intento, intentosMigracion, ex.Message);
        Thread.Sleep(TimeSpan.FromSeconds(5));
    }
}

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler(errores => errores.Run(async contexto =>
    {
        var detalle = contexto.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerFeature>();
        if (detalle?.Error != null)
            app.Logger.LogError(detalle.Error, "Error no controlado en {Metodo} {Ruta}", contexto.Request.Method, contexto.Request.Path);
        contexto.Response.StatusCode = StatusCodes.Status500InternalServerError;
        contexto.Response.ContentType = "text/plain; charset=utf-8";
        await contexto.Response.WriteAsync("Ocurrió un error inesperado. Intentá de nuevo en unos minutos.");
    }));
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("ReactApp");
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();

string[] documentosSinToken =
{
    "api/Prestamos/{id}/remito", "api/Prestamos/{id}/remito-devolucion",
    "api/Remitos/{id}/firma-salida", "api/Remitos/{id}/firma-devolucion"
};
string[] metodosDeEscritura = { "POST", "PUT", "PATCH", "DELETE" };

app.MapControllers().Add(endpoint =>
{
    if (endpoint is not RouteEndpointBuilder ruta) return;

    if (documentosSinToken.Contains(ruta.RoutePattern.RawText, StringComparer.OrdinalIgnoreCase))
    {
        endpoint.Metadata.Add(new AllowAnonymousAttribute());
        return;
    }

    var metodos = ruta.Metadata.OfType<HttpMethodMetadata>().FirstOrDefault()?.HttpMethods;
    var esEscritura = metodos != null
        && metodos.Any(m => metodosDeEscritura.Contains(m, StringComparer.OrdinalIgnoreCase));
    var tieneReglaPropia = ruta.Metadata.OfType<IAuthorizeData>().Any()
        || ruta.Metadata.OfType<IAllowAnonymous>().Any();

    if (esEscritura && !tieneReglaPropia)
        ruta.Metadata.Add(new AuthorizeAttribute { Roles = Roles.Bioingeniero });
});
app.Run();

static string ConvertirDatabaseUrl(string databaseUrl)
{
    var uri = new Uri(databaseUrl);
    var credenciales = uri.UserInfo.Split(':', 2);

    var csb = new Npgsql.NpgsqlConnectionStringBuilder
    {
        Host = uri.Host,
        Port = uri.Port > 0 ? uri.Port : 5432,
        Database = uri.AbsolutePath.TrimStart('/'),
        Username = Uri.UnescapeDataString(credenciales[0]),
        Password = credenciales.Length > 1 ? Uri.UnescapeDataString(credenciales[1]) : null,

        SslMode = Npgsql.SslMode.Prefer
    };
    return csb.ConnectionString;
}