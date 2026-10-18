namespace NTC.ModelViews.NoteModelView
{
    public class ReorderNoteModelView
    {
        public Guid DraggedId { get; set; }
        public Guid? Version { get; set; }

        public Guid? PreviousId { get; set; }

        public Guid? NextId { get; set; }
    }
}



