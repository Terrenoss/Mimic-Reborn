import { useEffect, useRef, useState } from "react";
import { lcu, useLcuObserve } from "../../lib/lcu";
import { useT } from "../../lib/i18n";
import queuePopSound from "../../assets/queue-pop.mp3";
import "./ready-check.css";

export default function ReadyCheck() {
    const readyCheck = useLcuObserve<any>("/lol-matchmaking/v1/ready-check");
    const [answered, setAnswered] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const t = useT();

    const active = readyCheck != null && readyCheck.state === "InProgress";

    useEffect(() => {
        if (!active) {
            setAnswered(false);
            return;
        }

        navigator.vibrate?.([200, 100, 200]);
        audioRef.current ??= new Audio(queuePopSound);
        audioRef.current.play().catch(() => {
            // Autoplay blocked before any user gesture; vibration still fires.
        });
    }, [active]);

    if (!active) return null;

    const timer = Math.max(0, (readyCheck.timer ?? 0));
    const progress = Math.min(100, (timer / 12) * 100);

    return (
        <div className="overlay fade-in ready-check">
            <h1 className="ready-check-title">{t("readyCheck.title")}</h1>
            <div className="ready-check-progress">
                <div className="ready-check-progress-fill" style={{ width: `${100 - progress}%` }} />
            </div>
            <div className="ready-check-buttons">
                <button
                    className="lcu-button confirm"
                    disabled={answered}
                    onClick={() => {
                        setAnswered(true);
                        lcu.post("/lol-matchmaking/v1/ready-check/accept");
                    }}>
                    {t("readyCheck.accept")}
                </button>
                <button
                    className="lcu-button deny"
                    disabled={answered}
                    onClick={() => {
                        setAnswered(true);
                        lcu.post("/lol-matchmaking/v1/ready-check/decline");
                    }}>
                    {t("readyCheck.decline")}
                </button>
            </div>
        </div>
    );
}
