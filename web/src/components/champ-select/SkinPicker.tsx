import { useEffect, useState } from "react";
import { lcu } from "../../lib/lcu";
import { splashUrl } from "../../lib/static-data";
import { useT } from "../../lib/i18n";
import { useChampSelect } from "./ChampSelect";

/** CommunityDragon mirror of an LCU asset path like /lol-game-data/assets/... */
function wardImageUrl(wardImagePath: string): string {
    const path = wardImagePath.replace(/^\/lol-game-data\/assets/i, "").toLowerCase();
    return `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default${path}`;
}

export default function SkinPicker(props: { onClose: () => void }) {
    const { localPlayer, champions } = useChampSelect();
    const [skins, setSkins] = useState<any[]>([]);
    const [wardSkins, setWardSkins] = useState<any[]>([]);
    const t = useT();

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

    // Owned ward skins: catalog from the LCU's static data, ownership from the
    // inventory service (endpoint moved across client versions, so try both).
    useEffect(() => {
        (async () => {
            const catalog = await lcu.get("/lol-game-data/assets/v1/ward-skins.json");
            if (catalog.status !== 200 || !Array.isArray(catalog.content)) return;
            for (const path of ["/lol-inventory/v2/inventory/WARD_SKIN", "/lol-inventory/v1/inventory/WARD_SKIN"]) {
                const inventory = await lcu.get(path);
                if (inventory.status === 200 && Array.isArray(inventory.content)) {
                    const owned = new Set(inventory.content.map((item: any) => +item.itemId));
                    setWardSkins(catalog.content.filter((w: any) => owned.has(w.id)));
                    return;
                }
            }
        })();
    }, []);

    const select = async (skinId: number) => {
        await lcu.patch("/lol-champ-select/v1/session/my-selection", { selectedSkinId: skinId });
    };

    const selectWard = async (wardSkinId: number) => {
        await lcu.patch("/lol-champ-select/v1/session/my-selection", { wardSkinId });
    };

    return (
        <div className="overlay fade-in skin-picker">
            <h2 className="screen-title">
                {champion ? t("skins.title", { champion: champion.name }) : t("skins.wards")}
            </h2>

            <div className="skin-picker-list">
                {champion && skins.map(skin => {
                    const skinIndex = skin.id - localPlayer.championId * 1000;
                    const chromas = (skin.childSkins ?? []).filter((c: any) => c.ownership?.owned);
                    const isSelected =
                        localPlayer.selectedSkinId === skin.id ||
                        chromas.some((c: any) => c.id === localPlayer.selectedSkinId);
                    return (
                        <div key={skin.id} className={"skin-card" + (isSelected ? " selected" : "")}>
                            <button className="skin-card-main" onClick={() => select(skin.id)}>
                                <img src={splashUrl(champion.id, skinIndex)} alt="" loading="lazy" />
                                <span>{skin.isBase ? champion.name : skin.name}</span>
                            </button>
                            {chromas.length > 0 && (
                                <div className="skin-chromas">
                                    <button
                                        className={"skin-chroma base" + (localPlayer.selectedSkinId === skin.id ? " selected" : "")}
                                        onClick={() => select(skin.id)}
                                    />
                                    {chromas.map((chroma: any) => (
                                        <button
                                            key={chroma.id}
                                            className={"skin-chroma" + (localPlayer.selectedSkinId === chroma.id ? " selected" : "")}
                                            style={{ background: chroma.colors?.length > 1
                                                ? `linear-gradient(135deg, ${chroma.colors[0]} 50%, ${chroma.colors[1]} 50%)`
                                                : chroma.colors?.[0] ?? "#888" }}
                                            onClick={() => select(chroma.id)}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
                {champion && skins.length === 0 && <p className="create-lobby-loading">{t("skins.loading")}</p>}

                {wardSkins.length > 0 && (
                    <>
                        <h3 className="rune-section-title">{t("skins.wards")}</h3>
                        <div className="ward-skin-grid">
                            {wardSkins.map(ward => (
                                <button
                                    key={ward.id}
                                    className={"champion-cell" + (localPlayer.wardSkinId === ward.id ? " selected" : "")}
                                    onClick={() => selectWard(ward.id)}>
                                    <img src={wardImageUrl(ward.wardImagePath)} alt={ward.name} loading="lazy" />
                                    <span>{ward.name}</span>
                                </button>
                            ))}
                        </div>
                    </>
                )}
            </div>

            <div className="champion-picker-actions">
                <button className="lcu-button" onClick={props.onClose}>
                    {t("picker.done")}
                </button>
            </div>
        </div>
    );
}
