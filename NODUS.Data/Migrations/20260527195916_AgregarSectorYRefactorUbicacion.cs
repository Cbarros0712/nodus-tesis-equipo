using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace NODUS.Data.Migrations
{
    /// <inheritdoc />
    public partial class AgregarSectorYRefactorUbicacion : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "alerta",
                columns: table => new
                {
                    id_alerta = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    tipo = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    fecha_generacion = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    estado = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    id_equipo = table.Column<int>(type: "integer", nullable: true),
                    id_usuario = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_alerta", x => x.id_alerta);
                    table.ForeignKey(
                        name: "FK_alerta_equipo_id_equipo",
                        column: x => x.id_equipo,
                        principalTable: "equipo",
                        principalColumn: "id_equipo",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_alerta_usuario_id_usuario",
                        column: x => x.id_usuario,
                        principalTable: "usuario",
                        principalColumn: "id_usuario",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "baja_patrimonial",
                columns: table => new
                {
                    id_baja = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    fecha = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    motivo = table.Column<string>(type: "text", nullable: false),
                    informe_obsolescencia = table.Column<string>(type: "text", nullable: false),
                    id_equipo = table.Column<int>(type: "integer", nullable: false),
                    id_usuario = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_baja_patrimonial", x => x.id_baja);
                    table.ForeignKey(
                        name: "FK_baja_patrimonial_equipo_id_equipo",
                        column: x => x.id_equipo,
                        principalTable: "equipo",
                        principalColumn: "id_equipo",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_baja_patrimonial_usuario_id_usuario",
                        column: x => x.id_usuario,
                        principalTable: "usuario",
                        principalColumn: "id_usuario",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "hoja_de_vida",
                columns: table => new
                {
                    id_hoja = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    fecha_apertura = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    id_equipo = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_hoja_de_vida", x => x.id_hoja);
                    table.ForeignKey(
                        name: "FK_hoja_de_vida_equipo_id_equipo",
                        column: x => x.id_equipo,
                        principalTable: "equipo",
                        principalColumn: "id_equipo",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "insumo",
                columns: table => new
                {
                    id_insumo = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    nombre = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    tipo = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    stock_actual = table.Column<int>(type: "integer", nullable: false),
                    stock_minimo = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_insumo", x => x.id_insumo);
                });

            migrationBuilder.CreateTable(
                name: "sector",
                columns: table => new
                {
                    id_sector = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    nombre = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    descripcion = table.Column<string>(type: "character varying(250)", maxLength: 250, nullable: true),
                    activo = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_sector", x => x.id_sector);
                });

            migrationBuilder.CreateTable(
                name: "servicio",
                columns: table => new
                {
                    id_servicio = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    nombre = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    sector = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_servicio", x => x.id_servicio);
                });

            migrationBuilder.CreateTable(
                name: "orden_trabajo",
                columns: table => new
                {
                    id_ot = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    fecha_apertura = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    tipo = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    sintoma = table.Column<string>(type: "text", nullable: false),
                    estado = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    fecha_cierre = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    id_equipo = table.Column<int>(type: "integer", nullable: false),
                    id_servicio = table.Column<int>(type: "integer", nullable: false),
                    id_usuario = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_orden_trabajo", x => x.id_ot);
                    table.ForeignKey(
                        name: "FK_orden_trabajo_equipo_id_equipo",
                        column: x => x.id_equipo,
                        principalTable: "equipo",
                        principalColumn: "id_equipo",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_orden_trabajo_servicio_id_servicio",
                        column: x => x.id_servicio,
                        principalTable: "servicio",
                        principalColumn: "id_servicio",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_orden_trabajo_usuario_id_usuario",
                        column: x => x.id_usuario,
                        principalTable: "usuario",
                        principalColumn: "id_usuario",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ubicacion",
                columns: table => new
                {
                    id_ubicacion = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    fecha_traslado = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    id_sector_anterior = table.Column<int>(type: "integer", nullable: false),
                    id_sector_nuevo = table.Column<int>(type: "integer", nullable: false),
                    id_equipo = table.Column<int>(type: "integer", nullable: false),
                    id_servicio = table.Column<int>(type: "integer", nullable: false),
                    id_usuario = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ubicacion", x => x.id_ubicacion);
                    table.ForeignKey(
                        name: "FK_ubicacion_equipo_id_equipo",
                        column: x => x.id_equipo,
                        principalTable: "equipo",
                        principalColumn: "id_equipo",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ubicacion_sector_id_sector_anterior",
                        column: x => x.id_sector_anterior,
                        principalTable: "sector",
                        principalColumn: "id_sector",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ubicacion_sector_id_sector_nuevo",
                        column: x => x.id_sector_nuevo,
                        principalTable: "sector",
                        principalColumn: "id_sector",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ubicacion_servicio_id_servicio",
                        column: x => x.id_servicio,
                        principalTable: "servicio",
                        principalColumn: "id_servicio",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ubicacion_usuario_id_usuario",
                        column: x => x.id_usuario,
                        principalTable: "usuario",
                        principalColumn: "id_usuario",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "intervencion",
                columns: table => new
                {
                    id_intervencion = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    tareas_realizadas = table.Column<string>(type: "text", nullable: false),
                    tiempo_empleado = table.Column<int>(type: "integer", nullable: false),
                    resultado_seg_electrica = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    fecha = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    id_ot = table.Column<int>(type: "integer", nullable: false),
                    id_usuario = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_intervencion", x => x.id_intervencion);
                    table.ForeignKey(
                        name: "FK_intervencion_orden_trabajo_id_ot",
                        column: x => x.id_ot,
                        principalTable: "orden_trabajo",
                        principalColumn: "id_ot",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_intervencion_usuario_id_usuario",
                        column: x => x.id_usuario,
                        principalTable: "usuario",
                        principalColumn: "id_usuario",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "uso_insumo",
                columns: table => new
                {
                    id_uso = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    cantidad = table.Column<int>(type: "integer", nullable: false),
                    id_insumo = table.Column<int>(type: "integer", nullable: false),
                    id_ot = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_uso_insumo", x => x.id_uso);
                    table.ForeignKey(
                        name: "FK_uso_insumo_insumo_id_insumo",
                        column: x => x.id_insumo,
                        principalTable: "insumo",
                        principalColumn: "id_insumo",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_uso_insumo_orden_trabajo_id_ot",
                        column: x => x.id_ot,
                        principalTable: "orden_trabajo",
                        principalColumn: "id_ot",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.UpdateData(
                table: "estado_equipo",
                keyColumn: "id_estado",
                keyValue: 3,
                column: "descripcion",
                value: "Falla sin OT asignada");

            migrationBuilder.UpdateData(
                table: "estado_equipo",
                keyColumn: "id_estado",
                keyValue: 4,
                column: "descripcion",
                value: "Cedido temporalmente");

            migrationBuilder.UpdateData(
                table: "estado_equipo",
                keyColumn: "id_estado",
                keyValue: 5,
                column: "descripcion",
                value: "Dado de baja definitivamente");

            migrationBuilder.InsertData(
                table: "insumo",
                columns: new[] { "id_insumo", "nombre", "stock_actual", "stock_minimo", "tipo" },
                values: new object[,]
                {
                    { 1, "Sensor de O2 SERVO-i", 8, 5, "Sensor" },
                    { 2, "Filtro bacteriano HME", 3, 10, "Sensor" },
                    { 3, "Cable SpO2 adulto", 12, 4, "Accesorio" }
                });

            migrationBuilder.InsertData(
                table: "sector",
                columns: new[] { "id_sector", "activo", "descripcion", "nombre" },
                values: new object[,]
                {
                    { 1, true, "Sector de cuidados intensivos para adultos", "Terapia Intensiva Adultos - UTIA" },
                    { 2, true, "Sector de cuidados intensivos neonatales", "Terapia Intensiva Neonatal - UTIN" },
                    { 3, true, "Quirófano principal bloque central", "Quirófano 1" },
                    { 4, true, "Quirófano secundario bloque central", "Quirófano 2" },
                    { 5, true, "Sala de shock de la guardia", "Guardia - Shock Room" },
                    { 6, true, "Sala general piso 3", "Internación piso 3" }
                });

            migrationBuilder.InsertData(
                table: "servicio",
                columns: new[] { "id_servicio", "nombre", "sector" },
                values: new object[,]
                {
                    { 1, "UTIN", "Neonatología piso 3" },
                    { 2, "UTIA", "Terapia intensiva piso 4" },
                    { 3, "Quirófano central", "Bloque quirúrgico piso 2" },
                    { 4, "Guardia", "Planta baja" }
                });

            migrationBuilder.CreateIndex(
                name: "IX_alerta_id_equipo",
                table: "alerta",
                column: "id_equipo");

            migrationBuilder.CreateIndex(
                name: "IX_alerta_id_usuario",
                table: "alerta",
                column: "id_usuario");

            migrationBuilder.CreateIndex(
                name: "IX_baja_patrimonial_id_equipo",
                table: "baja_patrimonial",
                column: "id_equipo");

            migrationBuilder.CreateIndex(
                name: "IX_baja_patrimonial_id_usuario",
                table: "baja_patrimonial",
                column: "id_usuario");

            migrationBuilder.CreateIndex(
                name: "IX_hoja_de_vida_id_equipo",
                table: "hoja_de_vida",
                column: "id_equipo");

            migrationBuilder.CreateIndex(
                name: "IX_intervencion_id_ot",
                table: "intervencion",
                column: "id_ot");

            migrationBuilder.CreateIndex(
                name: "IX_intervencion_id_usuario",
                table: "intervencion",
                column: "id_usuario");

            migrationBuilder.CreateIndex(
                name: "IX_orden_trabajo_id_equipo",
                table: "orden_trabajo",
                column: "id_equipo");

            migrationBuilder.CreateIndex(
                name: "IX_orden_trabajo_id_servicio",
                table: "orden_trabajo",
                column: "id_servicio");

            migrationBuilder.CreateIndex(
                name: "IX_orden_trabajo_id_usuario",
                table: "orden_trabajo",
                column: "id_usuario");

            migrationBuilder.CreateIndex(
                name: "IX_ubicacion_id_equipo",
                table: "ubicacion",
                column: "id_equipo");

            migrationBuilder.CreateIndex(
                name: "IX_ubicacion_id_sector_anterior",
                table: "ubicacion",
                column: "id_sector_anterior");

            migrationBuilder.CreateIndex(
                name: "IX_ubicacion_id_sector_nuevo",
                table: "ubicacion",
                column: "id_sector_nuevo");

            migrationBuilder.CreateIndex(
                name: "IX_ubicacion_id_servicio",
                table: "ubicacion",
                column: "id_servicio");

            migrationBuilder.CreateIndex(
                name: "IX_ubicacion_id_usuario",
                table: "ubicacion",
                column: "id_usuario");

            migrationBuilder.CreateIndex(
                name: "IX_uso_insumo_id_insumo",
                table: "uso_insumo",
                column: "id_insumo");

            migrationBuilder.CreateIndex(
                name: "IX_uso_insumo_id_ot",
                table: "uso_insumo",
                column: "id_ot");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "alerta");

            migrationBuilder.DropTable(
                name: "baja_patrimonial");

            migrationBuilder.DropTable(
                name: "hoja_de_vida");

            migrationBuilder.DropTable(
                name: "intervencion");

            migrationBuilder.DropTable(
                name: "ubicacion");

            migrationBuilder.DropTable(
                name: "uso_insumo");

            migrationBuilder.DropTable(
                name: "sector");

            migrationBuilder.DropTable(
                name: "insumo");

            migrationBuilder.DropTable(
                name: "orden_trabajo");

            migrationBuilder.DropTable(
                name: "servicio");

            migrationBuilder.UpdateData(
                table: "estado_equipo",
                keyColumn: "id_estado",
                keyValue: 3,
                column: "descripcion",
                value: "Falla sin OT asignada, no disponible");

            migrationBuilder.UpdateData(
                table: "estado_equipo",
                keyColumn: "id_estado",
                keyValue: 4,
                column: "descripcion",
                value: "Cedido temporalmente a otro servicio");

            migrationBuilder.UpdateData(
                table: "estado_equipo",
                keyColumn: "id_estado",
                keyValue: 5,
                column: "descripcion",
                value: "Dado de baja definitivamente por resolución");
        }
    }
}