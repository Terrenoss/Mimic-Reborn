import { ConnectionState } from "../../lib/socket";
import { useConnection } from "../../lib/store";
import poroCoolguy from "../../assets/poros/poro-coolguy.png";
import poroQuestion from "../../assets/poros/poro-question.png";
import poroAngry from "../../assets/poros/poro-angry.png";
import "./connect.css";

const CONTENT: Record<string, { poro: string; title: string; text: string; retry: boolean }> = {
    [ConnectionState.IDLE]: {
        poro: poroQuestion,
        title: "Not connected",
        text: "Mimic could not reach Conduit. Make sure Mimic Conduit is running on your computer and that your phone is on the same Wi-Fi network.",
        retry: true
    },
    [ConnectionState.CONNECTING]: {
        poro: poroCoolguy,
        title: "Connecting...",
        text: "Contacting your computer.",
        retry: false
    },
    [ConnectionState.HANDSHAKING]: {
        poro: poroCoolguy,
        title: "Almost there!",
        text: "Check your computer — Mimic is asking for permission to let this device connect.",
        retry: false
    },
    [ConnectionState.DENIED]: {
        poro: poroAngry,
        title: "Connection denied",
        text: "The connection was denied on your computer. Approve this device in the prompt shown by Mimic Conduit to continue.",
        retry: true
    },
    [ConnectionState.DISCONNECTED]: {
        poro: poroQuestion,
        title: "Connection lost",
        text: "The connection to your computer was lost. Conduit may have been closed.",
        retry: true
    }
};

export default function ConnectScreen() {
    const { state, connect } = useConnection();
    const content = CONTENT[state] ?? CONTENT[ConnectionState.IDLE];

    return (
        <div className="screen connect-screen fade-in">
            <h1 className="connect-logo">MIMIC</h1>
            <img className="connect-poro" src={content.poro} alt="" />
            <h2 className="screen-title">{content.title}</h2>
            <p className="connect-text">{content.text}</p>
            {content.retry && (
                <button className="lcu-button" onClick={() => connect()}>
                    Retry
                </button>
            )}
        </div>
    );
}
