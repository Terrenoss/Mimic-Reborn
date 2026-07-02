import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In dev, the UI is served by Vite but the websocket is proxied to a locally
// running Conduit. In production, Conduit serves the built files itself so
// everything is same-origin.
export default defineConfig({
    plugins: [react()],
    server: {
        proxy: {
            "/mobile": {
                target: "ws://localhost:51000",
                ws: true
            },
            "/api": {
                target: "http://localhost:51000"
            }
        }
    },
    build: {
        outDir: "dist"
    }
});
