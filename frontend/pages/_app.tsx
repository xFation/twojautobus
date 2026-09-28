import type { AppProps } from "next/app";
import Head from "next/head";
import { useRouter } from "next/router";
import Header from "@/components/Header";
import Footer from "@/components/Footer";


export default function App({ Component, pageProps }: AppProps) {
    const { pathname } = useRouter();
    const pageStyles: Record<string, string> = {
        "/": "/css/home.css",
        "/home": "/css/home.css",
        "/login": "/css/login.css",
        "/register": "/css/register.css",
        "/404": "/css/404.css",
        "/kontakt": "/css/kontakt.css",
    };

    return (
        <>
            <Head>
                <link rel="stylesheet" href="/css/base.css" />
                {pageStyles[pathname] && <link rel="stylesheet" href={pageStyles[pathname]} />}
                {pathname === "/map" && <link rel="stylesheet" href="/css/leaflet.css" />}
            </Head>
            <Header />
            <Component {...pageProps} />
            <Footer />
        </>
    );
}