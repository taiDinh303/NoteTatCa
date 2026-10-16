using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using NTC.Contract.Repositories.Entities;
using NTC.Contract.Repositories.IUOW;
using NTC.Contract.Services.Interface;
using static NTC.Core.Base.BaseException;

namespace NTC.Services.Service
{
    public class NoteTagService : INoteTagService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public NoteTagService(
            IUnitOfWork unitOfWork,
            IHttpContextAccessor httpContextAccessor)
        {
            _unitOfWork = unitOfWork;
            _httpContextAccessor = httpContextAccessor;
        }

        // ADD TAG TO NOTE
        public async Task AddTagToNoteAsync(Guid noteId, Guid tagId)
        {
            var noteRepo = _unitOfWork.GetRepository<Note>();
            var tagRepo = _unitOfWork.GetRepository<Tag>();
            var noteTagRepo = _unitOfWork.GetRepository<NoteTag>();

            Guid userId = GetCurrentUserId();

            // Validate note
            bool noteExists = await noteRepo.Entities
                .AnyAsync(x => x.Id == noteId && x.UserId == userId && !x.DeletedTime.HasValue);

            if (!noteExists)
                throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Note not found"
                );

            // Validate tag
            bool tagExists = await tagRepo.Entities
                .AnyAsync(x => x.Id == tagId && x.UserId == userId);

            if (!tagExists)
                throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Tag not found"
                );

            // Prevent duplicate
            bool exists = await noteTagRepo.Entities
                .AnyAsync(x => x.NoteId == noteId && x.TagId == tagId);

            if (exists) return;

            await noteTagRepo.InsertAsync(new NoteTag
            {
                NoteId = noteId,
                TagId = tagId
            });

            await _unitOfWork.SaveAsync();
        }

        // REMOVE TAG FROM NOTE
        public async Task RemoveTagFromNoteAsync(Guid noteId, Guid tagId)
        {
            var repo = _unitOfWork.GetRepository<NoteTag>();

            NoteTag entity = await repo.Entities
                .FirstOrDefaultAsync(x => x.NoteId == noteId && x.TagId == tagId)
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Tag is not assigned to this note"
                );

            await repo.DeleteAsync(entity);
            await _unitOfWork.SaveAsync();
        }

        // REMOVE TAG FROM ALL NOTES
        public async Task RemoveTagFromAllNotesAsync(Guid tagId)
        {
            var repo = _unitOfWork.GetRepository<NoteTag>();

            Guid userId = GetCurrentUserId();

            var items = await repo.Entities
                .Where(x => x.TagId == tagId)
                .ToListAsync();

            if (!items.Any())
                return;

            foreach (var item in items)
                await repo.DeleteAsync(item);

            //await _unitOfWork.SaveAsync();
        }


        // Remove all tags from note
        public async Task RemoveAllTagsFromNoteAsync(Guid noteId)
        {
            var repo = _unitOfWork.GetRepository<NoteTag>();

            var items = await repo.Entities
                .Where(x => x.NoteId == noteId)
                .ToListAsync();

            if (!items.Any())
                return;

            foreach (var item in items)
                await repo.DeleteAsync(item);

            //await _unitOfWork.SaveAsync();
        }




        // HELPERS
        private Guid GetCurrentUserId()
        {
            return Guid.Parse(
                _httpContextAccessor.HttpContext?
                    .User
                    .FindFirstValue(ClaimTypes.NameIdentifier)
                ?? throw new ErrorException(
                    StatusCodes.Status401Unauthorized,
                    "UNAUTHORIZED",
                    "User not authenticated"
                )
            );
        }
    }
}
