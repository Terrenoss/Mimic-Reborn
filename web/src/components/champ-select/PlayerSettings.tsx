import { lcu, useLcuObserve } from "../../lib/lcu";
import { summonerSpellUrl } from "../../lib/static-data";
import { useChampSelect } from "./ChampSelect";

export default function PlayerSettings() {
    const { session, localPlayer, summonerSpells, ddragonVersion, openOverlay } = useChampSelect();
    const rerollPoints = useLcuObserve<any>("/lol-summoner/v1/current-summoner/rerollPoints");

    const spell1 = summonerSpells[localPlayer.spell1Id];
    const spell2 = summonerSpells[localPlayer.spell2Id];
    const canReroll = session.benchEnabled && rerollPoints && rerollPoints.numberOfRolls > 0;
    const hasChampion = !!localPlayer.championId;

    return (
        <div className="cs-settings">
            <button className="cs-settings-button" onClick={() => openOverlay("spells")}>
                {spell1 && <img src={summonerSpellUrl(ddragonVersion, spell1.id)} alt="" />}
                {spell2 && <img src={summonerSpellUrl(ddragonVersion, spell2.id)} alt="" />}
                <span>Spells</span>
            </button>

            <button className="cs-settings-button" onClick={() => openOverlay("runes")}>
                <span>Runes</span>
            </button>

            <button className="cs-settings-button" disabled={!hasChampion} onClick={() => openOverlay("skins")}>
                <span>Skins</span>
            </button>

            {session.benchEnabled && (
                <button
                    className="cs-settings-button"
                    disabled={!canReroll}
                    onClick={() => lcu.post("/lol-champ-select/v1/session/my-selection/reroll")}>
                    <span>Reroll{rerollPoints ? ` (${rerollPoints.numberOfRolls})` : ""}</span>
                </button>
            )}
        </div>
    );
}
