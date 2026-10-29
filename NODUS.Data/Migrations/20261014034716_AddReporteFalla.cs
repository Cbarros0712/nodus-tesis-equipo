using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace NODUS.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddReporteFalla : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "reporte_falla",
                columns: table => new
                {
                    id_reporte_falla = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    id_equipo = table.Column<int>(type: "integer", nullable: false),
                    id_usuario = table.Column<int>(type: "integer", nullable: false),
                    nombre_completo = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    legajo = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    descripcion = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    fecha_reporte = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    fecha_dia = table.Column<DateOnly>(type: "date", nullable: false),
                    estado = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false, defaultValue: "Pendiente"),
                    id_ot = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_reporte_falla", x => x.id_reporte_falla);
                    table.ForeignKey(
                        name: "FK_reporte_falla_equipo_id_equipo",
                        column: x => x.id_equipo,
                        principalTable: "equipo",
                        principalColumn: "id_equipo",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_reporte_falla_orden_trabajo_id_ot",
                        column: x => x.id_ot,
                        principalTable: "orden_trabajo",
                        principalColumn: "id_ot",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_reporte_falla_usuario_id_usuario",
                        column: x => x.id_usuario,
                        principalTable: "usuario",
                        principalColumn: "id_usuario",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_reporte_falla_estado",
                table: "reporte_falla",
                column: "estado");

            migrationBuilder.CreateIndex(
                name: "IX_reporte_falla_id_ot",
                table: "reporte_falla",
                column: "id_ot");

            migrationBuilder.CreateIndex(
                name: "IX_reporte_falla_id_usuario",
                table: "reporte_falla",
                column: "id_usuario");

            migrationBuilder.CreateIndex(
                name: "ux_reporte_falla_equipo_dia",
                table: "reporte_falla",
                columns: new[] { "id_equipo", "fecha_dia" },
                unique: true,
                filter: "estado <> 'Descartado'");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "reporte_falla");
        }
    }
}
