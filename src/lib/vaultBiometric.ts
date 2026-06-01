// Biometrie-/Geräte-Freigabe für den Tresor
// WebAuthn (Platform Authenticator) → User-Presence/Biometrie-Bestätigung.
// Der PIN bleibt LOKAL verschlüsselt mit einem aus deviceSalt + credentialId
// abgeleiteten Schlüssel — verlässt das Gerät nie.

import { b64, randomBytes } from "./vaultCrypto";

const STORAGE_KEY = "immoniq.vault.bio.v1";
const enc = new TextEncoder();
const dec = new TextDecoder();

type Stored = {
  credentialId: string;
  deviceSalt: string;
  iv: string;
  ct: string;
};

/** App läuft in einem fremden iframe (z. B. Lovable-Vorschau)? Dort blockiert
 *  der Browser WebAuthn aus Sicherheitsgründen meist komplett. */
export function isInCrossOriginIframe(): boolean {
  try {
    if (typeof window === "undefined") return false;
    if (window.self === window.top) return false;
    // Wenn wir die parent-location nicht lesen können → cross-origin
    try {
      void window.top!.location.href;
      return false;
    } catch {
      return true;
    }
  } catch {
    return true;
  }
}

export const biometricSupported = () =>
  typeof window !== "undefined" &&
  !!window.PublicKeyCredential &&
  !!window.isSecureContext &&
  !isInCrossOriginIframe();

export async function platformAuthenticatorAvailable(): Promise<boolean> {
  try {
    if (!biometricSupported()) return false;
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export const hasBiometricSetup = () => {
  try { return !!localStorage.getItem(STORAGE_KEY); } catch { return false; }
};

export const clearBiometric = () => {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
};

async function deriveLocalKey(deviceSaltB64: string, credentialIdB64: string) {
  const material = enc.encode(deviceSaltB64 + ":" + credentialIdB64);
  const baseKey = await crypto.subtle.importKey("raw", material, "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: b64.dec(deviceSaltB64), iterations: 100_000, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

function friendlyError(e: any): Error {
  const name = e?.name ?? "";
  if (name === "NotAllowedError") return new Error("Biometrie abgebrochen oder nicht freigegeben.");
  if (name === "SecurityError") {
    return new Error("Biometrie ist in dieser Ansicht blockiert. Öffne ImmonIQ in einem eigenen Tab und versuche es erneut.");
  }
  if (name === "InvalidStateError") return new Error("Auf diesem Gerät ist bereits eine Biometrie registriert.");
  if (name === "NotSupportedError") return new Error("Dein Gerät unterstützt keine Biometrie für Web-Apps.");
  return new Error(e?.message ?? "Biometrie nicht verfügbar.");
}

export async function enrollBiometric(pin: string, userId: string, userEmail: string) {
  if (isInCrossOriginIframe()) {
    throw new Error("Biometrie ist in der Vorschau blockiert. Öffne ImmonIQ in einem eigenen Tab.");
  }
  if (!(await platformAuthenticatorAvailable())) {
    throw new Error("Biometrie auf diesem Gerät nicht verfügbar.");
  }

  try {
    const challenge = randomBytes(32);
    const userIdBytes = enc.encode(userId);

    const cred = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: "ImmonIQ Tresor", id: window.location.hostname },
        user: { id: userIdBytes, name: userEmail, displayName: userEmail },
        pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
          residentKey: "preferred",
        },
        timeout: 60_000,
        attestation: "none",
      },
    })) as PublicKeyCredential | null;

    if (!cred) throw new Error("Biometrie-Registrierung abgebrochen");

    const credentialId = b64.enc(new Uint8Array(cred.rawId));
    const deviceSalt = b64.enc(randomBytes(16));
    const key = await deriveLocalKey(deviceSalt, credentialId);
    const iv = randomBytes(12);
    const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv as BufferSource }, key, enc.encode(pin));

    const stored: Stored = { credentialId, deviceSalt, iv: b64.enc(iv), ct: b64.enc(new Uint8Array(ct)) };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch (e: any) {
    throw friendlyError(e);
  }
}

export async function unlockWithBiometric(): Promise<string> {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) throw new Error("Keine Biometrie eingerichtet");
  if (isInCrossOriginIframe()) {
    throw new Error("Biometrie ist in der Vorschau blockiert. Öffne ImmonIQ in einem eigenen Tab.");
  }
  const s: Stored = JSON.parse(raw);

  try {
    const challenge = randomBytes(32);
    const cred = (await navigator.credentials.get({
      publicKey: {
        challenge,
        timeout: 60_000,
        userVerification: "required",
        allowCredentials: [{ id: b64.dec(s.credentialId), type: "public-key", transports: ["internal"] }],
        rpId: window.location.hostname,
      },
    })) as PublicKeyCredential | null;

    if (!cred) throw new Error("Biometrie-Freigabe abgebrochen");

    const key = await deriveLocalKey(s.deviceSalt, s.credentialId);
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: b64.dec(s.iv) as BufferSource },
      key,
      b64.dec(s.ct),
    );
    return dec.decode(plain);
  } catch (e: any) {
    throw friendlyError(e);
  }
}
