


const GAP = 16; // khoảng cách giữa các note-item, khớp với CSS của bạn

let dragState = null;
let pendingDrag = null;
const DRAG_THRESHOLD = 6;

/* ---------------------------------------------------------------
   1. INJECT STYLE PHỤ TRỢ CHO DRAG (không đụng vào file CSS gốc)
--------------------------------------------------------------- */
function injectStyles() {
    if (document.getElementById("note-dragsort-style")) return;
    const style = document.createElement("style");
    style.id = "note-dragsort-style";
    style.textContent = `
      .note-grid { position: relative; }
      .note-item {
        position: absolute;
        will-change: left, top;
        transition: left 0.06s ease, top 0.06s ease;
      }
      .note-item.dragging {
        transition: none !important;
        z-index: 1000;
        pointer-events: none;
      }
      .note-item.dragging .note-card {
        box-shadow: 0 10px 24px rgba(0,0,0,0.18);
        transform: scale(1.03);
        cursor: grabbing;
      }
      .note-item.drop-placeholder-target .note-card {
        outline: 2px dashed #999;
        outline-offset: 2px;
      }
    `;
    document.head.appendChild(style);
}

/* ---------------------------------------------------------------
   2. MASONRY LAYOUT
--------------------------------------------------------------- */
function layoutMasonry(grid) {
    if (!grid) return;
    const items = Array.from(grid.children).filter((el) =>
        el.classList.contains("note-item")
    );

    if (items.length === 0) {
        grid.style.height = "0px";
        return;
    }

    const containerWidth = grid.clientWidth;
    const itemWidth = items[0].offsetWidth || 220;
    const columns = Math.max(
        1,
        Math.floor((containerWidth + GAP) / (itemWidth + GAP))
    );
    const colHeights = new Array(columns).fill(0);

    items.forEach((item) => {
        if (item.classList.contains("dragging")) return; // xử lý riêng khi kéo

        // cột thấp nhất hiện tại
        let minCol = 0;
        for (let i = 1; i < columns; i++) {
            if (colHeights[i] < colHeights[minCol]) minCol = i;
        }

        const usedWidth =
            columns * itemWidth +
            (columns - 1) * GAP;

        const offsetX =
            Math.max(0, (containerWidth - usedWidth) / 2);


        const x = offsetX + minCol * (itemWidth + GAP);

        const y = colHeights[minCol];

        item.style.left = x + "px";
        item.style.top = y + "px";

        colHeights[minCol] = y + item.offsetHeight + GAP;
    });

    grid.style.height = Math.max(...colHeights, 0) + "px";
}

function layoutNotes() {
    document.querySelectorAll(".note-grid").forEach(layoutMasonry);
}

/* debounce cho resize */
function debounce(fn, wait) {
    let t;
    return function (...args) {
        clearTimeout(t);
        t = setTimeout(() => fn.apply(this, args), wait);
    };
}

/* ---------------------------------------------------------------
   3. DRAG & DROP (Pointer Events - hỗ trợ cả mouse & touch)
--------------------------------------------------------------- */





function onPointerDown(e) {
    // Bỏ qua nếu bấm vào nút / dropdown / phần tử tương tác khác
    if (e.target.closest("button, .dropdown, .dropdown-menu, a, input, textarea")) {
        return;
    }

    const card = e.target.closest(".note-card");
    if (!card) return;

    const item = card.closest(".note-item");
    const grid = item.parentElement;
    if (!item || !grid) return;

    e.preventDefault();

    const rect = item.getBoundingClientRect();

    pendingDrag = {
        item,
        grid,
        rect,
        startX: e.clientX,
        startY: e.clientY,
        offsetX: e.clientX - rect.left,
        offsetY: e.clientY - rect.top,
    };

    document.body.style.userSelect = "none";

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp, { once: true });
}


function canDropBetweenGrids(fromGrid, toGrid) {
    const fromPinned = fromGrid.closest(".note-section")?.classList.contains("pinned-section");
    const toPinned = toGrid.closest(".note-section")?.classList.contains("pinned-section");

    return fromPinned === toPinned;
}
function onPointerMove(e) {

    if (!dragState) {

        if (!pendingDrag) return;

        const dx = e.clientX - pendingDrag.startX;
        const dy = e.clientY - pendingDrag.startY;

        if (Math.hypot(dx, dy) < DRAG_THRESHOLD) {
            return;
        }

        dragState = {
            item: pendingDrag.item,
            originGrid: pendingDrag.grid,
            currentGrid: pendingDrag.grid,
            offsetX: pendingDrag.offsetX,
            offsetY: pendingDrag.offsetY,
            width: pendingDrag.rect.width,
            targetGrid: pendingDrag.grid,
            targetItem: null,
            pointerY: e.clientY
        };

        const item = dragState.item;

        item.classList.add("dragging");
        item.style.width = pendingDrag.rect.width + "px";
        item.style.left = pendingDrag.rect.left + "px";
        item.style.top = pendingDrag.rect.top + "px";
        item.style.position = "fixed";

        document.body.style.userSelect = "none";

        pendingDrag = null;
    }

    if (!dragState) return;

    const { item, offsetX, offsetY } = dragState;

    item.style.left = e.clientX - offsetX + "px";
    item.style.top = e.clientY - offsetY + "px";

    let targetGrid = findGridUnderPoint(e.clientX, e.clientY) || dragState.currentGrid;

    if (!canDropBetweenGrids(dragState.originGrid, targetGrid)) {
        targetGrid = dragState.originGrid;
    }

    const targetItem = findClosestItem(targetGrid, e.clientX, e.clientY, item);

    clearDropHighlight();

    dragState.targetGrid = targetGrid;
    dragState.targetItem = targetItem;
    dragState.pointerY = e.clientY;

    if (targetItem) {
        targetItem.classList.add("drop-placeholder-target");
    }
}






function onPointerUp() {

    if (pendingDrag) {
        pendingDrag = null;
        window.removeEventListener("pointermove", onPointerMove);
        return;
    }

    if (!dragState) return;

    const {
        item,
        originGrid,
        currentGrid,
        targetGrid,
        targetItem,
        pointerY
    } = dragState;

    clearDropHighlight();

    if (targetGrid && canDropBetweenGrids(originGrid, targetGrid)) {

        if (targetItem) {
            insertNear(targetGrid, item, targetItem, pointerY);
        }
        else if (targetGrid !== item.parentElement) {
            targetGrid.appendChild(item);
        }

        dragState.currentGrid = targetGrid;
    }
    else {
        targetGrid = originGrid;
    }

    item.classList.remove("dragging");
    item.style.position = "absolute";
    item.style.width = "";
    document.body.style.userSelect = "";

    layoutMasonry(dragState.currentGrid);

    if (originGrid !== dragState.currentGrid) {
        layoutMasonry(originGrid);
    }

    persistOrder(item, dragState.currentGrid);

    window.removeEventListener("pointermove", onPointerMove);
    dragState = null;
}

function clearDropHighlight() {
    document
        .querySelectorAll(".drop-placeholder-target")
        .forEach((el) => el.classList.remove("drop-placeholder-target"));
}

/* Tìm .note-grid đang nằm dưới con trỏ chuột */
function findGridUnderPoint(x, y) {
    const el = document.elementFromPoint(x, y);
    if (!el) return null;
    return el.closest(".note-grid");
}

/* Tìm note-item gần điểm (x,y) nhất trong 1 grid, bỏ qua item đang kéo */
function findClosestItem(grid, x, y, excludeItem) {
    const items = Array.from(grid.children).filter(
        (el) => el.classList.contains("note-item") && el !== excludeItem
    );
    if (items.length === 0) return null;

    let closest = null;
    let minDist = Infinity;

    items.forEach((el) => {
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const dist = Math.hypot(cx - x, cy - y);
        if (dist < minDist) {
            minDist = dist;
            closest = el;
        }
    });

    return closest;
}

/* Chèn item được kéo vào trước/sau targetItem tùy vị trí con trỏ */
function insertNear(grid, item, targetItem, pointerY) {
    const rect = targetItem.getBoundingClientRect();
    const middleY = rect.top + rect.height / 2;

    if (pointerY < middleY) {
        if (targetItem.previousSibling !== item) {
            grid.insertBefore(item, targetItem);
        }
    } else {
        const next = targetItem.nextSibling;
        if (next !== item) {
            grid.insertBefore(item, next);
        }
    }
}


// Lấy note liền trước / liền sau item trong grid hiện tại (bỏ qua các phần
// tử không phải .note-item, phòng trường hợp có node khác chen vào)
function getNeighborIds(item) {
    let prev = item.previousElementSibling;
    while (prev && !prev.classList.contains("note-item")) {
        prev = prev.previousElementSibling;
    }
    let next = item.nextElementSibling;
    while (next && !next.classList.contains("note-item")) {
        next = next.nextElementSibling;
    }
    return {
        previousId: prev ? prev.dataset.noteId : null,
        nextId: next ? next.dataset.noteId : null,
    };
}


// Chỉ cần gửi note vừa được kéo (DraggedId) kèm 2 note liền kề vị trí mới
// của nó (PreviousId / NextId) - khớp với ReorderNoteModelView ở backend.
function persistOrder(item, grid) {
    const { previousId, nextId } = getNeighborIds(item);

    const data = {
        draggedId: item.dataset.noteId,
        previousId,
        nextId,
    };

    grid.dispatchEvent(
        new CustomEvent("notes:reordered", {
            bubbles: true,
            detail: { gridId: grid.id, ...data },
        })
    );

    reorderNote(data);
}

/* ---------------------------------------------------------------
   5. KHỞI TẠO
--------------------------------------------------------------- */
function initNoteBoard() {
    injectStyles();
    document.querySelectorAll(".note-grid").forEach((grid) => {
        grid.addEventListener("pointerdown", onPointerDown);
    });
    layoutNotes();
}

document.addEventListener("DOMContentLoaded", initNoteBoard);
window.addEventListener("resize", debounce(layoutNotes, 150));

// Cho phép gọi lại từ bên ngoài (vd sau khi AJAX thêm/xóa note)
window.NoteBoard = { init: initNoteBoard, refresh: layoutNotes, };


