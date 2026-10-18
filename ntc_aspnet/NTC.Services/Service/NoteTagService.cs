using Microsoft.EntityFrameworkCore;
using NTC.Contract.Repositories.Entities;
using NTC.Contract.Repositories.IUOW;
using NTC.Contract.Services.Interface;
using NTC.Core.Base;
using NTC.Core.Security;
using NTC.Services.Shared;
namespace NTC.Services.Service;
public sealed class NoteTagService(IUnitOfWork unitOfWork, ICurrentUser currentUser, TimeProvider clock)
    : BaseService(unitOfWork, currentUser, clock), INoteTagService
{
    private async Task<Note> RequireNote(Guid id) => await Repository<Note>().Entities.FirstOrDefaultAsync(x => x.Id == id && x.UserId == UserId && x.DeletedTime == null)
        ?? throw DomainErrors.NotFound("Note");
    private async Task RequireTag(Guid id)
    { if (!await Repository<Tag>().Entities.AnyAsync(x => x.Id == id && x.UserId == UserId && x.DeletedTime == null)) throw DomainErrors.NotFound("Label"); }
    public async Task AddTagToNoteAsync(Guid noteId, Guid tagId)
    {
        await InTransactionAsync(async () =>
        {
            var note = await RequireNote(noteId); await RequireTag(tagId);
            if (await Repository<NoteTag>().Entities.AnyAsync(x => x.NoteId == noteId && x.TagId == tagId)) return true;
            if (await Repository<NoteTag>().Entities.CountAsync(x => x.NoteId == noteId) >= 20) throw DomainErrors.Invalid("A note supports up to 20 labels.");
            await Repository<NoteTag>().InsertAsync(new() { NoteId = noteId, TagId = tagId, UserId = UserId });
            await Repository<Note>().UpdateAsync(note); await UnitOfWork.SaveAsync(); return true;
        });
    }
    public async Task RemoveTagFromNoteAsync(Guid noteId, Guid tagId)
    {
        var note = await RequireNote(noteId); await RequireTag(tagId);
        var link = await Repository<NoteTag>().Entities.FirstOrDefaultAsync(x => x.NoteId == noteId && x.TagId == tagId);
        if (link != null) { await Repository<NoteTag>().DeleteAsync(link); await Repository<Note>().UpdateAsync(note); await UnitOfWork.SaveAsync(); }
    }
    public async Task RemoveTagFromAllNotesAsync(Guid tagId)
    {
        await RequireTag(tagId);
        foreach (var link in await Repository<NoteTag>().Entities.Include(x => x.Note).Where(x => x.TagId == tagId && x.Note.UserId == UserId).ToListAsync())
        { await Repository<NoteTag>().DeleteAsync(link); await Repository<Note>().UpdateAsync(link.Note); }
        await UnitOfWork.SaveAsync();
    }
    public async Task RemoveAllTagsFromNoteAsync(Guid noteId)
    {
        var note = await RequireNote(noteId);
        await Repository<Note>().UpdateAsync(note);
        foreach (var link in await Repository<NoteTag>().Entities.Where(x => x.NoteId == noteId).ToListAsync()) await Repository<NoteTag>().DeleteAsync(link);
        await UnitOfWork.SaveAsync();
    }
}
