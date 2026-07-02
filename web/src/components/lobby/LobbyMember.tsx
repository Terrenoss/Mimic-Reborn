import { useEffect, useState } from "react";
import { lcu } from "../../lib/lcu";
import { POSITION_NAMES, profileIconUrl } from "../../lib/static-data";
import { roleImage } from "./roles";

export default function LobbyMember(props: {
    member: any;
    isLocal: boolean;
    localIsLeader: boolean;
    showPositions: boolean;
    onPickRoles: () => void;
}) {
    const { member, isLocal, localIsLeader, showPositions } = props;
    const [icon, setIcon] = useState<string | null>(null);
    const [showActions, setShowActions] = useState(false);

    useEffect(() => {
        let cancelled = false;
        lcu.get(`/lol-summoner/v1/summoners/${member.summonerId}`).then(async r => {
            if (r.status !== 200 || cancelled) return;
            setIcon(await profileIconUrl(r.content.profileIconId));
        });
        return () => {
            cancelled = true;
        };
    }, [member.summonerId]);

    const first = member.firstPositionPreference;
    const second = member.secondPositionPreference;

    return (
        <div className={"lobby-member" + (isLocal ? " local" : "")}
             onClick={() => !isLocal && localIsLeader && setShowActions(v => !v)}>
            {icon ? <img className="member-avatar" src={icon} alt="" /> : <div className="member-avatar" />}

            <div className="member-info">
                <span className="member-name">
                    {member.summonerName || member.gameName || "Summoner"}
                    {member.isLeader && <span className="member-badge">★</span>}
                </span>
                {showPositions && (
                    <span className="member-roles" onClick={e => {
                        if (!isLocal) return;
                        e.stopPropagation();
                        props.onPickRoles();
                    }}>
                        {first && <img src={roleImage(first)} alt={POSITION_NAMES[first] ?? first} />}
                        {second && second !== "UNSELECTED" && first !== "FILL" && (
                            <img src={roleImage(second)} alt={POSITION_NAMES[second] ?? second} />
                        )}
                        {isLocal && <span className="member-roles-edit">edit</span>}
                    </span>
                )}
            </div>

            {showActions && !isLocal && localIsLeader && (
                <div className="member-actions">
                    <button className="lcu-button" onClick={() => lcu.post(`/lol-lobby/v2/lobby/members/${member.summonerId}/promote`)}>
                        Promote
                    </button>
                    <button
                        className="lcu-button"
                        onClick={() =>
                            lcu.post(`/lol-lobby/v2/lobby/members/${member.summonerId}/${member.allowedInviteOthers ? "revoke-invite" : "grant-invite"}`)
                        }>
                        {member.allowedInviteOthers ? "Revoke Invite" : "Allow Invite"}
                    </button>
                    <button className="lcu-button deny" onClick={() => lcu.post(`/lol-lobby/v2/lobby/members/${member.summonerId}/kick`)}>
                        Kick
                    </button>
                </div>
            )}
        </div>
    );
}
