import { useEffect, useRef, useState } from "react";
import { ConnectionState } from "../../lib/socket";
import { useConnection } from "../../lib/store";
import { getLocale, LOCALES, setLocale, useT, type MessageKey } from "../../lib/i18n";
import { getStoredHost, isNative, scanQrCode, setStoredHost } from "../../lib/native";
import { discoverConduit } from "../../lib/discovery";
import poroCoolguy from "../../assets/poros/poro-coolguy.png";
import poroQuestion from "../../assets/poros/poro-question.png";
import poroAngry from "../../assets/poros/poro-angry.png";
import "./connect.css";

const CONTENT: Record<string, { poro: string; title: MessageKey; text: MessageKey; retry: boolean }> = {
    [ConnectionState.IDLE]: {
        poro: poroQuestion,
        title: "connect.idle.title",
        text: "connect.idle.text",
        retry: true
    },
    [ConnectionState.CONNECTING]: {
        poro: poroCoolguy,
        title: "connect.connecting.title",
        text: "connect.connecting.text",
        retry: false
    },
    [ConnectionState.HANDSHAKING]: {
        poro: poroCoolguy,
        title: "connect.handshaking.title",
        text: "connect.handshaking.text",
        retry: false
    },
    [ConnectionState.DENIED]: {
        poro: poroAngry,
        title: "connect.denied.title",
        text: "connect.denied.text",
        retry: true
    },
    [ConnectionState.DISCONNECTED]: {
        poro: poroQuestion,
        title: "connect.lost.title",
        text: "connect.lost.text",
        retry: true
    }
};

export default function ConnectScreen() {
    const { state, connect } = useConnection();
    const t = useT();
    const [host, setHost] = useState(getStoredHost() ?? "");
    const [searching, setSearching] = useState(false);
    const [searchProgress, setSearchProgress] = useState(0);
    const [searchFailed, setSearchFailed] = useState(false);
    const searchAbort = useRef<AbortController | null>(null);
    const content = CONTENT[state] ?? CONTENT[ConnectionState.IDLE];

    const connectToHost = () => {
        if (isNative && host.trim()) {
            const normalized = host.trim().includes(":") ? host.trim() : `${host.trim()}:51000`;
            setStoredHost(normalized);
            connect(normalized);
        } else {
            connect();
        }
    };

    // Sweeps the local network for a running Conduit — the zero-typing,
    // zero-camera way to pair.
    const searchNetwork = async () => {
        if (searching) return;
        setSearching(true);
        setSearchFailed(false);
        setSearchProgress(0);
        const controller = new AbortController();
        searchAbort.current = controller;
        const found = await discoverConduit(controller.signal, (done, total) =>
            setSearchProgress(Math.round((done / total) * 100))
        );
        searchAbort.current = null;
        setSearching(false);
        if (found) {
            setHost(found.host);
            setStoredHost(found.host);
            connect(found.host);
        } else if (!controller.signal.aborted) {
            setSearchFailed(true);
        }
    };

    const cancelSearch = () => {
        searchAbort.current?.abort();
        setSearching(false);
    };

    // First run on a fresh install: no address known yet, so start looking
    // for the PC right away instead of showing an empty input.
    useEffect(() => {
        if (isNative && !getStoredHost()) searchNetwork();
        return () => searchAbort.current?.abort();
    }, []);

    // Scans the QR code shown by Conduit's tray icon and connects directly,
    // so nobody has to type an IP address by hand.
    const scanAndConnect = async () => {
        const value = await scanQrCode();
        if (!value) return;
        let scannedHost: string | null = null;
        try {
            scannedHost = new URL(value).host;
        } catch {
            if (/^[\w.-]+(:\d+)?$/.test(value.trim())) scannedHost = value.trim();
        }
        if (!scannedHost) return;
        const normalized = scannedHost.includes(":") ? scannedHost : `${scannedHost}:51000`;
        setHost(normalized);
        setStoredHost(normalized);
        connect(normalized);
    };

    return (
        <div className="screen connect-screen fade-in">
            <h1 className="connect-logo">MIMIC</h1>
            <img className="connect-poro" src={content.poro} alt="" />
            <h2 className="screen-title">{t(content.title)}</h2>
            <p className="connect-text">{t(content.text)}</p>

            {isNative && searching && (
                <div className="connect-search fade-in">
                    <span className="connect-search-label">{t("connect.discover.searching")}</span>
                    <div className="connect-search-bar">
                        <div className="connect-search-fill" style={{ width: `${searchProgress}%` }} />
                    </div>
                    <button className="lcu-button" onClick={cancelSearch}>
                        {t("connect.discover.cancel")}
                    </button>
                </div>
            )}

            {isNative && !searching && (
                <>
                    {searchFailed && <p className="connect-search-failed">{t("connect.discover.notFound")}</p>}
                    <button className="lcu-button confirm connect-scan" onClick={searchNetwork}>
                        {t("connect.discover")}
                    </button>
                    <button className="lcu-button connect-scan" onClick={scanAndConnect}>
                        {t("connect.scanQr")}
                    </button>
                    <input
                        className="connect-host"
                        placeholder={t("connect.host.placeholder")}
                        value={host}
                        inputMode="decimal"
                        onChange={e => setHost(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && connectToHost()}
                    />
                </>
            )}

            {(content.retry || isNative) && !searching && (
                <button className="lcu-button" onClick={connectToHost}>
                    {isNative && !content.retry ? t("connect.host.connect") : t("connect.retry")}
                </button>
            )}

            <select
                className="connect-locale"
                aria-label={t("settings.language")}
                value={getLocale()}
                onChange={e => setLocale(e.target.value)}>
                {Object.entries(LOCALES).map(([code, { name }]) => (
                    <option key={code} value={code}>
                        {name}
                    </option>
                ))}
            </select>
        </div>
    );
}
