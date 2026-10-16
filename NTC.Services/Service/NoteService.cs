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
        private readonly INoteTagService _noteTagService;

        public NoteService(IUnitOfWork unitOfWork, IHttpContextAccessor httpContextAccessor, INoteTagService noteTagService)
        {
            _unitOfWork = unitOfWork;
            _httpContextAccessor = httpContextAccessor;
            _noteTagService = noteTagService;
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

        public async Task<BasePaginatedList<NoteResponseModelView>> GetTrashAsync(int pageNumber, int pageSize)
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
                    x.DeletedTime.HasValue)
                .Include(x => x.NoteTags)
                .ThenInclude(nt => nt.Tag)
                .OrderByDescending(x => x.DeletedTime);

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

        public async Task<Note> CreateAsync(CreateNoteModelView model)
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

            string currentUser =
                _httpContextAccessor.HttpContext?.User?.Identity?.Name ?? "System";

            int minSortOrder = await repo.Entities
                .Where(x =>
                    x.UserId == userId &&
                    x.IsPinned == model.IsPinned &&
                    !x.DeletedTime.HasValue)
                .Select(x => (int?)x.SortOrder)
                .MinAsync() ?? 1000;

            Note note = model.ToEntity();

            note.UserId = userId;
            note.SortOrder = minSortOrder - 1000;

            note.CreatedBy = currentUser;
            note.CreatedTime = CoreHelper.SystemTimeNow;

            if (note.IsPinned)
                note.PinnedAt = CoreHelper.SystemTimeNow;

            await repo.InsertAsync(note);
            await _unitOfWork.SaveAsync();

            return note;
        }

        public async Task UpdateAsync(UpdateNoteModelView model)
        {
            var repo = _unitOfWork.GetRepository<Note>();

            Note note = await repo.Entities
                .FirstOrDefaultAsync(x =>
                    x.Id == model.Id &&
                    !x.DeletedTime.HasValue)
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Note not found"
                );

            string currentUser =
                _httpContextAccessor.HttpContext?.User?.Identity?.Name ?? "System";

            await UpdatePinStateAsync(note, model.IsPinned);

            note.LastUpdatedBy = currentUser;
            note.LastUpdatedTime = CoreHelper.SystemTimeNow;

            model.ToEntity(note);

            await repo.UpdateAsync(note);
            await _unitOfWork.SaveAsync();
        }

        private async Task UpdatePinStateAsync(Note note, bool newPinnedState)
        {
            if (note.IsPinned == newPinnedState)
                return;

            var repo = _unitOfWork.GetRepository<Note>();

            var notesInGroup = await repo.Entities
                .Where(x =>
                    x.UserId == note.UserId &&
                    !x.DeletedTime.HasValue &&
                    x.IsPinned == newPinnedState &&
                    x.Id != note.Id)
                .OrderByDescending(x => x.SortOrder)
                .ToListAsync();

            foreach (var item in notesInGroup)
            {
                item.SortOrder += 1000;
                item.LastUpdatedTime = CoreHelper.SystemTimeNow;
            }

            note.IsPinned = newPinnedState;
            note.PinnedAt = newPinnedState ? CoreHelper.SystemTimeNow : null;
            note.SortOrder = 1000;
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


            await _noteTagService.RemoveAllTagsFromNoteAsync(id);

            await repo.DeleteAsync(note);
            await _unitOfWork.SaveAsync();
        }

        public async Task RestoreAsync(Guid id)
        {
            var repo = _unitOfWork.GetRepository<Note>();

            Note note = await repo.Entities
                .FirstOrDefaultAsync(x => x.Id == id && x.DeletedTime.HasValue)
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Note not found"
                );

            note.DeletedBy = null;
            note.DeletedTime = null;

            await repo.UpdateAsync(note);
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

            await UpdatePinStateAsync(note, !note.IsPinned);

            string currentUser =
                _httpContextAccessor.HttpContext?.User?.Identity?.Name
                ?? "System";

            note.LastUpdatedBy = currentUser;
            note.LastUpdatedTime = CoreHelper.SystemTimeNow;

            await repo.UpdateAsync(note);
            await _unitOfWork.SaveAsync();
        }


        public async Task ReorderAsync(ReorderNoteModelView model)
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


            string currentUser =
                _httpContextAccessor.HttpContext?.User?.Identity?.Name
                ?? "System";



            // Note dragging
            Note dragged = await repo.Entities
                .FirstOrDefaultAsync(x =>
                    x.Id == model.DraggedId &&
                    x.UserId == userId &&
                    !x.DeletedTime.HasValue)
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Dragged note not found."
                );



            // Current group (Pinned or Normal)
            bool isPinnedGroup = dragged.IsPinned;



            Note? previous = null;
            Note? next = null;



            // Note behind
            if (model.PreviousId.HasValue)
            {
                previous = await repo.Entities
                    .FirstOrDefaultAsync(x =>
                        x.Id == model.PreviousId.Value &&
                        x.UserId == userId &&
                        x.IsPinned == isPinnedGroup &&
                        !x.DeletedTime.HasValue);
            }



            // Note below
            if (model.NextId.HasValue)
            {
                next = await repo.Entities
                    .FirstOrDefaultAsync(x =>
                        x.Id == model.NextId.Value &&
                        x.UserId == userId &&
                        x.IsPinned == isPinnedGroup &&
                        !x.DeletedTime.HasValue);
            }



            /*
                previous = 1000
                next     = 2000

                => 1500
            */

            //if (next!.SortOrder <= 1000)
            //{
            //    await RebalanceSortOrderAsync(isPinnedGroup);
            //}

            if (previous == null && next == null)
            {
                dragged.SortOrder = 1000;
            }
            else if (previous == null)
            {
                double newSortOrder = next!.SortOrder - 1000;


                if (newSortOrder < 1000)
                {
                    await RebalanceSortOrderAsync(isPinnedGroup);

                    next = await repo.Entities
                        .Where(x =>
                            x.Id == model.NextId &&
                            x.UserId == userId &&
                            !x.DeletedTime.HasValue)
                        .FirstAsync();


                    newSortOrder = next.SortOrder - 1000;
                }


                dragged.SortOrder = newSortOrder;
            }
            else if (next == null)
            {
                // drag to the bot

                dragged.SortOrder = previous.SortOrder + 1000;
            }
            else
            {
                // drag to the middle

                dragged.SortOrder =
                    (previous.SortOrder + next.SortOrder) / 2;
            }



            dragged.LastUpdatedBy = currentUser;
            dragged.LastUpdatedTime = CoreHelper.SystemTimeNow;



            await repo.UpdateAsync(dragged);

            await _unitOfWork.SaveAsync();
        }


        private async Task RebalanceSortOrderAsync(bool isPinned)
        {
            var repo = _unitOfWork.GetRepository<Note>();

            Guid userId = Guid.Parse(
                _httpContextAccessor.HttpContext?
                    .User
                    .FindFirstValue(ClaimTypes.NameIdentifier)!
            );


            var notes = await repo.Entities
                .Where(x =>
                    x.UserId == userId &&
                    x.IsPinned == isPinned &&
                    !x.DeletedTime.HasValue)
                .OrderBy(x => x.SortOrder)
                .ToListAsync();


            int sortOrder = 1000;


            foreach (var note in notes)
            {
                note.SortOrder = sortOrder;

                sortOrder += 1000;
            }


            await _unitOfWork.SaveAsync();
        }


    }
}
