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
        initNotePage();
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
