import { useEffect, useState } from "react";
import { lcu } from "./lcu";

// Since Riot IDs, lobby/champ-select payloads often ship empty summonerName /
// gameName fields. This module resolves display names through the LCU and
// caches them for the session.

const cache = new Map<string, string>();
const pending = new Set<string>();
const listeners = new Set<() => void>();

function keyOf(member: any): string | null {
    if (member?.puuid) return member.puuid;
    if (member?.summonerId) return String(member.summonerId);
    return null;
}

function fetchName(member: any) {
    const key = keyOf(member);
    if (!key || cache.has(key) || pending.has(key)) return;
    if (member.summonerName || member.gameName) return;
    pending.add(key);
    const path = member.puuid
        ? `/lol-summoner/v2/summoners/puuid/${member.puuid}`
        : `/lol-summoner/v1/summoners/${member.summonerId}`;
    lcu.get(path).then(result => {
        pending.delete(key);
        if (result.status !== 200) return;
        const name = result.content?.gameName || result.content?.displayName || result.content?.internalName;
        if (!name) return;
        cache.set(key, name);
        listeners.forEach(listener => listener());
    });
}

/** Best display name for a member, from the payload or the resolved cache. */
export function memberName(member: any): string | null {
    const direct = member?.summonerName || member?.gameName;
    if (direct) return direct;
    const key = keyOf(member);
    return (key && cache.get(key)) || null;
}

/**
 * Resolves missing names for the given members and re-renders as they arrive.
 * Returns `memberName` for convenience.
 */
export function useMemberNames(members: any[]): typeof memberName {
    const [, bump] = useState(0);

    useEffect(() => {
        const listener = () => bump(v => v + 1);
        listeners.add(listener);
        members.forEach(fetchName);
        return () => {
            listeners.delete(listener);
        };
    });

    return memberName;
}
