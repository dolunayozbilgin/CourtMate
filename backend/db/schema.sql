-- ============================================================
-- CourtMate — Supabase Schema
-- Supabase SQL Editor'e kopyalayıp çalıştır
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- UZANTILAR
-- ──────────────────────────────────────────────────────────
-- PostGIS: konum bazlı sorgular için (yakındaki oyuncular)
CREATE EXTENSION IF NOT EXISTS postgis;

-- ──────────────────────────────────────────────────────────
-- 1. PROFİLLER
-- auth.users Supabase tarafından yönetilir (e-posta, şifre,
-- doğrulama hepsi otomatik). Biz sadece oyun profilini tutuyoruz.
-- ──────────────────────────────────────────────────────────
CREATE TABLE profiles (
  id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL CHECK (char_length(name) >= 2),
  age         INTEGER     NOT NULL CHECK (age >= 10 AND age <= 99),
  level       TEXT        NOT NULL CHECK (level IN ('baslangic', 'orta', 'ileri')),
  style       TEXT,
  hand        TEXT        NOT NULL DEFAULT 'Sağ el',
  court       TEXT,
  avail       TEXT,
  bio         TEXT        CHECK (char_length(bio) <= 160),

  -- Konum (PostGIS point: longitude, latitude)
  location    GEOGRAPHY(POINT, 4326),

  -- GPS koordinatları (client-side haversine hesabı için)
  lat         FLOAT,
  lng         FLOAT,

  -- Profil fotoğrafı (Supabase Storage bucket'ına yüklenen dosyanın yolu)
  avatar_url  TEXT,

  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- updated_at otomatik güncellensin
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Kullanıcı kayıt olunca boş profil otomatik oluşsun
-- (Uygulama hemen ardından profil bilgilerini dolduracak)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, name, age, level)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Yeni Oyuncu'),
    COALESCE((NEW.raw_user_meta_data->>'age')::integer, 18),
    COALESCE(NEW.raw_user_meta_data->>'level', 'baslangic')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ──────────────────────────────────────────────────────────
-- 2. EŞLEŞMELER
-- ──────────────────────────────────────────────────────────
CREATE TABLE matches (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id    UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id  UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status       TEXT        NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),

  -- Aynı ikili için tek istek
  CONSTRAINT no_duplicate_request UNIQUE (sender_id, receiver_id),
  -- Kendine istek gönderilemez
  CONSTRAINT no_self_match        CHECK (sender_id <> receiver_id)
);

CREATE TRIGGER matches_updated_at
  BEFORE UPDATE ON matches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ──────────────────────────────────────────────────────────
-- 3. MESAJLAR
-- ──────────────────────────────────────────────────────────
CREATE TABLE messages (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id   UUID        NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  sender_id  UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  text       TEXT        NOT NULL CHECK (char_length(text) >= 1 AND char_length(text) <= 1000),
  read_at    TIMESTAMPTZ,               -- NULL = okunmamış
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ──────────────────────────────────────────────────────────
-- 4. INDEX'LER
-- ──────────────────────────────────────────────────────────
CREATE INDEX idx_profiles_level    ON profiles(level);
CREATE INDEX idx_profiles_location ON profiles USING GIST(location);

CREATE INDEX idx_matches_sender    ON matches(sender_id);
CREATE INDEX idx_matches_receiver  ON matches(receiver_id);
CREATE INDEX idx_matches_status    ON matches(status);

CREATE INDEX idx_messages_match    ON messages(match_id, created_at);
CREATE INDEX idx_messages_unread   ON messages(match_id) WHERE read_at IS NULL;


-- ──────────────────────────────────────────────────────────
-- 5. YARDIMCI FONKSİYONLAR
-- ──────────────────────────────────────────────────────────

-- İki kullanıcı arasındaki eşleşmeyi getir (kim göndermiş olursa)
CREATE OR REPLACE FUNCTION get_match_between(user_a UUID, user_b UUID)
RETURNS TABLE(id UUID, status TEXT) AS $$
  SELECT id, status FROM matches
  WHERE (sender_id = user_a AND receiver_id = user_b)
     OR (sender_id = user_b AND receiver_id = user_a)
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Yakındaki oyuncuları getir (metre cinsinden mesafe ile)
CREATE OR REPLACE FUNCTION get_nearby_players(
  user_id    UUID,
  radius_m   INTEGER DEFAULT 10000   -- varsayılan 10 km
)
RETURNS TABLE(
  id          UUID,
  name        TEXT,
  age         INTEGER,
  level       TEXT,
  style       TEXT,
  hand        TEXT,
  court       TEXT,
  avail       TEXT,
  bio         TEXT,
  avatar_url  TEXT,
  distance_m  FLOAT
) AS $$
  SELECT
    p.id, p.name, p.age, p.level, p.style,
    p.hand, p.court, p.avail, p.bio, p.avatar_url,
    ST_Distance(p.location, me.location) AS distance_m
  FROM profiles p
  JOIN profiles me ON me.id = user_id
  WHERE p.id <> user_id
    AND p.location IS NOT NULL
    AND me.location IS NOT NULL
    AND ST_DWithin(p.location, me.location, radius_m)
  ORDER BY distance_m ASC;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Bir kullanıcının okunmamış mesaj sayısını getir
CREATE OR REPLACE FUNCTION get_unread_count(uid UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM messages m
  JOIN matches mt ON mt.id = m.match_id
  WHERE (mt.sender_id = uid OR mt.receiver_id = uid)
    AND m.sender_id <> uid
    AND m.read_at IS NULL;
$$ LANGUAGE sql STABLE SECURITY DEFINER;


-- ──────────────────────────────────────────────────────────
-- 6. ROW LEVEL SECURITY (RLS)
-- Her kullanıcı yalnızca kendi verisini görebilir/değiştirebilir
-- ──────────────────────────────────────────────────────────

-- ── profiles ────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Herkes profilleri görebilir (Keşfet ekranı için)
CREATE POLICY "profiles_select_all"
  ON profiles FOR SELECT
  USING (true);

-- Sadece kendi profilini güncelleyebilirsin
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Sadece kendi profilini silebilirsin
CREATE POLICY "profiles_delete_own"
  ON profiles FOR DELETE
  USING (auth.uid() = id);

-- INSERT: trigger zaten hallediyor (SECURITY DEFINER)
-- Direkt insert'e izin verme
CREATE POLICY "profiles_insert_trigger_only"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);


-- ── matches ─────────────────────────────────────────────
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- Kendi eşleşmelerini görebilirsin (gönderdiğin veya aldığın)
CREATE POLICY "matches_select_own"
  ON matches FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- İstek gönderebilirsin (sadece sender olarak)
CREATE POLICY "matches_insert_as_sender"
  ON matches FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- Sadece receiver kabul/red edebilir
CREATE POLICY "matches_update_receiver"
  ON matches FOR UPDATE
  USING (auth.uid() = receiver_id)
  WITH CHECK (status IN ('accepted', 'rejected'));

-- Gönderdiğin isteği iptal edebilirsin
CREATE POLICY "matches_delete_sender"
  ON matches FOR DELETE
  USING (auth.uid() = sender_id);


-- ── messages ────────────────────────────────────────────
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Sadece eşleştiğin kişilerle mesajları görebilirsin
CREATE POLICY "messages_select_participants"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = messages.match_id
        AND (m.sender_id = auth.uid() OR m.receiver_id = auth.uid())
        AND m.status = 'accepted'
    )
  );

-- Sadece kabul edilmiş eşleşmelere mesaj gönderebilirsin
CREATE POLICY "messages_insert_participants"
  ON messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = messages.match_id
        AND (m.sender_id = auth.uid() OR m.receiver_id = auth.uid())
        AND m.status = 'accepted'
    )
  );

-- Sadece kendi mesajını silebilirsin
CREATE POLICY "messages_delete_own"
  ON messages FOR DELETE
  USING (auth.uid() = sender_id);


-- ──────────────────────────────────────────────────────────
-- 7. REALTIME (Supabase Realtime için tabloları abone listesine ekle)
-- ──────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE matches;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;


-- ──────────────────────────────────────────────────────────
-- 8. STORAGE — Avatar bucket
-- Supabase Dashboard → Storage → New Bucket: "avatars", Public: TRUE
-- Sonra bu SQL'i çalıştır:
-- ──────────────────────────────────────────────────────────

-- Kendi klasörüne yükleyebilirsin (path: {userId}/avatar.*)
CREATE POLICY "avatars_insert_own"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (string_to_array(name, '/'))[1]);

-- Herkes okuyabilir (public profil fotoğrafı)
CREATE POLICY "avatars_select_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Sadece kendi dosyasını güncelleyebilirsin
CREATE POLICY "avatars_update_own"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (string_to_array(name, '/'))[1]);

-- Sadece kendi dosyasını silebilirsin
CREATE POLICY "avatars_delete_own"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (string_to_array(name, '/'))[1]);

-- ──────────────────────────────────────────────────────────
-- 9. Hesap silme RPC (isteğe bağlı, cmDeleteAccount'ta kullanılıyor)
-- ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION delete_own_account()
RETURNS void AS $$
BEGIN
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ──────────────────────────────────────────────────────────
-- 10. ENGELLEME & ŞİKAYET
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS blocks (
  blocker_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (blocker_id, blocked_id)
);
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blocks_select_own" ON blocks FOR SELECT USING (auth.uid() = blocker_id);
CREATE POLICY "blocks_insert_own" ON blocks FOR INSERT WITH CHECK (auth.uid() = blocker_id);
CREATE POLICY "blocks_delete_own" ON blocks FOR DELETE USING (auth.uid() = blocker_id);

CREATE TABLE IF NOT EXISTS reports (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  reason     TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reports_insert_own" ON reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- ──────────────────────────────────────────────────────────
-- 11. GPS KOLONLARI (var olan DB'ye uygulamak için)
-- Yeni kurulumda profiles tablosu zaten lat/lng içeriyor.
-- Mevcut bir DB'ye eklemek için:
-- ──────────────────────────────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS lat FLOAT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS lng FLOAT;

-- ──────────────────────────────────────────────────────────
-- KURULUM TAMAMLANDI
-- Şimdi Supabase Dashboard → Authentication → Email Templates
-- bölümünden doğrulama e-posta şablonunu özelleştirebilirsin.
-- ──────────────────────────────────────────────────────────
