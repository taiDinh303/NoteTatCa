

// ===================== Init =====================

let notePageBound = false;
function initNotePage() {


    if (!document.getElementById("noteListWrapper")) return;

    if (!notePageBound) {

        bindTagFilter();
        bindReminderFilter();


        bindTagEdit();
        bindTagDelete();


        bindTagClick();
        bindNoteTagsSave();


        bindReminderActions();
        bindCreateNoteSubmit();


        //event
        bindSidebarActions();
        bindOpenNoteModal();
        bindNoteActions();

        notePageBound = true;

    }
    else {
        window.NoteBoard?.refresh();
    }

    document
        .querySelectorAll(".note-pin-btn")
        .forEach(bindPinButton);

/*    console.log(noteCache);*/

}

window.initNotePage = initNotePage;





