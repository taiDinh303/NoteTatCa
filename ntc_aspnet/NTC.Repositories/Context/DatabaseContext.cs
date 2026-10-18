using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using NTC.Contract.Repositories.Entities;
using NTC.Contract.Repositories.Entities.Identity;
using NTC.Contract.Repositories.Entities.Tasks;
using NTC.Core.Base;
using NTC.Core.Security;
using NTC.Repositories.Configuration;

namespace NTC.Repositories.Context;

public class DatabaseContext : IdentityDbContext<ApplicationUser, ApplicationRole, Guid,
    ApplicationUserClaim, ApplicationUserRole, ApplicationUserLogin, ApplicationRoleClaim, ApplicationUserToken>
{
    private readonly TimeProvider _clock;
    private readonly ICurrentUser? _actor;
    public DatabaseContext(DbContextOptions<DatabaseContext> options, TimeProvider? clock = null, ICurrentUser? actor = null)
        : this((DbContextOptions)options, clock, actor) { }
    protected DatabaseContext(DbContextOptions options, TimeProvider? clock = null, ICurrentUser? actor = null) : base(options)
    { _clock = clock ?? TimeProvider.System; _actor = actor; }

    public DbSet<ApplicationUser> ApplicationUser => Set<ApplicationUser>();
    public DbSet<ApplicationRole> ApplicationRole => Set<ApplicationRole>();
    public DbSet<ApplicationUserClaim> ApplicationUserClaim => Set<ApplicationUserClaim>();
    public DbSet<ApplicationUserRole> ApplicationUserRole => Set<ApplicationUserRole>();
    public DbSet<ApplicationUserLogin> ApplicationUserLogin => Set<ApplicationUserLogin>();
    public DbSet<ApplicationRoleClaim> ApplicationRoleClaim => Set<ApplicationRoleClaim>();
    public DbSet<ApplicationUserToken> ApplicationUserToken => Set<ApplicationUserToken>();
    public DbSet<UserInfo> UserInfos => Set<UserInfo>();
    public DbSet<NoteTag> NoteTags => Set<NoteTag>();
    public DbSet<Tag> Tags => Set<Tag>();
    public DbSet<Note> Notes => Set<Note>();
    public DbSet<Reminder> Reminders => Set<Reminder>();
    public DbSet<RefreshSession> RefreshSessions => Set<RefreshSession>();
    public DbSet<EmailChallenge> EmailChallenges => Set<EmailChallenge>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<ReminderDelivery> ReminderDeliveries => Set<ReminderDelivery>();
    public DbSet<AdministrativeAuditEvent> AdministrativeAuditEvents => Set<AdministrativeAuditEvent>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        if (Database.ProviderName == "Npgsql.EntityFrameworkCore.PostgreSQL") builder.HasDefaultSchema("ntc");
        builder.Entity<ApplicationUser>().Property(x => x.TimeZoneId).HasMaxLength(100).HasDefaultValue("Asia/Ho_Chi_Minh");
        builder.Entity<ApplicationUser>().HasIndex(x => x.NormalizedEmail).HasDatabaseName("EmailIndex").IsUnique()
            .HasFilter(Database.IsSqlServer() ? "[NormalizedEmail] IS NOT NULL" : "\"NormalizedEmail\" IS NOT NULL");
        builder.Entity<NoteTag>(e =>
        {
            e.HasKey(x => new { x.NoteId, x.TagId });
            e.HasOne(x => x.Note).WithMany(x => x.NoteTags).HasForeignKey(x => new { x.NoteId, x.UserId })
                .HasPrincipalKey(x => new { x.Id, x.UserId }).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Tag).WithMany(x => x.NoteTags).HasForeignKey(x => new { x.TagId, x.UserId })
                .HasPrincipalKey(x => new { x.Id, x.UserId }).OnDelete(DeleteBehavior.Restrict);
        });
        builder.Entity<Note>(e =>
        {
            e.Property(x => x.Title).IsRequired().HasMaxLength(150);
            e.Property(x => x.IconEmoji).HasMaxLength(32);
            e.Property(x => x.DocumentSchemaVersion).HasDefaultValue(1);
            e.Property(x => x.CreateRequestHash).HasMaxLength(64);
            e.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(x => new { x.UserId, x.DeletedTime, x.IsPinned, x.SortOrder });
            var filter = Database.IsSqlServer() ? "[CreateRequestId] IS NOT NULL" : "\"CreateRequestId\" IS NOT NULL";
            e.HasIndex(x => new { x.UserId, x.CreateRequestId }).IsUnique().HasFilter(filter);
        });
        builder.Entity<Tag>(e =>
        {
            e.Property(x => x.Name).IsRequired().HasMaxLength(50);
            e.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(x => new { x.UserId, x.DeletedTime }); // Duplicate names are intentionally allowed.
        });
        builder.Entity<Reminder>(e =>
        {
            e.Property(x => x.TimeZoneId).HasMaxLength(100).HasDefaultValue("Asia/Ho_Chi_Minh");
            e.Property(x => x.SendEmail).HasDefaultValue(true);
            e.HasOne(x => x.Note).WithMany(x => x.Reminders).HasForeignKey(x => x.NoteId).OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(x => new { x.IsActive, x.NextOccurrenceAt });
        });
        builder.Entity<RefreshSession>(e =>
        {
            e.Property(x => x.TokenHash).HasMaxLength(64);
            e.Property(x => x.SecurityStamp).HasMaxLength(256);
            e.Property(x => x.Version).IsConcurrencyToken();
            e.HasIndex(x => x.TokenHash).IsUnique();
            e.HasIndex(x => new { x.UserId, x.FamilyId });
            e.HasIndex(x => x.ExpiresAt);
            e.HasOne<ApplicationUser>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
        });
        builder.Entity<EmailChallenge>(e =>
        {
            e.HasKey(x => x.Email); e.Property(x => x.Email).HasMaxLength(256);
            e.Property(x => x.CodeHash).HasMaxLength(64); e.Property(x => x.Version).IsConcurrencyToken();
            e.HasIndex(x => x.ExpiresAt);
        });
        builder.Entity<Notification>(e =>
        {
            e.HasIndex(x => new { x.ReminderId, x.OccurrenceAt }).IsUnique();
            e.HasIndex(x => new { x.UserId, x.ReadAt, x.CreatedTime });
            e.HasOne(x => x.Note).WithMany(x => x.Notifications).HasForeignKey(x => new { x.NoteId, x.UserId })
                .HasPrincipalKey(x => new { x.Id, x.UserId }).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Reminder).WithMany(x => x.Notifications).HasForeignKey(x => new { x.ReminderId, x.NoteId })
                .HasPrincipalKey(x => new { x.Id, x.NoteId }).OnDelete(DeleteBehavior.Restrict);
        });
        builder.Entity<ReminderDelivery>(e =>
        {
            e.HasIndex(x => new { x.ReminderId, x.OccurrenceAt }).IsUnique();
            e.HasIndex(x => new { x.Abandoned, x.SentAt, x.NextAttemptAt });
            e.Property(x => x.LastErrorCode).HasMaxLength(80);
            e.HasOne(x => x.Reminder).WithMany(x => x.Deliveries).HasForeignKey(x => new { x.ReminderId, x.NoteId })
                .HasPrincipalKey(x => new { x.Id, x.NoteId }).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Note).WithMany(x => x.ReminderDeliveries).HasForeignKey(x => new { x.NoteId, x.UserId })
                .HasPrincipalKey(x => new { x.Id, x.UserId }).OnDelete(DeleteBehavior.Restrict);
        });
        builder.Entity<UserInfo>().HasOne(x => x.User).WithOne(x => x.UserInfo).HasForeignKey<UserInfo>(x => x.Id);
        builder.Entity<UserInfo>().Property(x => x.Id).ValueGeneratedNever();
        builder.Entity<AdministrativeAuditEvent>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasOne<ApplicationUser>().WithMany().HasForeignKey(x => x.ActorUserId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<ApplicationUser>().WithMany().HasForeignKey(x => x.TargetUserId).OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(x => new { x.ActorUserId, x.OccurredAt });
            e.HasIndex(x => new { x.TargetUserId, x.OccurredAt });
            e.HasIndex(x => new { x.OccurredAt, x.Id });
        });
        builder.ConfigureEntityIntegrity(Database.ProviderName!);
        foreach (var entity in builder.Model.GetEntityTypes())
        {
            if (typeof(BaseEntity).IsAssignableFrom(entity.ClrType))
                builder.Entity(entity.ClrType).Property(nameof(BaseEntity.Version)).IsConcurrencyToken();
            // SQLite fixtures store UTC ticks: allows real relational ordering/comparisons in isolated tests.
            if (Database.ProviderName == "Microsoft.EntityFrameworkCore.Sqlite")
                foreach (var property in entity.GetProperties())
                    if (property.ClrType == typeof(DateTimeOffset) || property.ClrType == typeof(DateTimeOffset?))
                        property.SetValueConverter(new ValueConverter<DateTimeOffset, long>(v => v.UtcTicks, v => new DateTimeOffset(v, TimeSpan.Zero)));
        }
        if (Database.ProviderName == "Npgsql.EntityFrameworkCore.PostgreSQL")
            builder.Entity<UserInfo>().Property(x => x.BirthDate).HasColumnType("timestamp without time zone");
    }

    private void PrepareChanges()
    {
        var now = _clock.GetUtcNow();
        var entries = ChangeTracker.Entries().ToArray();
        if (entries.Any(x => x.Entity is AdministrativeAuditEvent && x.State is EntityState.Modified or EntityState.Deleted))
            throw DomainErrors.Invalid("Administrative audit events are append-only.");
        foreach (var entry in entries.Where(x => x.State is EntityState.Added or EntityState.Modified))
        {
            if (entry.State == EntityState.Modified)
            {
                string[] immutable = entry.Entity switch
                {
                    Note or Tag => ["UserId"],
                    NoteTag => ["UserId", "NoteId", "TagId"],
                    Notification or ReminderDelivery => ["UserId", "NoteId", "ReminderId", "OccurrenceAt"],
                    Reminder => ["NoteId"],
                    RefreshSession => ["UserId", "FamilyId", "CreatedAt", "ExpiresAt"],
                    _ => []
                };
                foreach (var property in immutable)
                    if (!Equals(entry.Property(property).OriginalValue, entry.Property(property).CurrentValue))
                        throw DomainErrors.Invalid("Resource ownership or occurrence/session identity cannot be reassigned.");
            }
            if (entry.Entity is IAuditableEntity audited)
            {
                audited.LastUpdatedTime = now; audited.LastUpdatedBy = _actor?.Name ?? "System";
                if (entry.State == EntityState.Added) { audited.CreatedTime = now; audited.CreatedBy = audited.LastUpdatedBy; }
                else
                {
                    entry.Property(nameof(IAuditableEntity.CreatedTime)).CurrentValue = entry.Property(nameof(IAuditableEntity.CreatedTime)).OriginalValue;
                    entry.Property(nameof(IAuditableEntity.CreatedBy)).CurrentValue = entry.Property(nameof(IAuditableEntity.CreatedBy)).OriginalValue;
                    if (audited.DeletedTime != null && entry.Property(nameof(IAuditableEntity.DeletedTime)).IsModified)
                        audited.DeletedBy = audited.LastUpdatedBy;
                }
            }
            if (entry.Entity is BaseEntity entity) entity.Version = Guid.NewGuid();
            if (entry.Entity is AdministrativeAuditEvent audit) audit.OccurredAt = now;
            if (entry.Entity is RefreshSession session) session.Version = Guid.NewGuid();
            if (entry.Entity is EmailChallenge challenge) challenge.Version = Guid.NewGuid();
            foreach (var property in entry.Properties)
                if (property.CurrentValue is DateTimeOffset value) property.CurrentValue = value.ToUniversalTime();
        }
    }
    public override int SaveChanges(bool acceptAllChangesOnSuccess) { PrepareChanges(); return base.SaveChanges(acceptAllChangesOnSuccess); }
    public override Task<int> SaveChangesAsync(bool acceptAllChangesOnSuccess, CancellationToken cancellationToken = default)
    { PrepareChanges(); return base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken); }
}
