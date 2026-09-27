import type { AppProps } from "next/app";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import "leaflet/dist/leaflet.css";
import "../assets/css/base.css";
import "../assets/css/simple.css";
import "../assets/css/home.css";
import "../assets/css/404.css";
import "../assets/css/register.css";


export default function App({ Component, pageProps }: AppProps) {
    return (
        <>
            <Header />
            <Component {...pageProps} />
            <Footer />
        </>
    );
}