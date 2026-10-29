using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NODUS.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddConfirmacionEntregaDevolucion : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: "PK_remito_contador",
                table: "remito_contador");

            migrationBuilder.AddColumn<string>(
                name: "tipo",
                table: "remito_contador",
                type: "character varying(3)",
                maxLength: 3,
                nullable: false,
                defaultValue: "REM"); // el contador que ya existe es el de remitos de salida

            // Préstamos activos quedan pendientes de entrega: se confirman subiendo el remito firmado
            migrationBuilder.AddColumn<string>(
                name: "estado_entrega",
                table: "prestamo",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "PendienteEntrega");

            // Los ya devueltos se entregaron antes de existir este circuito: quedan "Entregado" sin escaneo
            migrationBuilder.Sql("UPDATE prestamo SET estado_entrega = 'Entregado' WHERE estado = 'Devuelto';");

            migrationBuilder.AddColumn<DateTime>(
                name: "fecha_confirmacion_devolucion",
                table: "prestamo",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "fecha_confirmacion_entrega",
                table: "prestamo",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "fecha_devolucion_remito",
                table: "prestamo",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "numero_remito_devolucion",
                table: "prestamo",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "observaciones_devolucion",
                table: "prestamo",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ruta_remito_devolucion_firmado",
                table: "prestamo",
                type: "character varying(300)",
                maxLength: 300,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ruta_remito_devolucion_pdf",
                table: "prestamo",
                type: "character varying(300)",
                maxLength: 300,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ruta_remito_entrega_firmado",
                table: "prestamo",
                type: "character varying(300)",
                maxLength: 300,
                nullable: true);

            migrationBuilder.AddPrimaryKey(
                name: "PK_remito_contador",
                table: "remito_contador",
                columns: new[] { "tipo", "anio" });

            migrationBuilder.CreateIndex(
                name: "IX_prestamo_numero_remito_devolucion",
                table: "prestamo",
                column: "numero_remito_devolucion",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: "PK_remito_contador",
                table: "remito_contador");

            migrationBuilder.DropIndex(
                name: "IX_prestamo_numero_remito_devolucion",
                table: "prestamo");

            migrationBuilder.DropColumn(
                name: "tipo",
                table: "remito_contador");

            migrationBuilder.DropColumn(
                name: "estado_entrega",
                table: "prestamo");

            migrationBuilder.DropColumn(
                name: "fecha_confirmacion_devolucion",
                table: "prestamo");

            migrationBuilder.DropColumn(
                name: "fecha_confirmacion_entrega",
                table: "prestamo");

            migrationBuilder.DropColumn(
                name: "fecha_devolucion_remito",
                table: "prestamo");

            migrationBuilder.DropColumn(
                name: "numero_remito_devolucion",
                table: "prestamo");

            migrationBuilder.DropColumn(
                name: "observaciones_devolucion",
                table: "prestamo");

            migrationBuilder.DropColumn(
                name: "ruta_remito_devolucion_firmado",
                table: "prestamo");

            migrationBuilder.DropColumn(
                name: "ruta_remito_devolucion_pdf",
                table: "prestamo");

            migrationBuilder.DropColumn(
                name: "ruta_remito_entrega_firmado",
                table: "prestamo");

            migrationBuilder.AddPrimaryKey(
                name: "PK_remito_contador",
                table: "remito_contador",
                column: "anio");
        }
    }
}
