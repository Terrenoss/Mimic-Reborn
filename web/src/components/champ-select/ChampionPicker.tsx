import { useMemo, useState } from "react";
import { lcu, useLcuObserve } from "../../lib/lcu";
import { championSquareUrl } from "../../lib/static-data";
import { useT } from "../../lib/i18n";
import { loadFavorites, toggleFavorite } from "../../lib/favorites";
import { roleImage } from "../lobby/roles";
import { actionsForCell, useChampSelect } from "./ChampSelect";

const ROLE_TABS = ["TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY"];

export default function ChampionPicker(props: { mode: "pick" | "ban"; actionId?: number; onClose: () => void }) {
    const { session, champions, ddragonVersion, localPlayerCellId } = useChampSelect();
    const pickable = useLcuObserve<number[]>("/lol-champ-select/v1/pickable-champion-ids");
    const bannable = useLcuObserve<number[]>("/lol-champ-select/v1/bannable-champion-ids");
    // The client's own champion/position mapping, used for its rune suggestions.
    const positions = useLcuObserve<any>("/lol-perks/v1/recommended-champion-positions");
    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState<string>("ALL");
    const [favorites, setFavorites] = useState<Set<number>>(loadFavorites);
    const [selected, setSelected] = useState<number | null>(null);
    const t = useT();

    const isBan = props.mode === "ban";
    // The LCU sometimes reports an empty bannable/pickable list until the
    // action actually starts; fall back to the full roster so the grid is
    // never blank (illegal choices are simply rejected by the LCU).
    const reported = (isBan ? bannable : pickable) ?? [];
    const availableIds = reported.length > 0 ? reported : Object.keys(champions).map(Number);

    const positionsFor = (championId: number): string[] => {
        const entry = positions?.[championId];
        const list = Array.isArray(entry) ? entry : entry?.recommendedPositions;
        return Array.isArray(list) ? list.map((p: string) => p.toUpperCase()) : [];
    };
    const hasPositionData = positions != null && Object.keys(positions).length > 0;

    // Champions already picked/banned can't be chosen again.
    const takenIds = useMemo(() => {
        const actions = (session.actions ?? []).flat().filter((a: any) => a.completed);
        const picked = [...(session.myTeam ?? []), ...(session.theirTeam ?? [])].map((m: any) => m.championId);
        return new Set([...actions.map((a: any) => a.championId), ...picked].filter(Boolean));
    }, [session]);

    const list = useMemo(() => {
        const query = search.trim().toLowerCase();
        return availableIds
            .map(id => ({ id, data: champions[id] }))
            .filter(({ id, data }) => data && !takenIds.has(id))
            .filter(({ data }) => !query || data.name.toLowerCase().includes(query))
            .filter(({ id }) => {
                if (roleFilter === "ALL") return true;
                if (roleFilter === "FAV") return favorites.has(id);
                return positionsFor(id).includes(roleFilter);
            })
            .sort((a, b) => {
                const favDiff = +favorites.has(b.id) - +favorites.has(a.id);
                return favDiff !== 0 ? favDiff : a.data.name.localeCompare(b.data.name);
            });
    }, [availableIds, champions, search, takenIds, roleFilter, favorites, positions]);

    const action = props.actionId != null
        ? (session.actions ?? []).flat().find((a: any) => a.id === props.actionId)
        : actionsForCell(session, localPlayerCellId).find((a: any) => a.isInProgress && !a.completed);
    // During PLANNING we can hover (declare intent) but not lock in yet.
    const canComplete = !!action?.isInProgress;

    const hover = async (championId: number) => {
        setSelected(championId);
        if (action) await lcu.patch(`/lol-champ-select/v1/session/actions/${action.id}`, { championId });
    };

    const lockIn = async () => {
        if (!action || selected == null) return;
        await lcu.patch(`/lol-champ-select/v1/session/actions/${action.id}`, {
            championId: selected,
            completed: true
        });
        props.onClose();
    };

    return (
        <div className="overlay fade-in champion-picker">
            <h2 className="screen-title">{isBan ? t("picker.banTitle") : t("picker.pickTitle")}</h2>
            <input
                className="champion-picker-search"
                placeholder={t("picker.search")}
                value={search}
                onChange={e => setSearch(e.target.value)}
            />

            <div className="champion-picker-tabs">
                <button
                    className={"picker-tab" + (roleFilter === "ALL" ? " active" : "")}
                    onClick={() => setRoleFilter("ALL")}>
                    {t("picker.all")}
                </button>
                <button
                    className={"picker-tab" + (roleFilter === "FAV" ? " active" : "")}
                    onClick={() => setRoleFilter("FAV")}>
                    ★
                </button>
                {hasPositionData && ROLE_TABS.map(role => (
                    <button
                        key={role}
                        className={"picker-tab" + (roleFilter === role ? " active" : "")}
                        onClick={() => setRoleFilter(role)}>
                        <img src={roleImage(role)} alt={role} />
                    </button>
                ))}
            </div>

            <div className="champion-picker-grid">
                {list.map(({ id, data }) => (
                    <div key={id} className="champion-cell-wrap">
                        <button
                            className={"champion-cell" + (selected === id ? " selected" : "")}
                            onClick={() => hover(id)}>
                            <img src={championSquareUrl(ddragonVersion, data.id)} alt={data.name} loading="lazy" />
                            <span>{data.name}</span>
                        </button>
                        <button
                            className={"champion-cell-fav" + (favorites.has(id) ? " active" : "")}
                            onClick={e => {
                                e.stopPropagation();
                                setFavorites(f => toggleFavorite(f, id));
                            }}>
                            ★
                        </button>
                    </div>
                ))}
            </div>

            <div className="champion-picker-actions">
                <button
                    className={"lcu-button " + (isBan ? "deny" : "confirm")}
                    disabled={selected == null || !canComplete}
                    onClick={lockIn}>
                    {isBan ? t("picker.ban") : t("picker.lockIn")}
                </button>
                <button className="lcu-button" onClick={props.onClose}>
                    {t("picker.close")}
                </button>
            </div>
        </div>
    );
}
