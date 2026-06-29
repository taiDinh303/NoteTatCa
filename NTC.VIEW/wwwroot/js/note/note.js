// ===================== Anti-forgery =====================
function getAntiForgeryToken() {
    const token = document.querySelector('input[name="__RequestVerificationToken"]');
    return token ? token.value : "";
}

//Pin
function togglePinIcon(icon, pinned) {
    icon.classList.toggle("bi-pin-fill", pinned);
    icon.classList.toggle("bi-pin", !pinned);
}

function setPinnedState(btn, icon, card, pinned) {
    btn.dataset.pinned = pinned.toString();
    card.dataset.pinned = pinned.toString();
    btn.title = pinned ? "Unpin" : "Pin";
    togglePinIcon(icon, pinned);
}

function moveNoteCard(container, card, pinned) {
    if (!container) return;
    if (pinned) {
        container.prepend(card);
        return;
    }
    const pinnedCards = [...container.children].filter(c => c.dataset.pinned === "true");
    if (pinnedCards.length) {
        pinnedCards[pinnedCards.length - 1].after(card);
    } else {
        container.append(card);
    }
}



function bindPinButton(btn, container) {
    const icon = btn.querySelector("i");
    const card = btn.closest(".note-item");
    btn.dataset.pinned ??= card.dataset.pinned;

    btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const url = btn.dataset.url;
        const isPinned = btn.dataset.pinned === "true";
        const newPinned = !isPinned;
        setPinnedState(btn, icon, card, newPinned);
        moveNoteCard(container, card, newPinned);
     
        try {
            const res = await fetch(url, {
                method: "POST",
                headers: { "RequestVerificationToken": getAntiForgeryToken() }
            });
            if (!res.ok) throw new Error();
        } catch {
            setPinnedState(btn, icon, card, isPinned);
            moveNoteCard(container, card, isPinned);

            alert("Cannot toggle pin.");
        }
    });

    btn.addEventListener("mouseenter", () => {
        togglePinIcon(icon, btn.dataset.pinned !== "true");
    });
    btn.addEventListener("mouseleave", () => {
        togglePinIcon(icon, btn.dataset.pinned === "true");
    });
}

function initNotePins() {
    const container = document.getElementById("noteList");
    document.querySelectorAll(".note-pin-btn").forEach(btn => bindPinButton(btn, container));
}




// ===================== Note Delete =====================
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
        setTimeout(() => card.remove(), 200);
    } catch {
        alert("Không thể xóa note.");
    }
}

// dropdown
function toggleDropdown(btn) {
    const menu = btn.parentElement.querySelector(".dropdown-menu");
    menu.classList.toggle("show");
}

// 
document.addEventListener("click", () => {
    document.querySelectorAll(".dropdown-menu").forEach(m => m.classList.remove("show"));
});


// ===================== Init =====================

let notePageBound = false;
function initNotePage() {


    if (!document.getElementById("noteListWrapper")) return;
    if (!document.querySelector(".note-container")) return;


    if (!notePageBound) {

        bindTagFilter();
        bindReminderFilter();

        bindTagEdit();
        bindTagDelete();

        bindLabelTagClick();
        bindLabelSave();

        bindReminderActions();

        bindCreateNoteSubmit();

        notePageBound = true;
    }


    initNotePins();
}

window.initNotePage = initNotePage;




// ===================== Note Modal =====================
function openCreateNoteModal() {
    document.getElementById("createNoteModal").classList.add("show");

    document.getElementById("createNoteForm").reset();
}

function closeCreateNoteModal() {
    document.getElementById("createNoteModal").classList.remove("show");
}

// ===================== Note Create =====================
function getCreateNoteModel() {

    const form = document.getElementById("createNoteForm");

    return {
        title: form.querySelector('[name="Title"]').value.trim(),
        content: form.querySelector('[name="Content"]').value.trim(),
        isCompleted: form.querySelector('[name="IsCompleted"]').checked,
        sortOrder: -99
    };
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

        if (!res.ok) throw new Error();

        closeCreateNoteModal();

        location.reload();

    } catch {
        alert("Cannot create note.");
    }
}

function bindCreateNoteSubmit() {

    document.addEventListener("submit", async (e) => {

        const form = e.target.closest("#createNoteForm");
        if (!form) return;

        e.preventDefault();

        await createNote();
    });
}



function openEditNoteModal(card) {

    const modal = document.getElementById("editNoteModal");

    const id = card.dataset.noteId;
    const title = card.dataset.noteTitle;
    const content = card.dataset.noteContent;
    const isCompleted = card.dataset.noteCompleted === "true";

    document.getElementById("editNoteId").value = id;
    document.getElementById("editNoteTitle").value = title;
    document.getElementById("editNoteContent").value = content;
    document.getElementById("editNoteCompleted").checked = isCompleted;

    modal.dataset.originalTitle = title;
    modal.dataset.originalContent = content;
    modal.dataset.originalCompleted = isCompleted;

    modal.classList.add("show");
}



function noteHasChanges() {

    const modal = document.getElementById("editNoteModal");

    return (
        document.getElementById("editNoteTitle").value !== modal.dataset.originalTitle ||
        document.getElementById("editNoteContent").value !== modal.dataset.originalContent ||
        document.getElementById("editNoteCompleted").checked.toString() !== modal.dataset.originalCompleted
    );
}


async function saveNote() {

    const model = {
        id: document.getElementById("editNoteId").value,
        title: document.getElementById("editNoteTitle").value.trim(),
        content: document.getElementById("editNoteContent").value.trim(),
        isCompleted: document.getElementById("editNoteCompleted").checked
    };

    const res = await fetch("/Note/Index?handler=UpdateNote", {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            "RequestVerificationToken": getAntiForgeryToken()
        },
        body: JSON.stringify(model)
    });

    if (!res.ok) {
        alert("Cannot update note.");
        return;
    }

    document.getElementById("editNoteModal")
        .classList.remove("show");

    location.reload();
}



async function closeEditNoteModal() {

    const modal = document.getElementById("editNoteModal");
    
    if (noteHasChanges()) {
        await saveNote();
        return;
    }

    modal.classList.remove("show");
}