using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NTC.Repositories.Migrations
{
    /// <inheritdoc />
    public partial class AddMascotGenerations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "MascotGeneration",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RequestId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    QuotaDay = table.Column<string>(type: "nvarchar(8)", maxLength: 8, nullable: false),
                    State = table.Column<string>(type: "nvarchar(16)", maxLength: 16, nullable: false),
                    OccupiesSlot = table.Column<bool>(type: "bit", nullable: false),
                    ReplacesId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    StartedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    FinishedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    Description = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    ReferenceImage = table.Column<byte[]>(type: "varbinary(max)", nullable: true),
                    DirectionsPng = table.Column<byte[]>(type: "varbinary(max)", nullable: true),
                    ReactionsPng = table.Column<byte[]>(type: "varbinary(max)", nullable: true),
                    SavedDirectionsWebp = table.Column<byte[]>(type: "varbinary(max)", nullable: true),
                    SavedReactionsWebp = table.Column<byte[]>(type: "varbinary(max)", nullable: true),
                    ErrorCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MascotGeneration", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MascotGeneration_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_MascotGeneration_State_CreatedAt",
                table: "MascotGeneration",
                columns: new[] { "State", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_MascotGeneration_UserId",
                table: "MascotGeneration",
                column: "UserId",
                unique: true,
                filter: "[OccupiesSlot] = 1");

            migrationBuilder.CreateIndex(
                name: "IX_MascotGeneration_UserId_QuotaDay",
                table: "MascotGeneration",
                columns: new[] { "UserId", "QuotaDay" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MascotGeneration_UserId_RequestId",
                table: "MascotGeneration",
                columns: new[] { "UserId", "RequestId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MascotGeneration");
        }
    }
}
