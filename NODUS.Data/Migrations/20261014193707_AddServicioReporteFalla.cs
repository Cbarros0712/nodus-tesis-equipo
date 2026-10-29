using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NODUS.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddServicioReporteFalla : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "id_servicio",
                table: "reporte_falla",
                type: "integer",
                nullable: true);

            // Reportes anteriores: el servicio de la última ubicación del equipo, si tiene.
            // Los que no tienen ubicación quedan en NULL (por eso la columna es nullable).
            migrationBuilder.Sql(@"
                UPDATE reporte_falla r
                SET id_servicio = (
                    SELECT u.id_servicio FROM ubicacion u
                    WHERE u.id_equipo = r.id_equipo
                    ORDER BY u.fecha_traslado DESC, u.id_ubicacion DESC
                    LIMIT 1)
                WHERE r.id_servicio IS NULL;");

            migrationBuilder.CreateIndex(
                name: "IX_reporte_falla_id_servicio",
                table: "reporte_falla",
                column: "id_servicio");

            migrationBuilder.AddForeignKey(
                name: "FK_reporte_falla_servicio_id_servicio",
                table: "reporte_falla",
                column: "id_servicio",
                principalTable: "servicio",
                principalColumn: "id_servicio",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_reporte_falla_servicio_id_servicio",
                table: "reporte_falla");

            migrationBuilder.DropIndex(
                name: "IX_reporte_falla_id_servicio",
                table: "reporte_falla");

            migrationBuilder.DropColumn(
                name: "id_servicio",
                table: "reporte_falla");
        }
    }
}
