import { useEffect, useState } from "react";
import { lcu, useLcuObserve } from "../../lib/lcu";
import "./queue.css";

function formatSeconds(total: number): string {
    const minutes = Math.floor(total / 60);
    const seconds = Math.floor(total % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function Queue() {
    const search = useLcuObserve<any>("/lol-matchmaking/v1/search");
    const [elapsed, setElapsed] = useState(0);

    const inQueue = search != null && search.searchState === "Searching";

    useEffect(() => {
        if (!inQueue) return;
        setElapsed(search.timeInQueue ?? 0);
        const interval = setInterval(() => setElapsed(v => v + 1), 1000);
        return () => clearInterval(interval);
    }, [inQueue]);

    if (!inQueue) return null;

    return (
        <div className="queue-bar fade-in">
            <div className="queue-info">
                <span className="queue-time">{formatSeconds(elapsed)}</span>
                <span className="queue-estimate">
                    Estimated: {formatSeconds(search.estimatedQueueTime ?? 0)}
                </span>
            </div>
            <button className="lcu-button deny" onClick={() => lcu.del("/lol-lobby/v2/lobby/matchmaking/search")}>
                Cancel
            </button>
        </div>
    );
}
