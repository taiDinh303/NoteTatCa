using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NTC.Repositories.Migrations
{
    /// <inheritdoc />
    public partial class EnforceEntityIntegrity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Fail before any DDL; never silently delete or reassign legacy relationships.
            migrationBuilder.Sql("""
                IF EXISTS (SELECT 1 FROM [NoteTags] l LEFT JOIN [Notes] n ON n.[Id]=l.[NoteId] LEFT JOIN [Tags] t ON t.[Id]=l.[TagId] WHERE n.[Id] IS NULL OR t.[Id] IS NULL OR n.[UserId]<>t.[UserId])
                OR EXISTS (SELECT 1 FROM [Notifications] x JOIN [Notes] n ON n.[Id]=x.[NoteId] JOIN [Reminders] r ON r.[Id]=x.[ReminderId] WHERE x.[UserId]<>n.[UserId] OR r.[NoteId]<>x.[NoteId])
                OR EXISTS (SELECT 1 FROM [ReminderDeliveries] x JOIN [Notes] n ON n.[Id]=x.[NoteId] JOIN [Reminders] r ON r.[Id]=x.[ReminderId] WHERE x.[UserId]<>n.[UserId] OR r.[NoteId]<>x.[NoteId])
                THROW 50002, 'Existing entity relationships are inconsistent. Review the preflight report; no rows were deleted or reassigned.', 1;
                """);
            migrationBuilder.DropForeignKey(
                name: "FK_NoteTags_Notes_NoteId",
                table: "NoteTags");

            migrationBuilder.DropForeignKey(
                name: "FK_NoteTags_Tags_TagId",
                table: "NoteTags");

            migrationBuilder.DropForeignKey(
                name: "FK_Notifications_Notes_NoteId",
                table: "Notifications");

            migrationBuilder.DropForeignKey(
                name: "FK_Notifications_Reminders_ReminderId",
                table: "Notifications");

            migrationBuilder.DropForeignKey(
                name: "FK_ReminderDeliveries_Notes_NoteId",
                table: "ReminderDeliveries");

            migrationBuilder.DropForeignKey(
                name: "FK_ReminderDeliveries_Reminders_ReminderId",
                table: "ReminderDeliveries");

            migrationBuilder.DropIndex(
                name: "IX_ReminderDeliveries_NoteId",
                table: "ReminderDeliveries");

            migrationBuilder.DropIndex(
                name: "IX_Notifications_NoteId",
                table: "Notifications");

            migrationBuilder.DropIndex(
                name: "IX_NoteTags_TagId",
                table: "NoteTags");

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "AbandonedAt",
                table: "ReminderDeliveries",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "LastAttemptAt",
                table: "ReminderDeliveries",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "UserId",
                table: "NoteTags",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.Sql("UPDATE l SET [UserId]=n.[UserId] FROM [NoteTags] l JOIN [Notes] n ON n.[Id]=l.[NoteId];");

            migrationBuilder.AddUniqueConstraint(
                name: "AK_Tags_Id_UserId",
                table: "Tags",
                columns: new[] { "Id", "UserId" });

            migrationBuilder.AddUniqueConstraint(
                name: "AK_Reminders_Id_NoteId",
                table: "Reminders",
                columns: new[] { "Id", "NoteId" });

            migrationBuilder.AddUniqueConstraint(
                name: "AK_Notes_Id_UserId",
                table: "Notes",
                columns: new[] { "Id", "UserId" });

            migrationBuilder.CreateTable(
                name: "AdministrativeAuditEvents",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ActorUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    TargetUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    RoleId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Action = table.Column<int>(type: "int", nullable: false),
                    OccurredAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AdministrativeAuditEvents", x => x.Id);
                    table.CheckConstraint("CK_AdminAudit_Action", "[Action] BETWEEN 1 AND 11");
                    table.ForeignKey(
                        name: "FK_AdministrativeAuditEvents_AspNetUsers_ActorUserId",
                        column: x => x.ActorUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_AdministrativeAuditEvents_AspNetUsers_TargetUserId",
                        column: x => x.TargetUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.AddCheckConstraint(
                name: "CK_UserInfos_Gender",
                table: "UserInfos",
                sql: "[Gender] BETWEEN 0 AND 2");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Reminders_Count",
                table: "Reminders",
                sql: "[RepeatCount] IS NULL OR [RepeatCount] BETWEEN 1 AND 100000");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Reminders_Ending",
                table: "Reminders",
                sql: "[RepeatCount] IS NULL OR [RepeatUntil] IS NULL");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Reminders_Interval",
                table: "Reminders",
                sql: "[RepeatInterval] BETWEEN 1 AND 365");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Reminders_Processed",
                table: "Reminders",
                sql: "[OccurrencesProcessed] >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Reminders_RepeatType",
                table: "Reminders",
                sql: "[RepeatType] BETWEEN 0 AND 4");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Reminders_Until",
                table: "Reminders",
                sql: "[RepeatUntil] IS NULL OR [RepeatUntil] >= [ReminderAt]");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Reminders_WeekDays",
                table: "Reminders",
                sql: "([RepeatDays] IS NULL OR [RepeatDays] BETWEEN 1 AND 127) AND ([RepeatType] <> 2 OR [RepeatDays] IS NOT NULL)");

            migrationBuilder.CreateIndex(
                name: "IX_ReminderDeliveries_NoteId_UserId",
                table: "ReminderDeliveries",
                columns: new[] { "NoteId", "UserId" });

            migrationBuilder.CreateIndex(
                name: "IX_ReminderDeliveries_ReminderId_NoteId",
                table: "ReminderDeliveries",
                columns: new[] { "ReminderId", "NoteId" });

            migrationBuilder.AddCheckConstraint(
                name: "CK_ReminderDeliveries_Attempts",
                table: "ReminderDeliveries",
                sql: "[Attempts] >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_ReminderDeliveries_Completion",
                table: "ReminderDeliveries",
                sql: "[SentAt] IS NULL OR [Abandoned] = 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_ReminderDeliveries_Lease",
                table: "ReminderDeliveries",
                sql: "([LeaseId] IS NULL AND [LeaseUntil] IS NULL) OR ([LeaseId] IS NOT NULL AND [LeaseUntil] IS NOT NULL)");

            migrationBuilder.CreateIndex(
                name: "IX_RefreshSessions_ExpiresAt",
                table: "RefreshSessions",
                column: "ExpiresAt");

            migrationBuilder.AddCheckConstraint(
                name: "CK_RefreshSessions_Expiry",
                table: "RefreshSessions",
                sql: "[ExpiresAt] > [CreatedAt]");

            migrationBuilder.AddCheckConstraint(
                name: "CK_RefreshSessions_Replacement",
                table: "RefreshSessions",
                sql: "[ReplacedById] IS NULL OR [ReplacedById] <> [Id]");

            migrationBuilder.AddCheckConstraint(
                name: "CK_RefreshSessions_Revoked",
                table: "RefreshSessions",
                sql: "[RevokedAt] IS NULL OR [RevokedAt] >= [CreatedAt]");

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_NoteId_UserId",
                table: "Notifications",
                columns: new[] { "NoteId", "UserId" });

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_ReminderId_NoteId",
                table: "Notifications",
                columns: new[] { "ReminderId", "NoteId" });

            migrationBuilder.CreateIndex(
                name: "IX_NoteTags_NoteId_UserId",
                table: "NoteTags",
                columns: new[] { "NoteId", "UserId" });

            migrationBuilder.CreateIndex(
                name: "IX_NoteTags_TagId_UserId",
                table: "NoteTags",
                columns: new[] { "TagId", "UserId" });

            migrationBuilder.AddCheckConstraint(
                name: "CK_Notes_CreateRequest",
                table: "Notes",
                sql: "([CreateRequestId] IS NULL AND [CreateRequestHash] IS NULL) OR ([CreateRequestId] IS NOT NULL AND [CreateRequestHash] IS NOT NULL)");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Notes_DocumentSchema",
                table: "Notes",
                sql: "[DocumentSchemaVersion] >= 1");

            migrationBuilder.CreateIndex(
                name: "IX_EmailChallenges_ExpiresAt",
                table: "EmailChallenges",
                column: "ExpiresAt");

            migrationBuilder.AddCheckConstraint(
                name: "CK_EmailChallenges_Attempts",
                table: "EmailChallenges",
                sql: "[Attempts] BETWEEN 0 AND 5");

            migrationBuilder.AddCheckConstraint(
                name: "CK_EmailChallenges_Expiry",
                table: "EmailChallenges",
                sql: "[ExpiresAt] > [LastSentAt]");

            migrationBuilder.CreateIndex(
                name: "IX_AdministrativeAuditEvents_ActorUserId_OccurredAt",
                table: "AdministrativeAuditEvents",
                columns: new[] { "ActorUserId", "OccurredAt" });

            migrationBuilder.CreateIndex(
                name: "IX_AdministrativeAuditEvents_OccurredAt_Id",
                table: "AdministrativeAuditEvents",
                columns: new[] { "OccurredAt", "Id" });

            migrationBuilder.CreateIndex(
                name: "IX_AdministrativeAuditEvents_TargetUserId_OccurredAt",
                table: "AdministrativeAuditEvents",
                columns: new[] { "TargetUserId", "OccurredAt" });

            migrationBuilder.AddForeignKey(
                name: "FK_NoteTags_Notes_NoteId_UserId",
                table: "NoteTags",
                columns: new[] { "NoteId", "UserId" },
                principalTable: "Notes",
                principalColumns: new[] { "Id", "UserId" },
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_NoteTags_Tags_TagId_UserId",
                table: "NoteTags",
                columns: new[] { "TagId", "UserId" },
                principalTable: "Tags",
                principalColumns: new[] { "Id", "UserId" },
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Notifications_Notes_NoteId_UserId",
                table: "Notifications",
                columns: new[] { "NoteId", "UserId" },
                principalTable: "Notes",
                principalColumns: new[] { "Id", "UserId" },
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Notifications_Reminders_ReminderId_NoteId",
                table: "Notifications",
                columns: new[] { "ReminderId", "NoteId" },
                principalTable: "Reminders",
                principalColumns: new[] { "Id", "NoteId" },
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_ReminderDeliveries_Notes_NoteId_UserId",
                table: "ReminderDeliveries",
                columns: new[] { "NoteId", "UserId" },
                principalTable: "Notes",
                principalColumns: new[] { "Id", "UserId" },
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_ReminderDeliveries_Reminders_ReminderId_NoteId",
                table: "ReminderDeliveries",
                columns: new[] { "ReminderId", "NoteId" },
                principalTable: "Reminders",
                principalColumns: new[] { "Id", "NoteId" },
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_NoteTags_Notes_NoteId_UserId",
                table: "NoteTags");

            migrationBuilder.DropForeignKey(
                name: "FK_NoteTags_Tags_TagId_UserId",
                table: "NoteTags");

            migrationBuilder.DropForeignKey(
                name: "FK_Notifications_Notes_NoteId_UserId",
                table: "Notifications");

            migrationBuilder.DropForeignKey(
                name: "FK_Notifications_Reminders_ReminderId_NoteId",
                table: "Notifications");

            migrationBuilder.DropForeignKey(
                name: "FK_ReminderDeliveries_Notes_NoteId_UserId",
                table: "ReminderDeliveries");

            migrationBuilder.DropForeignKey(
                name: "FK_ReminderDeliveries_Reminders_ReminderId_NoteId",
                table: "ReminderDeliveries");

            migrationBuilder.DropTable(
                name: "AdministrativeAuditEvents");

            migrationBuilder.DropCheckConstraint(
                name: "CK_UserInfos_Gender",
                table: "UserInfos");

            migrationBuilder.DropUniqueConstraint(
                name: "AK_Tags_Id_UserId",
                table: "Tags");

            migrationBuilder.DropUniqueConstraint(
                name: "AK_Reminders_Id_NoteId",
                table: "Reminders");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Reminders_Count",
                table: "Reminders");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Reminders_Ending",
                table: "Reminders");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Reminders_Interval",
                table: "Reminders");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Reminders_Processed",
                table: "Reminders");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Reminders_RepeatType",
                table: "Reminders");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Reminders_Until",
                table: "Reminders");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Reminders_WeekDays",
                table: "Reminders");

            migrationBuilder.DropIndex(
                name: "IX_ReminderDeliveries_NoteId_UserId",
                table: "ReminderDeliveries");

            migrationBuilder.DropIndex(
                name: "IX_ReminderDeliveries_ReminderId_NoteId",
                table: "ReminderDeliveries");

            migrationBuilder.DropCheckConstraint(
                name: "CK_ReminderDeliveries_Attempts",
                table: "ReminderDeliveries");

            migrationBuilder.DropCheckConstraint(
                name: "CK_ReminderDeliveries_Completion",
                table: "ReminderDeliveries");

            migrationBuilder.DropCheckConstraint(
                name: "CK_ReminderDeliveries_Lease",
                table: "ReminderDeliveries");

            migrationBuilder.DropIndex(
                name: "IX_RefreshSessions_ExpiresAt",
                table: "RefreshSessions");

            migrationBuilder.DropCheckConstraint(
                name: "CK_RefreshSessions_Expiry",
                table: "RefreshSessions");

            migrationBuilder.DropCheckConstraint(
                name: "CK_RefreshSessions_Replacement",
                table: "RefreshSessions");

            migrationBuilder.DropCheckConstraint(
                name: "CK_RefreshSessions_Revoked",
                table: "RefreshSessions");

            migrationBuilder.DropIndex(
                name: "IX_Notifications_NoteId_UserId",
                table: "Notifications");

            migrationBuilder.DropIndex(
                name: "IX_Notifications_ReminderId_NoteId",
                table: "Notifications");

            migrationBuilder.DropIndex(
                name: "IX_NoteTags_NoteId_UserId",
                table: "NoteTags");

            migrationBuilder.DropIndex(
                name: "IX_NoteTags_TagId_UserId",
                table: "NoteTags");

            migrationBuilder.DropUniqueConstraint(
                name: "AK_Notes_Id_UserId",
                table: "Notes");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Notes_CreateRequest",
                table: "Notes");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Notes_DocumentSchema",
                table: "Notes");

            migrationBuilder.DropIndex(
                name: "IX_EmailChallenges_ExpiresAt",
                table: "EmailChallenges");

            migrationBuilder.DropCheckConstraint(
                name: "CK_EmailChallenges_Attempts",
                table: "EmailChallenges");

            migrationBuilder.DropCheckConstraint(
                name: "CK_EmailChallenges_Expiry",
                table: "EmailChallenges");

            migrationBuilder.DropColumn(
                name: "AbandonedAt",
                table: "ReminderDeliveries");

            migrationBuilder.DropColumn(
                name: "LastAttemptAt",
                table: "ReminderDeliveries");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "NoteTags");

            migrationBuilder.CreateIndex(
                name: "IX_ReminderDeliveries_NoteId",
                table: "ReminderDeliveries",
                column: "NoteId");

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_NoteId",
                table: "Notifications",
                column: "NoteId");

            migrationBuilder.CreateIndex(
                name: "IX_NoteTags_TagId",
                table: "NoteTags",
                column: "TagId");

            migrationBuilder.AddForeignKey(
                name: "FK_NoteTags_Notes_NoteId",
                table: "NoteTags",
                column: "NoteId",
                principalTable: "Notes",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_NoteTags_Tags_TagId",
                table: "NoteTags",
                column: "TagId",
                principalTable: "Tags",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Notifications_Notes_NoteId",
                table: "Notifications",
                column: "NoteId",
                principalTable: "Notes",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Notifications_Reminders_ReminderId",
                table: "Notifications",
                column: "ReminderId",
                principalTable: "Reminders",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_ReminderDeliveries_Notes_NoteId",
                table: "ReminderDeliveries",
                column: "NoteId",
                principalTable: "Notes",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_ReminderDeliveries_Reminders_ReminderId",
                table: "ReminderDeliveries",
                column: "ReminderId",
                principalTable: "Reminders",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
