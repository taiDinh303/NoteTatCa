// ===================== Note Create Modal =====================
function openCreateNoteModal() {
    document.getElementById("createNoteModal").classList.add("show");

    document.getElementById("createNoteForm").reset();
}

function closeCreateNoteModal() {
    document.getElementById("createNoteModal").classList.remove("show");
}

function bindCreateNoteSubmit() {

    document.addEventListener("submit", async (e) => {

        const form = e.target.closest("#createNoteForm");
        if (!form) return;

        e.preventDefault();

        await createNote();
    });
}

function getCreateNoteModel() {

    const form = document.getElementById("createNoteForm");

    return {
        title: form.querySelector('[name="Title"]').value.trim(),
        content: form.querySelector('[name="Content"]').value,
        sortOrder: 0
    };
}


function createNoteElement(note) {

    const template = document.getElementById("note-template");
    const item = template.content.firstElementChild.cloneNode(true);

    item.dataset.noteId = note.id;
    item.dataset.pinned = note.isPinned;

    // Giống Razor: gán vào button Label
    const NoteTagBtn = item.querySelector('[data-action="label-note"]');

    NoteTagBtn.dataset.noteId = note.id;
    NoteTagBtn.dataset.noteTags = (note.tags ?? [])
        .map(tag => tag.id)
        .join(",");

    renderNote(item, note);

    return item;
}

function renderNote(item, note) {

    const card = item.querySelector(".note-card");
    card.style.backgroundColor = note.backgroundColor ?? "#ffffff";

    item.querySelector(".note-title-row strong").textContent =
        note.title ?? "";

    item.querySelector(".note-content").textContent =
        note.content ?? "";

    renderPin(item, note);
    renderTags(item, note);
}

function renderPin(item, note) {
    const btn = item.querySelector(".note-pin-btn");

    btn.dataset.url = `/Note?id=${note.id}&handler=TogglePin`;
    btn.dataset.pinned = note.isPinned;

    updatePinButton(btn, note.isPinned);

    bindPinButton(btn);
}

function renderTags(item, note) {

    const container = item.querySelector(".note-tags");

    container.innerHTML = "";

    if (!note.tags?.length) {
        container.classList.add("d-none");
        return;
    }

    container.classList.remove("d-none");

    note.tags.forEach(tag => {

        container.insertAdjacentHTML(
            "beforeend",
            `
            <div class="tag-item">
                <span class="tag-dot"
                      style="background:${tag.color ?? "#adb5bd"}"></span>

                <span class="tag-name">
                    ${tag.name}
                </span>
            </div>
            `
        );
    });
}



function getNoteContainer(isPinned) {

    return document.getElementById(
        isPinned
            ? "pinnedNoteList"
            : "normalNoteList"
    );
}

function addNoteToBoard(note) {

    const item = createNoteElement(note);

    const grid = getNoteContainer(note.isPinned);

    grid.prepend(item);

    grid.closest(".note-section").style.display = "";

    document
        .querySelector(".note-empty-message")
        ?.classList.add("d-none");

    window.noteCache ??= {};
    window.noteCache[note.id] = note;

    window.NoteBoard?.refresh();
}

