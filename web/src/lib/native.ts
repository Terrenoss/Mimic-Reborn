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

/**
 * Opens the system QR scanner (Google code scanner — no camera permission
 * needed) and returns the scanned text, or null if cancelled/unavailable.
 */
export async function scanQrCode(): Promise<string | null> {
    if (!isNative) return null;
    const { BarcodeScanner, BarcodeFormat } = await import("@capacitor-mlkit/barcode-scanning");
    try {
        // The scanner ships as an on-demand Play Services module; make sure
        // it is present the first time (no-op afterwards).
        const { available } = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();
        if (!available) await BarcodeScanner.installGoogleBarcodeScannerModule();
    } catch {
        // No Play Services or check failed — scan() below will surface it.
    }
    try {
        const { barcodes } = await BarcodeScanner.scan({ formats: [BarcodeFormat.QrCode] });
        return barcodes[0]?.rawValue ?? null;
    } catch {
        return null;
    }
}

// Screen wake lock: while Mimic is connected the phone should not go to sleep
// mid-queue or mid-champ-select. Uses the standard Wake Lock API (Android
// WebView and modern mobile browsers); silently unsupported elsewhere.
let wakeLock: any = null;

export async function keepAwake(on: boolean) {
    try {
        if (on && !wakeLock && "wakeLock" in navigator) {
            wakeLock = await (navigator as any).wakeLock.request("screen");
            wakeLock.addEventListener?.("release", () => {
                wakeLock = null;
            });
        } else if (!on && wakeLock) {
            const lock = wakeLock;
            wakeLock = null;
            await lock.release();
        }
    } catch {
        // Unsupported or denied (e.g. low battery mode) — not critical.
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
