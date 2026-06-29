// ===================== Tag Filter =====================
async function handleTagClick(btn) {
    const tagId = btn.dataset.tagId || "";

    document.querySelectorAll("#tagBar > .tag-btn")
        .forEach(b => b.classList.remove("active"));

    btn.classList.add("active");

    const url = `/Note/Index?handler=NotesPartial&tagId=${tagId}`;
    const res = await fetch(url, { headers: { "X-Requested-With": "XMLHttpRequest" } });
    const html = await res.text();

    const wrapper = document.getElementById("noteListWrapper");
    wrapper.innerHTML = html;

    requestAnimationFrame(() => {
        initNotePins();
    });

    const newUrl = tagId ? `?tagId=${tagId}` : location.pathname;
    history.pushState({}, "", newUrl);
}

function bindTagFilter() {
    document.addEventListener("click", (e) => {
        const btn = e.target.closest("#tagBar > .tag-btn");
        if (!btn) return;

        e.preventDefault();
        handleTagClick(btn);
    });
}


async function handleReminderClick(btn) {
    document.querySelectorAll("#tagBar > .tag-btn")
        .forEach(b => b.classList.remove("active"));

    btn.classList.add("active");

    const url = `/Note/Index?handler=ReminderPartial`;
    const res = await fetch(url, {
        headers: { "X-Requested-With": "XMLHttpRequest" }
    });

    const html = await res.text();

    const wrapper = document.getElementById("noteListWrapper");
    wrapper.innerHTML = html;

    requestAnimationFrame(() => {
        initNotePins();
    });

    history.pushState({}, "", "?filter=reminder");
}


function bindReminderFilter() {
    document.addEventListener("click", (e) => {
        const btn = e.target.closest(".reminder-btn");
        if (!btn) return;

        e.preventDefault();
        handleReminderClick(btn);
    });
}











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

async function saveTag(row) {
    const nameInput = row.querySelector(".tag-name-input");
    const colorInput = row.querySelector(".tag-color-input");
    const editBtn = row.querySelector(".btn-edit-tag");
    const saveBtn = row.querySelector(".btn-save-tag");
    const tagId = row.dataset.tagId;
    const newName = nameInput.value.trim();
    const newColor = colorInput?.value || null;
    if (!newName) {
        alert("Tag name cannot be empty.");
        return;
    }
    try {
        const res = await fetch("/Note/Index?handler=UpdateTag", {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "RequestVerificationToken": getAntiForgeryToken()
            },
            body: JSON.stringify({ id: tagId, name: newName, color: newColor })
        });
        if (!res.ok) throw new Error();
        nameInput.disabled = true;
        colorInput.disabled = true;
        saveBtn.classList.add("d-none");
        editBtn.classList.remove("d-none");
        updatetagBarButton(tagId, newName, newColor);
        updateLabelModalButtons(tagId, newName, newColor);
        nameInput.dataset.originalValue = newName;
        colorInput.dataset.originalColor = newColor;
    } catch {
        nameInput.value = nameInput.dataset.originalValue;
        colorInput.value = colorInput.dataset.originalColor;
        alert("Cannot update tag.");
    }
}

function updatetagBarButton(tagId, newName, newColor) {
    const tagBtn = document.querySelector(`#tagBar .tag-btn[data-tag-id="${tagId}"]`);
    if (!tagBtn) return;

    tagBtn.querySelector(".tag-name").textContent = newName;

    if (newColor) {
        tagBtn.querySelector(".tag-dot").style.backgroundColor = newColor;
    }
}

function updateLabelModalButtons(tagId, newName, newColor) {
    const labelBtns = document.querySelectorAll(`#labelModal .label-tag-btn[data-tag-id="${tagId}"]`);
    labelBtns.forEach(btn => {
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

// ===================== Tag Create =====================
async function createTag(row) {

    console.log("🔥 createTag called", Date.now());

    const nameInput = row.querySelector(".create-tag-name");
    const colorInput = row.querySelector(".create-tag-color");
    const name = nameInput.value.trim();
    const color = colorInput.value || null;
    if (!name) {
        alert("Tag name cannot be empty.");
        return;
    }
    try {
        const res = await fetch("/Note/Index?handler=createTag", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "RequestVerificationToken": getAntiForgeryToken()
            },
            body: JSON.stringify({ name: name, color: color })
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        const tagId = data.id;
        addTagRowToModal(tagId, name, color, row);
        addTagButtonToBar(tagId, name, color);
        addTagButtonToLabelModal(tagId, name, color);
        nameInput.value = "";
        colorInput.value = "#6c757d";
    } catch {
        alert("Cannot create tag.");
    }
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

function addTagButtonToLabelModal(tagId, name, color) {
    const labelContainer = document.querySelector("#labelModal .label-container");
    if (!labelContainer) return;

    const labelBtn = document.createElement("button");

    labelBtn.type = "button";
    labelBtn.className = "label-tag-btn";
    labelBtn.dataset.tagId = tagId;
    labelBtn.dataset.tagName = name;
    labelBtn.textContent = name;

    if (color) {
        labelBtn.style.background = color;
    }

    // Thêm lên đầu danh sách
    labelContainer.prepend(labelBtn);
}



// ===================== Tag Delete =====================
async function deleteTag(row) {

    const tagId = row.dataset.tagId;
    if (!tagId) return;

    try {

        await fetch(`/Note/Index?handler=deleteTag&id=${tagId}`, {
            method: "POST",
            headers: {
                "RequestVerificationToken": getAntiForgeryToken()
            }
        });

        removeTagFromAllNoteDots(tagId);

        row.remove();

        document
            .querySelectorAll(`[data-tag-id="${tagId}"]`)
            .forEach(btn => btn.remove());

    } catch (err) {
        console.error(err);
    }
}

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

function closetagModal() {
    document.getElementById("tagModal").classList.remove("show");
    resetTagModal();
}