// Stable per-browser identity so Conduit only asks for approval once.
export function getDeviceId(): string {
    let id = localStorage.getItem("deviceID");
    if (!id) {
        id = crypto.randomUUID
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        localStorage.setItem("deviceID", id);
    }
    return id;
}

export function getDeviceDescription(): { device: string; browser: string } {
    const ua = navigator.userAgent;

    let device = "Computer";
    if (/iPhone/.test(ua)) device = "iPhone";
    else if (/iPad/.test(ua)) device = "iPad";
    else if (/Android/.test(ua)) device = "Android device";

    let browser = "unknown browser";
    if (/Firefox\//.test(ua)) browser = "Firefox";
    else if (/EdgA?\//.test(ua)) browser = "Edge";
    else if (/OPR\//.test(ua)) browser = "Opera";
    else if (/SamsungBrowser\//.test(ua)) browser = "Samsung Internet";
    else if (/Chrome\//.test(ua)) browser = "Chrome";
    else if (/Safari\//.test(ua)) browser = "Safari";

    return { device, browser };
}
