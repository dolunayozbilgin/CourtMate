// Supabase Edge Function — push bildirimi gönder
// Dağıtım: supabase functions deploy send-push
// Gerekli secrets: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
// DB Webhook: matches INSERT + UPDATE + messages INSERT → bu fonksiyona POST

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const VAPID_PUBLIC  = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')!;
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT')!;

const db = createClient(SUPABASE_URL, SERVICE_KEY);

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  try {
    const payload = await req.json();
    const record  = payload.record;
    const table   = payload.table as string;

    let targetUserId: string | null = null;
    let title = 'CourtMate';
    let body  = '';
    let tag   = 'courtmate';

    if (table === 'matches' && payload.type === 'INSERT') {
      targetUserId = record.receiver_id;
      title = 'Yeni Eşleşme İsteği';
      body  = 'Biri seninle eşleşmek istiyor!';
      tag   = 'match-request';
    } else if (table === 'matches' && payload.type === 'UPDATE' && record.status === 'accepted') {
      targetUserId = record.sender_id;
      title = 'Eşleştiniz!';
      body  = 'İsteğin kabul edildi. Korta çıkma zamanı!';
      tag   = 'match-accepted';
    } else if (table === 'messages' && payload.type === 'INSERT') {
      const { data: matchRow } = await db
        .from('matches').select('sender_id, receiver_id').eq('id', record.match_id).single();
      if (matchRow) {
        targetUserId = matchRow.sender_id === record.sender_id
          ? matchRow.receiver_id
          : matchRow.sender_id;
      }
      title = 'Yeni Mesaj';
      body  = record.text?.slice(0, 80) || '';
      tag   = `msg-${record.match_id}`;
    }

    if (!targetUserId) return new Response('No target', { status: 200 });

    const { data: sub } = await db
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', targetUserId)
      .single();

    if (!sub) {
      console.log('No push subscription for user:', targetUserId);
      return new Response('No subscription', { status: 200 });
    }

    const pushPayload = JSON.stringify({ title, body, tag, url: '/' });
    const resp = await sendWebPush(sub, pushPayload, {
      publicKey: VAPID_PUBLIC, privateKey: VAPID_PRIVATE, subject: VAPID_SUBJECT,
    });

    const respText = await resp.text().catch(() => '');
    console.log('Push result:', resp.status, respText);

    return new Response(JSON.stringify({ ok: resp.ok, status: resp.status }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('send-push error:', err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
});

// ── Web Push Encryption (RFC 8291 + RFC 8188) ──────────────

function b64Decode(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(b64 + '='.repeat((4 - b64.length % 4) % 4)), c => c.charCodeAt(0));
}

function b64Encode(buf: ArrayBuffer | Uint8Array): string {
  const arr = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  return btoa(String.fromCharCode(...arr)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let i = 0; for (const p of parts) { out.set(p, i); i += p.length; }
  return out;
}

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, len: number): Promise<Uint8Array> {
  const saltKey = await crypto.subtle.importKey('raw', salt, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const prk = new Uint8Array(await crypto.subtle.sign('HMAC', saltKey, ikm));
  const prkKey = await crypto.subtle.importKey('raw', prk, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const out = new Uint8Array(len);
  let prev = new Uint8Array(0), offset = 0;
  for (let i = 1; offset < len; i++) {
    const t = new Uint8Array(await crypto.subtle.sign('HMAC', prkKey, concat(prev, info, new Uint8Array([i]))));
    out.set(t.subarray(0, Math.min(t.length, len - offset)), offset);
    prev = t; offset += t.length;
  }
  return out;
}

async function encryptPush(plaintext: string, p256dhB64: string, authB64: string) {
  const enc = new TextEncoder();
  const clientPub = b64Decode(p256dhB64);
  const authSecret = b64Decode(authB64);

  // Ephemeral server ECDH key pair
  const serverKP = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const serverPubRaw = new Uint8Array(await crypto.subtle.exportKey('raw', serverKP.publicKey));

  // ECDH shared secret
  const clientKey = await crypto.subtle.importKey('raw', clientPub, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const sharedBits = await crypto.subtle.deriveBits({ name: 'ECDH', public: clientKey }, serverKP.privateKey, 256);
  const sharedSecret = new Uint8Array(sharedBits);

  // Salt (16 random bytes)
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // IKM = HKDF(salt=authSecret, ikm=sharedSecret, info="WebPush: info\0" || clientPub || serverPub)
  const ikmInfo = concat(enc.encode('WebPush: info\x00'), clientPub, serverPubRaw);
  const ikm = await hkdf(authSecret, sharedSecret, ikmInfo, 32);

  // CEK and nonce
  const cek   = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\x00'), 16);
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\x00'), 12);

  // AES-128-GCM encrypt (RFC 8188: plaintext || 0x02 for last record)
  const cekKey = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt']);
  const cipherBuf = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce },
    cekKey,
    concat(enc.encode(plaintext), new Uint8Array([2]))
  );

  // RFC 8188 header: salt(16) + rs(4, big-endian=4096) + keyidlen(1=65) + serverPub(65)
  const header = new Uint8Array(16 + 4 + 1 + 65);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, 4096, false);
  header[20] = 65;
  header.set(serverPubRaw, 21);

  return concat(header, new Uint8Array(cipherBuf));
}

async function sendWebPush(
  sub: { endpoint: string; p256dh: string; auth: string },
  payload: string,
  vapid: { publicKey: string; privateKey: string; subject: string }
) {
  const body = await encryptPush(payload, sub.p256dh, sub.auth);

  // VAPID JWT
  const now = Math.floor(Date.now() / 1000);
  const origin = new URL(sub.endpoint).origin;
  const enc = new TextEncoder();
  const header = b64Encode(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const claims = b64Encode(enc.encode(JSON.stringify({ aud: origin, exp: now + 43200, sub: vapid.subject })));

  // Import private key via JWK (avoids PKCS8 DER encoding issues)
  const pubBytes = b64Decode(vapid.publicKey); // 65 bytes: 0x04 || x(32) || y(32)
  const privJwk = {
    kty: 'EC', crv: 'P-256',
    d: vapid.privateKey,
    x: b64Encode(pubBytes.slice(1, 33)),
    y: b64Encode(pubBytes.slice(33, 65)),
  };
  const privKey = await crypto.subtle.importKey('jwk', privJwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, privKey, enc.encode(`${header}.${claims}`));
  const jwt = `${header}.${claims}.${b64Encode(sig)}`;

  return fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `vapid t=${jwt},k=${vapid.publicKey}`,
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      'TTL': '86400',
    },
    body,
  });
}
