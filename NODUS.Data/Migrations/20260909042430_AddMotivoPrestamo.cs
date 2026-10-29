using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace NODUS.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddMotivoPrestamo : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "motivo",
                table: "prestamo",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "prestamo_componente",
                columns: table => new
                {
                    id_prestamo_componente = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    componente = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    id_prestamo = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_prestamo_componente", x => x.id_prestamo_componente);
                    table.ForeignKey(
                        name: "FK_prestamo_componente_prestamo_id_prestamo",
                        column: x => x.id_prestamo,
                        principalTable: "prestamo",
                        principalColumn: "id_prestamo",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_prestamo_componente_id_prestamo",
                table: "prestamo_componente",
                column: "id_prestamo");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "prestamo_componente");

            migrationBuilder.DropColumn(
                name: "motivo",
                table: "prestamo");
        }
    }
}
