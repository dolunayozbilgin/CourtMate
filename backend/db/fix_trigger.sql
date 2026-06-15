-- ============================================================
-- CourtMate — Trigger Düzeltme
-- "Database error saving new user" hatasını çözer
-- Supabase SQL Editor'e kopyalayıp çalıştır
-- ============================================================

-- 1. Eski trigger + fonksiyonu temizle
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

-- 2. Daha sağlam versiyon: hata olsa bile kayıt işlemini engellemiyor
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_name  TEXT;
  v_age   INTEGER;
  v_level TEXT;
BEGIN
  -- Metadata'dan değerleri güvenli şekilde al
  v_name  := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'name', '')), '');
  v_age   := NULLIF(NEW.raw_user_meta_data->>'age', '')::integer;
  v_level := NULLIF(NEW.raw_user_meta_data->>'level', '');

  -- Güvenli varsayılanlar
  IF v_name IS NULL OR char_length(v_name) < 2 THEN v_name := 'Yeni Oyuncu'; END IF;
  IF v_age  IS NULL OR v_age < 10 OR v_age > 99  THEN v_age  := 18; END IF;
  IF v_level NOT IN ('baslangic', 'orta', 'ileri') THEN v_level := 'baslangic'; END IF;

  INSERT INTO profiles (id, name, age, level)
  VALUES (NEW.id, v_name, v_age, v_level)
  ON CONFLICT (id) DO NOTHING;   -- tekrar tetiklenirse sessizce geç

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Trigger hatası kayıt işlemini asla engellemesin
  RAISE WARNING 'handle_new_user hatası: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Trigger'ı yeniden bağla
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
