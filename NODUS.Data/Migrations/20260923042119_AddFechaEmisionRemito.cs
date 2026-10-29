using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NODUS.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddFechaEmisionRemito : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "fecha_emision_remito",
                table: "prestamo",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "fecha_emision_remito",
                table: "prestamo");
        }
    }
}
