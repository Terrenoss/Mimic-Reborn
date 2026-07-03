import { useEffect, useState } from "react";
import { useT } from "../../lib/i18n";
import { getStoredHost, isNative } from "../../lib/native";

function isNewer(candidate: string, current: string): boolean {
    const a = candidate.split(".").map(Number);
    const b = current.split(".").map(Number);
    for (let i = 0; i < 3; i++) {
        if ((a[i] ?? 0) > (b[i] ?? 0)) return true;
        if ((a[i] ?? 0) < (b[i] ?? 0)) return false;
    }
    return false;
}

/**
 * Offers the APK cached by Conduit when it is newer than this app.
 * Native only — browser users always get the freshest UI from Conduit itself.
 */
export default function UpdateBanner() {
    const [available, setAvailable] = useState<string | null>(null);
    const [dismissed, setDismissed] = useState(false);
    const t = useT();

    useEffect(() => {
        if (!isNative) return;
        const host = getStoredHost();
        if (!host) return;
        fetch(`http://${host}/api/info`)
            .then(r => r.json())
            .then(info => {
                if (info?.apkVersion && isNewer(info.apkVersion, __APP_VERSION__)) {
                    setAvailable(info.apkVersion);
                }
            })
            .catch(() => {
                // Conduit unreachable over plain HTTP; nothing to offer.
            });
    }, []);

    if (!available || dismissed) return null;

    return (
        <div className="update-banner fade-in">
            <span>{t("update.available", { version: available })}</span>
            <div className="update-banner-actions">
                <button
                    className="lcu-button confirm"
                    onClick={() => window.open(`http://${getStoredHost()}/apk`, "_blank")}>
                    {t("update.download")}
                </button>
                <button className="lcu-button" onClick={() => setDismissed(true)}>
                    {t("update.later")}
                </button>
            </div>
        </div>
    );
}
