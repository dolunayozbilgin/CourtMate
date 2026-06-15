// courtmate-data.jsx — player data + small shared UI atoms
// Exposes to window: CM_PLAYERS, CM_LEVELS, Avatar, StatTile, Stars, Pill, MateScore, cx

const CM_LEVELS = [
  { id: 'baslangic', label: 'Başlangıç', utr: '1–3.5', desc: 'Yeni başlıyor, ralliyi öğreniyor' },
  { id: 'orta',      label: 'Orta',      utr: '3.5–6', desc: 'Düzenli oynuyor, maç tecrübesi var' },
  { id: 'ileri',     label: 'İleri',     utr: '6+',    desc: 'Turnuva / kulüp seviyesi' },
];

// hue is used for a subtle duotone tint on the avatar so players read distinct
const CM_PLAYERS = [
  {
    id: 'selin', name: 'Selin A.', initials: 'SA', utr: 7.1, dist: 1.1, hue: 86,
    avail: 'Şu an müsait', availHot: true, level: 'ileri', wl: '4G-1M',
    mate: 4.9, onTime: 96, forehand: 5, serve: 4, style: 'Agresif baseline',
    hand: 'Sağ', court: 'Caddebostan Tenis', verified: true, mutual: true,
    bio: 'Sabah kortları severim. Uzun ralli, sert forehand. Maç sonrası kahve şart.',
  },
  {
    id: 'emre', name: 'Emre K.', initials: 'EK', utr: 6.2, dist: 2.4, hue: 70,
    avail: 'Bugün müsait', availHot: true, level: 'ileri', wl: '3G-2M',
    mate: 4.7, onTime: 94, forehand: 4, serve: 3, style: 'Baseline grinder',
    hand: 'Sağ', court: 'Maslak Arena', verified: true, mutual: true,
    bio: 'Rekabetçi ama dostane. Tie-break sevdalısı. Akşam seansları benden.',
  },
  {
    id: 'can', name: 'Can Ö.', initials: 'CÖ', utr: 5.6, dist: 4.2, hue: 150,
    avail: 'Yarın müsait', availHot: false, level: 'orta', wl: '3G-3M',
    mate: 4.6, onTime: 90, forehand: 3, serve: 4, style: 'All-court',
    hand: 'Sol', court: 'Ataşehir Kort', verified: false, mutual: false,
    bio: 'Servis-vole denemeyi seviyorum. Hafta içi öğlenleri uygunum.',
  },
  {
    id: 'burak', name: 'Burak T.', initials: 'BT', utr: 4.8, dist: 3.7, hue: 200,
    avail: 'Hafta sonu', availHot: false, level: 'orta', wl: '2G-3M',
    mate: 4.3, onTime: 88, forehand: 3, serve: 3, style: 'Serve & volley',
    hand: 'Sağ', court: 'Kadıköy Spor', verified: false, mutual: true,
    bio: 'Çift de oynarım. Antrenman partneri arıyorum, ciddiyim ama eğlenceli.',
  },
  {
    id: 'zeynep', name: 'Zeynep K.', initials: 'ZK', utr: 4.2, dist: 1.9, hue: 320,
    avail: 'Bugün müsait', availHot: true, level: 'baslangic', wl: '2G-1M',
    mate: 4.4, onTime: 92, forehand: 3, serve: 2, style: 'Gelişen oyuncu',
    hand: 'Sağ', court: 'Bağdat Cd. Kort', verified: false, mutual: false,
    bio: '6 aydır oynuyorum, sabırlı bir partner harika olur. Bol ralli isterim.',
  },
  {
    id: 'mert', name: 'Mert D.', initials: 'MD', utr: 8.0, dist: 5.0, hue: 18,
    avail: 'Akşamları', availHot: false, level: 'ileri', wl: '5G-0M',
    mate: 5.0, onTime: 98, forehand: 5, serve: 5, style: 'Tam saha baskı',
    hand: 'Sağ', court: 'Levent Tenis Kulübü', verified: true, mutual: true,
    bio: 'Eski ITF. Sert tempo, yüksek ritim. Sadece ciddi maç için yazın.',
  },
  {
    id: 'deniz', name: 'Deniz Y.', initials: 'DY', utr: 3.5, dist: 0.8, hue: 250,
    avail: 'Bugün müsait', availHot: true, level: 'baslangic', wl: '1G-1M',
    mate: 4.5, onTime: 91, forehand: 2, serve: 2, style: 'Yeni başlıyor',
    hand: 'Sol', court: 'Fenerbahçe Kort', verified: false, mutual: false,
    bio: 'Tenise yeni başladım, çok hevesliyim. Birlikte öğreniriz!',
  },
];

const cx = (...a) => a.filter(Boolean).join(' ');

function Avatar({ p, size = 92 }) {
  const fs = Math.round(size * 0.34);
  return (
    <div className="cm-avatar" style={{
      width: size, height: size,
      // duotone: accent base + per-player hue wash so they read distinct
      background: `radial-gradient(120% 120% at 30% 20%, hsl(${p.hue} 70% 62%), var(--accent) 70%)`,
    }}>
      <span style={{ fontFamily: 'var(--display)', fontSize: fs, color: 'var(--accent-ink)', letterSpacing: '-.02em' }}>
        {p.initials}
      </span>
    </div>
  );
}

function Stars({ n, max = 5 }) {
  return (
    <div className="cm-stars" aria-label={`${n}/${max}`}>
      {Array.from({ length: max }).map((_, i) => (
        <svg key={i} viewBox="0 0 24 24" width="14" height="14"
          style={{ opacity: i < n ? 1 : 0.18 }}>
          <path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.8 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z"
            fill="var(--accent)" />
        </svg>
      ))}
    </div>
  );
}

function StatTile({ label, value, children, accent }) {
  return (
    <div className="cm-stat">
      <div className="cm-stat-label">{label}</div>
      {children || <div className={cx('cm-stat-value', accent && 'is-accent')}>{value}</div>}
    </div>
  );
}

function Pill({ children, tone = 'default' }) {
  return <span className={cx('cm-pill', `is-${tone}`)}>{children}</span>;
}

function MateScore({ value }) {
  const v = typeof value === 'number' && !isNaN(value) ? value : 0;
  return (
    <div className="cm-mate">
      <span className="cm-mate-label">MATE SCORE</span>
      <span className="cm-mate-val">{v.toFixed(1)}<i>/5</i></span>
    </div>
  );
}

Object.assign(window, { CM_PLAYERS, CM_LEVELS, Avatar, Stars, StatTile, Pill, MateScore, cx });
