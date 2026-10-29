using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace NODUS.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddProrrogasPrestamo : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "fecha_estimada_devolucion_original",
                table: "prestamo",
                type: "timestamp with time zone",
                nullable: true);

            // Préstamos existentes: todavía no tuvieron prórrogas, así que la fecha original es la estimada actual
            migrationBuilder.Sql("UPDATE prestamo SET fecha_estimada_devolucion_original = fecha_estimada_devolucion;");

            migrationBuilder.CreateTable(
                name: "prorroga_prestamo",
                columns: table => new
                {
                    id_prorroga = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    id_prestamo = table.Column<int>(type: "integer", nullable: false),
                    fecha_anterior = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    fecha_nueva = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    motivo = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    fecha_solicitud = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    id_usuario = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_prorroga_prestamo", x => x.id_prorroga);
                    table.ForeignKey(
                        name: "FK_prorroga_prestamo_prestamo_id_prestamo",
                        column: x => x.id_prestamo,
                        principalTable: "prestamo",
                        principalColumn: "id_prestamo",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_prorroga_prestamo_usuario_id_usuario",
                        column: x => x.id_usuario,
                        principalTable: "usuario",
                        principalColumn: "id_usuario",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_prorroga_prestamo_id_prestamo",
                table: "prorroga_prestamo",
                column: "id_prestamo");

            migrationBuilder.CreateIndex(
                name: "IX_prorroga_prestamo_id_usuario",
                table: "prorroga_prestamo",
                column: "id_usuario");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "prorroga_prestamo");

            migrationBuilder.DropColumn(
                name: "fecha_estimada_devolucion_original",
                table: "prestamo");
        }
    }
}
