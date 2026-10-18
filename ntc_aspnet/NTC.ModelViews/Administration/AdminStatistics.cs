namespace NTC.ModelViews.Administration;
public sealed record AdminStatistics(int TotalAccounts, int LockedAccounts, int ActiveNotes, int TrashedNotes, int ActiveReminders, int PendingEmails);
public sealed class LockUserRequest { public bool IsLocked { get; set; } }
