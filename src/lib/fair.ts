// Provably-fair core. Every bet outcome is derived from
// HMAC-SHA256(serverSeed, `${clientSeed}:${nonce}:${round}`), so a result can
// be recomputed by anyone once the server seed is revealed.

const enc = new TextEncoder();

export function toHex(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  for (const b of bytes) s += b.toString(16).padStart(2, '0');
  return s;
}

export function randomHex(bytes = 32): string {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return toHex(a);
}

export async function sha256Hex(s: string): Promise<string> {
  return toHex(await crypto.subtle.digest('SHA-256', enc.encode(s)));
}

async function hmac(key: string, msg: string): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey(
    'raw',
    enc.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, enc.encode(msg)));
}

export interface RoundSeed {
  serverSeed: string;
  clientSeed: string;
  nonce: number;
}

/** Returns `count` uniform floats in [0, 1), 4 bytes of entropy each. */
export async function generateFloats(seed: RoundSeed, count: number): Promise<number[]> {
  const out: number[] = [];
  for (let round = 0; out.length < count; round++) {
    const bytes = await hmac(seed.serverSeed, `${seed.clientSeed}:${seed.nonce}:${round}`);
    for (let i = 0; i < 32 && out.length < count; i += 4) {
      out.push(
        bytes[i] / 256 + bytes[i + 1] / 256 ** 2 + bytes[i + 2] / 256 ** 3 + bytes[i + 3] / 256 ** 4,
      );
    }
  }
  return out;
}
