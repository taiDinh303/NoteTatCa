using NTC.Contract.Repositories.Entities;
using NTC.ModelViews.TagModelView;

namespace NTC.Services.Mappings
{
    public static class TagMappings
    {
        // 🔹 Mapping Tag -> TagResponseModelView
        public static TagResponseModelView ToViewModel(this Tag tag)
        {
            if (tag == null)
                throw new ArgumentNullException(nameof(tag));

            var model = new TagResponseModelView
            {
                Id = tag.Id,
                Version = tag.Version,

                Name = tag.Name,
                Color = tag.Color,
                Icon = tag.Icon,

                
                // Audit
                CreatedBy = tag.CreatedBy,
                CreatedTime = tag.CreatedTime,
                LastUpdatedBy = tag.LastUpdatedBy,
                LastUpdatedTime = tag.LastUpdatedTime
            };

            return model;
        }

        // 🔹 Mapping List<Tag> -> List<TagResponseModelView>
        public static List<TagResponseModelView> ToViewModelList(
            this IEnumerable<Tag> tags)
        {
            if (tags == null)
                return new List<TagResponseModelView>();

            return tags
                .Where(x => x != null)
                .Select(x => x.ToViewModel())
                .ToList();
        }

        // 🔹 Mapping TagResponseModelView -> Tag
        public static Tag ToEntity(this TagResponseModelView model)
        {
            if (model == null)
                throw new ArgumentNullException(nameof(model));

            var entity = new Tag
            {
                Id = model.Id,

                Name = model.Name?.Trim() ?? string.Empty,
                Color = model.Color,
                Icon = model.Icon,

                // Audit
                CreatedBy = model.CreatedBy,
                CreatedTime = model.CreatedTime,
                LastUpdatedBy = model.LastUpdatedBy,
                LastUpdatedTime = model.LastUpdatedTime
            };

            return entity;
        }

        // 🔹 Mapping CreateTagModelView -> Tag
        public static Tag ToEntity(this CreateTagModelView model)
        {
            if (model == null)
                throw new ArgumentNullException(nameof(model));

            return new Tag
            {
                Name = model.Name?.Trim() ?? string.Empty,
                Color = model.Color,
                Icon = model.Icon
            };
        }

        // 🔹 Mapping UpdateTagModelView -> Tag (update fields only)
        public static void ToEntity(
            this UpdateTagModelView model,
            Tag tag)
        {
            if (model == null)
                throw new ArgumentNullException(nameof(model));

            if (tag == null)
                throw new ArgumentNullException(nameof(tag));

            tag.Name = model.Name?.Trim() ?? tag.Name;
            tag.Color = model.Color;
            tag.Icon = model.Icon;
        }
    }
}
