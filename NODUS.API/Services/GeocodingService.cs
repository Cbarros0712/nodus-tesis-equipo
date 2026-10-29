using System.Globalization;
using System.Text.Json;
using System.Text.RegularExpressions;
using NODUS.Models;

namespace NODUS.API.Services
{
    public record GeocodingResultado(double Latitud, double Longitud, string Fuente, string DisplayName);

    public class GeocodingService
    {
        private static readonly TimeSpan DelayEntreRequests = TimeSpan.FromMilliseconds(1100);
        private static readonly SemaphoreSlim _lock = new(1, 1);
        private static DateTime _ultimoRequest = DateTime.MinValue;

        private static readonly string[] TiposSalud = { "hospital", "clinic", "doctors" };

        private readonly HttpClient _http;
        private readonly ILogger<GeocodingService> _logger;

        public GeocodingService(HttpClient http, ILogger<GeocodingService> logger)
        {
            _http = http;
            _logger = logger;
        }

        public async Task<GeocodingResultado?> GeocodificarHospitalAsync(HospitalExterno h, CancellationToken ct = default)
        {
            var ciudad = NormalizarLocalidad(h.Localidad);

            var direccion = LimpiarDireccion(h.Direccion);
            if (!string.IsNullOrWhiteSpace(direccion))
            {
                var r = await BuscarAsync($"{direccion}, {ciudad}", ct);

                if (r != null && r.Value.GetProperty("category").GetString() != "highway")
                    return ToResultado(r.Value, "direccion");
            }

            var porNombre = await BuscarAsync($"{h.Nombre}, {ciudad}", ct);
            if (porNombre != null
                && porNombre.Value.GetProperty("category").GetString() == "amenity"
                && TiposSalud.Contains(porNombre.Value.GetProperty("type").GetString()))
                return ToResultado(porNombre.Value, "nombre");

            return null;
        }

        private async Task<JsonElement?> BuscarAsync(string consulta, CancellationToken ct)
        {
            await _lock.WaitAsync(ct);
            try
            {
                var espera = _ultimoRequest + DelayEntreRequests - DateTime.UtcNow;
                if (espera > TimeSpan.Zero) await Task.Delay(espera, ct);

                var url = $"search?format=jsonv2&limit=1&countrycodes=ar&q={Uri.EscapeDataString(consulta)}";
                try
                {
                    using var resp = await _http.GetAsync(url, ct);
                    resp.EnsureSuccessStatusCode();
                    using var doc = JsonDocument.Parse(await resp.Content.ReadAsStringAsync(ct));
                    return doc.RootElement.GetArrayLength() > 0 ? doc.RootElement[0].Clone() : null;
                }
                catch (HttpRequestException ex)
                {
                    _logger.LogWarning(ex, "Error consultando Nominatim para '{Consulta}'", consulta);
                    return null;
                }
                finally
                {
                    _ultimoRequest = DateTime.UtcNow;
                }
            }
            finally
            {
                _lock.Release();
            }
        }

        private static GeocodingResultado ToResultado(JsonElement r, string fuente) => new(
            double.Parse(r.GetProperty("lat").GetString()!, CultureInfo.InvariantCulture),
            double.Parse(r.GetProperty("lon").GetString()!, CultureInfo.InvariantCulture),
            fuente,
            r.GetProperty("display_name").GetString() ?? string.Empty);

        private static string NormalizarLocalidad(string? localidad)
        {
            var loc = Regex.Replace(localidad ?? string.Empty, @"\s+capital$", string.Empty, RegexOptions.IgnoreCase).Trim();
            if (string.IsNullOrEmpty(loc)) return "Córdoba, Argentina";
            return loc.Equals("Córdoba", StringComparison.OrdinalIgnoreCase)
                ? "Córdoba, Argentina"
                : $"{loc}, Córdoba, Argentina";
        }

        private static string? LimpiarDireccion(string? direccion) =>
            direccion == null ? null : Regex.Replace(direccion, @"\bs/n\b", string.Empty, RegexOptions.IgnoreCase).Trim();
    }
}
