import { useEffect, useState } from "react";
import { lcu } from "../../lib/lcu";
import { splashUrl } from "../../lib/static-data";
import { useChampSelect } from "./ChampSelect";

export default function SkinPicker(props: { onClose: () => void }) {
    const { localPlayer, champions } = useChampSelect();
    const [skins, setSkins] = useState<any[]>([]);

    const champion = champions[localPlayer.championId];

    useEffect(() => {
        if (!champion) return;
        lcu.get("/lol-summoner/v1/current-summoner").then(async summoner => {
            if (summoner.status !== 200) return;
            const result = await lcu.get(
                `/lol-champions/v1/inventories/${summoner.content.summonerId}/champions/${localPlayer.championId}/skins`
            );
            if (result.status === 200) {
                setSkins(result.content.filter((s: any) => s.ownership?.owned || s.isBase));
            }
        });
    }, [localPlayer.championId]);

    const select = async (skinId: number) => {
        await lcu.patch("/lol-champ-select/v1/session/my-selection", { selectedSkinId: skinId });
    };

    if (!champion) return null;

    return (
        <div className="overlay fade-in skin-picker">
            <h2 className="screen-title">{champion.name} Skins</h2>

            <div className="skin-picker-list">
                {skins.map(skin => {
                    const skinIndex = skin.id - localPlayer.championId * 1000;
                    return (
                        <button
                            key={skin.id}
                            className={"skin-card" + (localPlayer.selectedSkinId === skin.id ? " selected" : "")}
                            onClick={() => select(skin.id)}>
                            <img src={splashUrl(champion.id, skinIndex)} alt="" loading="lazy" />
                            <span>{skin.isBase ? champion.name : skin.name}</span>
                        </button>
                    );
                })}
                {skins.length === 0 && <p className="create-lobby-loading">Loading skins...</p>}
            </div>

            <div className="champion-picker-actions">
                <button className="lcu-button" onClick={props.onClose}>
                    Done
                </button>
            </div>
        </div>
    );
}
