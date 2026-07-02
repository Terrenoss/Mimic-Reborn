import { lcu } from "../../lib/lcu";
import { championSquareUrl } from "../../lib/static-data";
import { useT } from "../../lib/i18n";
import { useChampSelect } from "./ChampSelect";

/** ARAM bench: tap a benched champion to swap with it. */
export default function Bench() {
    const { session, champions, ddragonVersion } = useChampSelect();
    const t = useT();
    const benchIds: number[] = session.benchChampions?.map((c: any) => c.championId) ?? [];

    if (benchIds.length === 0) return null;

    return (
        <div className="cs-bench">
            <span className="cs-bench-label">{t("cs.bench")}</span>
            <div className="cs-bench-list">
                {benchIds.map(id => {
                    const champion = champions[id];
                    if (!champion) return null;
                    return (
                        <button
                            key={id}
                            className="cs-bench-champion"
                            onClick={() => lcu.post(`/lol-champ-select/v1/session/bench/swap/${id}`)}>
                            <img src={championSquareUrl(ddragonVersion, champion.id)} alt={champion.name} />
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
