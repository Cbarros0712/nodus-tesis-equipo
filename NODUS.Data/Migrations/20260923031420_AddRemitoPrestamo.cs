using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NODUS.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddRemitoPrestamo : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "numero_remito",
                table: "prestamo",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ruta_remito_pdf",
                table: "prestamo",
                type: "character varying(300)",
                maxLength: 300,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "remito_contador",
                columns: table => new
                {
                    anio = table.Column<int>(type: "integer", nullable: false),
                    ultimo_numero = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_remito_contador", x => x.anio);
                });

            // Préstamos existentes: numeración correlativa por año, en orden de fecha de préstamo
            migrationBuilder.Sql(@"
                UPDATE prestamo p
                SET numero_remito = n.numero
                FROM (
                    SELECT id_prestamo,
                           'REM-' || anio || '-' || LPAD(ROW_NUMBER() OVER (PARTITION BY anio ORDER BY fecha_prestamo, id_prestamo)::text, 4, '0') AS numero
                    FROM (SELECT id_prestamo, fecha_prestamo, EXTRACT(YEAR FROM fecha_prestamo AT TIME ZONE 'UTC')::int AS anio FROM prestamo) t
                ) n
                WHERE p.id_prestamo = n.id_prestamo;");

            // El contador arranca desde el último número asignado en cada año
            migrationBuilder.Sql(@"
                INSERT INTO remito_contador (anio, ultimo_numero)
                SELECT EXTRACT(YEAR FROM fecha_prestamo AT TIME ZONE 'UTC')::int, COUNT(*)
                FROM prestamo
                GROUP BY 1;");

            migrationBuilder.CreateIndex(
                name: "IX_prestamo_numero_remito",
                table: "prestamo",
                column: "numero_remito",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "remito_contador");

            migrationBuilder.DropIndex(
                name: "IX_prestamo_numero_remito",
                table: "prestamo");

            migrationBuilder.DropColumn(
                name: "numero_remito",
                table: "prestamo");

            migrationBuilder.DropColumn(
                name: "ruta_remito_pdf",
                table: "prestamo");
        }
    }
}
