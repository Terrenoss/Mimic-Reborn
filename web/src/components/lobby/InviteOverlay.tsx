import { useState } from "react";
import { lcu, useLcuObserve } from "../../lib/lcu";

export default function InviteOverlay(props: { onClose: () => void }) {
    const suggested = useLcuObserve<any[]>("/lol-suggested-players/v1/suggested-players");
    const [name, setName] = useState("");
    const [feedback, setFeedback] = useState("");
    const [invited, setInvited] = useState<Set<number>>(new Set());

    const invite = async (summonerId: number) => {
        await lcu.post("/lol-lobby/v2/lobby/invitations", [{ toSummonerId: summonerId }]);
        setInvited(prev => new Set(prev).add(summonerId));
    };

    const inviteByName = async () => {
        if (!name.trim()) return;
        const result = await lcu.get(`/lol-summoner/v1/summoners?name=${encodeURIComponent(name.trim())}`);
        if (result.status !== 200) {
            setFeedback(`Could not find "${name.trim()}".`);
            return;
        }
        await invite(result.content.summonerId);
        setFeedback(`Invited ${name.trim()}!`);
        setName("");
    };

    return (
        <div className="overlay fade-in invite-overlay">
            <h2 className="screen-title">Invite Players</h2>

            <div className="invite-search">
                <input
                    value={name}
                    placeholder="Summoner name..."
                    onChange={e => {
                        setName(e.target.value);
                        setFeedback("");
                    }}
                    onKeyDown={e => e.key === "Enter" && inviteByName()}
                />
                <button className="lcu-button" onClick={inviteByName}>
                    Invite
                </button>
            </div>
            {feedback && <p className="invite-feedback">{feedback}</p>}

            <div className="invite-suggestions">
                {(suggested ?? []).map(player => (
                    <div key={player.summonerId} className="invite-suggestion">
                        <span>{player.summonerName}</span>
                        <button
                            className="lcu-button"
                            disabled={invited.has(player.summonerId)}
                            onClick={() => invite(player.summonerId)}>
                            {invited.has(player.summonerId) ? "Invited" : "Invite"}
                        </button>
                    </div>
                ))}
                {suggested?.length === 0 && <p className="invite-feedback">No recent players to suggest.</p>}
            </div>

            <div className="lobby-actions">
                <button className="lcu-button" onClick={props.onClose}>
                    Close
                </button>
            </div>
        </div>
    );
}
