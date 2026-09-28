import Head from "next/head";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { login } from "@/lib/api";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");
    const [busy, setBusy] = useState(false);

    const isFormValid = email.trim() !== "" && password.trim() !== "";

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!isFormValid) return;

        setBusy(true);
        setMessage("Logowanie...");

        try {
            const result = await login(email, password);
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
                <p className="label">twojautobus.pl</p>
                <h1>Zaloguj się</h1>
                <form className="basic-form" onSubmit={handleSubmit}>
                    <label htmlFor="email">Adres e-mail</label>
                    <input 
                        autoComplete="email" 
                        id="email" 
                        name="email" 
                        required 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    
                    <label htmlFor="password">Hasło</label>
                    <input 
                        autoComplete="current-password" 
                        id="password" 
                        name="password" 
                        required 
                        type="password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    
                    <button disabled={busy || !isFormValid} type="submit">
                        {busy ? "Logowanie..." : "Zaloguj się"}
                    </button>
                    
                    <p className="message" role="status">{message}</p>
                    <p className="register">Nie masz konta? <Link className="register-link" href="/register">Zarejestruj się</Link>.</p>
                </form>
            </main>
        </>
    );
}
