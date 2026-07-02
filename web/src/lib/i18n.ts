import { useSyncExternalStore } from "react";
import { en } from "../locales/en";
import { fr } from "../locales/fr";

// Deliberately tiny, dependency-free i18n. Adding a language = adding one
// file in src/locales and one entry in LOCALES below.
export type Messages = typeof en;
export type MessageKey = keyof Messages;

export const LOCALES: Record<string, { name: string; messages: Messages }> = {
    en: { name: "English", messages: en },
    fr: { name: "Français", messages: fr }
};

function detectLocale(): string {
    const saved = localStorage.getItem("locale");
    if (saved && LOCALES[saved]) return saved;
    const nav = navigator.language?.slice(0, 2).toLowerCase();
    return LOCALES[nav] ? nav : "en";
}

let current = detectLocale();
const listeners = new Set<() => void>();

export function setLocale(locale: string) {
    if (!LOCALES[locale]) return;
    current = locale;
    localStorage.setItem("locale", locale);
    listeners.forEach(l => l());
}

export function getLocale() {
    return current;
}

/** Translates a key, substituting {placeholders} from params. */
export function t(key: MessageKey, params?: Record<string, string | number>): string {
    let text: string = LOCALES[current].messages[key] ?? en[key] ?? key;
    if (params) {
        for (const [name, value] of Object.entries(params)) {
            text = text.replaceAll(`{${name}}`, String(value));
        }
    }
    return text;
}

/** Hook variant: re-renders the component when the locale changes. */
export function useT() {
    useSyncExternalStore(
        listener => {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        () => current
    );
    return t;
}
