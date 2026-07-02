import { useMemo, useState } from "react";
import { lcu, useLcuObserve } from "../../lib/lcu";
import mapSr from "../../assets/maps/sr-default.png";
import mapSrActive from "../../assets/maps/sr-active.png";
import mapHa from "../../assets/maps/ha-default.png";
import mapHaActive from "../../assets/maps/ha-active.png";
import mapTft from "../../assets/maps/tft-default.png";
import mapTftActive from "../../assets/maps/tft-active.png";
import mapRgm from "../../assets/maps/rgm-default.png";
import mapRgmActive from "../../assets/maps/rgm-active.png";

interface Section {
    id: string;
    name: string;
    icon: string;
    activeIcon: string;
    matches: (queue: any) => boolean;
}

const SECTIONS: Section[] = [
    { id: "sr", name: "Summoner's Rift", icon: mapSr, activeIcon: mapSrActive, matches: q => q.mapId === 11 && (q.gameMode === "CLASSIC" || q.gameMode === "SWIFTPLAY" || q.gameMode === "TUTORIAL") },
    { id: "ha", name: "ARAM", icon: mapHa, activeIcon: mapHaActive, matches: q => q.mapId === 12 },
    { id: "tft", name: "Teamfight Tactics", icon: mapTft, activeIcon: mapTftActive, matches: q => q.gameMode === "TFT" },
    { id: "rgm", name: "Featured", icon: mapRgm, activeIcon: mapRgmActive, matches: () => true }
];

export default function CreateLobby() {
    const queues = useLcuObserve<any[]>("/lol-game-queues/v1/queues");
    const [sectionId, setSectionId] = useState("sr");
    const [selectedQueue, setSelectedQueue] = useState<number | null>(null);

    // Same visibility rules the real client applies: PvP, currently available.
    const available = useMemo(
        () =>
            (queues ?? []).filter(
                q => q.queueAvailability === "Available" && q.category === "PvP" && q.gameMode !== "PRACTICETOOL"
            ),
        [queues]
    );

    const sections = useMemo(() => {
        const claimed = new Set<number>();
        return SECTIONS.map(section => {
            const sectionQueues = available.filter(q => !claimed.has(q.id) && section.matches(q));
            for (const q of sectionQueues) claimed.add(q.id);
            return { ...section, queues: sectionQueues };
        }).filter(s => s.queues.length > 0);
    }, [available]);

    const activeSection = sections.find(s => s.id === sectionId) ?? sections[0];

    return (
        <div className="screen lobby-screen fade-in">
            <h1 className="screen-title">Play</h1>
            <p className="screen-subtitle">Choose a game mode</p>

            <div className="create-lobby-maps">
                {sections.map(section => (
                    <button
                        key={section.id}
                        className={"create-lobby-map" + (section.id === activeSection?.id ? " active" : "")}
                        onClick={() => {
                            setSectionId(section.id);
                            setSelectedQueue(null);
                        }}>
                        <img src={section.id === activeSection?.id ? section.activeIcon : section.icon} alt="" />
                        <span>{section.name}</span>
                    </button>
                ))}
            </div>

            <div className="create-lobby-queues">
                {activeSection?.queues.map((queue: any) => (
                    <button
                        key={queue.id}
                        className={"create-lobby-queue" + (queue.id === selectedQueue ? " selected" : "")}
                        onClick={() => setSelectedQueue(queue.id)}>
                        {queue.description || queue.shortName}
                    </button>
                ))}
                {!queues && <p className="create-lobby-loading">Loading queues...</p>}
            </div>

            <div className="lobby-actions">
                <button
                    className="lcu-button confirm"
                    disabled={selectedQueue == null}
                    onClick={() => lcu.post("/lol-lobby/v2/lobby", { queueId: selectedQueue })}>
                    Create Lobby
                </button>
            </div>
        </div>
    );
}
