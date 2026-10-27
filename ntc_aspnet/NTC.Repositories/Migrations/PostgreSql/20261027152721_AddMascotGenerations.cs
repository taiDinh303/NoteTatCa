using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NTC.Repositories.Migrations.PostgreSql
{
    /// <inheritdoc />
    public partial class AddMascotGenerations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "MascotGeneration",
                schema: "ntc",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    RequestId = table.Column<Guid>(type: "uuid", nullable: false),
                    QuotaDay = table.Column<string>(type: "character varying(8)", maxLength: 8, nullable: false),
                    State = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    OccupiesSlot = table.Column<bool>(type: "boolean", nullable: false),
                    ReplacesId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    StartedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    FinishedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    Description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    ReferenceImage = table.Column<byte[]>(type: "bytea", nullable: true),
                    DirectionsPng = table.Column<byte[]>(type: "bytea", nullable: true),
                    ReactionsPng = table.Column<byte[]>(type: "bytea", nullable: true),
                    SavedDirectionsWebp = table.Column<byte[]>(type: "bytea", nullable: true),
                    SavedReactionsWebp = table.Column<byte[]>(type: "bytea", nullable: true),
                    ErrorCode = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MascotGeneration", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MascotGeneration_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalSchema: "ntc",
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_MascotGeneration_State_CreatedAt",
                schema: "ntc",
                table: "MascotGeneration",
                columns: new[] { "State", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_MascotGeneration_UserId",
                schema: "ntc",
                table: "MascotGeneration",
                column: "UserId",
                unique: true,
                filter: "\"OccupiesSlot\" = TRUE");

            migrationBuilder.CreateIndex(
                name: "IX_MascotGeneration_UserId_QuotaDay",
                schema: "ntc",
                table: "MascotGeneration",
                columns: new[] { "UserId", "QuotaDay" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MascotGeneration_UserId_RequestId",
                schema: "ntc",
                table: "MascotGeneration",
                columns: new[] { "UserId", "RequestId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MascotGeneration",
                schema: "ntc");
        }
    }
}
