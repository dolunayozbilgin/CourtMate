// courtmate-supabase.js — Supabase istemcisi + tüm API fonksiyonları
// anon key frontend için tasarlanmış ve güvenli; asıl güvenlik RLS politikalarından geliyor.
// Exposes to window: cm_db, profileToMe,
//   cmSignUp, cmSignIn, cmSignOut, cmGetSession, cmOnAuthStateChange,
//   cmSyncProfile, cmGetProfile, cmUpdateProfile,
//   cmSendMatchRequest, cmGetMatches, cmAcceptMatch,
//   cmGetMessages, cmSendMsg, cmMarkRead, cmSubscribeMessages, cmSubscribeMatches

const CM_SUPABASE_URL  = 'https://auvswprcxndqdkvrshur.supabase.co';
const CM_SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1dnN3cHJjeG5kcWRrdnJzaHVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NDQ4OTgsImV4cCI6MjA5NzAyMDg5OH0.mThEdEi2fajDxlUAh7FvE8T6UxlqPcEGJi3lWx_njFQ';

// Supabase yüklenmediyse uygulama çökmesini engelle
if (!window.supabase) {
  console.warn('Supabase CDN yüklenemedi — offline mod');
  window.supabase = { createClient: () => ({
    auth: { getSession: async () => ({ data: { session: null }, error: null }),
             signUp: async () => { throw new Error('Çevrimdışısın, internet bağlantını kontrol et'); },
             signInWithPassword: async () => { throw new Error('Çevrimdışısın, internet bağlantını kontrol et'); },
             signOut: async () => ({}),
             onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }) },
    from: () => ({ select: () => ({ neq: () => ({ data: [], error: null }), eq: () => ({ maybeSingle: async () => ({ data: null, error: null }), data: [], error: null }), or: async () => ({ data: [], error: null }) }), insert: () => ({ select: () => ({ single: async () => ({ data: null, error: new Error('Çevrimdışı') }) }) }), update: () => ({ eq: () => ({ select: () => ({ single: async () => ({ data: null, error: new Error('Çevrimdışı') }) }) }) }), upsert: async () => ({ error: null }) }),
    channel: () => ({ on: function() { return this; }, subscribe: () => {} }),
  }) };
}

const { createClient } = window.supabase;
const cm_db = createClient(CM_SUPABASE_URL, CM_SUPABASE_ANON, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

// ── Yardımcı ──────────────────────────────────────────────
function _initials(name) {
  const p = String(name || '').trim().split(/\s+/).filter(Boolean);
  return ((p[0]?.[0] || '') + (p.length > 1 ? p[p.length - 1][0] : '')).toLocaleUpperCase('tr');
}
function _hue(s) {
  let h = 7;
  for (const c of String(s || '')) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}

// DB profile satırını uygulama içi `me` nesnesine dönüştür
function profileToMe(profile, email) {
  const levels = window.CM_LEVELS || [];
  const lvl = levels.find(l => l.id === profile.level);
  return {
    id:         profile.id,
    isMe:       true,
    email:      email || '',
    name:       profile.name,
    initials:   _initials(profile.name),
    age:        profile.age,
    level:      profile.level,
    levelLabel: lvl ? lvl.label : profile.level,
    utrRange:   lvl ? lvl.utr : '—',
    style:      profile.style  || '',
    hand:       profile.hand   || 'Sağ el',
    court:      profile.court  || '—',
    avail:      profile.avail  || '',
    bio:        profile.bio    || '',
    hue:        _hue((profile.name || '') + (profile.style || '')),
    avatar_url: profile.avatar_url || null,
    lat:        profile.lat  || null,
    lng:        profile.lng  || null,
  };
}

// ── Auth ──────────────────────────────────────────────────

async function cmSignUp(email, password, profile) {
  const { data, error } = await cm_db.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: {
        name:  profile.name,
        age:   String(profile.age),
        level: profile.level,
        style: profile.style  || '',
        hand:  profile.hand   || 'Sağ el',
        court: profile.court  || '',
        avail: profile.avail  || '',
        bio:   profile.bio    || '',
      }
    }
  });
  if (error) throw error;

  const needsConfirmation = !data.session;

  // E-posta onayı gerekmiyorsa profili hemen yaz
  if (data.session && data.user) {
    await cmSyncProfile(data.user.id, profile);
  }

  return { needsConfirmation, user: data.user, session: data.session };
}

async function cmSignIn(email, password) {
  const { data, error } = await cm_db.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw error;
  return data; // { user, session }
}

async function cmSignOut() {
  const { error } = await cm_db.auth.signOut();
  if (error) console.warn('cmSignOut:', error.message);
}

async function cmGetSession() {
  const { data, error } = await cm_db.auth.getSession();
  if (error) throw error;
  return data; // { session }
}

function cmOnAuthStateChange(callback) {
  return cm_db.auth.onAuthStateChange(callback);
}

// ── Profil ────────────────────────────────────────────────

async function cmSyncProfile(userId, profile) {
  const { error } = await cm_db.from('profiles').upsert({
    id:    userId,
    name:  profile.name,
    age:   Number(profile.age),
    level: profile.level,
    style: profile.style  || null,
    hand:  profile.hand   || 'Sağ el',
    court: profile.court && profile.court !== '—' ? profile.court : null,
    avail: profile.avail  || null,
    bio:   profile.bio    || null,
  });
  if (error) throw error;
}

async function cmGetProfile(userId) {
  const { data, error } = await cm_db
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function cmUpdateProfile(userId, updates) {
  const { data, error } = await cm_db
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── Eşleşmeler ────────────────────────────────────────────

async function cmSendMatchRequest(senderId, receiverId) {
  const { data, error } = await cm_db
    .from('matches')
    .insert({ sender_id: senderId, receiver_id: receiverId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function cmGetMatches(userId) {
  const { data, error } = await cm_db
    .from('matches')
    .select('*, sender:sender_id(id,name,age,level,court,avail,style,hand), receiver:receiver_id(id,name,age,level,court,avail,style,hand)')
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);
  if (error) throw error;
  return data || [];
}

async function cmAcceptMatch(matchId) {
  const { data, error } = await cm_db
    .from('matches')
    .update({ status: 'accepted' })
    .eq('id', matchId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── Mesajlar ──────────────────────────────────────────────

async function cmGetMessages(matchId) {
  const { data, error } = await cm_db
    .from('messages')
    .select('*')
    .eq('match_id', matchId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

async function cmSendMsg(matchId, senderId, text) {
  const { data, error } = await cm_db
    .from('messages')
    .insert({ match_id: matchId, sender_id: senderId, text })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function cmMarkRead(matchId, userId) {
  await cm_db
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('match_id', matchId)
    .neq('sender_id', userId)
    .is('read_at', null);
}

function cmSubscribeMessages(matchId, callback) {
  return cm_db
    .channel(`messages-${matchId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `match_id=eq.${matchId}` }, callback)
    .subscribe();
}

function cmSubscribeMatches(userId, callback) {
  return cm_db
    .channel(`matches-user-${userId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `receiver_id=eq.${userId}` }, callback)
    .subscribe();
}

// ── Keşfet: Gerçek oyuncuları getir ───────────────────────
function _utrFromProfile(p) {
  const ranges = { baslangic: [2.0, 3.9], orta: [4.0, 6.9], ileri: [7.0, 10.0] };
  const [min, max] = ranges[p.level] || [3.0, 6.0];
  let h = 0; for (const c of String(p.id || '')) h = (h * 31 + c.charCodeAt(0)) % 1000;
  return +(min + (h / 1000) * (max - min)).toFixed(1);
}

function profileToPlayer(p, sentToIds, receivedFromIds) {
  return {
    id:       p.id,
    name:     p.name,
    initials: _initials(p.name),
    age:      p.age,
    level:    p.level,
    utr:      _utrFromProfile(p),
    lat:      p.lat  || null,
    lng:      p.lng  || null,
    dist:     null,
    avail:    p.avail   || 'Esnek',
    court:    p.court   || 'Belirtilmemiş',
    mutual:   (receivedFromIds || new Set()).has(p.id) && !(sentToIds || new Set()).has(p.id),
    style:    p.style   || '',
    hand:     p.hand    || 'Sağ el',
    bio:      p.bio     || '',
    hue:      _hue((p.name || '') + (p.style || '')),
    verified: false,
    isReal:   true,
  };
}

async function cmGetDiscoverPlayers(userId) {
  const [{ data: profiles, error: pe }, { data: myMatches }] = await Promise.all([
    cm_db.from('profiles').select('*').neq('id', userId),
    cm_db.from('matches').select('sender_id,receiver_id,status')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`),
  ]);
  if (pe) throw pe;
  const sentTo       = new Set((myMatches || []).filter(m => m.sender_id   === userId).map(m => m.receiver_id));
  const receivedFrom = new Set((myMatches || []).filter(m => m.receiver_id === userId).map(m => m.sender_id));
  return (profiles || []).map(p => profileToPlayer(p, sentTo, receivedFrom));
}

async function cmBlockUser(blockerId, blockedId) {
  const { error } = await cm_db.from('blocks').insert({ blocker_id: blockerId, blocked_id: blockedId });
  if (error && !error.message.includes('duplicate')) throw error;
}

async function cmReportUser(reporterId, reportedId, reason) {
  const { error } = await cm_db.from('reports').insert({ reporter_id: reporterId, reported_id: reportedId, reason });
  if (error) throw error;
}

async function cmGetBlockedIds(userId) {
  const { data, error } = await cm_db.from('blocks').select('blocked_id').eq('blocker_id', userId);
  if (error) throw error;
  return (data || []).map(r => r.blocked_id);
}

async function cmSaveLocation(userId, lat, lng) {
  await cmUpdateProfile(userId, { lat, lng });
}

async function cmUploadAvatar(userId, file) {
  if (file.size > 5 * 1024 * 1024) throw new Error('Fotoğraf en fazla 5 MB olabilir');
  if (!file.type.startsWith('image/')) throw new Error('Sadece resim dosyası yükleyebilirsin');
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${userId}/avatar.${ext}`;
  const { error: upErr } = await cm_db.storage.from('avatars').upload(path, file, {
    upsert: true, contentType: file.type,
  });
  if (upErr) throw upErr;
  const { data } = cm_db.storage.from('avatars').getPublicUrl(path);
  const publicUrl = data.publicUrl + '?t=' + Date.now();
  await cmUpdateProfile(userId, { avatar_url: publicUrl });
  return publicUrl;
}

async function cmDeleteAccount(userId) {
  await cm_db.storage.from('avatars').remove([`${userId}/avatar.jpg`, `${userId}/avatar.png`, `${userId}/avatar.jpeg`, `${userId}/avatar.webp`]);
  const { error } = await cm_db.rpc('delete_own_account');
  if (error) {
    await cm_db.from('profiles').delete().eq('id', userId);
    await cm_db.auth.signOut();
  }
}

Object.assign(window, {
  cm_db, profileToMe, profileToPlayer,
  cmSignUp, cmSignIn, cmSignOut, cmGetSession, cmOnAuthStateChange,
  cmSyncProfile, cmGetProfile, cmUpdateProfile, cmGetDiscoverPlayers,
  cmBlockUser, cmReportUser, cmGetBlockedIds,
  cmSaveLocation, cmUploadAvatar, cmDeleteAccount,
  cmSendMatchRequest, cmGetMatches, cmAcceptMatch,
  cmGetMessages, cmSendMsg, cmMarkRead, cmSubscribeMessages, cmSubscribeMatches,
});
