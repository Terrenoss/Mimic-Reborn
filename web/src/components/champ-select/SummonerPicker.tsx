import { useEffect, useState } from "react";
import { lcu } from "../../lib/lcu";
import { summonerSpellUrl } from "../../lib/static-data";
import { useT } from "../../lib/i18n";
import { useChampSelect } from "./ChampSelect";

export default function SummonerPicker(props: { onClose: () => void }) {
    const { localPlayer, summonerSpells, ddragonVersion } = useChampSelect();
    const [gameModeSpells, setGameModeSpells] = useState<number[] | null>(null);
    const [replacing, setReplacing] = useState<1 | 2>(1);
    const t = useT();

    // The LCU knows which spells are legal in the current game mode.
    useEffect(() => {
        lcu.get("/lol-game-data/assets/v1/summoner-spells.json").then(async r => {
            if (r.status !== 200) return;
            const session = await lcu.get("/lol-gameflow/v1/session");
            const mode = session.content?.gameData?.queue?.gameMode ?? "CLASSIC";
            setGameModeSpells(
                r.content
                    .filter((s: any) => s.gameModes?.includes(mode))
                    .map((s: any) => s.id)
                    .filter((id: number) => summonerSpells[id])
            );
        });
    }, []);

    const select = async (spellId: number) => {
        let spell1Id = replacing === 1 ? spellId : localPlayer.spell1Id;
        let spell2Id = replacing === 2 ? spellId : localPlayer.spell2Id;
        // Picking the spell already in the other slot swaps the two.
        if (spell1Id === spell2Id) {
            spell1Id = localPlayer.spell2Id;
            spell2Id = localPlayer.spell1Id;
        }
        await lcu.patch("/lol-champ-select/v1/session/my-selection", { spell1Id, spell2Id });
        setReplacing(r => (r === 1 ? 2 : 1));
    };

    const current = (slot: 1 | 2) => summonerSpells[slot === 1 ? localPlayer.spell1Id : localPlayer.spell2Id];

    return (
        <div className="overlay fade-in summoner-picker">
            <h2 className="screen-title">{t("spells.title")}</h2>

            <div className="summoner-picker-slots">
                {([1, 2] as const).map(slot => (
                    <button
                        key={slot}
                        className={"summoner-slot" + (replacing === slot ? " active" : "")}
                        onClick={() => setReplacing(slot)}>
                        {current(slot) && <img src={summonerSpellUrl(ddragonVersion, current(slot).id)} alt="" />}
                        <span>{current(slot)?.name ?? t("spells.none")}</span>
                    </button>
                ))}
            </div>

            <div className="summoner-picker-grid">
                {(gameModeSpells ?? []).map(id => {
                    const spell = summonerSpells[id];
                    const inUse = id === localPlayer.spell1Id || id === localPlayer.spell2Id;
                    return (
                        <button key={id} className={"champion-cell" + (inUse ? " selected" : "")} onClick={() => select(id)}>
                            <img src={summonerSpellUrl(ddragonVersion, spell.id)} alt={spell.name} />
                            <span>{spell.name}</span>
                        </button>
                    );
                })}
            </div>

            <div className="champion-picker-actions">
                <button className="lcu-button" onClick={props.onClose}>
                    {t("picker.done")}
                </button>
            </div>
        </div>
    );
}
