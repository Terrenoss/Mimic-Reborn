import { useMemo, useState } from "react";
import { lcu, useLcuObserve } from "../../lib/lcu";
import { championSquareUrl } from "../../lib/static-data";
import { actionsForCell, useChampSelect } from "./ChampSelect";

export default function ChampionPicker(props: { mode: "pick" | "ban"; actionId?: number; onClose: () => void }) {
    const { session, champions, ddragonVersion, localPlayerCellId } = useChampSelect();
    const pickable = useLcuObserve<number[]>("/lol-champ-select/v1/pickable-champion-ids");
    const bannable = useLcuObserve<number[]>("/lol-champ-select/v1/bannable-champion-ids");
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState<number | null>(null);

    const isBan = props.mode === "ban";
    const availableIds = (isBan ? bannable : pickable) ?? [];

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
            .sort((a, b) => a.data.name.localeCompare(b.data.name));
    }, [availableIds, champions, search, takenIds]);

    const action = props.actionId != null
        ? (session.actions ?? []).flat().find((a: any) => a.id === props.actionId)
        : actionsForCell(session, localPlayerCellId).find((a: any) => a.isInProgress && !a.completed);

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
            <h2 className="screen-title">{isBan ? "Ban a champion" : "Pick your champion"}</h2>
            <input
                className="champion-picker-search"
                placeholder="Search..."
                value={search}
                onChange={e => setSearch(e.target.value)}
            />

            <div className="champion-picker-grid">
                {list.map(({ id, data }) => (
                    <button
                        key={id}
                        className={"champion-cell" + (selected === id ? " selected" : "")}
                        onClick={() => hover(id)}>
                        <img src={championSquareUrl(ddragonVersion, data.id)} alt={data.name} loading="lazy" />
                        <span>{data.name}</span>
                    </button>
                ))}
            </div>

            <div className="champion-picker-actions">
                <button className={"lcu-button " + (isBan ? "deny" : "confirm")} disabled={selected == null} onClick={lockIn}>
                    {isBan ? "Ban" : "Lock In"}
                </button>
                <button className="lcu-button" onClick={props.onClose}>
                    Close
                </button>
            </div>
        </div>
    );
}
