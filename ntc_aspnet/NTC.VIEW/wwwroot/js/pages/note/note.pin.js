
function togglePinIcon(icon, pinned) {

    icon.classList.toggle("bi-pin-fill", pinned);
    icon.classList.toggle("bi-pin", !pinned);

}

function updatePinButton(btn, pinned) {

    btn.dataset.pinned = pinned.toString();


    const icon = btn.querySelector("i");


    icon.classList.toggle("bi-pin-fill", pinned);
    icon.classList.toggle("bi-pin", !pinned);


    btn.title = pinned ? "Unpin" : "Pin";

    btn.classList.toggle("pinned", pinned);

}

function setPinnedState(btn, noteItem, pinned) {

    updatePinButton(btn, pinned);

    noteItem.dataset.pinned = pinned.toString();

}

function moveNoteCard(noteItem, pinned) {

    const pinnedContainer =
        document.getElementById("pinnedNoteList");

    const normalContainer =
        document.getElementById("normalNoteList");


    if (!pinnedContainer || !normalContainer)
        return;


    if (pinned) {

        pinnedContainer.prepend(noteItem);

    }
    else {

        normalContainer.prepend(noteItem);

    }


    window.NoteBoard?.refresh();

}

function updatePinSections() {


    const pinnedContainer =
        document.getElementById("pinnedNoteList");


    const normalContainer =
        document.getElementById("normalNoteList");


    const pinnedSection =
        document.querySelector(".pinned-section");


    const normalSection =
        document.querySelector(".normal-section");



    if (!pinnedContainer || !normalContainer)
        return;



    if (pinnedSection) {

        pinnedSection.style.display =
            pinnedContainer.children.length > 0
                ? "block"
                : "none";

    }



    if (normalSection) {

        normalSection.style.display =
            normalContainer.children.length > 0
                ? "block"
                : "none";

    }

}


function initPinState(btn, noteItem) {

    btn.dataset.pinned ??= noteItem.dataset.pinned;

}

async function handlePinClick(e, btn, noteItem) {

    e.stopPropagation();


    const oldPinned =
        btn.dataset.pinned === "true";


    const newPinned =
        !oldPinned;


    updatePinUI(
        btn,
        noteItem,
        newPinned
    );


    try {

        await togglePinRequest(btn);

    }
    catch {

        rollbackPin(
            btn,
            noteItem,
            oldPinned
        );

        alert("Cannot toggle pin.");
    }

}


function updatePinUI(btn, noteItem, pinned) {
    setPinnedState(btn, noteItem, pinned);
    moveNoteCard(noteItem, pinned);
    updatePinSections();

    const id = noteItem.dataset.noteId;

    if (noteCache[id]) {
        noteCache[id].isPinned = pinned;
    }

    const editNoteId = document.getElementById("editNoteId")?.value;

    if (editNoteId === id) {
        updateEditPinButton(pinned);
    }
}


async function togglePinRequest(btn) {


    const url = btn.dataset.url;


    const res = await fetch(url, {

        method: "POST",

        headers: {
            "RequestVerificationToken":
                getAntiForgeryToken()
        }

    });


    if (!res.ok)
        throw new Error("Toggle pin failed");

}
function rollbackPin(btn, noteItem, oldPinned) {
    setPinnedState(btn, noteItem, oldPinned);
    moveNoteCard(noteItem, oldPinned);
    updatePinSections();

    const id = noteItem.dataset.noteId;

    if (noteCache[id]) {
        noteCache[id].isPinned = oldPinned;
    }

    const editNoteId = document.getElementById("editNoteId")?.value;

    if (editNoteId === id) {
        updateEditPinButton(oldPinned);
    }
}


