import { lcu, useLcuObserve } from "../../lib/lcu";
import { POSITION_NAMES, centeredSplashUrl, splashUrl, summonerSpellUrl } from "../../lib/static-data";
import { t } from "../../lib/i18n";
import { memberName, useMemberNames } from "../../lib/summoner-names";
import { actionsForCell, memberByCell, useChampSelect } from "./ChampSelect";

function MemberCard({ member, isEnemy, trade }: { member: any; isEnemy: boolean; trade?: any }) {
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
        if (!isLocal) return;
        // During PLANNING the LCU may already flag the ban action as "in
        // progress", but the only meaningful move is declaring a pick intent —
        // banning opens (and fails) otherwise.
        if (session.timer?.phase === "PLANNING") {
            const pickAction = actionsForCell(session, member.cellId).find((a: any) => a.type === "pick" && !a.completed);
            if (pickAction) {
                openOverlay("pick", pickAction.id);
                return;
            }
        }
        if (activeAction) openOverlay(activeAction.type === "ban" ? "ban" : "pick", activeAction.id);
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
                <span className="cs-member-name">{memberName(member) || (isEnemy ? t("cs.enemy") : t("cs.teammate"))}</span>
                <span className="cs-member-sub">
                    {champion ? champion.name : activeAction ? (activeAction.type === "ban" ? t("cs.banning") : t("cs.picking")) : ""}
                    {member.assignedPosition && ` · ${POSITION_NAMES[member.assignedPosition.toUpperCase()] ?? member.assignedPosition}`}
                </span>
            </div>
            {trade && trade.state === "AVAILABLE" && (
                <button
                    className="cs-trade-button"
                    onClick={e => {
                        e.stopPropagation();
                        lcu.post(`/lol-champ-select/v1/session/trades/${trade.id}/request`);
                    }}>
                    ⇄
                </button>
            )}
            {trade && trade.state === "SENT" && (
                <button
                    className="cs-trade-button pending"
                    onClick={e => {
                        e.stopPropagation();
                        lcu.post(`/lol-champ-select/v1/session/trades/${trade.id}/cancel`);
                    }}>
                    …
                </button>
            )}
            {!isEnemy && (spell1 || spell2) && (
                <div className="cs-member-spells">
                    {spell1 && <img src={summonerSpellUrl(ddragonVersion, spell1.id)} alt={spell1.name} />}
                    {spell2 && <img src={summonerSpellUrl(ddragonVersion, spell2.id)} alt={spell2.name} />}
                </div>
            )}
        </div>
    );
}

/** Banner shown when a teammate asks to trade champions with us. */
function TradeRequest({ trade }: { trade: any }) {
    const { session, champions } = useChampSelect();
    const other = memberByCell(session, trade.cellId);
    const champion = other ? champions[other.championId] : null;
    const name = memberName(other) || t("cs.teammate");

    return (
        <div className="cs-trade-request">
            <span>{t("cs.trade.incoming", { name, champion: champion?.name ?? "?" })}</span>
            <div className="cs-trade-request-actions">
                <button
                    className="lcu-button confirm"
                    onClick={() => lcu.post(`/lol-champ-select/v1/session/trades/${trade.id}/accept`)}>
                    {t("cs.trade.accept")}
                </button>
                <button
                    className="lcu-button deny"
                    onClick={() => lcu.post(`/lol-champ-select/v1/session/trades/${trade.id}/decline`)}>
                    {t("cs.trade.decline")}
                </button>
            </div>
        </div>
    );
}

export default function Members() {
    const { session } = useChampSelect();
    const trades = useLcuObserve<any[]>("/lol-champ-select/v1/session/trades");
    useMemberNames([...(session.myTeam ?? []), ...(session.theirTeam ?? [])]);
    const showEnemies = (session.theirTeam ?? []).length > 0;

    const tradeFor = (cellId: number) => (trades ?? []).find((trade: any) => trade.cellId === cellId);
    const incoming = (trades ?? []).find((trade: any) => trade.state === "RECEIVED");

    return (
        <div className="cs-members">
            {incoming && <TradeRequest trade={incoming} />}
            {(session.myTeam ?? []).map((member: any) => (
                <MemberCard key={member.cellId} member={member} isEnemy={false} trade={tradeFor(member.cellId)} />
            ))}
            {showEnemies && <div className="cs-members-divider">{t("cs.enemyTeam")}</div>}
            {(session.theirTeam ?? []).map((member: any) => (
                <MemberCard key={member.cellId} member={member} isEnemy={true} />
            ))}
        </div>
    );
}
