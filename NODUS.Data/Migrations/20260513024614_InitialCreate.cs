using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace NODUS.Data.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "estado_equipo",
                columns: table => new
                {
                    id_estado = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    nombre = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    descripcion = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    color_semaforo = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    inhabilita_operacion = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_estado_equipo", x => x.id_estado);
                });

            migrationBuilder.CreateTable(
                name: "marca",
                columns: table => new
                {
                    id_marca = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    nombre = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    pais_origen = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    contacto_soporte = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    telefono_soporte = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    email_soporte = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_marca", x => x.id_marca);
                });

            migrationBuilder.CreateTable(
                name: "tipo_activo",
                columns: table => new
                {
                    id_tipo = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    nombre = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    categoria = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tipo_activo", x => x.id_tipo);
                });

            migrationBuilder.CreateTable(
                name: "equipo",
                columns: table => new
                {
                    id_equipo = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    modelo = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    nro_serie = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    fecha_adquisicion = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    vencimiento_garantia = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    id_marca = table.Column<int>(type: "integer", nullable: false),
                    id_tipo = table.Column<int>(type: "integer", nullable: false),
                    id_estado = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_equipo", x => x.id_equipo);
                    table.ForeignKey(
                        name: "FK_equipo_estado_equipo_id_estado",
                        column: x => x.id_estado,
                        principalTable: "estado_equipo",
                        principalColumn: "id_estado",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_equipo_marca_id_marca",
                        column: x => x.id_marca,
                        principalTable: "marca",
                        principalColumn: "id_marca",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_equipo_tipo_activo_id_tipo",
                        column: x => x.id_tipo,
                        principalTable: "tipo_activo",
                        principalColumn: "id_tipo",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.InsertData(
                table: "estado_equipo",
                columns: new[] { "id_estado", "color_semaforo", "descripcion", "inhabilita_operacion", "nombre" },
                values: new object[,]
                {
                    { 1, "verde", "Equipo operativo y disponible", false, "En servicio" },
                    { 2, "amarillo", "Fuera de servicio transitorio por OT abierta", true, "En mantenimiento" },
                    { 3, "rojo", "Falla sin OT asignada, no disponible", true, "Fuera de servicio" },
                    { 4, "azul", "Cedido temporalmente a otro servicio", false, "En préstamo" },
                    { 5, "gris", "Dado de baja definitivamente por resolución", true, "Baja patrimonial" }
                });

            migrationBuilder.InsertData(
                table: "marca",
                columns: new[] { "id_marca", "contacto_soporte", "email_soporte", "nombre", "pais_origen", "telefono_soporte" },
                values: new object[,]
                {
                    { 1, "Getinge Latam", "soporte.ar@getinge.com", "Maquet / Getinge", "Alemania", "+54 11 4000-1200" },
                    { 2, "Philips Argentina", "healthcare.ar@philips.com", "Philips Healthcare", "Países Bajos", "+54 11 4319-3000" },
                    { 3, "Fresenius Argentina", "soporte@fresenius.com.ar", "Fresenius Kabi", "Alemania", "+54 11 5235-8800" },
                    { 4, "Dräger Argentina", "soporte.ar@draeger.com", "Dräger", "Alemania", "+54 11 4788-3500" }
                });

            migrationBuilder.InsertData(
                table: "tipo_activo",
                columns: new[] { "id_tipo", "categoria", "nombre" },
                values: new object[,]
                {
                    { 1, "Soporte vital", "Ventilador mecánico" },
                    { 2, "Diagnóstico", "Monitor multiparamétrico" },
                    { 3, "Soporte vital", "Bomba de infusión" },
                    { 4, "Quirúrgico", "Electrobisturí" },
                    { 5, "Soporte vital", "Incubadora neonatal" }
                });

            migrationBuilder.CreateIndex(
                name: "IX_equipo_id_estado",
                table: "equipo",
                column: "id_estado");

            migrationBuilder.CreateIndex(
                name: "IX_equipo_id_marca",
                table: "equipo",
                column: "id_marca");

            migrationBuilder.CreateIndex(
                name: "IX_equipo_id_tipo",
                table: "equipo",
                column: "id_tipo");

            migrationBuilder.CreateIndex(
                name: "IX_equipo_nro_serie",
                table: "equipo",
                column: "nro_serie",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "equipo");

            migrationBuilder.DropTable(
                name: "estado_equipo");

            migrationBuilder.DropTable(
                name: "marca");

            migrationBuilder.DropTable(
                name: "tipo_activo");
        }
    }
}
