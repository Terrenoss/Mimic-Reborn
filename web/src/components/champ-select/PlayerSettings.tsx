import { lcu, useLcuObserve } from "../../lib/lcu";
import { summonerSpellUrl } from "../../lib/static-data";
import { useT } from "../../lib/i18n";
import { useChampSelect } from "./ChampSelect";

export default function PlayerSettings() {
    const { session, localPlayer, summonerSpells, ddragonVersion, openOverlay } = useChampSelect();
    const rerollPoints = useLcuObserve<any>("/lol-summoner/v1/current-summoner/rerollPoints");
    const t = useT();

    const spell1 = summonerSpells[localPlayer.spell1Id];
    const spell2 = summonerSpells[localPlayer.spell2Id];
    const canReroll = session.benchEnabled && rerollPoints && rerollPoints.numberOfRolls > 0;

    return (
        <div className="cs-settings">
            <button className="cs-settings-button" onClick={() => openOverlay("spells")}>
                {spell1 && <img src={summonerSpellUrl(ddragonVersion, spell1.id)} alt="" />}
                {spell2 && <img src={summonerSpellUrl(ddragonVersion, spell2.id)} alt="" />}
                <span>{t("cs.spells")}</span>
            </button>

            <button className="cs-settings-button" onClick={() => openOverlay("runes")}>
                <span>{t("cs.runes")}</span>
            </button>

            <button className="cs-settings-button" onClick={() => openOverlay("skins")}>
                <span>{t("cs.skins")}</span>
            </button>

            {session.benchEnabled && (
                <button
                    className="cs-settings-button"
                    disabled={!canReroll}
                    onClick={() => lcu.post("/lol-champ-select/v1/session/my-selection/reroll")}>
                    <span>{t("cs.reroll")}{rerollPoints ? ` (${rerollPoints.numberOfRolls})` : ""}</span>
                </button>
            )}
        </div>
    );
}
