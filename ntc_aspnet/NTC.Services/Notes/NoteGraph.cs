using Microsoft.EntityFrameworkCore;
using NTC.Contract.Repositories.Entities;
using NTC.Contract.Repositories.Entities.Tasks;
using NTC.Contract.Repositories.IUOW;
namespace NTC.Services.Notes;
public static class NoteGraph
{
    public static async Task DeleteAsync(IUnitOfWork unitOfWork, Note note)
    {
        foreach (var n in await unitOfWork.GetRepository<Notification>().Entities.Where(x => x.NoteId == note.Id).ToListAsync())
            await unitOfWork.GetRepository<Notification>().DeleteAsync(n);
        foreach (var d in await unitOfWork.GetRepository<ReminderDelivery>().Entities.Where(x => x.NoteId == note.Id).ToListAsync())
            await unitOfWork.GetRepository<ReminderDelivery>().DeleteAsync(d);
        foreach (var r in await unitOfWork.GetRepository<Reminder>().Entities.Where(x => x.NoteId == note.Id).ToListAsync())
            await unitOfWork.GetRepository<Reminder>().DeleteAsync(r);
        foreach (var t in await unitOfWork.GetRepository<NoteTag>().Entities.Where(x => x.NoteId == note.Id).ToListAsync())
            await unitOfWork.GetRepository<NoteTag>().DeleteAsync(t);
        await unitOfWork.GetRepository<Note>().DeleteAsync(note);
    }
}
