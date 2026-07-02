import { create } from "zustand";
import { ConnectionState, socket } from "./socket";

interface ConnectionStore {
    state: ConnectionState;
    connect: (host?: string) => void;
    disconnect: () => void;
}

export const useConnection = create<ConnectionStore>(set => {
    socket.onStateChange = state => set({ state });

    return {
        state: ConnectionState.IDLE,
        connect: (host?: string) => socket.connect(host),
        disconnect: () => socket.close()
    };
});
