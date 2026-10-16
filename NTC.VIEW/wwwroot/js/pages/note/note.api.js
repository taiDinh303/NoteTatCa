function getAntiForgeryToken() {
    const token = document.querySelector('input[name="__RequestVerificationToken"]');
    return token ? token.value : "";
}

async function deleteNote(e, noteId) {
    e.preventDefault();
    e.stopPropagation();
    const card = e.target.closest(".note-item");
    if (!card) return;
    try {
        const res = await fetch(`/Note/Index?handler=Delete&id=${noteId}`, {
            method: "POST",
            headers: { "RequestVerificationToken": getAntiForgeryToken() }
        });
        if (!res.ok) throw new Error();
        card.classList.add("opacity-50");

        setTimeout(() => {
            card.remove();
            window.NoteBoard?.refresh();
        }, 100);
    }
    catch (err) {
        console.error(err);
        alert("Cannot delete note.");
    }
}

async function moveNoteToTrash(e, noteId) {
    e.preventDefault();
    e.stopPropagation();

    const card = document.querySelector(`.note-item[data-note-id="${noteId}"]`);

    try {
        const res = await fetch(`/Note/Index?handler=MoveToTrash&id=${noteId}`, {
            method: "POST",
            headers: { "RequestVerificationToken": getAntiForgeryToken() }
        });

        if (!res.ok) throw new Error();

        if (card) {
            card.classList.add("opacity-50");
            setTimeout(() => {
                card.remove();
                window.NoteBoard?.refresh();
            }, 100);
        }

        closeEditNoteModal();
    }
    catch (err) {
        console.error(err);
        alert("Cannot move note to trash.");
    }
}

async function restoreNote(e, noteId) {
    e.preventDefault();
    e.stopPropagation();

    const card = e.target.closest(".note-item");
    if (!card) return;

    try {
        const res = await fetch(`/Note/Trash?handler=Restore&id=${noteId}`, {
            method: "POST",
            headers: { "RequestVerificationToken": getAntiForgeryToken() }
        });

        if (!res.ok) throw new Error();

        card.classList.add("opacity-50");

        setTimeout(() => {
            card.remove();
            window.NoteBoard?.refresh();
        }, 100);
    }
    catch (err) {
        console.error(err);
        alert("Cannot restore note.");
    }
}

async function createNote() {

    const model = getCreateNoteModel();

    try {

        const res = await fetch("/Note/Index?handler=CreateNote", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "RequestVerificationToken": getAntiForgeryToken()
            },
            body: JSON.stringify(model)
        });

        if (!res.ok)
            throw new Error();

        const note = await res.json();

        addNoteToBoard(note);
        closeCreateNoteModal();
        window.NoteBoard?.refresh();

    }
    catch (err) {
        console.error(err);
        alert("Cannot create note.");
    }
}

async function updateNote() {
    const modal = document.getElementById("editNoteModal");
    const model = getEditNoteModel();

    const res = await fetch("/Note/Index?handler=UpdateNote", {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            "RequestVerificationToken": getAntiForgeryToken()
        },
        body: JSON.stringify(model)
    });

    if (!res.ok) {
        console.error(await res.text());
        alert("Cannot update note.");
        return;
    }

    updateNoteCache(model);
    updateNoteUI(model);
    modal.classList.remove("show");
}

async function reorderNote(data) {
    try {
        const res = await fetch("/Note/Index?handler=ReorderNote", {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "RequestVerificationToken": getAntiForgeryToken(),
            },
            body: JSON.stringify(data),
        });

        if (!res.ok) {
            throw new Error("Reorder failed");
        }

        console.log("Reorder success");
    } catch (error) {
        console.error(error);
    }
}