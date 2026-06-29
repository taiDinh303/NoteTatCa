using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using NTC.Contract.Repositories.Entities;
using NTC.Contract.Repositories.IUOW;
using NTC.Contract.Services.Interface;
using NTC.Core.Base;
using NTC.Core.Utils;
using NTC.ModelViews.TagModelView;
using NTC.Services.Mappings;
using static NTC.Core.Base.BaseException;

namespace NTC.Services.Service
{
    public class TagService : ITagService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public TagService(
            IUnitOfWork unitOfWork,
            IHttpContextAccessor httpContextAccessor)
        {
            _unitOfWork = unitOfWork;
            _httpContextAccessor = httpContextAccessor;
        }

        // GET ALL
        public async Task<BasePaginatedList<TagResponseModelView>> GetAllAsync(int pageNumber, int pageSize)
        {
            var repo = _unitOfWork.GetRepository<Tag>();

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

            IQueryable<Tag> query = repo.Entities
                .Where(x =>
                    x.UserId == userId &&
                    !x.DeletedTime.HasValue)
                .OrderByDescending(x => x.CreatedTime);

            int totalItems = await query.CountAsync();

            List<TagResponseModelView> result = await query
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .Select(x => x.ToViewModel())
                .ToListAsync();

            return new BasePaginatedList<TagResponseModelView>(
                result.AsReadOnly(),
                totalItems,
                pageNumber,
                pageSize
            );
        }

        // GET BY ID
        public async Task<TagResponseModelView> GetByIdAsync(Guid id)
        {
            var repo = _unitOfWork.GetRepository<Tag>();

            Tag tag = await repo.Entities
                .FirstOrDefaultAsync(x => x.Id == id && !x.DeletedTime.HasValue)
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Tag not found"
                );

            return tag.ToViewModel();
        }

        // create
        public async Task<Tag> CreateAsync(CreateTagModelView model)
        {
            var repo = _unitOfWork.GetRepository<Tag>();

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

            Tag tag = model.ToEntity();
            tag.UserId = userId;
            tag.CreatedBy = currentUser;
            tag.CreatedTime = CoreHelper.SystemTimeNow;

            await repo.InsertAsync(tag);
            await _unitOfWork.SaveAsync();

            // 🔥 TRẢ TAG VỪA TẠO (CÓ ID)
            return tag;
        }


        // update
        public async Task UpdateAsync(UpdateTagModelView model)
        {
            var repo = _unitOfWork.GetRepository<Tag>();

            Tag tag = await repo.Entities
                .FirstOrDefaultAsync(x => x.Id == model.Id && !x.DeletedTime.HasValue)
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Tag not found"
                );

            string currentUser =
                _httpContextAccessor.HttpContext?.User?.Identity?.Name ?? "System";

            tag.LastUpdatedBy = currentUser;
            tag.LastUpdatedTime = CoreHelper.SystemTimeNow;

            model.ToEntity(tag);

            await repo.UpdateAsync(tag);
            await _unitOfWork.SaveAsync();
        }

        // soft delete tag
        public async Task SoftDeleteAsync(Guid id)
        {
            var repo = _unitOfWork.GetRepository<Tag>();

            Tag tag = await repo.Entities
                .FirstOrDefaultAsync(x => x.Id == id && !x.DeletedTime.HasValue)
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Tag not found"
                );

            string currentUser =
                _httpContextAccessor.HttpContext?.User?.Identity?.Name ?? "System";

            tag.DeletedBy = currentUser;
            tag.DeletedTime = CoreHelper.SystemTimeNow;

            await repo.UpdateAsync(tag);
            await _unitOfWork.SaveAsync();
        }

        // hard delete tag
        public async Task DeleteAsync(Guid tagId)
        {
            var tagRepo = _unitOfWork.GetRepository<Tag>();
            var noteTagRepo = _unitOfWork.GetRepository<NoteTag>();


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

            // Check tag tồn tại & thuộc user
            Tag tag = await tagRepo.Entities
                .FirstOrDefaultAsync(x => x.Id == tagId && x.UserId == userId)
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Tag not found"
                );

            // Remove ALL relations
            var relations = await noteTagRepo.Entities
                .Where(x => x.TagId == tagId)
                .ToListAsync();

            foreach (var r in relations)
                await noteTagRepo.DeleteAsync(r);

            // Delete tag
            await tagRepo.DeleteAsync(tag);

            // Save once (transaction-like)
            await _unitOfWork.SaveAsync();
        }





    }
}
