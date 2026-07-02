import { POSITION_NAMES, centeredSplashUrl, splashUrl, summonerSpellUrl } from "../../lib/static-data";
import { actionsForCell, useChampSelect } from "./ChampSelect";

function MemberCard({ member, isEnemy }: { member: any; isEnemy: boolean }) {
    const { session, champions, summonerSpells, ddragonVersion, localPlayerCellId, openOverlay } = useChampSelect();

    const champion = champions[member.championId] ?? champions[member.championPickIntent] ?? null;
    const isIntent = !member.championId && !!member.championPickIntent;
    const isLocal = member.cellId === localPlayerCellId;

    const activeAction = actionsForCell(session, member.cellId).find((a: any) => a.isInProgress && !a.completed);
    const skinIndex = champion && member.selectedSkinId
        ? member.selectedSkinId - member.championId * 1000
        : 0;

    const spell1 = summonerSpells[member.spell1Id];
    const spell2 = summonerSpells[member.spell2Id];

    const handleTap = () => {
        if (!isLocal || !activeAction) return;
        openOverlay(activeAction.type === "ban" ? "ban" : "pick", activeAction.id);
    };

    return (
        <div
            className={
                "cs-member" +
                (isLocal ? " local" : "") +
                (activeAction ? " acting" : "") +
                (isIntent ? " intent" : "")
            }
            onClick={handleTap}>
            {champion && (
                <img
                    className="cs-member-splash"
                    src={centeredSplashUrl(+champion.key, skinIndex)}
                    onError={e => {
                        (e.target as HTMLImageElement).src = splashUrl(champion.id, skinIndex);
                    }}
                    alt=""
                />
            )}
            <div className="cs-member-shade" />
            <div className="cs-member-info">
                <span className="cs-member-name">{member.summonerName || member.gameName || (isEnemy ? "Enemy" : "Teammate")}</span>
                <span className="cs-member-sub">
                    {champion ? champion.name : activeAction ? (activeAction.type === "ban" ? "Banning..." : "Picking...") : ""}
                    {member.assignedPosition && ` · ${POSITION_NAMES[member.assignedPosition.toUpperCase()] ?? member.assignedPosition}`}
                </span>
            </div>
            {!isEnemy && (spell1 || spell2) && (
                <div className="cs-member-spells">
                    {spell1 && <img src={summonerSpellUrl(ddragonVersion, spell1.id)} alt={spell1.name} />}
                    {spell2 && <img src={summonerSpellUrl(ddragonVersion, spell2.id)} alt={spell2.name} />}
                </div>
            )}
        </div>
    );
}

export default function Members() {
    const { session } = useChampSelect();
    const showEnemies = (session.theirTeam ?? []).length > 0;

    return (
        <div className="cs-members">
            {(session.myTeam ?? []).map((member: any) => (
                <MemberCard key={member.cellId} member={member} isEnemy={false} />
            ))}
            {showEnemies && <div className="cs-members-divider">Enemy Team</div>}
            {(session.theirTeam ?? []).map((member: any) => (
                <MemberCard key={member.cellId} member={member} isEnemy={true} />
            ))}
        </div>
    );
}
