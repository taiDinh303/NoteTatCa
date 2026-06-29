// Write your Javascript code.

// tắt animation khi load
document.body.classList.add("preload");

document.addEventListener("DOMContentLoaded", () => {

    let sidebarState = localStorage.getItem("sidebar");

    // nếu chưa có thì mặc định là close
    if (!sidebarState) {
        localStorage.setItem("sidebar", "close");
        sidebarState = "close";
    }

    if (sidebarState === "open") {
        document.body.classList.add("sidebar-open");
    }

    // bật lại animation sau khi render xong
    setTimeout(() => {
        document.body.classList.remove("preload");
    }, 50);

});

function toggleSidebar() {

    document.body.classList.toggle("sidebar-open");

    if (document.body.classList.contains("sidebar-open")) {
        localStorage.setItem("sidebar", "open");
    } else {
        localStorage.setItem("sidebar", "close");
    }

}


async function loadPage(url, addHistory = true) {

    try {
        const res = await fetch(url, {
            headers: { "X-Requested-With": "XMLHttpRequest" }
        });

        if (!res.ok) {
            window.location.href = url;
            return;
        }

        const html = await res.text();

        const temp = document.createElement("div");
        temp.innerHTML = html;

        const newContent = temp.querySelector(".page-content");

        if (newContent) {
            document.querySelector(".page-content").innerHTML = newContent.innerHTML;
        } else {
            document.querySelector(".page-content").innerHTML = html;
        }

        if (addHistory) {
            history.pushState(null, "", url);
        }

        initPage();

    } catch (err) {
        console.error(err);
        window.location.href = url;
    }
}

function initPage() {

    if (window.initNotePage && document.querySelector("#noteListWrapper")) {
        window.initNotePage();
    }

}

document.addEventListener("click", function (e) {

    const link = e.target.closest("a[data-spa]");
    if (!link) return;

    if (link.target === "_blank") return;

    e.preventDefault();

    loadPage(link.getAttribute("href"));

});

window.addEventListener("popstate", () => {
    loadPage(location.pathname, false);
});

document.addEventListener("DOMContentLoaded", () => {
    initPage();
});







function toggleMenu(e) {
    e.stopPropagation();

    const menu = document.getElementById("user-menu");
    menu.hidden = !menu.hidden;
}

document.addEventListener("click", function (e) {

    const dropdown = document.querySelector(".user-dropdown");
    const menu = document.getElementById("user-menu");

    if (!dropdown || !menu) return;

    if (!dropdown.contains(e.target)) {
        menu.hidden = true;
    }

});



