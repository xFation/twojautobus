document.querySelector("#login-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = document.querySelector("#login-message");
    message.className = "message";
    message.textContent = "Logowanie...";

    try {
        const result = await window.apiRequest("/auth/login", {
            method: "POST",
            body: JSON.stringify({
                email: document.querySelector("#email").value,
                password: document.querySelector("#password").value,
            }),
        });
        sessionStorage.setItem("accessToken", result.access_token);
        message.classList.add("success");
        message.textContent = `Zalogowano jako ${result.user.name}.`;
    } catch (error) {
        message.textContent = error.message;
    }
});