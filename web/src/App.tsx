import { useEffect } from "react";
import { ConnectionState } from "./lib/socket";
import { useConnection } from "./lib/store";
import ConnectScreen from "./components/connect/ConnectScreen";
import Lobby from "./components/lobby/Lobby";
import Invites from "./components/invites/Invites";
import Queue from "./components/queue/Queue";
import ReadyCheck from "./components/ready-check/ReadyCheck";
import ChampSelect from "./components/champ-select/ChampSelect";

export default function App() {
    const { state, connect } = useConnection();

    // Auto-connect on load: in the LAN-first architecture the page is served
    // by Conduit itself, so the target host is simply our own origin.
    useEffect(() => {
        connect();
    }, []);

    if (state !== ConnectionState.CONNECTED) {
        return <ConnectScreen />;
    }

    // Like Mimic v2: every feature panel is mounted and self-gates on LCU state.
    return (
        <>
            <Lobby />
            <Invites />
            <Queue />
            <ReadyCheck />
            <ChampSelect />
        </>
    );
}
