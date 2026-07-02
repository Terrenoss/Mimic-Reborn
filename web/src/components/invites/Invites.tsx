import { useEffect, useState } from "react";
import { lcu, useLcuObserve } from "../../lib/lcu";
import { gameModeName } from "../../lib/static-data";
import "./invites.css";

function Invite({ invite }: { invite: any }) {
    const [queueName, setQueueName] = useState("");

    useEffect(() => {
        const queueId = invite.gameConfig?.queueId;
        if (queueId == null) return;
        lcu.get(`/lol-game-queues/v1/queues/${queueId}`).then(r => {
            if (r.status === 200) setQueueName(r.content.description ?? "");
        });
    }, [invite.gameConfig?.queueId]);

    const mode = invite.gameConfig
        ? gameModeName(invite.gameConfig.mapId, invite.gameConfig.gameMode)
        : "";

    return (
        <div className="invite-card fade-in">
            <div className="invite-card-text">
                <span className="invite-card-name">{invite.fromSummonerName}</span>
                <span className="invite-card-queue">invites you to {queueName || mode}</span>
            </div>
            <div className="invite-card-buttons">
                <button
                    className="lcu-button confirm"
                    onClick={() => lcu.post(`/lol-lobby/v2/received-invitations/${invite.invitationId}/accept`)}>
                    Accept
                </button>
                <button
                    className="lcu-button deny"
                    onClick={() => lcu.post(`/lol-lobby/v2/received-invitations/${invite.invitationId}/decline`)}>
                    Decline
                </button>
            </div>
        </div>
    );
}

export default function Invites() {
    const invites = useLcuObserve<any[]>("/lol-lobby/v2/received-invitations");
    const pending = (invites ?? []).filter(i => i.state === "Pending" && i.canAcceptInvitation);

    if (pending.length === 0) return null;

    return (
        <div className="invites-container">
            {pending.map(invite => (
                <Invite key={invite.invitationId} invite={invite} />
            ))}
        </div>
    );
}
