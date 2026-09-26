import { useEffect, useState } from "react";
import { searchStops } from "@/lib/api";
import type { Stop } from "@/types";

interface StopAutocompleteProps {
    id: string;
    label: string;
    placeholder: string;
    providerId: string;
    value: string;
    onValueChange: (value: string) => void;
    selectedStop: Stop | null;
    onSelect: (stop: Stop | null) => void;
    marker: "start" | "end";
}

export default function StopAutocomplete({
    id,
    label,
    placeholder,
    providerId,
    value,
    onValueChange,
    selectedStop,
    onSelect,
    marker,
}: StopAutocompleteProps) {
    const [suggestions, setSuggestions] = useState<Stop[]>([]);
    const [error, setError] = useState("");

    useEffect(() => {
        const normalizedQuery = value.trim();
        if (!providerId || normalizedQuery.length < 2 || selectedStop?.name === normalizedQuery) {
            setSuggestions([]);
            return;
        }

        let cancelled = false;
        const timer = window.setTimeout(async () => {
            try {
                const stops = await searchStops(providerId, normalizedQuery);
                if (!cancelled) {
                    setSuggestions(stops.slice(0, 12));
                    setError("");
                }
            } catch (requestError) {
                if (!cancelled) {
                    setSuggestions([]);
                    setError(requestError instanceof Error ? requestError.message : "Błąd wyszukiwania.");
                }
            }
        }, 250);

        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, [providerId, value, selectedStop]);

    function updateQuery(nextValue: string) {
        onValueChange(nextValue);
        setError("");
        onSelect(null);
    }

    function chooseStop(stop: Stop) {
        onValueChange(stop.name);
        setSuggestions([]);
        onSelect(stop);
    }

    return (
        <div className="field stop-field">
            <label className="field-label" htmlFor={id}>{label}</label>
            <span className="input-wrap">
                <span className={`stop-marker ${marker === "end" ? "marker-end" : "marker-start"}`} aria-hidden="true" />
                <input
                    autoComplete="off"
                    id={id}
                    onChange={(event) => updateQuery(event.target.value)}
                    placeholder={placeholder}
                    role="combobox"
                    aria-autocomplete="list"
                    aria-expanded={suggestions.length > 0}
                    value={value}
                />
            </span>
            {suggestions.length > 0 && (
                <div className="suggestions" role="listbox">
                    {suggestions.map((stop) => (
                        <button
                            className="suggestion-option"
                            key={stop.id}
                            onClick={() => chooseStop(stop)}
                            role="option"
                            type="button"
                        >
                            <span className="suggestion-name">{stop.name}</span>
                            <span className="suggestion-id">ID {stop.id}</span>
                        </button>
                    ))}
                </div>
            )}
            {error && <span className="form-error" role="alert">{error}</span>}
        </div>
    );
}