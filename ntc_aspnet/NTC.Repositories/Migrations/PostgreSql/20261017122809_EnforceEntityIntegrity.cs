using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NTC.Repositories.Migrations.PostgreSql
{
    /// <inheritdoc />
    public partial class EnforceEntityIntegrity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DO $NTC$
                BEGIN
                  IF EXISTS (SELECT 1 FROM ntc."NoteTags" l LEFT JOIN ntc."Notes" n ON n."Id"=l."NoteId" LEFT JOIN ntc."Tags" t ON t."Id"=l."TagId" WHERE n."Id" IS NULL OR t."Id" IS NULL OR n."UserId"<>t."UserId")
                  OR EXISTS (SELECT 1 FROM ntc."Notifications" x JOIN ntc."Notes" n ON n."Id"=x."NoteId" JOIN ntc."Reminders" r ON r."Id"=x."ReminderId" WHERE x."UserId"<>n."UserId" OR r."NoteId"<>x."NoteId")
                  OR EXISTS (SELECT 1 FROM ntc."ReminderDeliveries" x JOIN ntc."Notes" n ON n."Id"=x."NoteId" JOIN ntc."Reminders" r ON r."Id"=x."ReminderId" WHERE x."UserId"<>n."UserId" OR r."NoteId"<>x."NoteId") THEN
                    RAISE EXCEPTION 'Existing entity relationships are inconsistent. Review the preflight report; no rows were deleted or reassigned.' USING ERRCODE='23514';
                  END IF;
                END $NTC$;
                """);
            migrationBuilder.DropForeignKey(
                name: "FK_NoteTags_Notes_NoteId",
                schema: "ntc",
                table: "NoteTags");

            migrationBuilder.DropForeignKey(
                name: "FK_NoteTags_Tags_TagId",
                schema: "ntc",
                table: "NoteTags");

            migrationBuilder.DropForeignKey(
                name: "FK_Notifications_Notes_NoteId",
                schema: "ntc",
                table: "Notifications");

            migrationBuilder.DropForeignKey(
                name: "FK_Notifications_Reminders_ReminderId",
                schema: "ntc",
                table: "Notifications");

            migrationBuilder.DropForeignKey(
                name: "FK_ReminderDeliveries_Notes_NoteId",
                schema: "ntc",
                table: "ReminderDeliveries");

            migrationBuilder.DropForeignKey(
                name: "FK_ReminderDeliveries_Reminders_ReminderId",
                schema: "ntc",
                table: "ReminderDeliveries");

            migrationBuilder.DropIndex(
                name: "IX_ReminderDeliveries_NoteId",
                schema: "ntc",
                table: "ReminderDeliveries");

            migrationBuilder.DropIndex(
                name: "IX_Notifications_NoteId",
                schema: "ntc",
                table: "Notifications");

            migrationBuilder.DropIndex(
                name: "IX_NoteTags_TagId",
                schema: "ntc",
                table: "NoteTags");

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "AbandonedAt",
                schema: "ntc",
                table: "ReminderDeliveries",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "LastAttemptAt",
                schema: "ntc",
                table: "ReminderDeliveries",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "UserId",
                schema: "ntc",
                table: "NoteTags",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.Sql("UPDATE ntc.\"NoteTags\" AS l SET \"UserId\"=n.\"UserId\" FROM ntc.\"Notes\" AS n WHERE n.\"Id\"=l.\"NoteId\";");

            migrationBuilder.AddUniqueConstraint(
                name: "AK_Tags_Id_UserId",
                schema: "ntc",
                table: "Tags",
                columns: new[] { "Id", "UserId" });

            migrationBuilder.AddUniqueConstraint(
                name: "AK_Reminders_Id_NoteId",
                schema: "ntc",
                table: "Reminders",
                columns: new[] { "Id", "NoteId" });

            migrationBuilder.AddUniqueConstraint(
                name: "AK_Notes_Id_UserId",
                schema: "ntc",
                table: "Notes",
                columns: new[] { "Id", "UserId" });

            migrationBuilder.CreateTable(
                name: "AdministrativeAuditEvents",
                schema: "ntc",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ActorUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    TargetUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    RoleId = table.Column<Guid>(type: "uuid", nullable: true),
                    Action = table.Column<int>(type: "integer", nullable: false),
                    OccurredAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AdministrativeAuditEvents", x => x.Id);
                    table.CheckConstraint("CK_AdminAudit_Action", "\"Action\" BETWEEN 1 AND 11");
                    table.ForeignKey(
                        name: "FK_AdministrativeAuditEvents_AspNetUsers_ActorUserId",
                        column: x => x.ActorUserId,
                        principalSchema: "ntc",
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_AdministrativeAuditEvents_AspNetUsers_TargetUserId",
                        column: x => x.TargetUserId,
                        principalSchema: "ntc",
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.AddCheckConstraint(
                name: "CK_UserInfos_Gender",
                schema: "ntc",
                table: "UserInfos",
                sql: "\"Gender\" BETWEEN 0 AND 2");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Reminders_Count",
                schema: "ntc",
                table: "Reminders",
                sql: "\"RepeatCount\" IS NULL OR \"RepeatCount\" BETWEEN 1 AND 100000");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Reminders_Ending",
                schema: "ntc",
                table: "Reminders",
                sql: "\"RepeatCount\" IS NULL OR \"RepeatUntil\" IS NULL");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Reminders_Interval",
                schema: "ntc",
                table: "Reminders",
                sql: "\"RepeatInterval\" BETWEEN 1 AND 365");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Reminders_Processed",
                schema: "ntc",
                table: "Reminders",
                sql: "\"OccurrencesProcessed\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Reminders_RepeatType",
                schema: "ntc",
                table: "Reminders",
                sql: "\"RepeatType\" BETWEEN 0 AND 4");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Reminders_Until",
                schema: "ntc",
                table: "Reminders",
                sql: "\"RepeatUntil\" IS NULL OR \"RepeatUntil\" >= \"ReminderAt\"");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Reminders_WeekDays",
                schema: "ntc",
                table: "Reminders",
                sql: "(\"RepeatDays\" IS NULL OR \"RepeatDays\" BETWEEN 1 AND 127) AND (\"RepeatType\" <> 2 OR \"RepeatDays\" IS NOT NULL)");

            migrationBuilder.CreateIndex(
                name: "IX_ReminderDeliveries_NoteId_UserId",
                schema: "ntc",
                table: "ReminderDeliveries",
                columns: new[] { "NoteId", "UserId" });

            migrationBuilder.CreateIndex(
                name: "IX_ReminderDeliveries_ReminderId_NoteId",
                schema: "ntc",
                table: "ReminderDeliveries",
                columns: new[] { "ReminderId", "NoteId" });

            migrationBuilder.AddCheckConstraint(
                name: "CK_ReminderDeliveries_Attempts",
                schema: "ntc",
                table: "ReminderDeliveries",
                sql: "\"Attempts\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_ReminderDeliveries_Completion",
                schema: "ntc",
                table: "ReminderDeliveries",
                sql: "\"SentAt\" IS NULL OR \"Abandoned\" = FALSE");

            migrationBuilder.AddCheckConstraint(
                name: "CK_ReminderDeliveries_Lease",
                schema: "ntc",
                table: "ReminderDeliveries",
                sql: "(\"LeaseId\" IS NULL AND \"LeaseUntil\" IS NULL) OR (\"LeaseId\" IS NOT NULL AND \"LeaseUntil\" IS NOT NULL)");

            migrationBuilder.CreateIndex(
                name: "IX_RefreshSessions_ExpiresAt",
                schema: "ntc",
                table: "RefreshSessions",
                column: "ExpiresAt");

            migrationBuilder.AddCheckConstraint(
                name: "CK_RefreshSessions_Expiry",
                schema: "ntc",
                table: "RefreshSessions",
                sql: "\"ExpiresAt\" > \"CreatedAt\"");

            migrationBuilder.AddCheckConstraint(
                name: "CK_RefreshSessions_Replacement",
                schema: "ntc",
                table: "RefreshSessions",
                sql: "\"ReplacedById\" IS NULL OR \"ReplacedById\" <> \"Id\"");

            migrationBuilder.AddCheckConstraint(
                name: "CK_RefreshSessions_Revoked",
                schema: "ntc",
                table: "RefreshSessions",
                sql: "\"RevokedAt\" IS NULL OR \"RevokedAt\" >= \"CreatedAt\"");

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_NoteId_UserId",
                schema: "ntc",
                table: "Notifications",
                columns: new[] { "NoteId", "UserId" });

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_ReminderId_NoteId",
                schema: "ntc",
                table: "Notifications",
                columns: new[] { "ReminderId", "NoteId" });

            migrationBuilder.CreateIndex(
                name: "IX_NoteTags_NoteId_UserId",
                schema: "ntc",
                table: "NoteTags",
                columns: new[] { "NoteId", "UserId" });

            migrationBuilder.CreateIndex(
                name: "IX_NoteTags_TagId_UserId",
                schema: "ntc",
                table: "NoteTags",
                columns: new[] { "TagId", "UserId" });

            migrationBuilder.AddCheckConstraint(
                name: "CK_Notes_CreateRequest",
                schema: "ntc",
                table: "Notes",
                sql: "(\"CreateRequestId\" IS NULL AND \"CreateRequestHash\" IS NULL) OR (\"CreateRequestId\" IS NOT NULL AND \"CreateRequestHash\" IS NOT NULL)");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Notes_DocumentSchema",
                schema: "ntc",
                table: "Notes",
                sql: "\"DocumentSchemaVersion\" >= 1");

            migrationBuilder.CreateIndex(
                name: "IX_EmailChallenges_ExpiresAt",
                schema: "ntc",
                table: "EmailChallenges",
                column: "ExpiresAt");

            migrationBuilder.AddCheckConstraint(
                name: "CK_EmailChallenges_Attempts",
                schema: "ntc",
                table: "EmailChallenges",
                sql: "\"Attempts\" BETWEEN 0 AND 5");

            migrationBuilder.AddCheckConstraint(
                name: "CK_EmailChallenges_Expiry",
                schema: "ntc",
                table: "EmailChallenges",
                sql: "\"ExpiresAt\" > \"LastSentAt\"");

            migrationBuilder.CreateIndex(
                name: "IX_AdministrativeAuditEvents_ActorUserId_OccurredAt",
                schema: "ntc",
                table: "AdministrativeAuditEvents",
                columns: new[] { "ActorUserId", "OccurredAt" });

            migrationBuilder.CreateIndex(
                name: "IX_AdministrativeAuditEvents_OccurredAt_Id",
                schema: "ntc",
                table: "AdministrativeAuditEvents",
                columns: new[] { "OccurredAt", "Id" });

            migrationBuilder.CreateIndex(
                name: "IX_AdministrativeAuditEvents_TargetUserId_OccurredAt",
                schema: "ntc",
                table: "AdministrativeAuditEvents",
                columns: new[] { "TargetUserId", "OccurredAt" });

            migrationBuilder.AddForeignKey(
                name: "FK_NoteTags_Notes_NoteId_UserId",
                schema: "ntc",
                table: "NoteTags",
                columns: new[] { "NoteId", "UserId" },
                principalSchema: "ntc",
                principalTable: "Notes",
                principalColumns: new[] { "Id", "UserId" },
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_NoteTags_Tags_TagId_UserId",
                schema: "ntc",
                table: "NoteTags",
                columns: new[] { "TagId", "UserId" },
                principalSchema: "ntc",
                principalTable: "Tags",
                principalColumns: new[] { "Id", "UserId" },
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Notifications_Notes_NoteId_UserId",
                schema: "ntc",
                table: "Notifications",
                columns: new[] { "NoteId", "UserId" },
                principalSchema: "ntc",
                principalTable: "Notes",
                principalColumns: new[] { "Id", "UserId" },
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Notifications_Reminders_ReminderId_NoteId",
                schema: "ntc",
                table: "Notifications",
                columns: new[] { "ReminderId", "NoteId" },
                principalSchema: "ntc",
                principalTable: "Reminders",
                principalColumns: new[] { "Id", "NoteId" },
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_ReminderDeliveries_Notes_NoteId_UserId",
                schema: "ntc",
                table: "ReminderDeliveries",
                columns: new[] { "NoteId", "UserId" },
                principalSchema: "ntc",
                principalTable: "Notes",
                principalColumns: new[] { "Id", "UserId" },
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_ReminderDeliveries_Reminders_ReminderId_NoteId",
                schema: "ntc",
                table: "ReminderDeliveries",
                columns: new[] { "ReminderId", "NoteId" },
                principalSchema: "ntc",
                principalTable: "Reminders",
                principalColumns: new[] { "Id", "NoteId" },
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_NoteTags_Notes_NoteId_UserId",
                schema: "ntc",
                table: "NoteTags");

            migrationBuilder.DropForeignKey(
                name: "FK_NoteTags_Tags_TagId_UserId",
                schema: "ntc",
                table: "NoteTags");

            migrationBuilder.DropForeignKey(
                name: "FK_Notifications_Notes_NoteId_UserId",
                schema: "ntc",
                table: "Notifications");

            migrationBuilder.DropForeignKey(
                name: "FK_Notifications_Reminders_ReminderId_NoteId",
                schema: "ntc",
                table: "Notifications");

            migrationBuilder.DropForeignKey(
                name: "FK_ReminderDeliveries_Notes_NoteId_UserId",
                schema: "ntc",
                table: "ReminderDeliveries");

            migrationBuilder.DropForeignKey(
                name: "FK_ReminderDeliveries_Reminders_ReminderId_NoteId",
                schema: "ntc",
                table: "ReminderDeliveries");

            migrationBuilder.DropTable(
                name: "AdministrativeAuditEvents",
                schema: "ntc");

            migrationBuilder.DropCheckConstraint(
                name: "CK_UserInfos_Gender",
                schema: "ntc",
                table: "UserInfos");

            migrationBuilder.DropUniqueConstraint(
                name: "AK_Tags_Id_UserId",
                schema: "ntc",
                table: "Tags");

            migrationBuilder.DropUniqueConstraint(
                name: "AK_Reminders_Id_NoteId",
                schema: "ntc",
                table: "Reminders");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Reminders_Count",
                schema: "ntc",
                table: "Reminders");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Reminders_Ending",
                schema: "ntc",
                table: "Reminders");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Reminders_Interval",
                schema: "ntc",
                table: "Reminders");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Reminders_Processed",
                schema: "ntc",
                table: "Reminders");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Reminders_RepeatType",
                schema: "ntc",
                table: "Reminders");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Reminders_Until",
                schema: "ntc",
                table: "Reminders");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Reminders_WeekDays",
                schema: "ntc",
                table: "Reminders");

            migrationBuilder.DropIndex(
                name: "IX_ReminderDeliveries_NoteId_UserId",
                schema: "ntc",
                table: "ReminderDeliveries");

            migrationBuilder.DropIndex(
                name: "IX_ReminderDeliveries_ReminderId_NoteId",
                schema: "ntc",
                table: "ReminderDeliveries");

            migrationBuilder.DropCheckConstraint(
                name: "CK_ReminderDeliveries_Attempts",
                schema: "ntc",
                table: "ReminderDeliveries");

            migrationBuilder.DropCheckConstraint(
                name: "CK_ReminderDeliveries_Completion",
                schema: "ntc",
                table: "ReminderDeliveries");

            migrationBuilder.DropCheckConstraint(
                name: "CK_ReminderDeliveries_Lease",
                schema: "ntc",
                table: "ReminderDeliveries");

            migrationBuilder.DropIndex(
                name: "IX_RefreshSessions_ExpiresAt",
                schema: "ntc",
                table: "RefreshSessions");

            migrationBuilder.DropCheckConstraint(
                name: "CK_RefreshSessions_Expiry",
                schema: "ntc",
                table: "RefreshSessions");

            migrationBuilder.DropCheckConstraint(
                name: "CK_RefreshSessions_Replacement",
                schema: "ntc",
                table: "RefreshSessions");

            migrationBuilder.DropCheckConstraint(
                name: "CK_RefreshSessions_Revoked",
                schema: "ntc",
                table: "RefreshSessions");

            migrationBuilder.DropIndex(
                name: "IX_Notifications_NoteId_UserId",
                schema: "ntc",
                table: "Notifications");

            migrationBuilder.DropIndex(
                name: "IX_Notifications_ReminderId_NoteId",
                schema: "ntc",
                table: "Notifications");

            migrationBuilder.DropIndex(
                name: "IX_NoteTags_NoteId_UserId",
                schema: "ntc",
                table: "NoteTags");

            migrationBuilder.DropIndex(
                name: "IX_NoteTags_TagId_UserId",
                schema: "ntc",
                table: "NoteTags");

            migrationBuilder.DropUniqueConstraint(
                name: "AK_Notes_Id_UserId",
                schema: "ntc",
                table: "Notes");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Notes_CreateRequest",
                schema: "ntc",
                table: "Notes");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Notes_DocumentSchema",
                schema: "ntc",
                table: "Notes");

            migrationBuilder.DropIndex(
                name: "IX_EmailChallenges_ExpiresAt",
                schema: "ntc",
                table: "EmailChallenges");

            migrationBuilder.DropCheckConstraint(
                name: "CK_EmailChallenges_Attempts",
                schema: "ntc",
                table: "EmailChallenges");

            migrationBuilder.DropCheckConstraint(
                name: "CK_EmailChallenges_Expiry",
                schema: "ntc",
                table: "EmailChallenges");

            migrationBuilder.DropColumn(
                name: "AbandonedAt",
                schema: "ntc",
                table: "ReminderDeliveries");

            migrationBuilder.DropColumn(
                name: "LastAttemptAt",
                schema: "ntc",
                table: "ReminderDeliveries");

            migrationBuilder.DropColumn(
                name: "UserId",
                schema: "ntc",
                table: "NoteTags");

            migrationBuilder.CreateIndex(
                name: "IX_ReminderDeliveries_NoteId",
                schema: "ntc",
                table: "ReminderDeliveries",
                column: "NoteId");

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_NoteId",
                schema: "ntc",
                table: "Notifications",
                column: "NoteId");

            migrationBuilder.CreateIndex(
                name: "IX_NoteTags_TagId",
                schema: "ntc",
                table: "NoteTags",
                column: "TagId");

            migrationBuilder.AddForeignKey(
                name: "FK_NoteTags_Notes_NoteId",
                schema: "ntc",
                table: "NoteTags",
                column: "NoteId",
                principalSchema: "ntc",
                principalTable: "Notes",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_NoteTags_Tags_TagId",
                schema: "ntc",
                table: "NoteTags",
                column: "TagId",
                principalSchema: "ntc",
                principalTable: "Tags",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Notifications_Notes_NoteId",
                schema: "ntc",
                table: "Notifications",
                column: "NoteId",
                principalSchema: "ntc",
                principalTable: "Notes",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Notifications_Reminders_ReminderId",
                schema: "ntc",
                table: "Notifications",
                column: "ReminderId",
                principalSchema: "ntc",
                principalTable: "Reminders",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_ReminderDeliveries_Notes_NoteId",
                schema: "ntc",
                table: "ReminderDeliveries",
                column: "NoteId",
                principalSchema: "ntc",
                principalTable: "Notes",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_ReminderDeliveries_Reminders_ReminderId",
                schema: "ntc",
                table: "ReminderDeliveries",
                column: "ReminderId",
                principalSchema: "ntc",
                principalTable: "Reminders",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
