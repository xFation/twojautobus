document.querySelector("#register-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = document.querySelector("#register-message");
    message.className = "message";
    message.textContent = "Tworzę konto...";

    const birthdate = document.querySelector("#birthdate").value;
    const user = {
        name: document.querySelector("#name").value,
        email: document.querySelector("#email").value,
        password: document.querySelector("#password").value,
    };
    if (birthdate) user.birthdate = birthdate;

    try {
        const result = await window.apiRequest("/auth/register", {
            method: "POST",
            body: JSON.stringify(user),
        });
        message.classList.add("success");
        message.textContent = `Utworzono konto ${result.email}. Możesz się zalogować.`;
    } catch (error) {
        message.textContent = error.message;
    }
});