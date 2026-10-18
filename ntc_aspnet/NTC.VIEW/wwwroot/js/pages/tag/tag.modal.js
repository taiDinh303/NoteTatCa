// ===================== Tag Edit =====================
function enterEditTag(row) {
    const nameInput = row.querySelector(".tag-name-input");
    const colorInput = row.querySelector(".tag-color-input");
    const editBtn = row.querySelector(".btn-edit-tag");
    const saveBtn = row.querySelector(".btn-save-tag");
    nameInput.disabled = false;
    colorInput.disabled = false;
    nameInput.focus();
    nameInput.dataset.originalValue = nameInput.value;
    colorInput.dataset.originalColor = colorInput.value;
    editBtn.classList.add("d-none");
    saveBtn.classList.remove("d-none");
}

function updateTagBarButton(tagId, newName, newColor) {
    const tagBtn = document.querySelector(`#tagBar .tag-btn[data-tag-id="${tagId}"]`);
    if (!tagBtn) return;

    tagBtn.querySelector(".tag-name").textContent = newName;

    if (newColor) {
        tagBtn.querySelector(".tag-dot").style.backgroundColor = newColor;
    }
}

function updateNoteTagsModalButtons(tagId, newName, newColor) {
    const NoteTagBtns = document.querySelectorAll(`#NoteTagsModal .note-tag-btn[data-tag-id="${tagId}"]`);
    NoteTagBtns.forEach(btn => {
        btn.textContent = newName;
        btn.dataset.tagName = newName;
        if (newColor) btn.style.background = newColor;
    });
}

function bindTagEdit() {
    document.addEventListener("click", (e) => {
        const editBtn = e.target.closest(".btn-edit-tag");
        if (editBtn) {
            enterEditTag(editBtn.closest("tr"));
            return;
        }
        const saveBtn = e.target.closest(".btn-save-tag");
        if (saveBtn) {
            saveTag(saveBtn.closest("tr"));
        }
        const createBtn = e.target.closest(".btn-create-tag");
        if (createBtn) {
            createTag(createBtn.closest("tr"));
        }
    });
}




function addTagRowToModal(tagId, name, color, afterRow) {
    const template = document.getElementById("tag-row-template");
    const newRow = template.content.cloneNode(true).querySelector("tr");
    newRow.dataset.tagId = tagId;
    newRow.querySelector(".tag-color-input").value = color ?? "#adb5bd";
    newRow.querySelector(".tag-name-input").value = name;
    afterRow.insertAdjacentElement("afterend", newRow);
}




function addTagButtonToBar(tagId, name, color) {
    const tagBar = document.querySelector("#tagBar");
    if (!tagBar) return;

    const btn = document.createElement("button");
    btn.className = "tag-btn";
    btn.dataset.tagId = tagId;

    const nameSpan = document.createElement("span");
    nameSpan.className = "tag-name";
    nameSpan.textContent = name;

    const dotSpan = document.createElement("span");
    dotSpan.className = "tag-dot";
    dotSpan.style.backgroundColor = color || "#adb5bd";

    btn.append(nameSpan, dotSpan);

    const editTagsLink = tagBar.querySelector("a");

    if (editTagsLink) {
        editTagsLink.insertAdjacentElement("afterend", btn);
    } else {
        tagBar.prepend(btn);
    }
}

function addTagButtonToNoteTagsModal(tagId, name, color) {
    const labelContainer = document.querySelector("#NoteTagsModal .tag-container");
    if (!labelContainer) return;

    const NoteTagBtn = document.createElement("button");

    NoteTagBtn.type = "button";
    NoteTagBtn.className = "note-tag-btn";
    NoteTagBtn.dataset.tagId = tagId;
    NoteTagBtn.dataset.tagName = name;
    NoteTagBtn.textContent = name;

    if (color) {
        NoteTagBtn.style.background = color;
    }

    // Thêm lên đầu danh sách
    labelContainer.prepend(NoteTagBtn);
}







// ===================== Tag Modal Reset =====================
function resetTagModal() {
    document.querySelectorAll("#tagModal tr[data-tag-id]").forEach(row => {
        const nameInput = row.querySelector(".tag-name-input");
        const colorInput = row.querySelector(".tag-color-input");
        const editBtn = row.querySelector(".btn-edit-tag");
        const saveBtn = row.querySelector(".btn-save-tag");
        if (nameInput?.dataset.originalValue !== undefined) {
            nameInput.value = nameInput.dataset.originalValue;
        }
        if (colorInput?.dataset.originalColor !== undefined) {
            colorInput.value = colorInput.dataset.originalColor;
        }
        nameInput.disabled = true;
        colorInput.disabled = true;
        saveBtn?.classList.add("d-none");
        editBtn?.classList.remove("d-none");
    });
}

function openTagModal() {
    document.getElementById("tagModal").classList.add("show");
}

function closeTagModal() {
    document.getElementById("tagModal").classList.remove("show");
    resetTagModal();
}





//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// NoteTag Modal
let currentNoteId = null;
let originaltagIds = [];
let selectedtagIds = [];

// open
function openNoteTagsModal(btn) {
    currentNoteId = btn.dataset.noteId;
    originaltagIds = (btn.dataset.noteTags || "")
        .split(",")
        .map(x => x.trim())
        .filter(Boolean);

    selectedtagIds = [...originaltagIds];

    document.querySelectorAll(".note-tag-btn").forEach(catBtn => {
        const catId = catBtn.dataset.tagId;
        const attached = originaltagIds.includes(catId);
        setTagOpacity(catBtn, attached);
    });

    document.getElementById("NoteTagsModal").classList.add("show");
}
// close
function closeNoteTagsModal() {
    document.getElementById("NoteTagsModal").classList.remove("show");
}

// toggle label selection
function setTagOpacity(btn, attached) {
    btn.classList.toggle("opacity-100", attached);
    btn.classList.toggle("opacity-30", !attached);
}



function bindTagClick() {
    document.addEventListener("click", (e) => {
        const btn = e.target.closest(".note-tag-btn");
        if (!btn) return;
        const tagId = btn.dataset.tagId;
        const index = selectedtagIds.indexOf(tagId);
        if (index >= 0) {
            selectedtagIds.splice(index, 1);
            setTagOpacity(btn, false);
        } else {
            selectedtagIds.push(tagId);
            setTagOpacity(btn, true);
        }
    });
}



function bindNoteTagsSave() {
    document.addEventListener("click", (e) => {
        if (e.target.id === "saveNoteTagsChangesBtn") {
            saveNoteTagsChanges();
        }
    });
}

function updateNoteTagDots(noteId, tagIds) {
    const noteItem = document.querySelector(`.note-item[data-note-id="${noteId}"]`);
    if (!noteItem) return;

    let container = noteItem.querySelector(".note-tags");

    if (!container) {
        container = document.createElement("div");
        container.className = "note-tags note-tags-bottom";
        noteItem.querySelector(".note-card-body").appendChild(container);
    }

    container.innerHTML = "";

    if (!tagIds.length) {
        container.classList.add("d-none");
        return;
    }

    container.classList.remove("d-none");

    const visibleTagIds = tagIds.slice(0, 3);

    visibleTagIds.forEach(tagId => {
        const tagBtn = document.querySelector(`.note-tag-btn[data-tag-id="${tagId}"]`);
        if (!tagBtn) return;

        container.insertAdjacentHTML("beforeend", `
            <div class="tag-item">
                <span class="tag-dot" style="background:${tagBtn.style.background}"></span>
                <span class="tag-name">${tagBtn.dataset.tagName}</span>
            </div>
        `);
    });

    const remaining = tagIds.length - visibleTagIds.length;

    if (remaining > 0) {
        container.insertAdjacentHTML("beforeend", `
            <div class="tag-item tag-more">+${remaining}</div>
        `);
    }
}
