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
    const liveSession = useLcuObserve<any>("/lol-champ-select/v1/session");
    // The LCU occasionally emits transient delete/404 events mid-select;
    // dropping the whole screen (and any open overlay) for those is jarring,
    // so only consider the session gone when it stays gone.
    const [session, setSession] = useState<any>(null);
    useEffect(() => {
        if (liveSession) {
            setSession(liveSession);
            return;
        }
        const timer = setTimeout(() => setSession(null), 2500);
        return () => clearTimeout(timer);
    }, [liveSession]);
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

    // Buzz when it becomes our turn to pick or ban — easy to miss on a phone.
    const myTurn = !!session && (session.actions ?? [])
        .flat()
        .some((a: any) => a.actorCellId === session.localPlayerCellId && a.isInProgress && !a.completed);
    useEffect(() => {
        if (myTurn) navigator.vibrate?.([150, 80, 150]);
    }, [myTurn]);

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
