using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using NTC.Contract.Repositories.Entities;
using NTC.Contract.Repositories.Entities.Tasks;
using NTC.Contract.Repositories.IUOW;
using NTC.Contract.Services.Interface;
using NTC.Core.Base;
using NTC.Core.Utils;
using NTC.ModelViews.ReminderModelView;
using NTC.Services.Mappings;
using static NTC.Core.Base.BaseException;

namespace NTC.Services.Service
{
    public class ReminderService : IReminderService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public ReminderService(IUnitOfWork unitOfWork, IHttpContextAccessor httpContextAccessor)
        {
            _unitOfWork = unitOfWork;
            _httpContextAccessor = httpContextAccessor;
        }

        // GET ALL
        public async Task<BasePaginatedList<ReminderResponseModelView>> GetAllAsync(int pageNumber, int pageSize)
        {
            var repo = _unitOfWork.GetRepository<Reminder>();

            IQueryable<Reminder> query = repo.Entities
                .Include(x => x.Note)
                .Where(x => x.IsActive && !x.DeletedTime.HasValue)
                .OrderByDescending(x => x.CreatedTime);

            int totalItems = await query.CountAsync();

            var result = await query
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .Select(x => x.ToViewModel())
                .ToListAsync();

            return new BasePaginatedList<ReminderResponseModelView>(
                result.AsReadOnly(),
                totalItems,
                pageNumber,
                pageSize
            );
        }

        // GET BY ID
        public async Task<ReminderResponseModelView> GetByIdAsync(Guid id)
        {
            var repo = _unitOfWork.GetRepository<Reminder>();

            var reminder = await repo.Entities
                .Include(x => x.Note)
                .FirstOrDefaultAsync(x => x.Id == id && !x.DeletedTime.HasValue)
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Reminder not found"
                );

            return reminder.ToViewModel();
        }

        // GET BY NOTE ID
        public async Task<List<ReminderResponseModelView>> GetByNoteIdAsync(Guid noteId)
        {
            var repo = _unitOfWork.GetRepository<Reminder>();

            var reminders = await repo.Entities
                .Where(x => x.NoteId == noteId && !x.DeletedTime.HasValue)
                .OrderBy(x => x.ReminderAt)
                .ToListAsync();

            return reminders.ToViewModelList();
        }

        // CREATE
        public async Task<Reminder> CreateAsync(CreateReminderModelView model)
        {
            var repo = _unitOfWork.GetRepository<Reminder>();
            var noteRepo = _unitOfWork.GetRepository<Note>();

            // Get user
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

            // Check note existence and ownership
            var note = await noteRepo.Entities
                .FirstOrDefaultAsync(x => x.Id == model.NoteId && x.UserId == userId)
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Note not found"
                );


            // Validate repeat
            if (model.RepeatType != RepeatType.Weekly)
                model.RepeatDays = null;

            if (model.RepeatUntil != null && model.RepeatCount != null)
            {
                throw new ErrorException(
                    StatusCodes.Status400BadRequest,
                    "INVALID",
                    "Only one ending condition is allowed"
                );
            }

            // Limit quantity reminder / note
            const int MAX_REMINDERS = 5;

            int currentCount = await repo.Entities
                .CountAsync(r => r.NoteId == model.NoteId && r.IsActive);

            if (currentCount >= MAX_REMINDERS)
            {
                throw new ErrorException(
                    StatusCodes.Status400BadRequest,
                    "LIMIT_EXCEEDED",
                    $"Maximum {MAX_REMINDERS} reminders allowed per note"
                );
            }


            // Create
            var reminder = model.ToEntity();

            reminder.CreatedBy = currentUser;
            reminder.CreatedTime = CoreHelper.SystemTimeNow;
            reminder.IsActive = true;

            await repo.InsertAsync(reminder);
            await _unitOfWork.SaveAsync();

            return reminder;
        }

        // UPDATE reminder
        public async Task UpdateAsync(UpdateReminderModelView model)
        {
            var repo = _unitOfWork.GetRepository<Reminder>();

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

            string currentUser = _httpContextAccessor.HttpContext?.User?.Identity?.Name ?? "System";

            // Get reminder + check ownership by Note
            var reminder = await repo.Entities
                .Include(r => r.Note)
                .FirstOrDefaultAsync(x =>
                    x.Id == model.Id &&
                    !x.DeletedTime.HasValue &&
                    x.Note != null &&
                    x.Note.UserId == userId)
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Reminder not found"
                );

            // Validate repeat logic
            if (model.RepeatType != RepeatType.Weekly)
                model.RepeatDays = null;

            if (model.RepeatUntil != null && model.RepeatCount != null)
            {
                throw new ErrorException(
                    StatusCodes.Status400BadRequest,
                    "INVALID",
                    "Only one ending condition is allowed"
                );
            }

            // Check duplicate (excluding the current record)
            bool isDuplicate = await repo.Entities.AnyAsync(r =>
                r.Id != model.Id &&
                r.NoteId == reminder.NoteId &&
                r.ReminderAt == model.ReminderAt &&
                r.IsActive);

            if (isDuplicate)
            {
                throw new ErrorException(
                    StatusCodes.Status400BadRequest,
                    "DUPLICATE",
                    "Reminder at this time already exists"
                );
            }

            // Update data
            reminder.LastUpdatedBy = currentUser;
            reminder.LastUpdatedTime = CoreHelper.SystemTimeNow;

            model.ToEntity(reminder);

            await repo.UpdateAsync(reminder);
            await _unitOfWork.SaveAsync();
        }





        // delete reminder (soft delete)
        public async Task SoftDeleteAsync(Guid id)
        {
            var repo = _unitOfWork.GetRepository<Reminder>();

            var reminder = await repo.Entities
                .FirstOrDefaultAsync(x => x.Id == id && x.IsActive && !x.DeletedTime.HasValue)
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Reminder not found"
                );

            string currentUser =
                _httpContextAccessor.HttpContext?.User?.Identity?.Name ?? "System";

            reminder.IsActive = false;
            reminder.DeletedBy = currentUser;
            reminder.DeletedTime = CoreHelper.SystemTimeNow;

            await repo.UpdateAsync(reminder);
            await _unitOfWork.SaveAsync();
        }

        // delete reminder (hard delete)
        public async Task DeleteAsync(Guid id)
        {
            var repo = _unitOfWork.GetRepository<Reminder>();

            var reminder = await repo.Entities
                .FirstOrDefaultAsync(x => x.Id == id)
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Reminder not found"
                );

            await repo.DeleteAsync(reminder);
            await _unitOfWork.SaveAsync();
        }
    }
}