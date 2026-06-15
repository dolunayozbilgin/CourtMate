// courtmate-onboard.jsx — registration/onboarding flow + profile screen
// Exposes: SignupFlow, ProfileScreen, buildMe

const STYLE_OPTS = ['Agresif baseline', 'Baseline grinder', 'All-court', 'Serve & volley', 'Defansif', 'Yeni başlıyor'];
const HAND_OPTS = ['Sağ el', 'Sol el'];
const AVAIL_OPTS = ['Sabahları', 'Öğlenleri', 'Akşamları', 'Hafta sonu'];

function initialsOf(name) {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  const a = parts[0][0] || '';
  const b = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (a + b).toLocaleUpperCase('tr');
}
function hueFromName(s) {
  let h = 7;
  for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}
function buildMe(d) {
  const lvl = CM_LEVELS.find((l) => l.id === d.level) || CM_LEVELS[0];
  return {
    id: 'me', isMe: true, verified: false,
    name: d.name.trim(), initials: initialsOf(d.name), age: +d.age,
    email: (d.email || '').trim(), password: d.password || '',
    level: d.level, levelLabel: lvl.label, utrRange: lvl.utr,
    style: d.style, hand: d.hand, court: (d.court || '').trim() || '—',
    avail: d.avail, bio: (d.bio || '').trim(),
    hue: hueFromName(d.name + d.style),
  };
}

// ── Registration / onboarding ───────────────────────────
function SignupFlow({ initial, editing, onComplete, onCancel }) {
  const { useState } = React;
  const [step, setStep] = useState(0);
  const [name, setName] = useState(initial?.name || '');
  const [age, setAge] = useState(initial?.age ? String(initial.age) : '');
  const [level, setLevel] = useState(initial?.level || '');
  const [style, setStyle] = useState(initial?.style || '');
  const [hand, setHand] = useState(initial?.hand || 'Sağ el');
  const [court, setCourt] = useState(initial?.court && initial.court !== '—' ? initial.court : '');
  const [avail, setAvail] = useState(initial?.avail || '');
  const [bio, setBio] = useState(initial?.bio || '');

  const STEPS = [
    { k: 'KİMLİK', t: 'Kendini\ntanıt' },
    { k: 'SEVİYE', t: 'Senin\nseviyen ne?' },
    { k: 'OYUN PROFİLİ', t: 'Nasıl\noynuyorsun?' },
    { k: 'HAKKINDA', t: 'Birkaç\nsöz et' },
  ];
  const valid = [
    name.trim().length >= 2 && +age >= 10 && +age <= 99,
    !!level,
    !!style && !!hand,
    !!avail,
  ];
  const last = step === STEPS.length - 1;
  const go = () => {
    if (!valid[step]) return;
    if (last) onComplete(buildMe({ name, age, level, style, hand, court, avail, bio }));
    else setStep((s) => s + 1);
  };
  const back = () => { if (step === 0) onCancel && onCancel(); else setStep((s) => s - 1); };

  return (
    <div className="cm-signup">
      <div className="cm-su-top">
        <button className="cm-su-back" onClick={back} aria-label="Geri">
          <svg viewBox="0 0 24 24" width="20" height="20"><path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <div className="cm-su-prog">
          {STEPS.map((s, i) => (
            <span key={i} className={cx('cm-su-seg', i <= step && 'is-on')} />
          ))}
        </div>
        <span className="cm-su-count">{step + 1}/{STEPS.length}</span>
      </div>

      <div className="cm-su-body">
        <span className="cm-su-kicker">▶ {editing ? 'PROFİLİ DÜZENLE' : `ADIM ${step + 1}`} · {STEPS[step].k}</span>
        <h1 className="cm-su-title">{STEPS[step].t}</h1>

        {step === 0 && (
          <div className="cm-su-fields">
            <label className="cm-field">
              <span className="cm-field-label">AD SOYAD</span>
              <input className="cm-input" value={name} onChange={(e) => setName(e.target.value)}
                placeholder="Örn. Arda Yılmaz" autoComplete="off" />
            </label>
            <label className="cm-field">
              <span className="cm-field-label">YAŞ</span>
              <input className="cm-input" value={age} onChange={(e) => setAge(e.target.value.replace(/\D/g, '').slice(0, 2))}
                placeholder="Örn. 27" inputMode="numeric" />
            </label>
            <p className="cm-su-hint">Adın ve yaşın profilinde rakiplere görünür.</p>
          </div>
        )}

        {step === 1 && (
          <div className="cm-gate-list cm-su-levels">
            {CM_LEVELS.map((l) => (
              <button key={l.id} className={cx('cm-gate-opt', level === l.id && 'is-sel')} onClick={() => setLevel(l.id)}>
                <div className="cm-gate-opt-main">
                  <span className="cm-gate-opt-label">{l.label}</span>
                  <span className="cm-gate-opt-desc">{l.desc}</span>
                </div>
                <span className="cm-gate-utr">UTR {l.utr}</span>
                <span className={cx('cm-gate-check', level === l.id && 'is-sel')}>
                  <svg viewBox="0 0 24 24" width="16" height="16"><path d="M5 13l4 4L19 7" stroke="var(--accent-ink)" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </span>
              </button>
            ))}
          </div>
        )}

        {step === 2 && (
          <div className="cm-su-fields">
            <div className="cm-field">
              <span className="cm-field-label">OYUN STİLİN</span>
              <div className="cm-chip-row">
                {STYLE_OPTS.map((o) => (
                  <button key={o} className={cx('cm-chip', style === o && 'is-sel')} onClick={() => setStyle(o)}>{o}</button>
                ))}
              </div>
            </div>
            <div className="cm-field">
              <span className="cm-field-label">DOMİNANT EL</span>
              <div className="cm-chip-row">
                {HAND_OPTS.map((o) => (
                  <button key={o} className={cx('cm-chip', hand === o && 'is-sel')} onClick={() => setHand(o)}>{o}</button>
                ))}
              </div>
            </div>
            <label className="cm-field">
              <span className="cm-field-label">SIK OYNADIĞIN KORT <i>(opsiyonel)</i></span>
              <input className="cm-input" value={court} onChange={(e) => setCourt(e.target.value)}
                placeholder="Örn. Caddebostan Tenis" autoComplete="off" />
            </label>
          </div>
        )}

        {step === 3 && (
          <div className="cm-su-fields">
            <div className="cm-field">
              <span className="cm-field-label">NE ZAMAN MÜSAİTSİN</span>
              <div className="cm-chip-row">
                {AVAIL_OPTS.map((o) => (
                  <button key={o} className={cx('cm-chip', avail === o && 'is-sel')} onClick={() => setAvail(o)}>{o}</button>
                ))}
              </div>
            </div>
            <label className="cm-field">
              <span className="cm-field-label">KENDİNDEN BAHSET <i>(opsiyonel)</i></span>
              <textarea className="cm-input cm-textarea" value={bio} maxLength={160}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Oyun tarzın, beklentilerin, maç sonrası kahve sevgin…" />
              <span className="cm-su-counter">{bio.length}/160</span>
            </label>
          </div>
        )}
      </div>

      <div className="cm-su-foot">
        <button className="cm-cta" disabled={!valid[step]} onClick={go}>
          {last ? (editing ? 'DEĞİŞİKLİKLERİ KAYDET' : 'HESABI OLUŞTUR') : 'DEVAM'}
          <svg viewBox="0 0 24 24" width="20" height="20"><path d="M5 12h14M13 6l6 6-6 6" stroke="var(--accent-ink)" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>
    </div>
  );
}

// ── Profile (reflects the registered account) ───────────
function ProfileScreen({ me, onEdit }) {
  const lvlColor = { baslangic: '#34d399', orta: '#f5c044', ileri: '#ff7058' }[me.level] || 'var(--accent)';
  return (
    <div className="cm-profile">
      <div className="cm-prof-hero">
        <Avatar p={me} size={88} />
        <div className="cm-prof-id">
          <div className="cm-prof-name-row">
            <h2 className="cm-prof-name">{me.name}</h2>
            <span className="cm-prof-badge">YENİ</span>
          </div>
          <div className="cm-prof-meta">{me.age} yaş · {me.levelLabel} · {me.hand}</div>
          <div className="cm-prof-court">
            <svg viewBox="0 0 24 24" width="13" height="13"><path d="M12 21s7-6.3 7-11a7 7 0 10-14 0c0 4.7 7 11 7 11z" stroke="var(--accent)" strokeWidth="1.8" fill="none"/><circle cx="12" cy="10" r="2.4" stroke="var(--accent)" strokeWidth="1.8" fill="none"/></svg>
            {me.court}
          </div>
        </div>
      </div>

      <div className="cm-prof-tags">
        <span className="cm-prof-level" style={{ '--lv': lvlColor }}>{me.levelLabel}</span>
        <span className="cm-style-tag">{me.style}</span>
      </div>

      <div className="cm-stat-grid cm-prof-stats">
        <StatTile label="SEVİYE" value={me.levelLabel} accent />
        <StatTile label="UTR ARALIĞI" value={me.utrRange} accent />
        <StatTile label="DOMİNANT EL" value={me.hand} />
        <StatTile label="MÜSAİTLİK" value={me.avail} />
      </div>

      <div className="cm-prof-block">
        <div className="cm-prof-block-label">DURUM</div>
        <div className="cm-prof-newrow">
          <div className="cm-prof-newval">YENİ<i>oyuncu</i></div>
          <p>Henüz maç oynamadın. İlk eşleşmenden sonra Mate Score ve istatistiklerin burada birikecek.</p>
        </div>
      </div>

      {me.bio && (
        <div className="cm-prof-block">
          <div className="cm-prof-block-label">HAKKINDA</div>
          <p className="cm-prof-bio">{me.bio}</p>
        </div>
      )}

      <button className="cm-prof-edit" onClick={onEdit}>
        <svg viewBox="0 0 24 24" width="16" height="16"><path d="M4 20h4l10-10-4-4L4 16v4zM14 6l4 4" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
        Profili düzenle
      </button>
    </div>
  );
}

Object.assign(window, { SignupFlow, ProfileScreen, buildMe });
