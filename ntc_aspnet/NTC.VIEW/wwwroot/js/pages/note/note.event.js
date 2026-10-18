function bindSidebarActions() {

    document.addEventListener("click", function (e) {

        const action = e.target.closest("[data-action]");
        if (!action) return;


        switch (action.dataset.action) {

            case "create-note":
                openCreateNoteModal();
                break;


            case "edit-tags":
                openTagModal();
                break;
        }

    });
}

//function bindNoteActions() {
//    document.addEventListener("click", e => {
//        const action = e.target.closest("[data-action]");
//        if (!action) return;

//        switch (action.dataset.action) {
//            case "toggle-dropdown":
//                toggleDropdown(action);
//                break;

//            case "move-to-trash":
//                moveNoteToTrash(e, action.closest(".note-item").dataset.noteId);
//                break;

//            case "delete-note":
//                deleteNote(e, action.closest(".note-item").dataset.noteId);
//                break;

//            case "restore-note":
//                restoreNote(e, action.closest(".note-item").dataset.noteId);
//                break;

//            case "label-note":
//                openNoteTagsModal(action);
//                break;
//        }
//    });
//}
function bindNoteActions() {
    document.addEventListener("click", e => {
        const action = e.target.closest("[data-action]");
        if (!action) return;

        const noteItem = action.closest(".note-item");
        const noteId = action.dataset.noteId || noteItem?.dataset.noteId;

        switch (action.dataset.action) {
            case "toggle-dropdown":
                toggleDropdown(action);
                break;

            case "move-to-trash":
                console.log("Move to trash:", noteId);
                if (noteId) moveNoteToTrash(e, noteId);
                break;

            case "delete-note":
                if (noteId) deleteNote(e, noteId);
                break;

            case "restore-note":
                if (noteId) restoreNote(e, noteId);
                break;

            case "label-note":
                openNoteTagsModal(action);
                break;
        }
    });
}

document.addEventListener("click", e => {

    if (e.target.closest(".dropdown")) {
        return;
    }

    document.querySelectorAll(".dropdown-menu")
        .forEach(m => m.classList.remove("show"));
});


function toggleDropdown(btn) {
    const menu = btn.parentElement.querySelector(".dropdown-menu");

    document.querySelectorAll(".dropdown-menu").forEach(m => {
        if (m !== menu) m.classList.remove("show", "open-up", "open-left");
    });

    if (menu.classList.contains("show")) {
        menu.classList.remove("show", "open-up", "open-left");
        return;
    }

    menu.classList.add("show");

    const rect = menu.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();

    const openUp = rect.bottom > window.innerHeight;
    const openLeft = rect.right > window.innerWidth;

    menu.classList.toggle("open-up", openUp);
    menu.classList.toggle("open-left", openLeft);
}









function bindOpenNoteModal() {

    document.addEventListener("click", e => {

        if (
            e.target.closest(".dropdown") ||
            e.target.closest(".note-pin")
        ) return;

        const card = e.target.closest(".note-card");
        if (!card) return;

        openEditNoteModal(
            card.closest(".note-item")
        );
    });

}

function bindPinHover(btn, icon) {


    btn.addEventListener(
        "mouseenter",
        () => {

            togglePinIcon(
                icon,
                btn.dataset.pinned !== "true"
            );

        }
    );


    btn.addEventListener(
        "mouseleave",
        () => {

            togglePinIcon(
                icon,
                btn.dataset.pinned === "true"
            );

        }
    );

}

function bindPinButton(btn) {

    if (btn.dataset.bound) return;
    btn.dataset.bound = "true";

    const icon = btn.querySelector("i");
    const noteItem = btn.closest(".note-item");

    if (!icon || !noteItem) return;

    initPinState(btn, noteItem);

    btn.addEventListener("click", e =>
        handlePinClick(e, btn, noteItem)
    );

    bindPinHover(btn, icon);
}