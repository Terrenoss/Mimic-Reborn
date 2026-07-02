import { useEffect, useState } from "react";
import { lcu, useLcuObserve } from "../../lib/lcu";
import { loadRuneTrees, runeIconUrl } from "../../lib/static-data";
import { useT } from "../../lib/i18n";
import { useChampSelect } from "./ChampSelect";

// Stat shards are not in runesReforged.json; ids are stable.
const STAT_SHARDS: number[][] = [
    [5008, 5005, 5007],
    [5008, 5010, 5001],
    [5011, 5013, 5001]
];

const SHARD_NAMES: Record<number, string> = {
    5008: "Adaptive Force",
    5005: "Attack Speed",
    5007: "Ability Haste",
    5010: "Move Speed",
    5001: "Health Scaling",
    5011: "Health",
    5013: "Tenacity"
};

export default function RuneEditor(props: { onClose: () => void }) {
    const { localPlayer } = useChampSelect();
    const pages = useLcuObserve<any[]>("/lol-perks/v1/pages");
    const currentPage = useLcuObserve<any>("/lol-perks/v1/currentpage");
    const [trees, setTrees] = useState<any[]>([]);
    const [recommended, setRecommended] = useState<any[]>([]);
    const [appliedIndex, setAppliedIndex] = useState<number | null>(null);
    const t = useT();

    useEffect(() => {
        loadRuneTrees().then(setTrees);
    }, []);

    // Riot's own recommended pages for this champion/position/map — straight
    // from the LCU, no third-party site needed.
    useEffect(() => {
        if (!localPlayer?.championId) return;
        setAppliedIndex(null);
        (async () => {
            const session = await lcu.get("/lol-gameflow/v1/session");
            const mapId = session.content?.map?.id ?? session.content?.gameData?.queue?.mapId ?? 11;
            const position = (localPlayer.assignedPosition || "middle").toLowerCase();
            const result = await lcu.get(
                `/lol-perks/v1/recommended-pages/champion/${localPlayer.championId}/position/${position}/map/${mapId}`
            );
            if (result.status === 200 && Array.isArray(result.content)) setRecommended(result.content);
        })();
    }, [localPlayer?.championId, localPlayer?.assignedPosition]);

    const editablePages = (pages ?? []).filter(p => p.isEditable);
    const page = currentPage && currentPage.isEditable ? currentPage : editablePages[0];

    const primaryTree = trees.find(t => t.id === page?.primaryStyleId);
    const secondaryTree = trees.find(t => t.id === page?.subStyleId);

    const savePage = (updates: Partial<any>) => {
        if (!page) return;
        lcu.put(`/lol-perks/v1/pages/${page.id}`, { ...page, ...updates });
    };

    const setRune = (slotIndex: number, runeId: number, isPrimary: boolean) => {
        if (!page) return;
        const perks = [...page.selectedPerkIds];
        const offset = isPrimary ? 0 : 4;
        perks[offset + slotIndex] = runeId;
        savePage({ selectedPerkIds: perks });
    };

    const applyRecommended = (reco: any, index: number) => {
        savePage({
            primaryStyleId: reco.primaryPerkStyleId,
            subStyleId: reco.secondaryPerkStyleId,
            selectedPerkIds: reco.perks.map((p: any) => p.id)
        });
        setAppliedIndex(index);
    };

    if (!page || trees.length === 0) {
        return (
            <div className="overlay fade-in rune-editor">
                <h2 className="screen-title">{t("runes.title")}</h2>
                <p className="create-lobby-loading">
                    {trees.length === 0 ? t("runes.loading") : t("runes.noPage")}
                </p>
                <div className="champion-picker-actions">
                    <button className="lcu-button" onClick={props.onClose}>{t("picker.close")}</button>
                </div>
            </div>
        );
    }

    // Finds a rune's ddragon icon across all trees (used for keystone previews).
    const runeIcon = (runeId: number): string | null => {
        for (const tree of trees) {
            for (const slot of tree.slots) {
                const rune = slot.runes.find((r: any) => r.id === runeId);
                if (rune) return runeIconUrl(rune.icon);
            }
        }
        return null;
    };

    return (
        <div className="overlay fade-in rune-editor">
            <h2 className="screen-title">{page.name}</h2>

            <div className="rune-editor-body">
                {recommended.length > 0 && (
                    <>
                        <h3 className="rune-section-title">{t("runes.recommended")}</h3>
                        <div className="rune-recommended">
                            {recommended.map((reco, index) => {
                                const icon = runeIcon(reco.keystone?.id);
                                return (
                                    <button
                                        key={reco.recommendationId ?? index}
                                        className={"rune-reco-button" + (appliedIndex === index ? " applied" : "")}
                                        onClick={() => applyRecommended(reco, index)}>
                                        {icon && <img src={icon} alt="" />}
                                        <span>
                                            {appliedIndex === index ? t("runes.applied") : reco.keystone?.name ?? t("runes.apply")}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </>
                )}

                <select
                    className="rune-page-select"
                    value={page.id}
                    onChange={e => lcu.put("/lol-perks/v1/currentpage", +e.target.value)}>
                    {editablePages.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>

                <div className="rune-tree-choice">
                    {trees.map(tree => (
                        <button
                            key={tree.id}
                            className={"rune-tree-button" + (tree.id === page.primaryStyleId ? " selected" : "")}
                            onClick={() => {
                                const sub = trees.find(t => t.id !== tree.id && t.id === page.subStyleId)
                                    ? page.subStyleId
                                    : trees.find(t => t.id !== tree.id)!.id;
                                savePage({ primaryStyleId: tree.id, subStyleId: sub, selectedPerkIds: [0, 0, 0, 0, 0, 0, ...page.selectedPerkIds.slice(6)] });
                            }}>
                            <img src={runeIconUrl(tree.icon)} alt={tree.name} />
                        </button>
                    ))}
                </div>

                {primaryTree?.slots.map((slot: any, slotIndex: number) => (
                    <div key={slotIndex} className="rune-slot">
                        {slot.runes.map((rune: any) => (
                            <button
                                key={rune.id}
                                className={"rune-button" + (page.selectedPerkIds.includes(rune.id) ? " selected" : "")}
                                onClick={() => setRune(slotIndex, rune.id, true)}>
                                <img src={runeIconUrl(rune.icon)} alt={rune.name} title={rune.name} />
                            </button>
                        ))}
                    </div>
                ))}

                <h3 className="rune-section-title">{t("runes.secondary", { tree: secondaryTree?.name ?? "" })}</h3>
                <div className="rune-tree-choice">
                    {trees.filter(t => t.id !== page.primaryStyleId).map(tree => (
                        <button
                            key={tree.id}
                            className={"rune-tree-button" + (tree.id === page.subStyleId ? " selected" : "")}
                            onClick={() => savePage({ subStyleId: tree.id })}>
                            <img src={runeIconUrl(tree.icon)} alt={tree.name} />
                        </button>
                    ))}
                </div>
                {secondaryTree?.slots.slice(1).map((slot: any, slotIndex: number) => (
                    <div key={slotIndex} className="rune-slot">
                        {slot.runes.map((rune: any) => (
                            <button
                                key={rune.id}
                                className={"rune-button" + (page.selectedPerkIds.slice(4, 6).includes(rune.id) ? " selected" : "")}
                                onClick={() => setRune(slotIndex % 2, rune.id, false)}>
                                <img src={runeIconUrl(rune.icon)} alt={rune.name} title={rune.name} />
                            </button>
                        ))}
                    </div>
                ))}

                <h3 className="rune-section-title">{t("runes.shards")}</h3>
                {STAT_SHARDS.map((row, rowIndex) => (
                    <div key={rowIndex} className="rune-slot shards">
                        {row.map(shardId => (
                            <button
                                key={shardId}
                                className={"rune-button shard" + (page.selectedPerkIds[6 + rowIndex] === shardId ? " selected" : "")}
                                onClick={() => {
                                    const perks = [...page.selectedPerkIds];
                                    perks[6 + rowIndex] = shardId;
                                    savePage({ selectedPerkIds: perks });
                                }}>
                                <span>{SHARD_NAMES[shardId]}</span>
                            </button>
                        ))}
                    </div>
                ))}
            </div>

            <div className="champion-picker-actions">
                <button className="lcu-button" onClick={props.onClose}>
                    {t("picker.done")}
                </button>
            </div>
        </div>
    );
}
