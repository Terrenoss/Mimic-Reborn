import { useEffect, useState } from "react";
import { lcu, useLcuObserve } from "../../lib/lcu";
import { gameModeName } from "../../lib/static-data";
import { useT } from "../../lib/i18n";
import CreateLobby from "./CreateLobby";
import LobbyMember from "./LobbyMember";
import RolePicker from "./RolePicker";
import InviteOverlay from "./InviteOverlay";
import "./lobby.css";

export default function Lobby() {
    const t = useT();
    const lobby = useLcuObserve<any>("/lol-lobby/v2/lobby");
    const search = useLcuObserve<any>("/lol-matchmaking/v1/search");
    const [queueName, setQueueName] = useState("");
    const [showRolePicker, setShowRolePicker] = useState(false);
    const [showInvites, setShowInvites] = useState(false);

    const queueId = lobby?.gameConfig?.queueId;
    useEffect(() => {
        if (queueId == null || queueId === -1) return;
        lcu.get(`/lol-game-queues/v1/queues/${queueId}`).then(r => {
            if (r.status === 200) setQueueName(r.content.description ?? r.content.shortName ?? "");
        });
    }, [queueId]);

    // Hidden during queue / ready check / champ select overlays (they sit on top),
    // and replaced by the queue picker when there is no lobby at all.
    if (!lobby) return <CreateLobby />;

    const config = lobby.gameConfig ?? {};
    const localMember = lobby.localMember ?? {};
    const members: any[] = [localMember, ...(lobby.members ?? []).filter((m: any) => m.summonerId !== localMember.summonerId)];
    const showPositions = config.showPositionSelector;
    const isSearching = search && search.searchState !== "Invalid" && search.searchState !== "Canceled";

    return (
        <div className="screen lobby-screen fade-in">
            <h1 className="screen-title">{queueName || t("lobby.title")}</h1>
            <p className="screen-subtitle">{gameModeName(config.mapId, config.gameMode)}</p>

            <div className="lobby-members">
                {members.map(member => (
                    <LobbyMember
                        key={member.summonerId}
                        member={member}
                        isLocal={member.summonerId === localMember.summonerId}
                        localIsLeader={localMember.isLeader}
                        showPositions={showPositions}
                        onPickRoles={() => setShowRolePicker(true)}
                    />
                ))}
            </div>

            <div className="lobby-actions">
                {lobby.canStartActivity && (
                    <button
                        className="lcu-button confirm"
                        disabled={!!isSearching}
                        onClick={() => lcu.post("/lol-lobby/v2/lobby/matchmaking/search")}>
                        {t("lobby.findMatch")}
                    </button>
                )}
                <button className="lcu-button" onClick={() => setShowInvites(true)}>
                    {t("lobby.invitePlayers")}
                </button>
                <button className="lcu-button deny" onClick={() => lcu.del("/lol-lobby/v2/lobby")}>
                    {t("lobby.leave")}
                </button>
            </div>

            {showRolePicker && (
                <RolePicker
                    current={localMember}
                    onClose={() => setShowRolePicker(false)}
                    onSelect={(first, second) => {
                        lcu.put("/lol-lobby/v2/lobby/members/localMember/position-preferences", {
                            firstPreference: first,
                            secondPreference: second
                        });
                        setShowRolePicker(false);
                    }}
                />
            )}
            {showInvites && <InviteOverlay onClose={() => setShowInvites(false)} />}
        </div>
    );
}
