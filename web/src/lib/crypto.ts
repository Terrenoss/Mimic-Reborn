import { p256 } from "@noble/curves/p256";
import { gcm } from "@noble/ciphers/aes";
import { hkdf } from "@noble/hashes/hkdf";
import { sha256 } from "@noble/hashes/sha2";
import { randomBytes } from "@noble/hashes/utils";

// Mirrors conduit/Crypto/SessionCrypto.cs exactly:
// ECDH P-256 -> HKDF-SHA256(salt "mimic-reborn", info "aes-256-gcm") -> AES-256-GCM.
// Wire format: base64(nonce) + ":" + base64(ciphertext || tag).
// Implemented with @noble so it works on plain http:// LAN origins, where
// window.crypto.subtle is unavailable (non-secure context).

const HKDF_SALT = new TextEncoder().encode("mimic-reborn");
const HKDF_INFO = new TextEncoder().encode("aes-256-gcm");

// DER prefix of a SubjectPublicKeyInfo for an uncompressed P-256 point.
const SPKI_PREFIX = Uint8Array.from([
    0x30, 0x59, 0x30, 0x13, 0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01,
    0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07, 0x03, 0x42, 0x00
]);

const toBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const fromBase64 = (b64: string) => Uint8Array.from(atob(b64), c => c.charCodeAt(0));

export class SessionCrypto {
    private privateKey = p256.utils.randomPrivateKey();
    private key: Uint8Array | null = null;

    /** Our public key as base64 SubjectPublicKeyInfo, importable by .NET. */
    get publicKeyBase64(): string {
        const point = p256.getPublicKey(this.privateKey, false);
        const spki = new Uint8Array(SPKI_PREFIX.length + point.length);
        spki.set(SPKI_PREFIX);
        spki.set(point, SPKI_PREFIX.length);
        return toBase64(spki);
    }

    /** Derives the shared AES-256-GCM key from Conduit's SPKI base64 public key. */
    deriveSessionKey(conduitPublicKeyBase64: string) {
        const spki = fromBase64(conduitPublicKeyBase64);
        const point = spki.slice(-65); // uncompressed point is the last 65 bytes

        // Compressed shared point; x-coordinate (bytes 1..33) matches
        // .NET's DeriveRawSecretAgreement output.
        const shared = p256.getSharedSecret(this.privateKey, point, true).slice(1);
        this.key = hkdf(sha256, shared, HKDF_SALT, HKDF_INFO, 32);
    }

    encrypt(plaintext: string): string {
        if (!this.key) throw new Error("Session key not derived yet.");
        const nonce = randomBytes(12);
        const cipherAndTag = gcm(this.key, nonce).encrypt(new TextEncoder().encode(plaintext));
        return toBase64(nonce) + ":" + toBase64(cipherAndTag);
    }

    decrypt(wire: string): string {
        if (!this.key) throw new Error("Session key not derived yet.");
        const separator = wire.indexOf(":");
        const nonce = fromBase64(wire.slice(0, separator));
        const cipherAndTag = fromBase64(wire.slice(separator + 1));
        return new TextDecoder().decode(gcm(this.key, nonce).decrypt(cipherAndTag));
    }
}
