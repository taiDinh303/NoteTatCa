using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NTC.Repositories.Migrations.PostgreSql
{
    /// <inheritdoc />
    public partial class AddAnnouncements : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Announcements",
                schema: "ntc",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    Body = table.Column<string>(type: "character varying(10000)", maxLength: 10000, nullable: false),
                    AllActiveUsers = table.Column<bool>(type: "boolean", nullable: false),
                    AuthorId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreateRequestId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreateRequestHash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    PublishedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    PublishedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    PublishRequestId = table.Column<Guid>(type: "uuid", nullable: true),
                    PublishedVersion = table.Column<Guid>(type: "uuid", nullable: true),
                    RecipientCount = table.Column<int>(type: "integer", nullable: false),
                    RevokedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    RevokedBy = table.Column<Guid>(type: "uuid", nullable: true),
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
                    table.PrimaryKey("PK_Announcements", x => x.Id);
                    table.CheckConstraint("CK_Announcements_Count", "\"RecipientCount\" >= 0");
                    table.CheckConstraint("CK_Announcements_Publish", "(\"PublishedAt\" IS NULL AND \"PublishedBy\" IS NULL AND \"PublishRequestId\" IS NULL AND \"PublishedVersion\" IS NULL) OR (\"PublishedAt\" IS NOT NULL AND \"PublishedBy\" IS NOT NULL AND \"PublishRequestId\" IS NOT NULL AND \"PublishedVersion\" IS NOT NULL)");
                    table.CheckConstraint("CK_Announcements_Revoke", "(\"RevokedAt\" IS NULL AND \"RevokedBy\" IS NULL) OR (\"RevokedAt\" IS NOT NULL AND \"RevokedBy\" IS NOT NULL AND \"PublishedAt\" IS NOT NULL)");
                    table.ForeignKey(
                        name: "FK_Announcements_AspNetUsers_AuthorId",
                        column: x => x.AuthorId,
                        principalSchema: "ntc",
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Announcements_AspNetUsers_PublishedBy",
                        column: x => x.PublishedBy,
                        principalSchema: "ntc",
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Announcements_AspNetUsers_RevokedBy",
                        column: x => x.RevokedBy,
                        principalSchema: "ntc",
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "AnnouncementEvents",
                schema: "ntc",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    AnnouncementId = table.Column<Guid>(type: "uuid", nullable: false),
                    ActorId = table.Column<Guid>(type: "uuid", nullable: false),
                    Action = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    OccurredAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AnnouncementEvents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AnnouncementEvents_Announcements_AnnouncementId",
                        column: x => x.AnnouncementId,
                        principalSchema: "ntc",
                        principalTable: "Announcements",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_AnnouncementEvents_AspNetUsers_ActorId",
                        column: x => x.ActorId,
                        principalSchema: "ntc",
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "AnnouncementReceipts",
                schema: "ntc",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    AnnouncementId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    ReadAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
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
                    table.PrimaryKey("PK_AnnouncementReceipts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AnnouncementReceipts_Announcements_AnnouncementId",
                        column: x => x.AnnouncementId,
                        principalSchema: "ntc",
                        principalTable: "Announcements",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AnnouncementReceipts_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalSchema: "ntc",
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "AnnouncementTargets",
                schema: "ntc",
                columns: table => new
                {
                    AnnouncementId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AnnouncementTargets", x => new { x.AnnouncementId, x.UserId });
                    table.ForeignKey(
                        name: "FK_AnnouncementTargets_Announcements_AnnouncementId",
                        column: x => x.AnnouncementId,
                        principalSchema: "ntc",
                        principalTable: "Announcements",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AnnouncementTargets_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalSchema: "ntc",
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AnnouncementEvents_ActorId",
                schema: "ntc",
                table: "AnnouncementEvents",
                column: "ActorId");

            migrationBuilder.CreateIndex(
                name: "IX_AnnouncementEvents_AnnouncementId_OccurredAt_Id",
                schema: "ntc",
                table: "AnnouncementEvents",
                columns: new[] { "AnnouncementId", "OccurredAt", "Id" });

            migrationBuilder.CreateIndex(
                name: "IX_AnnouncementReceipts_AnnouncementId_UserId",
                schema: "ntc",
                table: "AnnouncementReceipts",
                columns: new[] { "AnnouncementId", "UserId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AnnouncementReceipts_UserId_ReadAt",
                schema: "ntc",
                table: "AnnouncementReceipts",
                columns: new[] { "UserId", "ReadAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Announcements_AuthorId_CreateRequestId",
                schema: "ntc",
                table: "Announcements",
                columns: new[] { "AuthorId", "CreateRequestId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Announcements_CreatedTime_Id",
                schema: "ntc",
                table: "Announcements",
                columns: new[] { "CreatedTime", "Id" });

            migrationBuilder.CreateIndex(
                name: "IX_Announcements_PublishedBy_PublishRequestId",
                schema: "ntc",
                table: "Announcements",
                columns: new[] { "PublishedBy", "PublishRequestId" },
                unique: true,
                filter: "\"PublishRequestId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Announcements_RevokedBy",
                schema: "ntc",
                table: "Announcements",
                column: "RevokedBy");

            migrationBuilder.CreateIndex(
                name: "IX_AnnouncementTargets_UserId",
                schema: "ntc",
                table: "AnnouncementTargets",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AnnouncementEvents",
                schema: "ntc");

            migrationBuilder.DropTable(
                name: "AnnouncementReceipts",
                schema: "ntc");

            migrationBuilder.DropTable(
                name: "AnnouncementTargets",
                schema: "ntc");

            migrationBuilder.DropTable(
                name: "Announcements",
                schema: "ntc");
        }
    }
}
