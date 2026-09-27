import Head from "next/head";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { registerUser } from "@/lib/api";

function ValidIcon() {
    return (
        <svg className="icon icon-valid" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
    );
}

function InvalidIcon() {
    return (
        <svg className="icon icon-invalid" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
    );
}

export default function RegisterPage() {
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");
    const [busy, setBusy] = useState(false);

    const hasMinLength = password.length >= 8;
    const hasCapitalLetter = /[A-Z]/.test(password);
    const hasSpecialChar = /[!@#\$%^&*(),.?":{}|<>]/.test(password);

    const isPasswordValid = hasMinLength && hasCapitalLetter && hasSpecialChar;

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!isPasswordValid) return;

        setBusy(true);
        setMessage("Tworzę konto...");
        const form = new FormData(event.currentTarget);
        const birthdate = String(form.get("birthdate") || "");
        const user = {
            name: String(form.get("name")),
            email: String(form.get("email")),
            password: password,
            ...(birthdate ? { birthdate } : {}),
        };

        try {
            const result = await registerUser(user);
            setMessage(`Konto ${result.email} zostało utworzone! Możesz już się zalogować.`);
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Nie udało się utworzyć konta.");
        } finally {
            setBusy(false);
        }
    }

    return (
        <>
            <Head><title>Rejestracja Twój Autobus</title></Head>
            <main className="container">
                <p className="label">twojautobus.pl</p>
                <h1>Zarejestruj się</h1>
                <form className="basic-form" onSubmit={handleSubmit}>
                    <label htmlFor="name">Imię i nazwisko</label>
                    <input autoComplete="name" id="name" maxLength={100} minLength={2} name="name" required type="text" />
                    
                    <label htmlFor="email">Adres e-mail</label>
                    <input autoComplete="email" id="email" name="email" required type="email" />
                    
                    <label htmlFor="password">Hasło</label>
                    <input 
                        autoComplete="new-password" 
                        id="password" 
                        name="password" 
                        required 
                        type="password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    
                    <div className="password-requirements">
                        <div className={`requirement ${hasMinLength ? "valid" : "invalid"}`}>
                            {hasMinLength ? <ValidIcon /> : <InvalidIcon />}
                            <span>Minimum 8 znaków</span>
                        </div>
                        <div className={`requirement ${hasCapitalLetter ? "valid" : "invalid"}`}>
                            {hasCapitalLetter ? <ValidIcon /> : <InvalidIcon />}
                            <span>Minimum 1 wielka litera</span>
                        </div>
                        <div className={`requirement ${hasSpecialChar ? "valid" : "invalid"}`}>
                            {hasSpecialChar ? <ValidIcon /> : <InvalidIcon />}
                            <span>Minimum 1 znak specjalny</span>
                        </div>
                    </div>

                    <label htmlFor="birthdate">Data urodzenia (opcjonalnie)</label>
                    <input id="birthdate" name="birthdate" type="date" />
                    
                    <button disabled={busy || !isPasswordValid} type="submit">
                        {busy ? "Tworzenie konta" : "Utwórz konto"}
                    </button>
                    
                    <p className="message" role="status">{message}</p>
                    <p>Masz już konto? <Link href="/login">Zaloguj się</Link>.</p>
                </form>
            </main>
        </>
    );
}
