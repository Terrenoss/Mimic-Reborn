import top from "../../assets/roles/role-top.png";
import jungle from "../../assets/roles/role-jungle.png";
import mid from "../../assets/roles/role-mid.png";
import bot from "../../assets/roles/role-bot.png";
import support from "../../assets/roles/role-support.png";
import fill from "../../assets/roles/role-fill.png";
import unselected from "../../assets/roles/role-unselected.png";

const ROLE_IMAGES: Record<string, string> = {
    TOP: top,
    JUNGLE: jungle,
    MIDDLE: mid,
    BOTTOM: bot,
    UTILITY: support,
    FILL: fill,
    UNSELECTED: unselected
};

export function roleImage(position: string): string {
    return ROLE_IMAGES[position] ?? unselected;
}

export const SELECTABLE_ROLES = ["TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY", "FILL"];
