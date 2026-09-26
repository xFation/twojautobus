import Link from "next/link";
import { useRouter } from "next/router";

const navigationItems = [
    { href: "/", label: "Start" },
    { href: "/wyniki", label: "Wyniki" },
    { href: "/map", label: "Mapa" },
    { href: "/login", label: "Logowanie" },
    { href: "/register", label: "Rejestracja" },
];

export default function Header() {
    const { pathname } = useRouter();

    return (
        <header className="topbar">
            <Link className="brand" href="/" aria-label="Twój Autobus, strona główna">
                <span className="brand-mark" aria-hidden="true">T</span>
                <span>Twój <span className="brand-light">Autobus</span></span>
            </Link>
            <nav className="main-nav" aria-label="Główna nawigacja">
                {navigationItems.map((item) => (
                    <Link
                        className={pathname === item.href ? "active" : undefined}
                        href={item.href}
                        key={item.href}
                        aria-current={pathname === item.href ? "page" : undefined}
                    >
                        {item.label}
                    </Link>
                ))}
            </nav>
        </header>
    );
}