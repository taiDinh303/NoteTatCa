using Microsoft.EntityFrameworkCore;
using NTC.Contract.Repositories.Entities;
using NTC.Contract.Repositories.IUOW;
using NTC.Contract.Services.Interface;
using NTC.Core.Base;
using NTC.Core.Security;
using NTC.ModelViews.TagModelView;
using NTC.Services.Mappings;
using NTC.Services.Notes;
using NTC.Services.Shared;
namespace NTC.Services.Service;
public sealed class TagService(IUnitOfWork unitOfWork, ICurrentUser currentUser, TimeProvider clock)
    : BaseService(unitOfWork, currentUser, clock), ITagService
{
    private IQueryable<Tag> Owned() => Repository<Tag>().Entities.Where(x => x.UserId == UserId && x.DeletedTime == null);
    public async Task<BasePaginatedList<TagResponseModelView>> GetAllAsync(int pageNumber, int pageSize)
    {
        _ = UserId; ValidatePage(pageNumber, pageSize); var query = Owned().AsNoTracking();
        var count = await query.CountAsync(); var tags = await query.OrderBy(x => x.Name).ThenBy(x => x.Id).Skip((pageNumber - 1) * pageSize).Take(pageSize).ToListAsync();
        return new(tags.Select(x => x.ToViewModel()).ToArray(), count, pageNumber, pageSize);
    }
    public async Task<TagResponseModelView> GetByIdAsync(Guid id) => (await Owned().AsNoTracking().FirstOrDefaultAsync(x => x.Id == id) ?? throw DomainErrors.NotFound("Label")).ToViewModel();
    private static void Validate(string name, string? color, string? icon)
    {
        if (string.IsNullOrWhiteSpace(name) || name.Length > 50) throw DomainErrors.Invalid("Label name must contain 1 to 50 characters.");
        _ = ContentRules.Color(color);
        if (icon?.Length > 50 || icon?.Any(c => char.IsControl(c) || c is '<' or '>') == true) throw DomainErrors.Invalid("Invalid label icon.");
    }
    public async Task<Tag> CreateAsync(CreateTagModelView model)
    {
        _ = UserId; Validate(model.Name, model.Color, model.Icon);
        var tag = new Tag { UserId = UserId, Name = model.Name.Trim(), Color = model.Color, Icon = model.Icon };
        await Repository<Tag>().InsertAsync(tag); await UnitOfWork.SaveAsync(); return tag;
    }
    public async Task UpdateAsync(UpdateTagModelView model)
    {
        var tag = await Owned().FirstOrDefaultAsync(x => x.Id == model.Id) ?? throw DomainErrors.NotFound("Label");
        if (model.Version.HasValue) RequireVersion(model.Version.Value, tag.Version);
        Validate(model.Name, model.Color, model.Icon); tag.Name = model.Name.Trim(); tag.Color = model.Color; tag.Icon = model.Icon; await UnitOfWork.SaveAsync();
    }
    public async Task PatchAsync(Guid id, PatchTagRequest request)
    {
        await InTransactionAsync(async () =>
        {
            var tag = await Owned().FirstOrDefaultAsync(x => x.Id == id) ?? throw DomainErrors.NotFound("Label");
            RequireVersion(request.Version, tag.Version);
            var name = request.Includes(nameof(request.Name)) ? request.Name : tag.Name;
            var color = request.Includes(nameof(request.Color)) ? request.Color : tag.Color;
            var icon = request.Includes(nameof(request.Icon)) ? request.Icon : tag.Icon;
            Validate(name ?? string.Empty, color, icon);
            tag.Name = name!.Trim(); tag.Color = ContentRules.Color(color); tag.Icon = icon;
            await UnitOfWork.SaveAsync(); return true;
        });
    }
    public Task SoftDeleteAsync(Guid id) => DeleteInternal(id, false);
    public Task DeleteAsync(Guid id) => DeleteInternal(id, true);
    private async Task DeleteInternal(Guid id, bool permanent)
    {
        await InTransactionAsync(async () =>
        {
            var tag = await Repository<Tag>().Entities.FirstOrDefaultAsync(x => x.Id == id && x.UserId == UserId) ?? throw DomainErrors.NotFound("Label");
            foreach (var link in await Repository<NoteTag>().Entities.Include(x => x.Note).Where(x => x.TagId == id).ToListAsync())
            { await Repository<NoteTag>().DeleteAsync(link); if (link.Note.UserId == UserId) await Repository<Note>().UpdateAsync(link.Note); }
            if (permanent) await Repository<Tag>().DeleteAsync(tag); else { tag.DeletedTime = UtcNow; tag.DeletedBy = CurrentUser.Name; }
            await UnitOfWork.SaveAsync(); return true;
        });
    }
}
