using Microsoft.EntityFrameworkCore;
using NODUS.Data;
using NODUS.Models;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace NODUS.API.Services
{
    public class RemitoService
    {
        public const string TipoSalida = "REM";
        public const string TipoDevolucion = "DEV";
        private const string CarpetaRemitos = "Remitos";

        private readonly AlmacenamientoService _almacenamiento;

        public RemitoService(AlmacenamientoService almacenamiento)
        {
            _almacenamiento = almacenamiento;
        }

        public async Task<string> ReservarNumeroAsync(NodusDbContext db, string tipo, int anio)
        {
            var numero = (await db.Database.SqlQuery<int>($@"
                INSERT INTO remito_contador (tipo, anio, ultimo_numero) VALUES ({tipo}, {anio}, 1)
                ON CONFLICT (tipo, anio) DO UPDATE SET ultimo_numero = remito_contador.ultimo_numero + 1
                RETURNING ultimo_numero AS ""Value""").ToListAsync()).Single();

            return $"{tipo}-{anio}-{numero:D4}";
        }

        public Task<string> GenerarPdfAsync(Prestamo prestamo)
        {
            prestamo.FechaEmisionRemito ??= DateTime.UtcNow;
            var emision = TimeZoneInfo.ConvertTimeFromUtc(prestamo.FechaEmisionRemito.Value, ZonaHoraria.Argentina);
            return _almacenamiento.GuardarAsync(CarpetaRemitos, $"{prestamo.NumeroRemito}.pdf", CrearRemitoSalida(prestamo, emision).GeneratePdf());
        }

        public Task<string> GenerarPdfDevolucionAsync(Prestamo prestamo) =>
            _almacenamiento.GuardarAsync(CarpetaRemitos, $"{prestamo.NumeroRemitoDevolucion}.pdf",
                CrearRemitoDevolucion(prestamo, prestamo.FechaDevolucionReal!.Value, prestamo.ObservacionesDevolucion, ZonaHoraria.AhoraArgentina()).GeneratePdf());

        private static readonly string ColorPrimario = "#2C7DA0";
        private static readonly string ColorDevolucion = "#0F6E56";
        private static readonly string ColorBorde = "#CBD5E0";
        private static readonly string ColorTexto = "#2D3748";
        private static readonly string ColorSuave = "#6B7C8C";

        private static IDocument CrearRemitoSalida(Prestamo p, DateTime emision)
        {
            var hospital = p.Hospital!;
            return Documento(p, "REMITO DE PRÉSTAMO", p.NumeroRemito, ColorPrimario, emision, col =>
            {
                col.Item().Element(c => SeccionEquipo(c, p));
                col.Item().Element(c => SeccionComponentes(c, p, "Componentes entregados", "Verificado"));
                col.Item().Element(c => SeccionHospital(c, hospital, "Hospital destino"));
                col.Item().Element(c => Seccion(c, "Fechas", body =>
                {
                    Campo(body, "Fecha de préstamo", FechaCorta(p.FechaPrestamo));
                    Campo(body, "Devolución estimada", p.FechaEstimadaDevolucion.HasValue ? FechaCorta(p.FechaEstimadaDevolucion.Value) : "Sin fecha estimada");
                    Campo(body, "Registrado por", p.Usuario?.Nombre);
                }));
                if (!string.IsNullOrWhiteSpace(p.Observaciones))
                    col.Item().Element(c => Seccion(c, "Observaciones", body => body.Item().Text(p.Observaciones)));

                col.Item().Element(c => Firmas(c, "Entrega (institución)", $"Retira ({hospital.Nombre})"));
            });
        }

        private static IDocument CrearRemitoDevolucion(Prestamo p, DateTime fechaDevolucion, string? observaciones, DateTime emision)
        {
            var hospital = p.Hospital!;
            return Documento(p, "REMITO DE DEVOLUCIÓN", p.NumeroRemitoDevolucion!, ColorDevolucion, emision, col =>
            {
                col.Item().Element(c => Seccion(c, "Referencia", body =>
                {
                    Campo(body, "Remito de salida", p.NumeroRemito);
                    Campo(body, "Préstamo", $"#{p.IdPrestamo}");
                }));
                col.Item().Element(c => SeccionEquipo(c, p));
                col.Item().Element(c => SeccionComponentes(c, p, "Componentes a devolver", "Devuelto"));
                col.Item().Element(c => SeccionHospital(c, hospital, "Hospital que devuelve"));
                col.Item().Element(c => Seccion(c, "Fechas", body =>
                {
                    Campo(body, "Fecha de préstamo", FechaCorta(p.FechaPrestamo));
                    Campo(body, "Devolución pactada", p.FechaEstimadaDevolucionOriginal.HasValue ? FechaCorta(p.FechaEstimadaDevolucionOriginal.Value) : "Sin fecha estimada");
                    if (p.Prorrogas.Count > 0 && p.FechaEstimadaDevolucion.HasValue)
                        Campo(body, "Devolución prorrogada", $"{FechaCorta(p.FechaEstimadaDevolucion.Value)} ({p.Prorrogas.Count} prórroga{(p.Prorrogas.Count == 1 ? "" : "s")})");
                    Campo(body, "Fecha de devolución", FechaCorta(fechaDevolucion));
                }));

                col.Item().Element(c => Seccion(c, "Estado del equipo al recibirlo", body =>
                {
                    if (!string.IsNullOrWhiteSpace(observaciones)) body.Item().Text(observaciones);
                    body.Item().Height(string.IsNullOrWhiteSpace(observaciones) ? 40 : 20);
                }));

                col.Item().Element(c => Firmas(c, $"Entrega ({hospital.Nombre})", "Recibe (institución)"));
            });
        }

        private static IDocument Documento(Prestamo p, string titulo, string numero, string color, DateTime emision, Action<ColumnDescriptor> contenido) =>
            Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(PageSizes.A4);
                    page.Margin(36);
                    page.DefaultTextStyle(t => t.FontSize(10).FontColor(ColorTexto));

                    page.Header().Column(col =>
                    {
                        col.Item().Row(row =>
                        {
                            row.RelativeItem().Column(c =>
                            {
                                c.Item().Text("NODUS").FontSize(20).Bold().FontColor(ColorPrimario);
                                c.Item().Text("Gestión de activos biomédicos").FontColor(ColorSuave);
                            });
                            row.ConstantItem(200).Border(1.5f).BorderColor(color).Padding(8).Column(c =>
                            {
                                c.Item().AlignCenter().Text(titulo).Bold().FontColor(color);
                                c.Item().AlignCenter().Text(numero).FontSize(14).Bold();
                                c.Item().AlignCenter().Text($"Emisión: {emision:dd/MM/yyyy HH:mm}").FontSize(9).FontColor(ColorSuave);
                            });
                        });
                        col.Item().PaddingTop(10).LineHorizontal(1).LineColor(ColorBorde);
                    });

                    page.Content().PaddingTop(12).Column(col =>
                    {
                        col.Spacing(10);
                        contenido(col);
                    });

                    page.Footer().AlignCenter().Text(t =>
                    {
                        t.DefaultTextStyle(s => s.FontSize(8).FontColor(ColorSuave));
                        t.Span($"{numero} · Préstamo #{p.IdPrestamo} · Página ");
                        t.CurrentPageNumber();
                        t.Span(" de ");
                        t.TotalPages();
                    });
                });
            });

        private static void SeccionEquipo(IContainer container, Prestamo p)
        {
            var equipo = p.Equipo!;
            Seccion(container, "Equipo", body =>
            {
                Campo(body, "Equipo", string.Join(" · ", new[] { equipo.TipoActivo?.Nombre, equipo.Marca?.Nombre, equipo.Modelo }.Where(s => !string.IsNullOrWhiteSpace(s))));
                Campo(body, "N° de serie", equipo.NroSerie);
                Campo(body, "Motivo del préstamo", p.Motivo);
            });
        }

        private static void SeccionComponentes(IContainer container, Prestamo p, string titulo, string columnaCheck)
        {
            var componentes = p.PrestamoComponentes.Select(c => c.Componente).ToList();
            if (componentes.Count == 0) return;

            Seccion(container, $"{titulo} ({componentes.Count})", body =>
            {
                body.Item().Table(table =>
                {
                    table.ColumnsDefinition(cols =>
                    {
                        cols.ConstantColumn(28);
                        cols.RelativeColumn();
                        cols.ConstantColumn(60);
                    });
                    table.Header(h =>
                    {
                        h.Cell().Element(CeldaEncabezado).Text("#");
                        h.Cell().Element(CeldaEncabezado).Text("Componente");
                        h.Cell().Element(CeldaEncabezado).AlignCenter().Text(columnaCheck);
                    });
                    for (var i = 0; i < componentes.Count; i++)
                    {
                        table.Cell().Element(Celda).Text((i + 1).ToString());
                        table.Cell().Element(Celda).Text(componentes[i]);
                        table.Cell().Element(Celda).AlignCenter().AlignMiddle().Width(10).Height(10).Border(1).BorderColor(ColorSuave);
                    }
                });
            });
        }

        private static void SeccionHospital(IContainer container, HospitalExterno hospital, string titulo)
        {
            Seccion(container, titulo, body =>
            {
                Campo(body, "Hospital", hospital.Nombre);
                Campo(body, "Dirección", string.Join(", ", new[] { hospital.Direccion, hospital.Localidad }.Where(s => !string.IsNullOrWhiteSpace(s))));
                Campo(body, "Contacto", hospital.Contacto);
                Campo(body, "Teléfono", hospital.Telefono);
                Campo(body, "Email", hospital.Email);
            });
        }

        private static void Firmas(IContainer container, string izquierda, string derecha)
        {
            container.PaddingTop(12).ShowEntire().Row(row =>
            {
                row.RelativeItem().Element(c => RecuadroFirma(c, izquierda));
                row.ConstantItem(24);
                row.RelativeItem().Element(c => RecuadroFirma(c, derecha));
            });
        }

        private static void Seccion(IContainer container, string titulo, Action<ColumnDescriptor> contenido)
        {
            container.Border(1).BorderColor(ColorBorde).Column(col =>
            {
                col.Item().Background("#F0F6FA").PaddingVertical(5).PaddingHorizontal(10)
                    .Text(titulo.ToUpperInvariant()).FontSize(9).Bold().FontColor(ColorPrimario);
                col.Item().PaddingVertical(7).PaddingHorizontal(10).Column(body =>
                {
                    body.Spacing(3);
                    contenido(body);
                });
            });
        }

        private static void Campo(ColumnDescriptor col, string etiqueta, string? valor)
        {
            col.Item().Row(row =>
            {
                row.ConstantItem(120).Text(etiqueta).FontColor(ColorSuave);
                row.RelativeItem().Text(string.IsNullOrWhiteSpace(valor) ? "—" : valor);
            });
        }

        private static void RecuadroFirma(IContainer container, string titulo)
        {
            container.Border(1).BorderColor(ColorBorde).Padding(10).Column(col =>
            {
                col.Item().Text(titulo).Bold().FontSize(9);
                col.Item().Height(42);
                col.Item().LineHorizontal(0.75f).LineColor(ColorSuave);
                col.Item().PaddingTop(2).Text("Firma").FontSize(8).FontColor(ColorSuave);
                col.Item().Height(20);
                col.Item().LineHorizontal(0.75f).LineColor(ColorSuave);
                col.Item().PaddingTop(2).Row(r =>
                {
                    r.RelativeItem().Text("Aclaración").FontSize(8).FontColor(ColorSuave);
                    r.ConstantItem(90).Text("DNI / Fecha").FontSize(8).FontColor(ColorSuave);
                });
            });
        }

        private static IContainer CeldaEncabezado(IContainer c) =>
            c.BorderBottom(1).BorderColor(ColorBorde).PaddingVertical(4).PaddingHorizontal(4).DefaultTextStyle(s => s.Bold().FontSize(9));

        private static IContainer Celda(IContainer c) =>
            c.BorderBottom(0.5f).BorderColor("#EDF2F7").PaddingVertical(2).PaddingHorizontal(4);

        private static string FechaCorta(DateTime fecha) => fecha.ToString("dd/MM/yyyy");
    }
}
