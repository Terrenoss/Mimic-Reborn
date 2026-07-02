import { useEffect, useState } from "react";
import { socket } from "./socket";

/**
 * Subscribes to an LCU path for the lifetime of the component.
 * Returns the latest payload, or null while loading / when the resource is gone.
 */
export function useLcuObserve<T = any>(path: string): T | null {
    const [value, setValue] = useState<T | null>(null);

    useEffect(() => {
        socket.observe(path, result => {
            setValue(result.status === 200 ? (result.content as T) : null);
        });
        return () => socket.unobserve(path);
    }, [path]);

    return value;
}

/** One-shot LCU request helper (thin alias over the socket singleton). */
export const lcu = {
    get: (path: string) => socket.request(path, "GET"),
    post: (path: string, body?: any) => socket.request(path, "POST", body),
    put: (path: string, body?: any) => socket.request(path, "PUT", body),
    patch: (path: string, body?: any) => socket.request(path, "PATCH", body),
    del: (path: string) => socket.request(path, "DELETE")
};
