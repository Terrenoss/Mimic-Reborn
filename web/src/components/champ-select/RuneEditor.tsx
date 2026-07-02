import { useEffect, useState } from "react";
import { lcu, useLcuObserve } from "../../lib/lcu";
import { loadRuneTrees, runeIconUrl } from "../../lib/static-data";

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
    const pages = useLcuObserve<any[]>("/lol-perks/v1/pages");
    const currentPage = useLcuObserve<any>("/lol-perks/v1/currentpage");
    const [trees, setTrees] = useState<any[]>([]);

    useEffect(() => {
        loadRuneTrees().then(setTrees);
    }, []);

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

    if (!page || trees.length === 0) {
        return (
            <div className="overlay fade-in rune-editor">
                <h2 className="screen-title">Runes</h2>
                <p className="create-lobby-loading">
                    {trees.length === 0 ? "Loading runes..." : "No editable rune page. Create one in the client first."}
                </p>
                <div className="champion-picker-actions">
                    <button className="lcu-button" onClick={props.onClose}>Close</button>
                </div>
            </div>
        );
    }

    return (
        <div className="overlay fade-in rune-editor">
            <h2 className="screen-title">{page.name}</h2>

            <div className="rune-editor-body">
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

                <h3 className="rune-section-title">Secondary: {secondaryTree?.name}</h3>
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

                <h3 className="rune-section-title">Stat Shards</h3>
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
                    Done
                </button>
            </div>
        </div>
    );
}
