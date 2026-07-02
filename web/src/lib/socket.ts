import { SessionCrypto } from "./crypto";
import { getDeviceDescription, getDeviceId } from "./device";

// Opcodes shared with conduit/MobileSession.cs. 3-9 are inherited from Mimic v2;
// 0-1 are the LAN-direct ECDH handshake.
export const enum MobileOpcode {
    HELLO = 0,
    SECRET = 1,
    SECRET_RESPONSE = 2,
    VERSION = 3,
    VERSION_RESPONSE = 4,
    SUBSCRIBE = 5,
    UNSUBSCRIBE = 6,
    REQUEST = 7,
    RESPONSE = 8,
    UPDATE = 9
}

export const enum ConnectionState {
    IDLE = "idle",
    CONNECTING = "connecting",
    HANDSHAKING = "handshaking",
    CONNECTED = "connected",
    DENIED = "denied",
    DISCONNECTED = "disconnected"
}

export interface LcuResult {
    status: number;
    content: any;
}

type Observer = { regex: RegExp; handler: (result: LcuResult) => void };

/**
 * Encrypted websocket connection to Conduit. Exposes the same three primitives
 * the old Vue root component had: request, observe and unobserve.
 */
export class ConduitSocket {
    state: ConnectionState = ConnectionState.IDLE;
    peerVersion: string | null = null;
    peerMachine: string | null = null;
    onStateChange: (state: ConnectionState) => void = () => {};

    private socket: WebSocket | null = null;
    private crypto = new SessionCrypto();
    private idCounter = 0;
    private pendingRequests = new Map<number, (result: LcuResult) => void>();
    private observers = new Map<string, Observer>();

    connect(host: string = window.location.host) {
        const protocol = window.location.protocol === "https:" ? "wss" : "ws";
        this.setState(ConnectionState.CONNECTING);

        this.crypto = new SessionCrypto();
        this.socket = new WebSocket(`${protocol}://${host}/mobile`);
        this.socket.onmessage = ev => this.handleMessage(ev.data);
        this.socket.onclose = () => {
            if (this.state !== ConnectionState.DENIED) {
                this.setState(this.state === ConnectionState.CONNECTED
                    ? ConnectionState.DISCONNECTED
                    : ConnectionState.IDLE);
            }
        };
        this.socket.onerror = () => this.socket?.close();
    }

    request(path: string, method = "GET", body?: any): Promise<LcuResult> {
        return new Promise(resolve => {
            const id = this.idCounter++;
            this.pendingRequests.set(id, resolve);
            this.sendEncrypted([MobileOpcode.REQUEST, id, path, method, body ?? null]);
        });
    }

    /**
     * Observes an LCU path. Plain string paths get an immediate initial request;
     * the handler then re-fires on every UPDATE whose path matches.
     */
    observe(path: string, handler: (result: LcuResult) => void) {
        const pattern = `^${path}$`;
        this.observers.set(path, { regex: new RegExp(pattern), handler });
        this.sendEncrypted([MobileOpcode.SUBSCRIBE, pattern]);
        this.request(path).then(handler);
    }

    unobserve(path: string) {
        this.observers.delete(path);
        this.sendEncrypted([MobileOpcode.UNSUBSCRIBE, `^${path}$`]);
    }

    close() {
        this.socket?.close();
        this.socket = null;
        this.setState(ConnectionState.IDLE);
    }

    private handleMessage(raw: string) {
        let parsed: any;
        try {
            parsed = JSON.parse(raw);
        } catch {
            return;
        }

        // Post-handshake messages arrive as an encrypted JSON string.
        if (typeof parsed === "string") {
            try {
                parsed = JSON.parse(this.crypto.decrypt(parsed));
            } catch {
                return;
            }
        }

        if (!Array.isArray(parsed)) return;

        switch (parsed[0] as MobileOpcode) {
            case MobileOpcode.HELLO: {
                // [0, conduitPubKey, version, machineName]
                this.peerVersion = parsed[2] ?? null;
                this.peerMachine = parsed[3] ?? null;
                this.crypto.deriveSessionKey(parsed[1]);

                const identify = JSON.stringify({
                    identity: getDeviceId(),
                    ...getDeviceDescription()
                });
                this.sendRaw([MobileOpcode.SECRET, this.crypto.publicKeyBase64, this.crypto.encrypt(identify)]);
                this.setState(ConnectionState.HANDSHAKING);
                break;
            }
            case MobileOpcode.SECRET_RESPONSE: {
                if (parsed[1] === true) {
                    this.setState(ConnectionState.CONNECTED);
                } else {
                    this.setState(ConnectionState.DENIED);
                    this.socket?.close();
                }
                break;
            }
            case MobileOpcode.VERSION_RESPONSE: {
                this.peerVersion = parsed[1] ?? this.peerVersion;
                this.peerMachine = parsed[2] ?? this.peerMachine;
                break;
            }
            case MobileOpcode.RESPONSE: {
                // [8, id, status, content]
                const resolve = this.pendingRequests.get(parsed[1]);
                if (resolve) {
                    this.pendingRequests.delete(parsed[1]);
                    resolve({ status: parsed[2], content: parsed[3] });
                }
                break;
            }
            case MobileOpcode.UPDATE: {
                // [9, path, status, data]
                for (const { regex, handler } of this.observers.values()) {
                    if (regex.test(parsed[1])) handler({ status: parsed[2], content: parsed[3] });
                }
                break;
            }
        }
    }

    private sendRaw(message: any[]) {
        this.socket?.send(JSON.stringify(message));
    }

    private sendEncrypted(message: any[]) {
        if (this.state !== ConnectionState.CONNECTED && this.state !== ConnectionState.HANDSHAKING) return;
        this.socket?.send(JSON.stringify(this.crypto.encrypt(JSON.stringify(message))));
    }

    private setState(state: ConnectionState) {
        this.state = state;
        this.onStateChange(state);
    }
}

// Singleton used by the whole app.
export const socket = new ConduitSocket();
