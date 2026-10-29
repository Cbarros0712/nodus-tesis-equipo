namespace NODUS.API.Services
{
    public class AlmacenamientoService
    {
        public const long TamanioMaximoEscaneo = 10 * 1024 * 1024;

        private readonly string _raiz;

        public AlmacenamientoService(IWebHostEnvironment env)
        {
            _raiz = Path.GetFullPath(Path.Combine(env.ContentRootPath, "Storage"));
        }

        public async Task<string> GuardarAsync(string carpeta, string nombreArchivo, byte[] contenido)
        {
            var relativa = Path.Combine(carpeta, nombreArchivo);
            var absoluta = RutaAbsoluta(relativa) ?? throw new InvalidOperationException("Ruta de almacenamiento inválida.");
            Directory.CreateDirectory(Path.GetDirectoryName(absoluta)!);
            await File.WriteAllBytesAsync(absoluta, contenido);
            return relativa.Replace('\\', '/');
        }

        public string? RutaExistente(string? relativa)
        {
            var absoluta = RutaAbsoluta(relativa);
            return absoluta != null && File.Exists(absoluta) ? absoluta : null;
        }

        public void Eliminar(string? relativa)
        {
            var absoluta = RutaExistente(relativa);
            if (absoluta != null) File.Delete(absoluta);
        }

        private string? RutaAbsoluta(string? relativa)
        {
            if (string.IsNullOrWhiteSpace(relativa)) return null;
            var absoluta = Path.GetFullPath(Path.Combine(_raiz, relativa));
            return absoluta.StartsWith(_raiz + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase) ? absoluta : null;
        }

        public record EscaneoValidado(byte[] Contenido, string Extension);

        public static async Task<(EscaneoValidado? Escaneo, string? Error)> ValidarEscaneoAsync(IFormFile? archivo)
        {
            if (archivo == null || archivo.Length == 0)
                return (null, "Adjuntá el remito firmado (foto o PDF).");
            if (archivo.Length > TamanioMaximoEscaneo)
                return (null, "El archivo supera los 10 MB. Probá con una foto de menor resolución.");

            using var ms = new MemoryStream();
            await archivo.CopyToAsync(ms);
            var bytes = ms.ToArray();

            var extension = DetectarTipo(bytes);
            return extension == null
                ? (null, "Formato no admitido. Subí una foto (JPG o PNG) o un PDF.")
                : (new EscaneoValidado(bytes, extension), null);
        }

        private static string? DetectarTipo(byte[] b)
        {
            if (b.Length >= 4 && b[0] == 0x25 && b[1] == 0x50 && b[2] == 0x44 && b[3] == 0x46) return ".pdf";
            if (b.Length >= 3 && b[0] == 0xFF && b[1] == 0xD8 && b[2] == 0xFF) return ".jpg";
            if (b.Length >= 8 && b[0] == 0x89 && b[1] == 0x50 && b[2] == 0x4E && b[3] == 0x47
                && b[4] == 0x0D && b[5] == 0x0A && b[6] == 0x1A && b[7] == 0x0A) return ".png";
            return null;
        }

        public static string ContentType(string ruta) => Path.GetExtension(ruta).ToLowerInvariant() switch
        {
            ".pdf" => "application/pdf",
            ".jpg" => "image/jpeg",
            ".png" => "image/png",
            _ => "application/octet-stream"
        };
    }
}
