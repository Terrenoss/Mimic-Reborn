import { useState } from "react";
import { ConnectionState } from "../../lib/socket";
import { useConnection } from "../../lib/store";
import { getLocale, LOCALES, setLocale, useT, type MessageKey } from "../../lib/i18n";
import { getStoredHost, isNative, setStoredHost } from "../../lib/native";
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

    return (
        <div className="screen connect-screen fade-in">
            <h1 className="connect-logo">MIMIC</h1>
            <img className="connect-poro" src={content.poro} alt="" />
            <h2 className="screen-title">{t(content.title)}</h2>
            <p className="connect-text">{t(content.text)}</p>

            {isNative && (
                <input
                    className="connect-host"
                    placeholder={t("connect.host.placeholder")}
                    value={host}
                    inputMode="decimal"
                    onChange={e => setHost(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && connectToHost()}
                />
            )}

            {(content.retry || isNative) && (
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
