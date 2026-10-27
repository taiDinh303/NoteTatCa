using Microsoft.EntityFrameworkCore;
using NTC.Contract.Repositories.Entities;
using NTC.Contract.Repositories.Entities.Tasks;
namespace NTC.Repositories.Mascots;
public static class MascotModel
{
    public static void ConfigureMascots(this ModelBuilder builder, string provider) => builder.Entity<MascotGeneration>(e =>
    {
        e.HasKey(x => x.Id);
        e.Property(x => x.QuotaDay).HasMaxLength(8).IsRequired();
        e.Property(x => x.State).HasMaxLength(16).IsRequired();
        e.Property(x => x.Description).HasMaxLength(1000).IsRequired();
        e.Property(x => x.ErrorCode).HasMaxLength(50);
        e.HasIndex(x => new { x.UserId, x.QuotaDay }).IsUnique();
        e.HasIndex(x => new { x.UserId, x.RequestId }).IsUnique();
        e.HasIndex(x => x.UserId).IsUnique().HasFilter(provider == "Microsoft.EntityFrameworkCore.SqlServer"
            ? "[OccupiesSlot] = 1" : "\"OccupiesSlot\" = TRUE");
        e.HasIndex(x => new { x.State, x.CreatedAt });
        e.HasOne<ApplicationUser>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
    });
}
