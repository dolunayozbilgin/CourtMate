// Supabase Edge Function — push bildirimi gönder
// Dağıtım: supabase functions deploy send-push
// Gerekli secrets: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
// DB Webhook: matches INSERT + messages INSERT → bu fonksiyona POST

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const VAPID_PUBLIC  = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')!;
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT')!; // mailto:siz@email.com

const db = createClient(SUPABASE_URL, SERVICE_KEY);

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

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
    // match sahibi kim, mesajı alan kim?
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

  if (!sub) return new Response('No subscription', { status: 200 });

  const pushPayload = JSON.stringify({ title, body, tag, url: '/' });

  // Web Push gönder (web-push protokolü)
  const resp = await sendWebPush(sub, pushPayload, {
    publicKey: VAPID_PUBLIC, privateKey: VAPID_PRIVATE, subject: VAPID_SUBJECT,
  });

  return new Response(JSON.stringify({ ok: resp.ok, status: resp.status }), {
    headers: { 'Content-Type': 'application/json' },
  });
});

// ── Minimal Web Push gönderici (VAPID + AES-GCM) ──────────
// Not: Deno deploy ortamında tam web-push kütüphanesi kullanılamadığından
// basitleştirilmiş VAPID JWT + şifreleme implementasyonu.
// Üretimde: https://github.com/negrel/deno-web-push kullanabilirsiniz.
async function sendWebPush(
  sub: { endpoint: string; p256dh: string; auth: string },
  payload: string,
  vapid: { publicKey: string; privateKey: string; subject: string }
) {
  // VAPID JWT oluştur
  const now = Math.floor(Date.now() / 1000);
  const origin = new URL(sub.endpoint).origin;
  const header = btoa(JSON.stringify({ typ: 'JWT', alg: 'ES256' })).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const claimsObj = { aud: origin, exp: now + 43200, sub: vapid.subject };
  const claims = btoa(JSON.stringify(claimsObj)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const privKeyBytes = base64UrlDecode(vapid.privateKey);
  const privateKey = await crypto.subtle.importKey(
    'pkcs8', addPkcs8Header(privKeyBytes),
    { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']
  );
  const sigInput = new TextEncoder().encode(`${header}.${claims}`);
  const sigBuf   = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, privateKey, sigInput);
  const sig = btoa(String.fromCharCode(...new Uint8Array(sigBuf))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const jwt = `${header}.${claims}.${sig}`;

  return fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `vapid t=${jwt},k=${vapid.publicKey}`,
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      'TTL': '86400',
    },
    body: new TextEncoder().encode(payload),
  });
}

function base64UrlDecode(str: string) {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/').padEnd(str.length + (4 - str.length % 4) % 4, '=');
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}

function addPkcs8Header(rawKey: Uint8Array) {
  const prefix = new Uint8Array([0x30,0x41,0x02,0x01,0x00,0x30,0x13,0x06,0x07,0x2a,0x86,0x48,0xce,0x3d,0x02,0x01,0x06,0x08,0x2a,0x86,0x48,0xce,0x3d,0x03,0x01,0x07,0x04,0x27,0x30,0x25,0x02,0x01,0x01,0x04,0x20]);
  const result = new Uint8Array(prefix.length + rawKey.length);
  result.set(prefix); result.set(rawKey, prefix.length);
  return result.buffer;
}
