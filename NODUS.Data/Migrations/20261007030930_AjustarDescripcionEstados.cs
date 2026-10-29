using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NODUS.Data.Migrations
{
    /// <inheritdoc />
    public partial class AjustarDescripcionEstados : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "estado_equipo",
                keyColumn: "id_estado",
                keyValue: 2,
                column: "descripcion",
                value: "Equipo con orden de trabajo en curso");

            migrationBuilder.UpdateData(
                table: "estado_equipo",
                keyColumn: "id_estado",
                keyValue: 3,
                column: "descripcion",
                value: "Equipo con orden de trabajo pendiente, aún no iniciada");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "estado_equipo",
                keyColumn: "id_estado",
                keyValue: 2,
                column: "descripcion",
                value: "Fuera de servicio transitorio por OT abierta");

            migrationBuilder.UpdateData(
                table: "estado_equipo",
                keyColumn: "id_estado",
                keyValue: 3,
                column: "descripcion",
                value: "Falla sin OT asignada");
        }
    }
}
