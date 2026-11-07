using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NTC.Repositories.Migrations.PostgreSql
{
    /// <inheritdoc />
    public partial class AddHiddenNoteVault : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsHidden",
                schema: "ntc",
                table: "Notes",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "NoteVault",
                schema: "ntc",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CredentialVersion = table.Column<Guid>(type: "uuid", nullable: false),
                    Kind = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    SecretHash = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: false),
                    FailedAttempts = table.Column<int>(type: "integer", nullable: false),
                    LockedUntil = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    ResetHash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    ResetExpiresAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    ResetSentAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    ResetAttempts = table.Column<int>(type: "integer", nullable: false),
                    Version = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NoteVault", x => x.UserId);
                    table.ForeignKey(
                        name: "FK_NoteVault_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalSchema: "ntc",
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "NoteVaultGrant",
                schema: "ntc",
                columns: table => new
                {
                    TokenHash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    SessionId = table.Column<Guid>(type: "uuid", nullable: false),
                    VaultVersion = table.Column<Guid>(type: "uuid", nullable: false),
                    ExpiresAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NoteVaultGrant", x => x.TokenHash);
                    table.ForeignKey(
                        name: "FK_NoteVaultGrant_NoteVault_UserId",
                        column: x => x.UserId,
                        principalSchema: "ntc",
                        principalTable: "NoteVault",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_NoteVaultGrant_UserId_SessionId",
                schema: "ntc",
                table: "NoteVaultGrant",
                columns: new[] { "UserId", "SessionId" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "NoteVaultGrant",
                schema: "ntc");

            migrationBuilder.DropTable(
                name: "NoteVault",
                schema: "ntc");

            migrationBuilder.DropColumn(
                name: "IsHidden",
                schema: "ntc",
                table: "Notes");
        }
    }
}
