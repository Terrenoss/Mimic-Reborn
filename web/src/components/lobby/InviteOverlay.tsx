import { useState } from "react";
import { lcu, useLcuObserve } from "../../lib/lcu";
import { useT } from "../../lib/i18n";

export default function InviteOverlay(props: { onClose: () => void }) {
    const suggested = useLcuObserve<any[]>("/lol-suggested-players/v1/suggested-players");
    const [name, setName] = useState("");
    const [feedback, setFeedback] = useState("");
    const [invited, setInvited] = useState<Set<number>>(new Set());
    const t = useT();

    const invite = async (summonerId: number) => {
        await lcu.post("/lol-lobby/v2/lobby/invitations", [{ toSummonerId: summonerId }]);
        setInvited(prev => new Set(prev).add(summonerId));
    };

    const inviteByName = async () => {
        if (!name.trim()) return;
        const result = await lcu.get(`/lol-summoner/v1/summoners?name=${encodeURIComponent(name.trim())}`);
        if (result.status !== 200) {
            setFeedback(t("invite.notFound", { name: name.trim() }));
            return;
        }
        await invite(result.content.summonerId);
        setFeedback(t("invite.success", { name: name.trim() }));
        setName("");
    };

    return (
        <div className="overlay fade-in invite-overlay">
            <h2 className="screen-title">{t("invite.title")}</h2>

            <div className="invite-search">
                <input
                    value={name}
                    placeholder={t("invite.placeholder")}
                    onChange={e => {
                        setName(e.target.value);
                        setFeedback("");
                    }}
                    onKeyDown={e => e.key === "Enter" && inviteByName()}
                />
                <button className="lcu-button" onClick={inviteByName}>
                    {t("invite.action")}
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
                            {invited.has(player.summonerId) ? t("invite.invited") : t("invite.action")}
                        </button>
                    </div>
                ))}
                {suggested?.length === 0 && <p className="invite-feedback">{t("invite.noSuggestions")}</p>}
            </div>

            <div className="lobby-actions">
                <button className="lcu-button" onClick={props.onClose}>
                    {t("invite.close")}
                </button>
            </div>
        </div>
    );
}
