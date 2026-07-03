import { lcu } from "./lcu";

// Large, effectively-static LCU payloads, fetched once per app session instead
// of on every overlay open (they are several hundred KB each).

let positionsPromise: Promise<Record<number, any>> | null = null;

/** The client's champion -> recommended positions map (used for role filters). */
export function getRecommendedPositions(): Promise<Record<number, any>> {
    positionsPromise ??= lcu
        .get("/lol-perks/v1/recommended-champion-positions")
        .then(r => (r.status === 200 && r.content && typeof r.content === "object" ? r.content : {}));
    return positionsPromise;
}

let wardCatalogPromise: Promise<any[]> | null = null;

/** Full ward skin catalog from the client's static data. */
export function getWardSkinCatalog(): Promise<any[]> {
    wardCatalogPromise ??= lcu
        .get("/lol-game-data/assets/v1/ward-skins.json")
        .then(r => (r.status === 200 && Array.isArray(r.content) ? r.content : []));
    return wardCatalogPromise;
}

/** Owned ward skin ids, or null when the inventory cannot be read. */
export async function getOwnedWardSkinIds(): Promise<Set<number> | null> {
    // Preferred source: the collections service (same one the desktop
    // collection tab uses; also what Mimic v2 relied on).
    const summoner = await lcu.get("/lol-summoner/v1/current-summoner");
    if (summoner.status === 200) {
        const result = await lcu.get(`/lol-collections/v1/inventories/${summoner.content.summonerId}/ward-skins`);
        if (result.status === 200 && Array.isArray(result.content) && result.content.length > 0) {
            return new Set(
                result.content
                    .filter((w: any) => w.owned === true || w.ownership?.owned === true)
                    .map((w: any) => +(w.id ?? w.wardSkinId))
            );
        }
    }

    // Fallbacks: the inventory service (endpoint shape moved across versions).
    for (const path of [
        "/lol-inventory/v2/inventory?inventoryTypes=WARD_SKIN",
        "/lol-inventory/v1/inventory/WARD_SKIN"
    ]) {
        const result = await lcu.get(path);
        if (result.status === 200 && Array.isArray(result.content) && result.content.length > 0) {
            return new Set(result.content.map((item: any) => +item.itemId));
        }
    }
    return null;
}
