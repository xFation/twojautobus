import Head from "next/head";
import Link from "next/link";

export default function NotFoundPage() {
    return (
        <>
            <Head><title>Nie znaleziono strony (404) | Twój Autobus</title></Head>
            <main>
                <section className="notfound-page" id="notfoundPage">
                    <div className="notfound-bg" aria-hidden="true">
                        <span className="bg-circle bg-circle--one" />
                        <span className="bg-circle bg-circle--two" />
                        <span className="bg-circle bg-circle--three" />
                        <span className="bg-grid" />
                    </div>
                    <div className="container notfound-container">
                        <div className="notfound-content">
                            <div className="notfound-brand"><span className="brand-dot" />Twój Autobus</div>
                            <div className="error-code" aria-label="Błąd 404"><span>4</span><span>0</span><span>4</span></div>
                            <div className="notfound-label">Błąd 404</div>
                            <h1 font-family="Aliar">Podstrona <span>nie istnieje.</span></h1>
                            <p className="notfound-description">
                                Strona, której szukasz, mogła zostać przeniesiona albo adres jest nieprawidłowy.
                            </p>
                            <div className="notfound-actions">
                                <Link className="btn btn-primary" href="/">Wróć na stronę główną</Link>
                            </div>
                            <nav className="quick-links" aria-label="Przydatne strony">
                                <Link className="quick-link" href="/map">Mapa przystanków</Link>
                                <Link className="quick-link" href="/wyniki">Wyniki wyszukiwania</Link>
                            </nav>
                        </div>
                        <div className="notfound-visual" aria-hidden="true">
                            <div className="visual-glow" />
                            <div className="visual-card">
                                <div className="visual-card-top"><span className="visual-dot" /><span className="visual-dot" /><span className="visual-dot" /></div>
                                <div className="visual-card-body">
                                    <div className="visual-error-number">404</div>
                                    <div className="visual-route">
                                        <span className="route-point route-point--active" />
                                        <span className="route-line"><span className="route-line-progress" /></span>
                                        <span className="route-point" />
                                    </div>
                                    <div className="visual-message"><strong>Brak podstrony</strong><span>Nie znaleziono wskazanego adresu</span></div>
                                </div>
                            </div>
                            <div className="floating-symbol floating-symbol--one">?</div>
                            <div className="floating-symbol floating-symbol--two">404</div>
                            <div className="floating-symbol floating-symbol--three">×</div>
                        </div>
                    </div>
                </section>
            </main>
        </>
    );
}