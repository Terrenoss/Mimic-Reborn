import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
    appId: "app.mimicreborn",
    appName: "Mimic",
    webDir: "dist",
    server: {
        // Serve the WebView over http://localhost so plain ws:// connections
        // to the PC on the LAN are not blocked as mixed content.
        androidScheme: "http",
        cleartext: true
    },
    android: {
        allowMixedContent: true
    }
};

export default config;
