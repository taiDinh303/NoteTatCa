using Microsoft.EntityFrameworkCore;
using NTC.Contract.Repositories.Entities;
using NTC.Contract.Repositories.Entities.Identity;
using NTC.Contract.Repositories.Entities.Tasks;

namespace NTC.Repositories.Configuration;

internal static class EntityIntegrityConfiguration
{
    public static void ConfigureEntityIntegrity(this ModelBuilder model, string provider)
    {
        var sqlServer = provider == "Microsoft.EntityFrameworkCore.SqlServer";
        string Q(string column) => sqlServer ? $"[{column}]" : $"\"{column}\"";
        var falseValue = provider == "Npgsql.EntityFrameworkCore.PostgreSQL" ? "FALSE" : "0";
        void Check<T>(string name, string expression) where T : class => model.Entity<T>()
            .ToTable(table => table.HasCheckConstraint(name, expression));

        Check<Note>("CK_Notes_DocumentSchema", $"{Q("DocumentSchemaVersion")} >= 1");
        Check<Note>("CK_Notes_CreateRequest", $"({Q("CreateRequestId")} IS NULL AND {Q("CreateRequestHash")} IS NULL) OR ({Q("CreateRequestId")} IS NOT NULL AND {Q("CreateRequestHash")} IS NOT NULL)");
        Check<Reminder>("CK_Reminders_RepeatType", $"{Q("RepeatType")} BETWEEN 0 AND 4");
        Check<Reminder>("CK_Reminders_Interval", $"{Q("RepeatInterval")} BETWEEN 1 AND 365");
        Check<Reminder>("CK_Reminders_Count", $"{Q("RepeatCount")} IS NULL OR {Q("RepeatCount")} BETWEEN 1 AND 100000");
        Check<Reminder>("CK_Reminders_Ending", $"{Q("RepeatCount")} IS NULL OR {Q("RepeatUntil")} IS NULL");
        Check<Reminder>("CK_Reminders_Processed", $"{Q("OccurrencesProcessed")} >= 0");
        Check<Reminder>("CK_Reminders_WeekDays", $"({Q("RepeatDays")} IS NULL OR {Q("RepeatDays")} BETWEEN 1 AND 127) AND ({Q("RepeatType")} <> 2 OR {Q("RepeatDays")} IS NOT NULL)");
        Check<Reminder>("CK_Reminders_Until", $"{Q("RepeatUntil")} IS NULL OR {Q("RepeatUntil")} >= {Q("ReminderAt")}");
        Check<ReminderDelivery>("CK_ReminderDeliveries_Attempts", $"{Q("Attempts")} >= 0");
        Check<ReminderDelivery>("CK_ReminderDeliveries_Lease", $"({Q("LeaseId")} IS NULL AND {Q("LeaseUntil")} IS NULL) OR ({Q("LeaseId")} IS NOT NULL AND {Q("LeaseUntil")} IS NOT NULL)");
        Check<ReminderDelivery>("CK_ReminderDeliveries_Completion", $"{Q("SentAt")} IS NULL OR {Q("Abandoned")} = {falseValue}");
        Check<RefreshSession>("CK_RefreshSessions_Expiry", $"{Q("ExpiresAt")} > {Q("CreatedAt")}");
        Check<RefreshSession>("CK_RefreshSessions_Revoked", $"{Q("RevokedAt")} IS NULL OR {Q("RevokedAt")} >= {Q("CreatedAt")}");
        Check<RefreshSession>("CK_RefreshSessions_Replacement", $"{Q("ReplacedById")} IS NULL OR {Q("ReplacedById")} <> {Q("Id")}");
        Check<EmailChallenge>("CK_EmailChallenges_Attempts", $"{Q("Attempts")} BETWEEN 0 AND 5");
        Check<EmailChallenge>("CK_EmailChallenges_Expiry", $"{Q("ExpiresAt")} > {Q("LastSentAt")}");
        Check<UserInfo>("CK_UserInfos_Gender", $"{Q("Gender")} BETWEEN 0 AND 2");
        Check<AdministrativeAuditEvent>("CK_AdminAudit_Action", $"{Q("Action")} BETWEEN 1 AND 12");
    }
}
