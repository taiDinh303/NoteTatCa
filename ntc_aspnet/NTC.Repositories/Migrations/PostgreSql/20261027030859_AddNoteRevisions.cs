using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NTC.Repositories.Migrations.PostgreSql
{
    /// <inheritdoc />
    public partial class AddNoteRevisions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "NoteRevisions",
                schema: "ntc",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    NoteId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    SourceVersion = table.Column<Guid>(type: "uuid", nullable: false),
                    SavedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    Title = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    Content = table.Column<string>(type: "text", nullable: false),
                    DocumentJson = table.Column<string>(type: "text", nullable: true),
                    DocumentSchemaVersion = table.Column<int>(type: "integer", nullable: false),
                    IconEmoji = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    BackgroundColor = table.Column<string>(type: "text", nullable: true),
                    Version = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    LastUpdatedBy = table.Column<string>(type: "text", nullable: true),
                    DeletedBy = table.Column<string>(type: "text", nullable: true),
                    CreatedTime = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    LastUpdatedTime = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    DeletedTime = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NoteRevisions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_NoteRevisions_Notes_NoteId_UserId",
                        columns: x => new { x.NoteId, x.UserId },
                        principalSchema: "ntc",
                        principalTable: "Notes",
                        principalColumns: new[] { "Id", "UserId" },
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_NoteRevisions_NoteId_SourceVersion",
                schema: "ntc",
                table: "NoteRevisions",
                columns: new[] { "NoteId", "SourceVersion" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_NoteRevisions_NoteId_UserId",
                schema: "ntc",
                table: "NoteRevisions",
                columns: new[] { "NoteId", "UserId" });

            migrationBuilder.CreateIndex(
                name: "IX_NoteRevisions_UserId_NoteId_SavedAt",
                schema: "ntc",
                table: "NoteRevisions",
                columns: new[] { "UserId", "NoteId", "SavedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "NoteRevisions",
                schema: "ntc");
        }
    }
}
