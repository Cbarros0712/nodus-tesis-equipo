using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace NODUS.Data.Migrations
{
    /// <inheritdoc />
    public partial class AgregarUsuario : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "usuario",
                columns: table => new
                {
                    id_usuario = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    nombre = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    rol = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    email = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    password_hash = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_usuario", x => x.id_usuario);
                });

            migrationBuilder.InsertData(
                table: "usuario",
                columns: new[] { "id_usuario", "email", "nombre", "password_hash", "rol" },
                values: new object[,]
                {
                    { 1, "tecnico@hospital.gob.ar", "Ing. Carlos Rivas", "$2a$11$K1ZpMEfiMQTJGtWMnKz5iuYDE3Ew5AHkWMhVzEqRYJCRjEcNJ9L2i", "Técnico biomédico" },
                    { 2, "jefe@hospital.gob.ar", "Lic. Martín Díaz", "$2a$11$K1ZpMEfiMQTJGtWMnKz5iuYDE3Ew5AHkWMhVzEqRYJCRjEcNJ9L2i", "Jefe patrimonio" },
                    { 3, "admin@hospital.gob.ar", "Admin Sistema", "$2a$11$K1ZpMEfiMQTJGtWMnKz5iuYDE3Ew5AHkWMhVzEqRYJCRjEcNJ9L2i", "Administrador" }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "usuario");
        }
    }
}
