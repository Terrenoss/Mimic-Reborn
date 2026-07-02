import { createContext, useContext, useEffect, useState } from "react";
import { lcu, useLcuObserve } from "../../lib/lcu";
import { getDdragonVersion, loadStaticByKey } from "../../lib/static-data";
import Members from "./Members";
import Timer from "./Timer";
import ChampionPicker from "./ChampionPicker";
import PlayerSettings from "./PlayerSettings";
import SummonerPicker from "./SummonerPicker";
import SkinPicker from "./SkinPicker";
import Bench from "./Bench";
import RuneEditor from "./RuneEditor";
import magicBackground from "../../assets/magic-background.jpg";
import "./champ-select.css";

export type OverlayKind = "none" | "pick" | "ban" | "spells" | "skins" | "runes" | "bench";

export interface ChampSelectContextValue {
    session: any;
    ddragonVersion: string;
    champions: Record<number, any>;
    summonerSpells: Record<number, any>;
    localPlayerCellId: number;
    localPlayer: any;
    openOverlay: (overlay: OverlayKind, actionId?: number) => void;
}

const Context = createContext<ChampSelectContextValue | null>(null);
export const useChampSelect = () => useContext(Context)!;

/** Finds the member (ours or enemy) occupying a cell. */
export function memberByCell(session: any, cellId: number): any {
    return [...(session.myTeam ?? []), ...(session.theirTeam ?? [])].find((m: any) => m.cellId === cellId);
}

/** All actions concerning a cell, flattened. */
export function actionsForCell(session: any, cellId: number): any[] {
    return (session.actions ?? []).flat().filter((a: any) => a.actorCellId === cellId);
}

export default function ChampSelect() {
    const session = useLcuObserve<any>("/lol-champ-select/v1/session");
    const [ddragonVersion, setDdragonVersion] = useState<string>("");
    const [champions, setChampions] = useState<Record<number, any>>({});
    const [summonerSpells, setSummonerSpells] = useState<Record<number, any>>({});
    const [overlay, setOverlay] = useState<OverlayKind>("none");
    const [overlayActionId, setOverlayActionId] = useState<number | undefined>();

    useEffect(() => {
        getDdragonVersion().then(setDdragonVersion);
        loadStaticByKey("champion.json").then(setChampions);
        loadStaticByKey("summoner.json").then(setSummonerSpells);
    }, []);

    // Close overlays when champ select ends.
    useEffect(() => {
        if (!session) setOverlay("none");
    }, [session == null]);

    if (!session || !ddragonVersion || !Object.keys(champions).length) return null;

    const localPlayer = (session.myTeam ?? []).find((m: any) => m.cellId === session.localPlayerCellId);
    if (!localPlayer) return null;

    const value: ChampSelectContextValue = {
        session,
        ddragonVersion,
        champions,
        summonerSpells,
        localPlayerCellId: session.localPlayerCellId,
        localPlayer,
        openOverlay: (kind, actionId) => {
            setOverlay(kind);
            setOverlayActionId(actionId);
        }
    };

    return (
        <Context.Provider value={value}>
            <div className="overlay champ-select fade-in" style={{ backgroundImage: `url(${magicBackground})` }}>
                <Timer />
                <Members />
                {session.benchEnabled && <Bench />}
                <PlayerSettings />

                {(overlay === "pick" || overlay === "ban") && (
                    <ChampionPicker mode={overlay} actionId={overlayActionId} onClose={() => setOverlay("none")} />
                )}
                {overlay === "spells" && <SummonerPicker onClose={() => setOverlay("none")} />}
                {overlay === "skins" && <SkinPicker onClose={() => setOverlay("none")} />}
                {overlay === "runes" && <RuneEditor onClose={() => setOverlay("none")} />}
            </div>
        </Context.Provider>
    );
}
