import { useEffect, useRef, useState } from "react";
import { ConnectionState } from "./lib/socket";
import { useConnection } from "./lib/store";
import { keepAwake } from "./lib/native";
import { useT } from "./lib/i18n";
import ConnectScreen from "./components/connect/ConnectScreen";
import Lobby from "./components/lobby/Lobby";
import Invites from "./components/invites/Invites";
import Queue from "./components/queue/Queue";
import ReadyCheck from "./components/ready-check/ReadyCheck";
import ChampSelect from "./components/champ-select/ChampSelect";

export default function App() {
    const { state, connect } = useConnection();
    const t = useT();

    // Brief websocket drops happen (Wi-Fi power saving, app switches). Tearing
    // the whole UI down for those loses in-progress state like an open
    // champion picker, so ride them out and only fall back to the connect
    // screen when the connection stays down.
    const wasConnected = useRef(false);
    const [graceExpired, setGraceExpired] = useState(false);
    useEffect(() => {
        if (state === ConnectionState.CONNECTED) {
            wasConnected.current = true;
            setGraceExpired(false);
            return;
        }
        if (state === ConnectionState.DENIED) {
            setGraceExpired(true);
            return;
        }
        if (!wasConnected.current) return;
        const timer = setTimeout(() => setGraceExpired(true), 6000);
        return () => clearTimeout(timer);
    }, [state]);

    const reconnecting =
        state !== ConnectionState.CONNECTED &&
        state !== ConnectionState.DENIED &&
        wasConnected.current &&
        !graceExpired;

    // Auto-connect on load: in the LAN-first architecture the page is served
    // by Conduit itself, so the target host is simply our own origin.
    useEffect(() => {
        connect();
    }, []);

    // Keep the screen on while connected — losing the screen mid-queue means
    // missing the ready check. The lock is dropped by the OS when the app is
    // backgrounded, so re-acquire it whenever we become visible again.
    useEffect(() => {
        if (state !== ConnectionState.CONNECTED) {
            keepAwake(false);
            return;
        }
        keepAwake(true);
        const onVisible = () => {
            if (document.visibilityState === "visible") keepAwake(true);
        };
        document.addEventListener("visibilitychange", onVisible);
        return () => {
            document.removeEventListener("visibilitychange", onVisible);
            keepAwake(false);
        };
    }, [state]);

    if (state !== ConnectionState.CONNECTED && !reconnecting) {
        return <ConnectScreen />;
    }

    // Like Mimic v2: every feature panel is mounted and self-gates on LCU state.
    return (
        <>
            {reconnecting && <div className="reconnect-banner">{t("connect.reconnecting")}</div>}
            <Lobby />
            <Invites />
            <Queue />
            <ReadyCheck />
            <ChampSelect />
        </>
    );
}
