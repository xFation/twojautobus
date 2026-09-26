import { useEffect, useRef, useState } from "react";
import type { LayerGroup, Map as LeafletMap } from "leaflet";
import type { Stop } from "@/types";

interface StopsMapProps {
    stops: Stop[];
}

export default function StopsMap({ stops }: StopsMapProps) {
    const elementRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<LeafletMap | null>(null);
    const layerRef = useRef<LayerGroup | null>(null);
    const leafletRef = useRef<typeof import("leaflet") | null>(null);
    const [mapReady, setMapReady] = useState(false);

    useEffect(() => {
        let cancelled = false;
        let createdMap: LeafletMap | null = null;

        async function initialize() {
            const leafletModule = await import("leaflet");
            if (cancelled || !elementRef.current) return;

            const leaflet = (
                (leafletModule as unknown as { default?: typeof import("leaflet") }).default ??
                leafletModule
            ) as typeof import("leaflet");
            leafletRef.current = leaflet;
            createdMap = leaflet.map(elementRef.current).setView([51.1, 19.4], 6);
            leaflet.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                maxZoom: 19,
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            }).addTo(createdMap);
            mapRef.current = createdMap;
            layerRef.current = leaflet.layerGroup().addTo(createdMap);
            setMapReady(true);
        }

        void initialize();
        return () => {
            cancelled = true;
            createdMap?.remove();
            mapRef.current = null;
            layerRef.current = null;
        };
    }, []);

    useEffect(() => {
        const map = mapRef.current;
        const layer = layerRef.current;
        const leaflet = leafletRef.current;
        if (!mapReady || !map || !layer || !leaflet) return;

        layer.clearLayers();
        const coordinates: [number, number][] = [];
        for (const stop of stops) {
            if (!Number.isFinite(stop.latitude) || !Number.isFinite(stop.longitude)) continue;
            const marker = leaflet.circleMarker([stop.latitude, stop.longitude], {
                radius: 5,
                color: "#245943",
                fillColor: "#f4b942",
                fillOpacity: 0.9,
            });
            const popup = document.createElement("div");
            const name = document.createElement("strong");
            name.textContent = stop.name;
            const id = document.createElement("div");
            id.textContent = `ID przystanku: ${stop.id}`;
            popup.append(name, id);
            marker.bindPopup(popup).addTo(layer);
            coordinates.push([stop.latitude, stop.longitude]);
        }

        if (coordinates.length) map.fitBounds(coordinates, { padding: [20, 20], maxZoom: 14 });
    }, [mapReady, stops]);

    return <div id="map" ref={elementRef} aria-label="Mapa OpenStreetMap z przystankami" />;
}