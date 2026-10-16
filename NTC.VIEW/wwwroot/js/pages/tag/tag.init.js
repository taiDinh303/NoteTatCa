
function bindTagDelete() {
    document.addEventListener("click", (e) => {
        const deleteBtn = e.target.closest(".btn-delete-tag");
        if (!deleteBtn) return;
        const row = deleteBtn.closest("tr");
        if (!row) return;
        deleteTag(row);
    });
}

function removeTagFromAllNoteDots(tagId) {
    document.querySelectorAll(".note-item").forEach(noteCard => {
        const triggerBtn = noteCard.querySelector("[data-note-id]");
        if (!triggerBtn) return;
        const noteId = triggerBtn.dataset.noteId;
        const catIds = (triggerBtn.dataset.noteTags || "")
            .split(",")
            .map(x => x.trim())
            .filter(x => x && x !== tagId);
        triggerBtn.dataset.noteTags = catIds.join(",");
        updateNoteTagDots(noteId, catIds);
    });
}