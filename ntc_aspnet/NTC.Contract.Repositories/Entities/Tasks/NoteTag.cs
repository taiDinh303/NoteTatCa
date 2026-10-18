namespace NTC.Contract.Repositories.Entities
{
    public class NoteTag
    {
        public Guid NoteId { get; set; }
        public Guid TagId { get; set; }
        // Both composite foreign keys include the owner, preventing cross-account links.
        public Guid UserId { get; set; }

        public Note Note { get; set; } = null!;
        public Tag Tag { get; set; } = null!;
    }
}
