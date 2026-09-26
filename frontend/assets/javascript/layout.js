const layoutScript = document.currentScript;
const rootPath = layoutScript.dataset.root || "";
const pageName = layoutScript.dataset.page || "";

async function insertComponent(selector, fileName) {
    const placeholder = document.querySelector(selector);
    if (!placeholder) return;

    try {
        const response = await fetch(`${rootPath}components/${fileName}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const markup = (await response.text()).replaceAll("{{ROOT}}", rootPath);
        placeholder.innerHTML = markup;

        if (selector === "[data-site-header]") {
            const activeLink = placeholder.querySelector(`[data-page="${pageName}"]`);
            activeLink?.classList.add("active");
            activeLink?.setAttribute("aria-current", "page");
        }
    } catch (error) {
        placeholder.textContent = `Nie udało się wczytać elementu strony: ${fileName}`;
        console.error(error);
    }
}

insertComponent("[data-site-header]", "header.html");
insertComponent("[data-site-footer]", "footer.html");