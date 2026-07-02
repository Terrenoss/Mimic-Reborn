import { ConnectionState } from "../../lib/socket";
import { useConnection } from "../../lib/store";
import { getLocale, LOCALES, setLocale, useT, type MessageKey } from "../../lib/i18n";
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
    const content = CONTENT[state] ?? CONTENT[ConnectionState.IDLE];

    return (
        <div className="screen connect-screen fade-in">
            <h1 className="connect-logo">MIMIC</h1>
            <img className="connect-poro" src={content.poro} alt="" />
            <h2 className="screen-title">{t(content.title)}</h2>
            <p className="connect-text">{t(content.text)}</p>
            {content.retry && (
                <button className="lcu-button" onClick={() => connect()}>
                    {t("connect.retry")}
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
