import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

// Thin wrapper around Capacitor so the rest of the app stays platform-agnostic.
// In the browser these all no-op gracefully.

export const isNative = Capacitor.isNativePlatform();

export async function requestNotificationPermission() {
    if (!isNative) return;
    try {
        await LocalNotifications.requestPermissions();
    } catch {
        // User declined; queue pops will only alert while the app is open.
    }
}

let notificationId = 1;

/** Fires a system notification (native only). Used for queue pops while backgrounded. */
export async function notify(title: string, body: string) {
    if (!isNative) return;
    try {
        await LocalNotifications.schedule({
            notifications: [{ id: notificationId++, title, body }]
        });
    } catch {
        // Permission missing — nothing else to do.
    }
}

/** On native builds there is no meaningful window.location.host; the PC address is stored. */
export function getStoredHost(): string | null {
    return localStorage.getItem("conduitHost");
}

export function setStoredHost(host: string) {
    localStorage.setItem("conduitHost", host);
}

/** The host the socket should target, or null when we need to ask the user (native, first run). */
export function getDefaultHost(): string | null {
    if (!isNative) return window.location.host;
    return getStoredHost();
}
