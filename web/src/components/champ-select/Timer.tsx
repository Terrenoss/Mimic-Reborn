import { useEffect, useState } from "react";
import { NO_BAN_ICON, championSquareUrl } from "../../lib/static-data";
import { t } from "../../lib/i18n";
import { memberName } from "../../lib/summoner-names";
import { memberByCell, useChampSelect } from "./ChampSelect";

function phaseLabel(session: any): string {
    const timerPhase = session.timer?.phase;
    if (timerPhase === "PLANNING") return t("cs.planning");
    if (timerPhase === "FINALIZATION") return t("cs.finalization");

    const activeActions = (session.actions ?? []).flat().filter((a: any) => a.isInProgress && !a.completed);
    if (activeActions.length === 0) return t("cs.waiting");

    const action = activeActions[0];
    const member = memberByCell(session, action.actorCellId);
    const isBan = action.type === "ban";
    if (action.actorCellId === session.localPlayerCellId) {
        return isBan ? t("cs.youBanning") : t("cs.youPicking");
    }
    const name = memberName(member) || "?";
    return isBan ? t("cs.otherBanning", { name }) : t("cs.otherPicking", { name });
}

function BanRow({ actions, champions, version }: { actions: any[]; champions: Record<number, any>; version: string }) {
    return (
        <div className="ban-row">
            {actions.map(action => {
                const champion = champions[action.championId];
                return (
                    <img
                        key={action.id}
                        className={"ban-icon" + (action.completed ? "" : " pending")}
                        src={champion ? championSquareUrl(version, champion.id) : NO_BAN_ICON}
                        alt={champion?.name ?? "No ban"}
                    />
                );
            })}
        </div>
    );
}

export default function Timer() {
    const { session, champions, ddragonVersion } = useChampSelect();
    const [remaining, setRemaining] = useState(0);

    const timerEnd = session.timer?.internalNowInEpochMs + session.timer?.adjustedTimeLeftInPhase;
    useEffect(() => {
        if (!session.timer) return;
        const target = Date.now() + (session.timer.adjustedTimeLeftInPhase ?? 0);
        const interval = setInterval(() => setRemaining(Math.max(0, Math.round((target - Date.now()) / 1000))), 200);
        return () => clearInterval(interval);
    }, [timerEnd]);

    const bans = (session.actions ?? []).flat().filter((a: any) => a.type === "ban");
    const ourBans = bans.filter((a: any) => memberByCell(session, a.actorCellId)?.team === session.myTeam?.[0]?.team
        || (session.myTeam ?? []).some((m: any) => m.cellId === a.actorCellId));
    const theirBans = bans.filter((a: any) => !ourBans.includes(a));

    return (
        <div className="cs-timer">
            <span className="cs-timer-count">{remaining}</span>
            <span className="cs-timer-phase">{phaseLabel(session)}</span>
            {bans.length > 0 && (
                <div className="cs-bans">
                    <BanRow actions={ourBans} champions={champions} version={ddragonVersion} />
                    <BanRow actions={theirBans} champions={champions} version={ddragonVersion} />
                </div>
            )}
        </div>
    );
}
