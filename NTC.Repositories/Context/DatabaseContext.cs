using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using NTC.Contract.Repositories.Entities;
using NTC.Contract.Repositories.Entities.Tasks;

namespace NTC.Repositories.Context
{
    public class DatabaseContext : IdentityDbContext<ApplicationUser, ApplicationRole, Guid, ApplicationUserClaim, ApplicationUserRole, ApplicationUserLogin, ApplicationRoleClaim, ApplicationUserToken>
    {
        public DatabaseContext(DbContextOptions<DatabaseContext> options) : base(options) { }

        // Identity
        public virtual DbSet<ApplicationUser> ApplicationUser => Set<ApplicationUser>();
        public virtual DbSet<ApplicationRole> ApplicationRole => Set<ApplicationRole>();
        public virtual DbSet<ApplicationUserClaim> ApplicationUserClaim => Set<ApplicationUserClaim>();
        public virtual DbSet<ApplicationUserRole> ApplicationUserRole => Set<ApplicationUserRole>();
        public virtual DbSet<ApplicationUserLogin> ApplicationUserLogin => Set<ApplicationUserLogin>();
        public virtual DbSet<ApplicationRoleClaim> ApplicationRoleClaim => Set<ApplicationRoleClaim>();
        public virtual DbSet<ApplicationUserToken> ApplicationUserToken => Set<ApplicationUserToken>();

        // Domain

        public virtual DbSet<UserInfo> UserInfos => Set<UserInfo>();
        public virtual DbSet<NoteTag> NoteTags => Set<NoteTag>();
        public virtual DbSet<Tag> Tags => Set<Tag>();
        public virtual DbSet<Note> Notes => Set<Note>();
        public virtual DbSet<Reminder> Reminders => Set<Reminder>();

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            // ===== NoteTag (Many-to-Many) =====
            builder.Entity<NoteTag>(entity =>
            {
                entity.HasKey(x => new { x.NoteId, x.TagId });

                entity.HasOne(x => x.Note)
                      .WithMany(n => n.NoteTags)
                      .HasForeignKey(x => x.NoteId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(x => x.Tag)
                      .WithMany(c => c.NoteTags)
                      .HasForeignKey(x => x.TagId)
                      .OnDelete(DeleteBehavior.Restrict);
            });
            // ===== Note =====
            builder.Entity<Note>(entity =>
            {
                entity.Property(x => x.Title)
                      .IsRequired()
                      .HasMaxLength(150);

                entity.HasOne(x => x.User)
                      .WithMany()
                      .HasForeignKey(x => x.UserId)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            // ===== Tag =====
            builder.Entity<Tag>(entity =>
            {
                entity.Property(x => x.Name)
                      .IsRequired()
                      .HasMaxLength(50);

                entity.HasOne(x => x.User)
                      .WithMany()
                      .HasForeignKey(x => x.UserId)
                      .OnDelete(DeleteBehavior.Cascade);
            });
        }


    }
}
