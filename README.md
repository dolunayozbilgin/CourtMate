# CourtMate

Tenis oyuncularını buluşturan eşleşme uygulaması. Tinder mantığıyla çalışır: swipe'la, eşleş, kort randevusu ver, maçını kaydet.

---

## Özellikler

- **Keşfet** — Yakındaki oyuncuları swipe'la, beğenilerin karşılıklıysa eşleşme olur
- **Filtrele** — Seviye, mesafe ve müsaitlik gününe göre özelleştir
- **Maç Planla** — Chat içinden kort, gün ve saat teklif et; partner kabul edince takvime girer
- **Maç Geçmişi** — Oynadığın maçları profilde takip et, G/M istatistiği gör
- **Puanlama** — Maç sonrası partneri 5 yıldız üzerinden değerlendir (Uber tarzı)
- **Gerçek Zamanlı Chat** — Supabase Realtime ile anlık mesajlaşma
- **Push Bildirimleri** — Web Push ile yeni mesaj ve eşleşme bildirimleri
- **Fotoğraf Yükleme** — Profil fotoğrafı Supabase Storage'a yüklenir
- **GPS Filtresi** — Haversine formülüyle gerçek mesafe hesabı
- **Engelle / Şikayet** — Kullanıcı güvenliği için blok ve rapor sistemi

---

## Teknoloji

| Katman | Teknoloji |
|---|---|
| Frontend | React (Babel CDN, tek HTML dosyası) |
| Backend | Supabase (Auth, DB, Storage, Realtime) |
| Edge Functions | Supabase Edge Functions (Deno) |
| Push | Service Worker + Web Push (RFC 8291) |
| Hosting | Netlify (static, build adımı yok) |

---

## Kurulum

### Gereksinimler

- Supabase hesabı ve projesi
- Netlify hesabı (veya herhangi bir static hosting)

### 1. Supabase Tabloları

Supabase SQL editöründe sırayla çalıştır:

```sql
-- Profiller
create table profiles (
  id uuid primary key references auth.users,
  name text,
  age int,
  level text,
  style text,
  hand text,
  court text,
  avail text,
  bio text,
  avatar_url text,
  lat float,
  lng float,
  avg_rating float,
  rating_count int default 0
);

-- Eşleşmeler
create table matches (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references profiles(id),
  receiver_id uuid references profiles(id),
  status text default 'pending',
  created_at timestamptz default now()
);

-- Mesajlar
create table messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references matches(id),
  sender_id uuid references profiles(id),
  text text,
  created_at timestamptz default now()
);

-- Planlanmış maçlar
create table scheduled_matches (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references matches(id),
  sender_id uuid references profiles(id),
  receiver_id uuid references profiles(id),
  court_name text,
  court_surf text,
  day text,
  scheduled_time text,
  status text default 'pending',
  winner_id uuid references profiles(id),
  rating_by_sender int check (rating_by_sender between 1 and 5),
  rating_by_receiver int check (rating_by_receiver between 1 and 5),
  created_at timestamptz default now()
);

-- Engellenenler
create table blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid references profiles(id),
  blocked_id uuid references profiles(id),
  created_at timestamptz default now()
);

-- Şikayetler
create table reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references profiles(id),
  reported_id uuid references profiles(id),
  reason text,
  created_at timestamptz default now()
);
```

Puanlama RPC'si:

```sql
create or replace function submit_match_rating(
  p_schedule_id uuid, p_rater_id uuid, p_stars int
) returns void as $$
declare
  v_sender_id uuid; v_receiver_id uuid; v_rated_id uuid;
  v_avg float; v_count bigint;
begin
  select sender_id, receiver_id into v_sender_id, v_receiver_id
    from scheduled_matches where id = p_schedule_id;
  if p_rater_id = v_sender_id then
    update scheduled_matches set rating_by_sender = p_stars where id = p_schedule_id;
    v_rated_id := v_receiver_id;
  else
    update scheduled_matches set rating_by_receiver = p_stars where id = p_schedule_id;
    v_rated_id := v_sender_id;
  end if;
  select avg(stars)::float, count(*) into v_avg, v_count from (
    select rating_by_sender as stars from scheduled_matches
      where receiver_id = v_rated_id and rating_by_sender is not null and status = 'accepted'
    union all
    select rating_by_receiver as stars from scheduled_matches
      where sender_id = v_rated_id and rating_by_receiver is not null and status = 'accepted'
  ) r;
  update profiles set avg_rating = round(v_avg::numeric, 1), rating_count = v_count
    where id = v_rated_id;
end;
$$ language plpgsql security definer;
```

### 2. Storage

Supabase Storage'da `avatars` adında public bir bucket oluştur.

### 3. Ortam Değişkenleri

`CourtMate.html` içinde Supabase URL ve anon key'i güncelle:

```js
const SUPABASE_URL = 'https://xxxx.supabase.co';
const SUPABASE_KEY = 'eyJ...';
```

### 4. Deploy

```bash
# Netlify CLI ile
netlify deploy --prod

# Ya da klasörü doğrudan Netlify'a sürükle
```

---

## Dosya Yapısı

```
CourtMate.html          # Uygulamanın tamamı — tek dosya
courtmate-supabase.js   # Supabase fonksiyonları (window.cmXxx olarak yüklenir)
sw.js                   # Service Worker (Web Push)
index.html              # CourtMate.html'e yönlendirme
supabase/functions/     # Edge Functions (push gönderimi)
netlify.toml            # Netlify yapılandırması
```

---

## Supabase Tabloları Özet

| Tablo | Açıklama |
|---|---|
| `profiles` | Kullanıcı profili, konum, ortalama puan |
| `matches` | Eşleşme istekleri (pending / accepted / rejected) |
| `messages` | Chat mesajları |
| `scheduled_matches` | Maç teklifleri, sonuçlar, karşılıklı puanlamalar |
| `blocks` | Engellenen kullanıcılar |
| `reports` | Şikayet kayıtları |

---

## Lisans

MIT
