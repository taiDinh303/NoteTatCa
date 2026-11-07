using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NTC.Repositories.Migrations
{
    /// <inheritdoc />
    public partial class AddHiddenNoteVault : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsHidden",
                table: "Notes",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "NoteVault",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CredentialVersion = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Kind = table.Column<string>(type: "nvarchar(16)", maxLength: 16, nullable: false),
                    SecretHash = table.Column<string>(type: "nvarchar(512)", maxLength: 512, nullable: false),
                    FailedAttempts = table.Column<int>(type: "int", nullable: false),
                    LockedUntil = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    ResetHash = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: true),
                    ResetExpiresAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    ResetSentAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    ResetAttempts = table.Column<int>(type: "int", nullable: false),
                    Version = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NoteVault", x => x.UserId);
                    table.ForeignKey(
                        name: "FK_NoteVault_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "NoteVaultGrant",
                columns: table => new
                {
                    TokenHash = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SessionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    VaultVersion = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ExpiresAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NoteVaultGrant", x => x.TokenHash);
                    table.ForeignKey(
                        name: "FK_NoteVaultGrant_NoteVault_UserId",
                        column: x => x.UserId,
                        principalTable: "NoteVault",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_NoteVaultGrant_UserId_SessionId",
                table: "NoteVaultGrant",
                columns: new[] { "UserId", "SessionId" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "NoteVaultGrant");

            migrationBuilder.DropTable(
                name: "NoteVault");

            migrationBuilder.DropColumn(
                name: "IsHidden",
                table: "Notes");
        }
    }
}
