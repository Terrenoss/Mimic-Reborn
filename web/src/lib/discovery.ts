import { getStoredHost } from "./native";

// LAN auto-discovery: probes candidate addresses for Conduit's /api/info
// endpoint so users don't have to type an IP or scan the QR code. Works from
// the native app because its WebView allows cleartext requests.

const PORT = 51000;
const PROBE_TIMEOUT_MS = 1500;
const CONCURRENCY = 40;

export interface DiscoveredPc {
    host: string; // "ip:port", ready for socket.connect()
    machine: string | null;
}

/** /24 subnets to sweep, most likely first. */
function candidateSubnets(): string[] {
    const subnets: string[] = [];
    const push = (subnet: string) => {
        if (subnet && !subnets.includes(subnet)) subnets.push(subnet);
    };

    // The subnet of the last known PC is by far the best guess.
    const stored = getStoredHost();
    const match = stored?.match(/^(\d+\.\d+\.\d+)\.\d+/);
    if (match) push(match[1]);

    // Default ranges of common home routers (incl. French ISP boxes).
    push("192.168.1");
    push("192.168.0");
    return subnets;
}

/** True if a Conduit instance answered on this address. */
async function probe(ip: string, signal: AbortSignal): Promise<DiscoveredPc | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
    const onOuterAbort = () => controller.abort();
    signal.addEventListener("abort", onOuterAbort);
    try {
        const response = await fetch(`http://${ip}:${PORT}/api/info`, { signal: controller.signal });
        if (!response.ok) return null;
        const info = await response.json();
        if (info?.name !== "Mimic") return null;
        return { host: `${ip}:${PORT}`, machine: info.machine ?? null };
    } catch {
        return null;
    } finally {
        clearTimeout(timeout);
        signal.removeEventListener("abort", onOuterAbort);
    }
}

/**
 * Sweeps the candidate subnets and resolves with the first Conduit found,
 * or null when the sweep completes empty or is aborted.
 */
export async function discoverConduit(
    signal: AbortSignal,
    onProgress?: (done: number, total: number) => void
): Promise<DiscoveredPc | null> {
    const ips = candidateSubnets().flatMap(subnet =>
        Array.from({ length: 254 }, (_, i) => `${subnet}.${i + 1}`)
    );

    let done = 0;
    let next = 0;
    let found: DiscoveredPc | null = null;

    const worker = async () => {
        while (next < ips.length && !found && !signal.aborted) {
            const ip = ips[next++];
            const result = await probe(ip, signal);
            done++;
            onProgress?.(done, ips.length);
            if (result) found = result;
        }
    };

    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    return signal.aborted ? null : found;
}
