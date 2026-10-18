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
        initNotePage();
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
        updateTagBarButton(tagId, newName, newColor);
        updateNoteTagsModalButtons(tagId, newName, newColor);
        nameInput.dataset.originalValue = newName;
        colorInput.dataset.originalColor = newColor;
    } catch {
        nameInput.value = nameInput.dataset.originalValue;
        colorInput.value = colorInput.dataset.originalColor;
        alert("Cannot update tag.");
    }
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
        addTagButtonToNoteTagsModal(tagId, name, color);
        nameInput.value = "";
        colorInput.value = "#6c757d";
    } catch {
        alert("Cannot create tag.");
    }
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

        document.querySelectorAll(`[data-tag-id="${tagId}"]`).forEach(btn => btn.remove());

    } catch (err) {
        console.error(err);
    }
}





// add/remove notetag
async function saveNoteTagsChanges() {
    const toAdd = selectedtagIds.filter(x => !originaltagIds.includes(x));
    const toRemove = originaltagIds.filter(x => !selectedtagIds.includes(x));
    const token = getAntiForgeryToken();

    try {
        for (const tagId of toAdd) {
            const res = await fetch("?handler=AddTagToNote", {
                method: "POST",
                headers: { "RequestVerificationToken": token },
                body: new URLSearchParams({ noteId: currentNoteId, tagId })
            });

            if (!res.ok) throw new Error();
        }

        for (const tagId of toRemove) {
            const res = await fetch("?handler=RemoveTagFromNote", {
                method: "POST",
                headers: { "RequestVerificationToken": token },
                body: new URLSearchParams({ noteId: currentNoteId, tagId })
            });

            if (!res.ok) throw new Error();
        }

        document.querySelectorAll(`[data-note-id="${currentNoteId}"][data-note-tags]`)
            .forEach(btn => btn.dataset.noteTags = selectedtagIds.join(","));

        updateNoteTagDots(currentNoteId, selectedtagIds);

        const note = noteCache[currentNoteId];

        if (note) {
            note.tags = selectedtagIds.map(tagId => {
                const tagBtn = document.querySelector(`.note-tag-btn[data-tag-id="${tagId}"]`);

                return {
                    id: tagId,
                    name: tagBtn?.dataset.tagName || "",
                    color: tagBtn?.style.background || "#adb5bd"
                };
            });
        }

        renderEditNoteTags(note?.tags || []);
        window.NoteBoard?.refresh();

        document.getElementById("saveNoteTagsChangesBtn").blur();
        closeNoteTagsModal();

    } catch {
        alert("Cannot update notetag.");
    }
}