
// Label Modal
let currentNoteId = null;
let originaltagIds = [];
let selectedtagIds = [];

// open
function openLabelModal(btn) {
    currentNoteId = btn.dataset.noteId;
    originaltagIds = (btn.dataset.noteTags || "")
        .split(",")
        .map(x => x.trim())
        .filter(Boolean);

    selectedtagIds = [...originaltagIds];

    document.querySelectorAll(".label-tag-btn").forEach(catBtn => {
        const catId = catBtn.dataset.tagId;
        const attached = originaltagIds.includes(catId);
        setLabelOpacity(catBtn, attached);
    });

    document.getElementById("labelModal").classList.add("show");
}
// close
function closeLabelModal() {
    document.getElementById("labelModal").classList.remove("show");
}

// toggle label selection
function setLabelOpacity(btn, attached) {
    btn.classList.toggle("opacity-100", attached);
    btn.classList.toggle("opacity-30", !attached);
}



function bindLabelTagClick() {
    document.addEventListener("click", (e) => {
        const btn = e.target.closest(".label-tag-btn");
        if (!btn) return;
        const tagId = btn.dataset.tagId;
        const index = selectedtagIds.indexOf(tagId);
        if (index >= 0) {
            selectedtagIds.splice(index, 1);
            setLabelOpacity(btn, false);
        } else {
            selectedtagIds.push(tagId);
            setLabelOpacity(btn, true);
        }
    });
}

// add/remove labels
async function saveLabelChanges() {
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
        const triggerBtn = document.querySelector(`[data-note-id="${currentNoteId}"][data-note-tags]`);
        if (triggerBtn) {
            triggerBtn.dataset.noteTags = selectedtagIds.join(",");
        }
        updateNoteTagDots(currentNoteId, selectedtagIds);
        document.getElementById("saveLabelChangesBtn").blur();
        closeLabelModal();
    } catch {
        alert("Cannot update labels.");
    }
}

function bindLabelSave() {
    document.addEventListener("click", (e) => {
        if (e.target.id === "saveLabelChangesBtn") {
            saveLabelChanges();
        }
    });
}

function updateNoteTagDots(noteId, tagIds) {
    const noteCard = document
        .querySelector(`.note-item [data-note-id="${noteId}"]`)
        ?.closest(".note-item");

    if (!noteCard) return;

    let container = noteCard.querySelector(".note-tags");

    // nếu chưa có thì tạo
    if (!container) {
        container = document.createElement("div");
        container.className = "note-tags mt-auto mb-2";
        noteCard.querySelector(".note-card-body").appendChild(container);
    }

    container.innerHTML = "";

    tagIds.forEach(catId => {
        const labelBtn = document.querySelector(
            `.label-tag-btn[data-tag-id="${catId}"]`
        );

        if (!labelBtn) return;

        // 👉 wrapper giống Razor
        const item = document.createElement("div");
        item.className = "tag-item";

        // dot
        const dot = document.createElement("span");
        dot.className = "tag-dot";
        dot.style.background = labelBtn.style.background;

        // name
        const name = document.createElement("span");
        name.className = "tag-name";
        name.textContent = labelBtn.dataset.tagName;

        item.appendChild(dot);
        item.appendChild(name);

        container.appendChild(item);
    });

    // nếu không có tag thì xoá luôn
    if (!tagIds.length) {
        container.remove();
    }
}

