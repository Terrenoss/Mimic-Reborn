// League static data, loaded dynamically from DataDragon so new champions,
// runes and icons work without shipping a new Mimic release.

let ddragonVersionPromise: Promise<string> | null = null;

export function getDdragonVersion(): Promise<string> {
    ddragonVersionPromise ??= fetch("https://ddragon.leagueoflegends.com/api/versions.json")
        .then(r => r.json())
        .then((versions: string[]) => versions[0]);
    return ddragonVersionPromise;
}

const staticCache = new Map<string, Promise<Record<number, any>>>();

/** Loads a ddragon data file and maps entries by their numeric `key`. */
export function loadStaticByKey(file: string): Promise<Record<number, any>> {
    if (!staticCache.has(file)) {
        staticCache.set(file, (async () => {
            const version = await getDdragonVersion();
            const json = await fetch(`https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/${file}`).then(r => r.json());
            const byKey: Record<number, any> = {};
            for (const entry of Object.values<any>(json.data)) {
                byKey[+entry.key] = entry;
            }
            return byKey;
        })());
    }
    return staticCache.get(file)!;
}

/** Loads runesReforged.json (an array, not keyed like the others). */
let runesPromise: Promise<any[]> | null = null;
export function loadRuneTrees(): Promise<any[]> {
    runesPromise ??= getDdragonVersion().then(version =>
        fetch(`https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/runesReforged.json`).then(r => r.json()));
    return runesPromise;
}

export async function profileIconUrl(iconId: number): Promise<string> {
    const version = await getDdragonVersion();
    return `https://ddragon.leagueoflegends.com/cdn/${version}/img/profileicon/${iconId}.png`;
}

export function championSquareUrl(version: string, championId: string): string {
    return `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${championId}.png`;
}

export function summonerSpellUrl(version: string, spellId: string): string {
    return `https://ddragon.leagueoflegends.com/cdn/${version}/img/spell/${spellId}.png`;
}

export function runeIconUrl(icon: string): string {
    return `https://ddragon.leagueoflegends.com/cdn/img/${icon}`;
}

/** CommunityDragon centered splash; falls back gracefully in <img onError>. */
export function centeredSplashUrl(championKey: number, skinIndex = 0): string {
    return skinIndex === 0
        ? `https://cdn.communitydragon.org/latest/champion/${championKey}/splash-art/centered`
        : `https://cdn.communitydragon.org/latest/champion/${championKey}/splash-art/centered/skin/${skinIndex}`;
}

export function splashUrl(championId: string, skinNum = 0): string {
    return `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${championId}_${skinNum}.jpg`;
}

export const NO_BAN_ICON =
    "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/-1.png";

export const POSITION_NAMES: Record<string, string> = {
    TOP: "Top",
    JUNGLE: "Jungle",
    MIDDLE: "Mid",
    BOTTOM: "Bottom",
    UTILITY: "Support",
    FILL: "Fill",
    UNSELECTED: "Unselected"
};

// mapId-gameMode -> display name.
export const GAMEMODE_NAMES: Record<string, string> = {
    "11-CLASSIC": "Summoner's Rift",
    "12-ARAM": "ARAM",
    "22-TFT": "Teamfight Tactics",
    "11-URF": "URF",
    "11-PRACTICETOOL": "Practice Tool",
    "11-TUTORIAL": "Tutorial",
    "30-CHERRY": "Arena",
    "33-SWIFTPLAY": "Swiftplay"
};

export function gameModeName(mapId: number, gameMode: string): string {
    return GAMEMODE_NAMES[`${mapId}-${gameMode}`] ?? gameMode;
}
