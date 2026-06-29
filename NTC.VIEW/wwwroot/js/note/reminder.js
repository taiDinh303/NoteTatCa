// ===================== Helpers =====================
function getMinDateTimeLocal() {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");

    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function formatDateTime(dateStr) {
    if (!dateStr) return "";

    const d = new Date(dateStr);

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");

    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function getWeekDaysValue(container) {
    let value = 0;

    container.querySelectorAll("button.active").forEach(btn => {
        value |= parseInt(btn.dataset.value);
    });

    return value;
}

function setWeekDaysValue(container, value) {
    container.querySelectorAll("button").forEach(btn => {
        const v = parseInt(btn.dataset.value);

        if ((value & v) === v) {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }
    });
}


// ===================== Modal =====================
let reminderNoteId = null;

function closeReminderModal() {
    document.getElementById("reminderModal").classList.remove("show");
    resetReminderModal();
}

async function openReminderModal(btn) {
    reminderNoteId = btn.dataset.noteId;

    const modal = document.getElementById("reminderModal");

    modal.dataset.noteId = reminderNoteId;
    modal.classList.add("show");

    const createTimeInput = modal.querySelector(".create-reminder-time");

    if (createTimeInput) {
        createTimeInput.min = getMinDateTimeLocal();
    }

    const res = await fetch(`/Note?handler=GetReminderByNote&noteId=${reminderNoteId}`);
    const data = await res.json();

    renderReminderTable(data.data);
}

function resetReminderModal() {
    document.querySelectorAll("#reminderModal tr[data-reminder-id]").forEach(row => {
        const timeInput = row.querySelector(".reminder-time-input");
        const repeatInput = row.querySelector(".reminder-repeat-input");
        const editBtn = row.querySelector(".btn-edit-reminder");
        const saveBtn = row.querySelector(".btn-save-reminder");

        if (timeInput?.dataset.originalValue !== undefined) {
            timeInput.value = timeInput.dataset.originalValue;
        }

        if (repeatInput?.dataset.originalValue !== undefined) {
            repeatInput.value = repeatInput.dataset.originalValue;
        }

        row.querySelectorAll("input, select").forEach(el => {
            el.disabled = true;
        });

        row.querySelectorAll(".weekday-group button").forEach(btn => {
            btn.disabled = true;

            const original = btn.dataset.originalValue === "true";

            btn.classList.toggle("active", original);
        });

        saveBtn?.classList.add("d-none");
        editBtn?.classList.remove("d-none");
    });
}


// ===================== Render =====================
// ===================== Render =====================
function renderReminderTable(reminders) {
    const tbody = document.getElementById("reminderTableBody");

    // Lưu lại các row create trước khi clear
    const createRows = Array.from(
        tbody.querySelectorAll(
            ".create-reminder-main-row, .create-reminder-extra-row, .reminder-divider-row"
        )
    );

    tbody.innerHTML = "";

    // Append lại các row create
    createRows.forEach(row => tbody.appendChild(row));

    const template = document.getElementById("reminder-row-template");

    if (!reminders || reminders.length === 0) {
        const empty = document.createElement("tr");
        empty.className = "empty-reminder-row";
        empty.innerHTML = `
            <td colspan="8" style="text-align:center; padding:16px;">
                No reminders
            </td>
        `;
        tbody.appendChild(empty);
        return;
    }

    reminders.forEach(r => {
        const clone = template.content.cloneNode(true);

        const mainRow = clone.querySelector(".reminder-main-row");
        const extraRow = clone.querySelector(".reminder-extra-row");
        const dividerRow = clone.querySelector(".reminder-divider-row");

        const timeInput = clone.querySelector(".reminder-time-input");
        const repeatInput = clone.querySelector(".reminder-repeat-input");
        const intervalInput = clone.querySelector(".reminder-interval-input");
        const untilInput = clone.querySelector(".reminder-until-input");
        const countInput = clone.querySelector(".reminder-count-input");
        const activeInput = clone.querySelector(".reminder-active-input");
        const weekdayContainer = clone.querySelector(".reminder-weekdays");

        // Gắn id cho cả 3 row
        mainRow.dataset.reminderId = r.id;
        extraRow.dataset.reminderId = r.id;
        dividerRow.dataset.reminderId = r.id;

        if (timeInput) {
            timeInput.value = formatDateTime(r.reminderAt);
            timeInput.min = getMinDateTimeLocal();
        }

        if (repeatInput) {
            repeatInput.value = r.repeatType;
        }

        if (intervalInput) {
            intervalInput.value = r.repeatInterval ?? 1;
        }

        if (untilInput) {
            untilInput.value = r.repeatUntil
                ? formatDateTime(r.repeatUntil)
                : "";
        }

        if (countInput) {
            countInput.value = r.repeatCount ?? "";
        }

        if (activeInput) {
            activeInput.checked = r.isActive;
        }

        if (weekdayContainer) {
            weekdayContainer.querySelectorAll("button").forEach(btn => {
                btn.disabled = true;
            });

            setWeekDaysValue(weekdayContainer, r.repeatDays);
        }

        tbody.appendChild(clone);
    });
}


// ===================== Edit =====================

function enterEditReminder(row) {
    const mainRow = row.closest(".reminder-main-row");

    if (!mainRow) return;

    const extraRow = mainRow.nextElementSibling;

    const editBtn = mainRow.querySelector(".btn-edit-reminder");
    const saveBtn = mainRow.querySelector(".btn-save-reminder");

    const allInputs = [
        ...mainRow.querySelectorAll("input, select"),
        ...(extraRow ? extraRow.querySelectorAll("input, select") : [])
    ];

    allInputs.forEach(el => {
        el.disabled = false;

        if (el.type === "checkbox") {
            el.dataset.originalValue = el.checked;
        } else {
            el.dataset.originalValue = el.value;
        }
    });

    const timeInput = mainRow.querySelector(".reminder-time-input");

    if (timeInput) {
        timeInput.min = getMinDateTimeLocal();
    }

    if (extraRow) {
        extraRow.querySelectorAll(".weekday-group button").forEach(btn => {
            btn.disabled = false;
            btn.dataset.originalValue = btn.classList.contains("active") ? "true" : "false";
        });
    }

    editBtn.classList.add("d-none");
    saveBtn.classList.remove("d-none");
}

async function saveReminder(row) {
    const mainRow = row.closest(".reminder-main-row");

    if (!mainRow) return;

    const extraRow = mainRow.nextElementSibling;

    const timeInput = mainRow.querySelector(".reminder-time-input");
    const repeatInput = mainRow.querySelector(".reminder-repeat-input");
    const activeInput = mainRow.querySelector(".reminder-active-input");

    const intervalInput = extraRow?.querySelector(".reminder-interval-input");
    const untilInput = extraRow?.querySelector(".reminder-until-input");
    const countInput = extraRow?.querySelector(".reminder-count-input");
    const weekdaysContainer = extraRow?.querySelector(".reminder-weekdays");

    const editBtn = mainRow.querySelector(".btn-edit-reminder");
    const saveBtn = mainRow.querySelector(".btn-save-reminder");

    const reminderId = mainRow.dataset.reminderId;

    if (!timeInput.value) {
        alert("Reminder time is required.");
        return;
    }

    try {
        const payload = {
            id: reminderId,
            reminderAt: new Date(timeInput.value).toISOString(),
            repeatType: parseInt(repeatInput.value),
            repeatInterval: parseInt(intervalInput?.value) || 1,
            repeatDays: weekdaysContainer
                ? getWeekDaysValue(weekdaysContainer)
                : 0,
            repeatUntil: untilInput?.value
                ? new Date(untilInput.value).toISOString()
                : null,
            repeatCount: countInput?.value
                ? parseInt(countInput.value)
                : null,
            isActive: activeInput.checked
        };

        const res = await fetch("/Note/Index?handler=UpdateReminder", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "RequestVerificationToken": getAntiForgeryToken()
            },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            throw new Error();
        }

        const allInputs = [
            ...mainRow.querySelectorAll("input, select"),
            ...(extraRow ? extraRow.querySelectorAll("input, select") : [])
        ];

        allInputs.forEach(el => {
            el.disabled = true;

            if (el.type === "checkbox") {
                el.dataset.originalValue = el.checked;
            } else {
                el.dataset.originalValue = el.value;
            }
        });

        if (extraRow) {
            extraRow.querySelectorAll(".weekday-group button").forEach(btn => {
                btn.disabled = true;
                btn.dataset.originalValue = btn.classList.contains("active");
            });
        }

        saveBtn.classList.add("d-none");
        editBtn.classList.remove("d-none");
    } catch {
        const allInputs = [
            ...mainRow.querySelectorAll("input, select"),
            ...(extraRow ? extraRow.querySelectorAll("input, select") : [])
        ];

        allInputs.forEach(el => {
            if (el.type === "checkbox") {
                el.checked = el.dataset.originalValue === "true";
            } else {
                el.value = el.dataset.originalValue;
            }
        });

        if (extraRow) {
            extraRow.querySelectorAll(".weekday-group button").forEach(btn => {
                const original = btn.dataset.originalValue === "true";
                btn.classList.toggle("active", original);
            });
        }

        alert("Cannot update reminder.");
    }
}



// ===================== Create =====================
async function createReminder(row, noteId) {
    const mainRow = row.closest(".create-reminder-main-row");

    if (!mainRow) return;

    const extraRow = mainRow.nextElementSibling;

    const timeInput = mainRow.querySelector(".create-reminder-time");
    const repeatTypeInput = mainRow.querySelector(".create-repeat-type");
    const activeInput = mainRow.querySelector(".create-is-active");

    const intervalInput = extraRow?.querySelector(".create-repeat-interval");
    const untilInput = extraRow?.querySelector(".create-repeat-until");
    const countInput = extraRow?.querySelector(".create-repeat-count");
    const weekdaysContainer = extraRow?.querySelector(".create-weekdays");

    const time = timeInput?.value;
    const repeatType = repeatTypeInput?.value;
    const interval = intervalInput?.value;
    const until = untilInput?.value;
    const count = countInput?.value;
    const active = activeInput?.checked;

    if (!time) {
        alert("Reminder time is required.");
        return;
    }

    try {
        const payload = {
            noteId,
            reminderAt: new Date(time).toISOString(),
            repeatType: parseInt(repeatType) || 0,
            repeatInterval: parseInt(interval) || 1,
            repeatDays: weekdaysContainer
                ? getWeekDaysValue(weekdaysContainer)
                : 0,
            repeatUntil: until
                ? new Date(until).toISOString()
                : null,
            repeatCount: count
                ? parseInt(count)
                : null,
            isActive: active
        };

        const res = await fetch("/Note/Index?handler=CreateReminder", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "RequestVerificationToken": getAntiForgeryToken()
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
            throw new Error();
        }

        alert("Created!");

        mainRow.querySelectorAll("input").forEach(el => {
            if (el.type === "checkbox") {
                el.checked = true;
            } else {
                el.value = "";
            }
        });

        if (extraRow) {
            extraRow.querySelectorAll("input").forEach(el => {
                el.value = "";
            });

            extraRow.querySelector(".create-repeat-interval").value = "1";

            extraRow.querySelectorAll(".weekday-group button").forEach(btn => {
                btn.classList.remove("active");
            });
        }

        timeInput.value = "";
        repeatTypeInput.value = "0";
        activeInput.checked = true;

    } catch {
        alert("Cannot create reminder.");
    }
}


// ===================== Delete =====================
async function deleteReminder(row) {
    const mainRow = row.closest(".reminder-main-row");

    if (!mainRow) return;

    const extraRow = mainRow.nextElementSibling;
    const dividerRow = extraRow?.nextElementSibling;

    const id = mainRow.dataset.reminderId;

    try {
        const res = await fetch(`/Note/Index?handler=DeleteReminder&id=${id}`, {
            method: "POST",
            headers: {
                "RequestVerificationToken": getAntiForgeryToken()
            }
        });

        if (!res.ok) {
            throw new Error();
        }

        mainRow.remove();

        if (extraRow?.classList.contains("reminder-extra-row")) {
            extraRow.remove();
        }

        if (dividerRow?.classList.contains("reminder-divider-row")) {
            dividerRow.remove();
        }
    } catch {
        alert("Cannot delete reminder.");
    }
}

// ===================== Events =====================
function bindReminderActions() {
    document.addEventListener("click", (e) => {
        const weekdayBtn = e.target.closest(".weekday-group button");

        if (weekdayBtn && !weekdayBtn.disabled) {
            weekdayBtn.classList.toggle("active");
            return;
        }

        const createBtn = e.target.closest(".btn-create-reminder");

        if (createBtn) {
            const row = createBtn.closest("tr");
            const modal = document.getElementById("reminderModal");
            const noteId = modal.dataset.noteId;

            createReminder(row, noteId);
            return;
        }

        const editBtn = e.target.closest(".btn-edit-reminder");

        if (editBtn) {
            enterEditReminder(editBtn.closest("tr"));
            return;
        }

        const saveBtn = e.target.closest(".btn-save-reminder");

        if (saveBtn) {
            saveReminder(saveBtn.closest("tr"));
            return;
        }

        const deleteBtn = e.target.closest(".btn-delete-reminder");

        if (deleteBtn) {
            deleteReminder(deleteBtn.closest("tr"));
        }
    });
}


