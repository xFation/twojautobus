import Head from "next/head";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { registerUser } from "@/lib/api";

export default function RegisterPage() {
    const [message, setMessage] = useState("");
    const [busy, setBusy] = useState(false);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setBusy(true);
        setMessage("Tworzę konto...");
        const form = new FormData(event.currentTarget);
        const birthdate = String(form.get("birthdate") || "");
        const user = {
            name: String(form.get("name")),
            email: String(form.get("email")),
            password: String(form.get("password")),
            ...(birthdate ? { birthdate } : {}),
        };

        try {
            const result = await registerUser(user);
            setMessage(`Utworzono konto ${result.email}. Możesz się zalogować.`);
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Nie udało się utworzyć konta.");
        } finally {
            setBusy(false);
        }
    }

    return (
        <>
            <Head><title>Rejestracja | Twój Autobus</title></Head>
            <main className="container">
                <h1>Rejestracja</h1>
                <form className="basic-form" onSubmit={handleSubmit}>
                    <label htmlFor="name">Imię i nazwisko</label>
                    <input autoComplete="name" id="name" maxLength={100} minLength={2} name="name" required type="text" />
                    <label htmlFor="email">Adres e-mail</label>
                    <input autoComplete="email" id="email" name="email" required type="email" />
                    <label htmlFor="password">Hasło, minimum 8 znaków</label>
                    <input autoComplete="new-password" id="password" minLength={8} name="password" required type="password" />
                    <label htmlFor="birthdate">Data urodzenia (opcjonalnie)</label>
                    <input id="birthdate" name="birthdate" type="date" />
                    <button disabled={busy} type="submit">{busy ? "Tworzę konto..." : "Utwórz konto"}</button>
                    <p className="message" role="status">{message}</p>
                </form>
                <p>Masz już konto? <Link href="/login">Zaloguj się</Link>.</p>
            </main>
        </>
    );
}