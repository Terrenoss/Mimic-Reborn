// Favorite champions, persisted locally on the device.

const STORAGE_KEY = "favoriteChampions";

export function loadFavorites(): Set<number> {
    try {
        return new Set<number>(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"));
    } catch {
        return new Set();
    }
}

export function toggleFavorite(favorites: Set<number>, championId: number): Set<number> {
    const next = new Set(favorites);
    if (next.has(championId)) next.delete(championId);
    else next.add(championId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
    return next;
}
