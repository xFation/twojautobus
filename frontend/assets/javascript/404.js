(function () {
    "use strict";

    const page = document.querySelector("#notfoundPage");
    const card = page?.querySelector(".visual-card");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia("(pointer: fine)").matches;

    if (!page || !card || reduceMotion || !finePointer) return;

    page.addEventListener("mousemove", (event) => {
        const bounds = page.getBoundingClientRect();
        const x = (event.clientX - bounds.left) / bounds.width - 0.5;
        const y = (event.clientY - bounds.top) / bounds.height - 0.5;
        card.style.transform = `translateY(-3px) rotateX(${y * -3}deg) rotateY(${x * 4}deg) rotate(1deg)`;
    });

    page.addEventListener("mouseleave", () => {
        card.style.transform = "translateY(0) rotate(2deg)";
    });
})();