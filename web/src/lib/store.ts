import { create } from "zustand";
import { ConnectionState, socket } from "./socket";

interface ConnectionStore {
    state: ConnectionState;
    connect: () => void;
    disconnect: () => void;
}

export const useConnection = create<ConnectionStore>(set => {
    socket.onStateChange = state => set({ state });

    return {
        state: ConnectionState.IDLE,
        connect: () => socket.connect(),
        disconnect: () => socket.close()
    };
});
