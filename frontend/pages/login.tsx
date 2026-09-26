import Head from "next/head";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { login } from "@/lib/api";

export default function LoginPage() {
    const [message, setMessage] = useState("");
    const [busy, setBusy] = useState(false);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setBusy(true);
        setMessage("Logowanie...");
        const form = new FormData(event.currentTarget);

        try {
            const result = await login(String(form.get("email")), String(form.get("password")));
            window.sessionStorage.setItem("accessToken", result.access_token);
            setMessage(`Zalogowano jako ${result.user.name}.`);
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Nie udało się zalogować.");
        } finally {
            setBusy(false);
        }
    }

    return (
        <>
            <Head><title>Logowanie | Twój Autobus</title></Head>
            <main className="container">
                <h1>Logowanie</h1>
                <form className="basic-form" onSubmit={handleSubmit}>
                    <label htmlFor="email">Adres e-mail</label>
                    <input autoComplete="email" id="email" name="email" required type="email" />
                    <label htmlFor="password">Hasło</label>
                    <input autoComplete="current-password" id="password" name="password" required type="password" />
                    <button disabled={busy} type="submit">{busy ? "Logowanie..." : "Zaloguj"}</button>
                    <p className="message" role="status">{message}</p>
                </form>
                <p>Nie masz konta? <Link href="/register">Zarejestruj się</Link>.</p>
            </main>
        </>
    );
}