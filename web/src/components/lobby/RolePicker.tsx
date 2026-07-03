import { useState } from "react";
import { POSITION_NAMES } from "../../lib/static-data";
import { useT } from "../../lib/i18n";
import { roleImage, SELECTABLE_ROLES } from "./roles";

export default function RolePicker(props: {
    current: any;
    onClose: () => void;
    onSelect: (first: string, second: string) => void;
}) {
    const [first, setFirst] = useState<string>(props.current.firstPositionPreference || "UNSELECTED");
    const [second, setSecond] = useState<string>(props.current.secondPositionPreference || "UNSELECTED");
    const [picking, setPicking] = useState<"first" | "second">("first");
    const t = useT();

    const pick = (role: string) => {
        if (picking === "first") {
            // Picking a role already used as secondary swaps the two.
            if (role === second) setSecond(first);
            setFirst(role);
            if (role === "FILL") setSecond("UNSELECTED");
            setPicking("second");
        } else {
            // Picking the primary role as secondary swaps the two.
            if (role === first) {
                if (second === "UNSELECTED" || second === "FILL") return;
                setFirst(second);
            }
            setSecond(role);
        }
    };

    const valid = first !== "UNSELECTED" && (first === "FILL" || second !== "UNSELECTED");

    return (
        <div className="overlay fade-in role-picker">
            <h2 className="screen-title">{t("roles.title")}</h2>

            <div className="role-picker-slots">
                <button className={"role-slot" + (picking === "first" ? " active" : "")} onClick={() => setPicking("first")}>
                    <img src={roleImage(first)} alt="" />
                    <span>{t("roles.primary", { role: POSITION_NAMES[first] })}</span>
                </button>
                <button
                    className={"role-slot" + (picking === "second" ? " active" : "")}
                    disabled={first === "FILL"}
                    onClick={() => setPicking("second")}>
                    <img src={roleImage(second)} alt="" />
                    <span>{t("roles.secondary", { role: POSITION_NAMES[second] })}</span>
                </button>
            </div>

            <div className="role-picker-grid">
                {SELECTABLE_ROLES.map(role => (
                    <button
                        key={role}
                        className={"role-option" + (role === first || role === second ? " selected" : "")}
                        onClick={() => pick(role)}>
                        <img src={roleImage(role)} alt="" />
                        <span>{POSITION_NAMES[role]}</span>
                    </button>
                ))}
            </div>

            <div className="lobby-actions">
                <button className="lcu-button confirm" disabled={!valid} onClick={() => props.onSelect(first, second)}>
                    {t("roles.confirm")}
                </button>
                <button className="lcu-button" onClick={props.onClose}>
                    {t("roles.cancel")}
                </button>
            </div>
        </div>
    );
}
