using Microsoft.EntityFrameworkCore;
using NTC.Contract.Repositories.Entities;
using NTC.Contract.Repositories.Entities.Tasks;

namespace NTC.Repositories.Configuration;

internal static class AnnouncementConfiguration
{
    public static void ConfigureAnnouncements(this ModelBuilder model, bool sqlServer)
    {
        string Q(string name) => sqlServer ? $"[{name}]" : $"\"{name}\"";
        model.Entity<Announcement>(e =>
        {
            e.ToTable("Announcements", t => {
                t.HasCheckConstraint("CK_Announcements_Publish", $"({Q("PublishedAt")} IS NULL AND {Q("PublishedBy")} IS NULL AND {Q("PublishRequestId")} IS NULL AND {Q("PublishedVersion")} IS NULL) OR ({Q("PublishedAt")} IS NOT NULL AND {Q("PublishedBy")} IS NOT NULL AND {Q("PublishRequestId")} IS NOT NULL AND {Q("PublishedVersion")} IS NOT NULL)");
                t.HasCheckConstraint("CK_Announcements_Revoke", $"({Q("RevokedAt")} IS NULL AND {Q("RevokedBy")} IS NULL) OR ({Q("RevokedAt")} IS NOT NULL AND {Q("RevokedBy")} IS NOT NULL AND {Q("PublishedAt")} IS NOT NULL)");
                t.HasCheckConstraint("CK_Announcements_Count", $"{Q("RecipientCount")} >= 0");
            });
            e.Property(x => x.Title).HasMaxLength(150).IsRequired();
            e.Property(x => x.Body).HasMaxLength(10000).IsRequired();
            e.Property(x => x.CreateRequestHash).HasMaxLength(64).IsRequired();
            e.HasIndex(x => new { x.AuthorId, x.CreateRequestId }).IsUnique();
            e.HasOne<ApplicationUser>().WithMany().HasForeignKey(x => x.AuthorId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<ApplicationUser>().WithMany().HasForeignKey(x => x.PublishedBy).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<ApplicationUser>().WithMany().HasForeignKey(x => x.RevokedBy).OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(x => new { x.CreatedTime, x.Id });
            e.HasIndex(x => new { x.PublishedBy, x.PublishRequestId }).IsUnique().HasFilter($"{Q("PublishRequestId")} IS NOT NULL");
            e.HasMany(x => x.Targets).WithOne().HasForeignKey(x => x.AnnouncementId).OnDelete(DeleteBehavior.Cascade);
            e.HasMany(x => x.Receipts).WithOne(x => x.Announcement).HasForeignKey(x => x.AnnouncementId).OnDelete(DeleteBehavior.Cascade);
        });
        model.Entity<AnnouncementTarget>(e => {
            e.ToTable("AnnouncementTargets"); e.HasKey(x => new { x.AnnouncementId, x.UserId });
            e.HasOne<ApplicationUser>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
        });
        model.Entity<AnnouncementReceipt>(e => {
            e.ToTable("AnnouncementReceipts");
            e.HasIndex(x => new { x.AnnouncementId, x.UserId }).IsUnique();
            e.HasIndex(x => new { x.UserId, x.ReadAt });
            e.HasOne<ApplicationUser>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
        });
        model.Entity<AnnouncementEvent>(e => {
            e.ToTable("AnnouncementEvents"); e.HasKey(x => x.Id);
            e.Property(x => x.Action).HasMaxLength(16).IsRequired();
            e.HasOne<Announcement>().WithMany().HasForeignKey(x => x.AnnouncementId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<ApplicationUser>().WithMany().HasForeignKey(x => x.ActorId).OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(x => new { x.AnnouncementId, x.OccurredAt, x.Id });
        });
    }
}
