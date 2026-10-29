using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace NODUS.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddPrestamos : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "hospital_externo",
                columns: table => new
                {
                    id_hospital = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    nombre = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    localidad = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    direccion = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    contacto = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    telefono = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    email = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    activo = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_hospital_externo", x => x.id_hospital);
                });

            migrationBuilder.CreateTable(
                name: "prestamo",
                columns: table => new
                {
                    id_prestamo = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    fecha_prestamo = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    fecha_estimada_devolucion = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    fecha_devolucion_real = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    estado = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    observaciones = table.Column<string>(type: "text", nullable: true),
                    id_equipo = table.Column<int>(type: "integer", nullable: false),
                    id_hospital = table.Column<int>(type: "integer", nullable: false),
                    id_usuario = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_prestamo", x => x.id_prestamo);
                    table.ForeignKey(
                        name: "FK_prestamo_equipo_id_equipo",
                        column: x => x.id_equipo,
                        principalTable: "equipo",
                        principalColumn: "id_equipo",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_prestamo_hospital_externo_id_hospital",
                        column: x => x.id_hospital,
                        principalTable: "hospital_externo",
                        principalColumn: "id_hospital",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_prestamo_usuario_id_usuario",
                        column: x => x.id_usuario,
                        principalTable: "usuario",
                        principalColumn: "id_usuario",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_prestamo_id_equipo",
                table: "prestamo",
                column: "id_equipo");

            migrationBuilder.CreateIndex(
                name: "IX_prestamo_id_hospital",
                table: "prestamo",
                column: "id_hospital");

            migrationBuilder.CreateIndex(
                name: "IX_prestamo_id_usuario",
                table: "prestamo",
                column: "id_usuario");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "prestamo");

            migrationBuilder.DropTable(
                name: "hospital_externo");
        }
    }
}
