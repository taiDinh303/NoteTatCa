using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using NTC.Contract.Repositories.Entities;
using NTC.Contract.Repositories.IUOW;
using NTC.Contract.Services.Interface;
using NTC.Core.Base;
using NTC.Core.Utils;
using NTC.ModelViews.NoteModelView;
using NTC.Services.Mappings;
using static NTC.Core.Base.BaseException;

namespace NTC.Services.Service
{
    public class NoteService : INoteService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public NoteService(
               IUnitOfWork unitOfWork,
               IHttpContextAccessor httpContextAccessor)
        {
            _unitOfWork = unitOfWork;
            _httpContextAccessor = httpContextAccessor;
        }

        public async Task<BasePaginatedList<NoteResponseModelView>> GetAllAsync(int pageNumber, int pageSize)
        {
            var repo = _unitOfWork.GetRepository<Note>();

            Guid userId = Guid.Parse(
                _httpContextAccessor.HttpContext?
                    .User
                    .FindFirstValue(ClaimTypes.NameIdentifier)
                ?? throw new ErrorException(
                    StatusCodes.Status401Unauthorized,
                    "UNAUTHORIZED",
                    "User not authenticated"
                )
            );

            IQueryable<Note> query = repo.Entities
                .Where(x =>
                    x.UserId == userId &&
                    !x.DeletedTime.HasValue)
                    .Include(x => x.Reminders.Where(r => r.IsActive))
                    .Include(x => x.NoteTags)
                    .ThenInclude(nc => nc.Tag)
                    .OrderByDescending(x => x.IsPinned)
                    .ThenByDescending(x => x.PinnedAt)
                    .ThenByDescending(x => x.CreatedTime)
                    .ThenBy(x => x.SortOrder);



            int totalItems = await query.CountAsync();

            List<NoteResponseModelView> result = await query
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .Select(x => x.ToViewModel())
                .ToListAsync();

            return new BasePaginatedList<NoteResponseModelView>(
                result.AsReadOnly(),
                totalItems,
                pageNumber,
                pageSize
            );
        }

        public async Task<BasePaginatedList<NoteResponseModelView>> GetByTagAsync(Guid? tagId, int pageNumber, int pageSize)
        {
            var repo = _unitOfWork.GetRepository<Note>();

            Guid userId = Guid.Parse(
                _httpContextAccessor.HttpContext?
                    .User
                    .FindFirstValue(ClaimTypes.NameIdentifier)
                ?? throw new ErrorException(
                    StatusCodes.Status401Unauthorized,
                    "UNAUTHORIZED",
                    "User not authenticated"
                )
            );

            IQueryable<Note> query = repo.Entities
                .Where(x =>
                    x.UserId == userId &&
                    !x.DeletedTime.HasValue)
                .Include(x => x.NoteTags)
                    .ThenInclude(nc => nc.Tag);

            // ⭐ Filter by tag
            if (tagId.HasValue)
            {
                query = query.Where(n =>
                    n.NoteTags.Any(nc => nc.TagId == tagId));
            }

            query = query
                .OrderByDescending(x => x.IsPinned)
                .ThenByDescending(x => x.PinnedAt)
                .ThenByDescending(x => x.CreatedTime)
                .ThenBy(x => x.SortOrder);

            int totalItems = await query.CountAsync();

            var result = await query
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .Select(x => x.ToViewModel())
                .ToListAsync();

            return new BasePaginatedList<NoteResponseModelView>(
                result.AsReadOnly(),
                totalItems,
                pageNumber,
                pageSize
            );
        }


        public async Task<BasePaginatedList<NoteResponseModelView>> GetByReminderAsync(int pageNumber, int pageSize)
        {
            var repo = _unitOfWork.GetRepository<Note>();

            Guid userId = Guid.Parse(
                _httpContextAccessor.HttpContext?
                    .User
                    .FindFirstValue(ClaimTypes.NameIdentifier)
                ?? throw new ErrorException(
                    StatusCodes.Status401Unauthorized,
                    "UNAUTHORIZED",
                    "User not authenticated"
                )
            );

            IQueryable<Note> query = repo.Entities
                .Where(x =>
                    x.UserId == userId &&
                    !x.DeletedTime.HasValue &&
                    x.Reminders.Any(r => r.IsActive) // 👈 filter chính
                )
                .Include(x => x.Reminders)
                .Include(x => x.NoteTags)
                    .ThenInclude(nc => nc.Tag)
                .OrderByDescending(x => x.IsPinned)
                .ThenByDescending(x => x.PinnedAt)
                .ThenBy(x => x.Reminders.Min(r => r.ReminderAt)) // 👈 gần nhất lên trước
                .ThenByDescending(x => x.CreatedTime)
                .ThenBy(x => x.SortOrder);

            int totalItems = await query.CountAsync();

            var result = await query
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .Select(x => x.ToViewModel())
                .ToListAsync();

            return new BasePaginatedList<NoteResponseModelView>(
                result.AsReadOnly(),
                totalItems,
                pageNumber,
                pageSize
            );
        }





        public async Task<NoteResponseModelView> GetByIdAsync(Guid id)
        {
            var repo = _unitOfWork.GetRepository<Note>();

            Note note = await repo.Entities
                .FirstOrDefaultAsync(x => x.Id == id && !x.DeletedTime.HasValue)
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Note not found"
                );

            return note.ToViewModel();
        }

        public async Task CreateAsync(CreateNoteModelView model)
        {
            var repo = _unitOfWork.GetRepository<Note>();

            string currentUser = _httpContextAccessor.HttpContext?.User?.Identity?.Name ?? "System";

            Note note = model.ToEntity();
            note.CreatedBy = currentUser;
            note.CreatedTime = CoreHelper.SystemTimeNow;

            await repo.InsertAsync(note);
            await _unitOfWork.SaveAsync();
        }

        public async Task UpdateAsync(UpdateNoteModelView model)
        {
            var repo = _unitOfWork.GetRepository<Note>();

            Note note = await repo.Entities
                .FirstOrDefaultAsync(x => x.Id == model.Id && !x.DeletedTime.HasValue)
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Note not found"
                );

            string currentUser = _httpContextAccessor.HttpContext?.User?.Identity?.Name ?? "System";

            note.LastUpdatedBy = currentUser;
            note.LastUpdatedTime = CoreHelper.SystemTimeNow;

            model.ToEntity(note);

            await repo.UpdateAsync(note);
            await _unitOfWork.SaveAsync();
        }

        public async Task SoftDeleteAsync(Guid id)
        {
            var repo = _unitOfWork.GetRepository<Note>();

            Note note = await repo.Entities
                .FirstOrDefaultAsync(x => x.Id == id && !x.DeletedTime.HasValue)
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Note not found"
                );

            string currentUser = _httpContextAccessor.HttpContext?.User?.Identity?.Name ?? "System";

            note.DeletedBy = currentUser;
            note.DeletedTime = CoreHelper.SystemTimeNow;

            await repo.UpdateAsync(note);
            await _unitOfWork.SaveAsync();
        }

        public async Task DeleteAsync(Guid id)
        {
            var repo = _unitOfWork.GetRepository<Note>();

            Note note = await repo.Entities
                .FirstOrDefaultAsync(x => x.Id == id)
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Note not found"
                );

            await repo.DeleteAsync(note);
            await _unitOfWork.SaveAsync();
        }


        public async Task TogglePinAsync(Guid id)
        {
            var repo = _unitOfWork.GetRepository<Note>();

            Guid userId = Guid.Parse(
                _httpContextAccessor.HttpContext?
                    .User
                    .FindFirstValue(ClaimTypes.NameIdentifier)
                ?? throw new ErrorException(
                    StatusCodes.Status401Unauthorized,
                    "UNAUTHORIZED",
                    "User not authenticated"
                )
            );

            Note note = await repo.Entities
                .FirstOrDefaultAsync(x =>
                    x.Id == id &&
                    x.UserId == userId &&
                    !x.DeletedTime.HasValue)
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Note not found"
                );

            note.IsPinned = !note.IsPinned;
            note.PinnedAt = note.IsPinned ? CoreHelper.SystemTimeNow : null;

            string currentUser =
                _httpContextAccessor.HttpContext?.User?.Identity?.Name ?? "System";

            note.LastUpdatedBy = currentUser;
            note.LastUpdatedTime = CoreHelper.SystemTimeNow;

            await repo.UpdateAsync(note);
            await _unitOfWork.SaveAsync();
        }






    }
}
