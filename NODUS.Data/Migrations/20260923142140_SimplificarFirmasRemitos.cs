using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NODUS.Data.Migrations
{
    /// <summary>
    /// Deja dos documentos por préstamo (remito de salida y de devolución), cada uno con su escaneo firmado
    /// opcional. Reemplaza el circuito anterior de AddConfirmacionEntregaDevolucion (estado de entrega aparte
    /// y devolución confirmada solo al subir el DEV firmado).
    /// </summary>
    public partial class SimplificarFirmasRemitos : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Ahora el DEV se genera al registrar la devolución: los DEV generados para préstamos que siguen
            // en curso (circuito anterior, sin confirmar) se descartan. Sus números quedan sin usar.
            migrationBuilder.Sql(@"
                UPDATE prestamo
                SET numero_remito_devolucion = NULL, ruta_remito_devolucion_pdf = NULL, observaciones_devolucion = NULL
                WHERE estado <> 'Devuelto' AND numero_remito_devolucion IS NOT NULL;");

            // Los escaneos ya cargados se conservan: el de "entrega" es el remito de salida firmado
            migrationBuilder.RenameColumn(
                name: "ruta_remito_entrega_firmado",
                table: "prestamo",
                newName: "ruta_remito_salida_firmado");

            migrationBuilder.RenameColumn(
                name: "fecha_confirmacion_entrega",
                table: "prestamo",
                newName: "fecha_carga_firma_salida");

            migrationBuilder.RenameColumn(
                name: "fecha_confirmacion_devolucion",
                table: "prestamo",
                newName: "fecha_carga_firma_devolucion");

            migrationBuilder.DropColumn(
                name: "estado_entrega",
                table: "prestamo");

            // Al confirmar, fecha_devolucion_remito ya se copiaba a fecha_devolucion_real, que es la que queda
            migrationBuilder.DropColumn(
                name: "fecha_devolucion_remito",
                table: "prestamo");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "fecha_devolucion_remito",
                table: "prestamo",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "estado_entrega",
                table: "prestamo",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "PendienteEntrega");

            migrationBuilder.RenameColumn(
                name: "fecha_carga_firma_devolucion",
                table: "prestamo",
                newName: "fecha_confirmacion_devolucion");

            migrationBuilder.RenameColumn(
                name: "fecha_carga_firma_salida",
                table: "prestamo",
                newName: "fecha_confirmacion_entrega");

            migrationBuilder.RenameColumn(
                name: "ruta_remito_salida_firmado",
                table: "prestamo",
                newName: "ruta_remito_entrega_firmado");

            migrationBuilder.Sql(@"
                UPDATE prestamo SET estado_entrega = 'Entregado'
                WHERE estado = 'Devuelto' OR ruta_remito_entrega_firmado IS NOT NULL;
                UPDATE prestamo SET fecha_devolucion_remito = fecha_devolucion_real
                WHERE numero_remito_devolucion IS NOT NULL;");
        }
    }
}
