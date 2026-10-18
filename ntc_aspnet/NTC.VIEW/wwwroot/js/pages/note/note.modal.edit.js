function openEditNoteModal(noteItem) {
    const modal = document.getElementById("editNoteModal");
    const id = noteItem.dataset.noteId;
    const note = noteCache[id];

    if (!note) {
        console.error("Note not found in cache:", id);
        return;
    }

    const title = document.getElementById("editNoteTitle");
    const content = document.getElementById("editNoteContent");
    const box = document.getElementById("editNoteBox");

    updateEditPinButton(note.isPinned);
    renderEditNoteTags(note.tags);

    document.getElementById("editNoteId").value = note.id;
    title.value = note.title || "";
    content.value = note.content || "";

    const color = note.backgroundColor || "#ffffff";

    box.style.backgroundColor = color;
    box.dataset.color = color;
    document.getElementById("editNoteColor").value = color;

    modal.dataset.originalTitle = note.title || "";
    modal.dataset.originalContent = note.content || "";
    modal.dataset.originalColor = color;
    modal.dataset.originalPinned = note.isPinned.toString();

    const tagButton = modal.querySelector('[data-action="label-note"]');
    const trashButton = modal.querySelector('[data-action="move-to-trash"]');

    tagButton.dataset.noteId = note.id;
    tagButton.dataset.noteTags = (note.tags ?? []).map(tag => tag.id).join(",");
    trashButton.dataset.noteId = note.id;

    modal.classList.add("show");

    requestAnimationFrame(() => autoResizeTextarea(content));
}

function autoResizeTextarea(textarea) {
    if (!textarea) return;

    textarea.style.height = "0px";
    textarea.style.height = `${textarea.scrollHeight}px`;
}

document.addEventListener("input", e => {
    if (e.target.id === "editNoteContent") {
        autoResizeTextarea(e.target);
    }
});

function closeEditNoteModal() {
    const modal = document.getElementById("editNoteModal");

    if (noteHasChanges()) {
        updateNote();
        return;
    }

    modal.classList.remove("show");
}

function noteHasChanges() {
    const modal = document.getElementById("editNoteModal");
    const box = document.getElementById("editNoteBox");

    return (
        document.getElementById("editNoteTitle").value !== modal.dataset.originalTitle ||
        document.getElementById("editNoteContent").value !== modal.dataset.originalContent ||
        box.dataset.color !== modal.dataset.originalColor ||
        document.getElementById("editPinBtn").dataset.pinned !== modal.dataset.originalPinned
    );
}

function toggleEditPin(btn) {
    const pinned = btn.dataset.pinned !== "true";

    btn.dataset.pinned = pinned.toString();

    const icon = btn.querySelector("i");

    icon.classList.toggle("bi-pin-fill", pinned);
    icon.classList.toggle("bi-pin", !pinned);
}

function updateEditPinButton(pinned) {
    const btn = document.getElementById("editPinBtn");
    if (!btn) return;

    btn.dataset.pinned = pinned.toString();

    const icon = btn.querySelector("i");

    icon.classList.toggle("bi-pin-fill", pinned);
    icon.classList.toggle("bi-pin", !pinned);
}

function changeNoteColor(color) {
    const box = document.getElementById("editNoteBox");

    box.style.backgroundColor = color;
    box.dataset.color = color;
    document.getElementById("editNoteColor").value = color;
}

function getEditNoteModel() {
    return {
        id: document.getElementById("editNoteId").value,
        title: document.getElementById("editNoteTitle").value,
        content: document.getElementById("editNoteContent").value,
        backgroundColor: document.getElementById("editNoteBox").dataset.color,
        isPinned: document.getElementById("editPinBtn").dataset.pinned === "true"
    };
}

function updateNoteCache(note) {
    if (noteCache[note.id]) {
        Object.assign(noteCache[note.id], note);
    }
}

function updateNoteUI(note) {
    const noteItem = document.querySelector(`.note-item[data-note-id="${note.id}"]`);

    if (!noteItem) return;

    noteItem.querySelector(".note-title-row strong").textContent = note.title;
    noteItem.querySelector(".note-content").textContent = note.content;
    noteItem.querySelector(".note-card").style.backgroundColor = note.backgroundColor;

    updateNotePinUI(noteItem, note.isPinned);
    moveNoteToSection(noteItem, note.isPinned);
    updateNoteSections();

    NoteBoard.refresh();
}

function updateNotePinUI(noteItem, pinned) {
    noteItem.dataset.pinned = pinned.toString();

    const btn = noteItem.querySelector(".note-pin-btn");
    const icon = btn?.querySelector("i");

    if (!btn || !icon) return;

    btn.dataset.pinned = pinned.toString();
    icon.classList.toggle("bi-pin-fill", pinned);
    icon.classList.toggle("bi-pin", !pinned);
}

function moveNoteToSection(noteItem, pinned) {
    const targetList = document.getElementById(
        pinned ? "pinnedNoteList" : "normalNoteList"
    );

    targetList.prepend(noteItem);
}

function updateNoteSections() {
    const pinnedList = document.getElementById("pinnedNoteList");
    const normalList = document.getElementById("normalNoteList");

    document.querySelector(".pinned-section").style.display =
        pinnedList.children.length ? "" : "none";

    document.querySelector(".normal-section").style.display =
        normalList.children.length ? "" : "none";

    document.querySelector(".note-empty-message").classList.toggle(
        "d-none",
        document.querySelectorAll(".note-item").length > 0
    );
}








function toggleEditNoteFullscreen() {
    const box = document.getElementById("editNoteBox");
    const icon = document.querySelector("#editNoteModal .edit-note-header-actions button:last-child i");
    const fullscreen = box.classList.toggle("fullscreen");

    icon.classList.toggle("bi-arrows-fullscreen", !fullscreen);
    icon.classList.toggle("bi-fullscreen-exit", fullscreen);

    requestAnimationFrame(() => autoResizeTextarea(document.getElementById("editNoteContent")));
}

function renderEditNoteTags(tags) {
    const container = document.getElementById("editNoteTags");

    container.innerHTML = (tags ?? []).map(tag => `
        <div class="tag-item">
            <span class="tag-dot" style="background:${tag.color || "#adb5bd"}"></span>
            <span class="tag-name">${tag.name}</span>
        </div>
    `).join("");
}

document.addEventListener("DOMContentLoaded", () => {
    const content = document.getElementById("editNoteContent");

    if (content) autoResizeTextarea(content);

    const colorPicker = document.getElementById("editNoteColor");

    if (colorPicker) {
        colorPicker.addEventListener("input", function () {
            document.getElementById("editNoteBox").style.backgroundColor = this.value;
        });
    }
});

