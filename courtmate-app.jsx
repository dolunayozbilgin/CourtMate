// courtmate-app.jsx — screens, overlays, navigation, tweaks → mounts the app

const { useState, useRef, useEffect } = React;

// ── Global hata yakalayıcı ────────────────────────────────
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { err: null }; }
  static getDerivedStateFromError(e) { return { err: e }; }
  render() {
    if (this.state.err) return (
      <div style={{ position:'fixed', inset:0, background:'#0d0d0d', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16, padding:24, color:'#fff', fontFamily:'monospace', fontSize:13 }}>
        <div style={{ fontSize:36 }}>⚠️</div>
        <b style={{ color:'#dcfc32' }}>Bir hata oluştu</b>
        <p style={{ color:'#888', textAlign:'center', maxWidth:280, lineHeight:1.5 }}>{this.state.err.message}</p>
        <button onClick={() => { this.setState({ err: null }); window.location.reload(); }}
          style={{ marginTop:8, background:'#dcfc32', color:'#000', border:'none', borderRadius:12, padding:'12px 24px', fontFamily:'monospace', fontWeight:700, cursor:'pointer' }}>
          YENİDEN BAŞLAT
        </button>
      </div>
    );
    return this.props.children;
  }
}

const LEVEL_FILTERS = [
  { id: 'hepsi', label: 'Hepsi' },
  { id: 'baslangic', label: 'Başlangıç' },
  { id: 'orta', label: 'Orta' },
  { id: 'ileri', label: 'İleri' },
];

// ── Top bar ──────────────────────────────────────────────
function TopBar({ live, onTheme, theme }) {
  return (
    <div className="cm-topbar">
      <div className="cm-brand">
        <span className="cm-brand-mark">▚</span>
        <span className="cm-brand-name">COURT<b>MATE</b></span>
      </div>
      <div className="cm-topbar-right">
        <span className="cm-live"><i className="cm-live-dot" />{live} OYUNCU · 2.5KM</span>
      </div>
    </div>
  );
}

// ── Level filter (segmented) ─────────────────────────────
function LevelFilter({ value, onChange }) {
  return (
    <div className="cm-filter">
      {LEVEL_FILTERS.map((f) => (
        <button key={f.id} className={cx('cm-filter-btn', value === f.id && 'is-active')}
          onClick={() => onChange(f.id)}>{f.label}</button>
      ))}
    </div>
  );
}

// ── Bottom tab bar ───────────────────────────────────────
function TabBar({ active, onTab, badges = {} }) {
  const tabs = [
    { id: 'discover', label: 'Keşfet', icon: (a) => <path d="M5 5l14 14M19 5L5 19" stroke={a} strokeWidth="2" strokeLinecap="round"/> },
    { id: 'matches', label: 'Eşleşmeler', icon: (a) => <path d="M12 21s7-6.3 7-11a7 7 0 10-14 0c0 4.7 7 11 7 11z" stroke={a} strokeWidth="2" fill="none"/> },
    { id: 'chat', label: 'Sohbet', icon: (a) => <path d="M4 5h16v11H9l-5 4z" stroke={a} strokeWidth="2" fill="none" strokeLinejoin="round"/> },
    { id: 'profile', label: 'Profil', icon: (a) => <g><circle cx="12" cy="8" r="4" stroke={a} strokeWidth="2" fill="none"/><path d="M4 21c1.5-4 5-6 8-6s6.5 2 8 6" stroke={a} strokeWidth="2" fill="none"/></g> },
  ];
  return (
    <div className="cm-tabbar">
      {tabs.map((t) => {
        const on = active === t.id;
        return (
          <button key={t.id} className={cx('cm-tab', on && 'is-on')} onClick={() => onTab(t.id)}>
            <span className="cm-tab-ico">
              <svg viewBox="0 0 24 24" width="24" height="24">{t.icon(on ? 'var(--accent)' : 'var(--muted)')}</svg>
              {badges[t.id] > 0 && <i className="cm-badge">{badges[t.id]}</i>}
            </span>
            <span className="cm-tab-label">{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── Level gate (entry) ───────────────────────────────────
function LevelGate({ onPick }) {
  const [sel, setSel] = useState(null);
  return (
    <div className="cm-gate">
      <div className="cm-gate-head">
        <span className="cm-gate-kicker">▶ BAŞLAMADAN ÖNCE</span>
        <h1 className="cm-gate-title">SENİN<br/><em>SEVİYEN</em><br/>NE?</h1>
        <p className="cm-gate-sub">Seni doğru rakiplerle eşleştirelim. İstediğin zaman değiştirebilirsin.</p>
      </div>
      <div className="cm-gate-list">
        {CM_LEVELS.map((l) => (
          <button key={l.id} className={cx('cm-gate-opt', sel === l.id && 'is-sel')} onClick={() => setSel(l.id)}>
            <div className="cm-gate-opt-main">
              <span className="cm-gate-opt-label">{l.label}</span>
              <span className="cm-gate-opt-desc">{l.desc}</span>
            </div>
            <span className="cm-gate-utr">UTR {l.utr}</span>
            <span className={cx('cm-gate-check', sel === l.id && 'is-sel')}>
              <svg viewBox="0 0 24 24" width="16" height="16"><path d="M5 13l4 4L19 7" stroke="var(--accent-ink)" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </span>
          </button>
        ))}
      </div>
      <button className="cm-cta" disabled={!sel} onClick={() => onPick(sel)}>
        OYUNCULARI GÖSTER
        <svg viewBox="0 0 24 24" width="20" height="20"><path d="M5 12h14M13 6l6 6-6 6" stroke="var(--accent-ink)" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>
    </div>
  );
}

// ── Match overlay ────────────────────────────────────────
function MatchOverlay({ player, onSchedule, onKeep }) {
  return (
    <div className="cm-match">
      <div className="cm-match-glow" />
      <div className="cm-match-inner">
        <span className="cm-match-kicker">EŞLEŞME · MATCH POINT</span>
        <h1 className="cm-match-title">EŞLEŞ<em>TİNİZ!</em></h1>
        <div className="cm-match-avatars">
          <div className="cm-match-av cm-match-you"><span>SEN</span></div>
          <div className="cm-match-vs">×</div>
          <div className="cm-match-av"><Avatar p={player} size={96} /></div>
        </div>
        <p className="cm-match-line">Sen ve <b>{player.name}</b> birbirinizi seçtiniz. Korta çıkma zamanı.</p>
        <div className="cm-match-actions">
          <button className="cm-cta" onClick={() => onSchedule(player)}>
            MAÇ AYARLA
            <svg viewBox="0 0 24 24" width="20" height="20"><path d="M5 12h14M13 6l6 6-6 6" stroke="var(--accent-ink)" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <button className="cm-ghost" onClick={onKeep}>Aramaya devam et</button>
        </div>
      </div>
    </div>
  );
}

// ── Schedule sheet ───────────────────────────────────────
const COURTS = [
  { id: 'c1', name: 'Caddebostan Tenis', dist: '1.1 km', surf: 'Sert kort' },
  { id: 'c2', name: 'Kalamış Açık Kort', dist: '2.0 km', surf: 'Toprak' },
  { id: 'c3', name: 'Fenerbahçe Spor', dist: '0.8 km', surf: 'Sert kort' },
];
const DAYS = ['Bugün', 'Yarın', 'Cmt', 'Paz'];
const TIMES = ['08:00', '10:00', '13:00', '17:00', '19:00', '21:00'];

function ScheduleSheet({ player, onClose, onSend }) {
  const [court, setCourt] = useState('c1');
  const [day, setDay] = useState('Yarın');
  const [time, setTime] = useState('19:00');
  return (
    <div className="cm-sheet-scrim" onClick={onClose}>
      <div className="cm-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="cm-sheet-grip" />
        <div className="cm-sheet-head">
          <Avatar p={player} size={44} />
          <div>
            <div className="cm-sheet-title">Maç teklifi gönder</div>
            <div className="cm-sheet-sub">{player.name} · UTR {player.utr != null ? player.utr.toFixed(1) : '—'}</div>
          </div>
        </div>

        <div className="cm-sheet-label">KORT</div>
        <div className="cm-court-list">
          {COURTS.map((c) => (
            <button key={c.id} className={cx('cm-court', court === c.id && 'is-sel')} onClick={() => setCourt(c.id)}>
              <div>
                <div className="cm-court-name">{c.name}</div>
                <div className="cm-court-meta">{c.dist} · {c.surf}</div>
              </div>
              <span className={cx('cm-radio', court === c.id && 'is-sel')} />
            </button>
          ))}
        </div>

        <div className="cm-sheet-label">GÜN</div>
        <div className="cm-chip-row">
          {DAYS.map((d) => (
            <button key={d} className={cx('cm-chip', day === d && 'is-sel')} onClick={() => setDay(d)}>{d}</button>
          ))}
        </div>

        <div className="cm-sheet-label">SAAT</div>
        <div className="cm-chip-row">
          {TIMES.map((t) => (
            <button key={t} className={cx('cm-chip', time === t && 'is-sel')} onClick={() => setTime(t)}>{t}</button>
          ))}
        </div>

        <button className="cm-cta cm-sheet-cta" onClick={() => onSend({ court: COURTS.find(c => c.id === court), day, time })}>
          TEKLİFİ GÖNDER
          <svg viewBox="0 0 24 24" width="20" height="20"><path d="M4 12l16-8-6 16-3-6-7-2z" stroke="var(--accent-ink)" strokeWidth="2" fill="none" strokeLinejoin="round"/></svg>
        </button>
      </div>
    </div>
  );
}

// ── Sent confirmation ────────────────────────────────────
function SentToast({ data, player, onDone }) {
  return (
    <div className="cm-match">
      <div className="cm-match-inner">
        <div className="cm-sent-check">
          <svg viewBox="0 0 24 24" width="40" height="40"><path d="M5 13l4 4L19 7" stroke="var(--accent-ink)" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <h1 className="cm-match-title" style={{ fontSize: 38 }}>TEKLİF<br/><em>GÖNDERİLDİ</em></h1>
        <div className="cm-sent-recap">
          <div><span>OYUNCU</span><b>{player.name}</b></div>
          <div><span>KORT</span><b>{data.court.name}</b></div>
          <div><span>NE ZAMAN</span><b>{data.day} · {data.time}</b></div>
        </div>
        <p className="cm-match-line">{player.name} onayladığında sohbet açılacak.</p>
        <button className="cm-cta" onClick={onDone}>KEŞFETMEYE DÖN</button>
      </div>
    </div>
  );
}

// ── Simple placeholder tab screen ────────────────────────
function StubScreen({ title, note }) {
  return (
    <div className="cm-stub">
      <div className="cm-stub-mark">◴</div>
      <h3>{title}</h3>
      <p>{note}</p>
    </div>
  );
}

// ── Root app ─────────────────────────────────────────────
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "charged",
  "accent": "#dcfc32",
  "startLevel": "ileri",
  "showMateScore": true
}/*EDITMODE-END*/;

const ME_KEY = 'cm_me_v1';
const loadMe = () => { try { return JSON.parse(localStorage.getItem(ME_KEY)) || null; } catch (e) { return null; } };

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [me, setMe] = useState(loadMe);
  const [editing, setEditing] = useState(false);
  const [stage, setStage] = useState(() => loadMe() ? 'app' : 'signup');
  const [tab, setTab] = useState('discover');
  const [filter, setFilter] = useState(() => { const m = loadMe(); return m ? m.level : 'hepsi'; });
  const [match, setMatch] = useState(null);     // matched player (full overlay)
  const [schedule, setSchedule] = useState(null); // player being scheduled
  const [sent, setSent] = useState(null);        // {data, player}
  const [matches, setMatches] = useState([]);    // accepted match ids
  const [pending, setPending] = useState([]);    // sent request ids awaiting accept
  const [threads, setThreads] = useState({});    // id -> { messages:[{from,text}], unread }
  const [chatOrder, setChatOrder] = useState([]);// most-recent-first thread ids
  const [activeChat, setActiveChat] = useState(null); // open thread id
  const [toast, setToast] = useState(null);
  const timersRef = React.useRef([]);

  // clear all pending timers on unmount
  useEffect(() => () => { timersRef.current.forEach(clearTimeout); }, []);

  // Supabase oturumu kontrol et
  // apply theme + accent to root
  useEffect(() => {
    const root = document.getElementById('cm-root');
    if (!root) return;
    root.dataset.theme = t.theme;
    root.dataset.mate = t.showMateScore ? 'on' : 'off';
    root.style.setProperty('--accent', t.accent);
  }, [t.theme, t.accent, t.showMateScore]);

  // finish registration
  const completeSignup = (account) => {
    setMe(account);
    try { localStorage.setItem(ME_KEY, JSON.stringify(account)); } catch(e) {}
    setFilter(account.level);
    setEditing(false);
    setStage('app');
    if (editing) setTab('profile');
  };

  const resetAll = () => {
    try { localStorage.removeItem(ME_KEY); } catch(e) {}
    timersRef.current.forEach(clearTimeout); timersRef.current = [];
    setMe(null); setEditing(false); setStage('signup'); setTab('discover');
    setMatch(null); setSchedule(null); setSent(null);
    setMatches([]); setPending([]); setThreads({}); setChatOrder([]); setActiveChat(null); setToast(null);
  };

  const playerPool = CM_PLAYERS;
  const filtered = React.useMemo(
    () => (filter === 'hepsi' ? playerPool : playerPool.filter((p) => p.level === filter)),
    [filter, playerPool]
  );

  // create a chat thread (empty — real messages come from Supabase)
  const addThread = (player) => {
    setThreads((th) => (th[player.id] ? th : { ...th, [player.id]: { messages: [], unread: 0 } }));
    setChatOrder((o) => [player.id, ...o.filter((x) => x !== player.id)]);
  };

  // accept a request → becomes a match + opens a chat thread
  const acceptMatch = (player, instant) => {
    setMatches((m) => (m.includes(player.id) ? m : [...m, player.id]));
    addThread(player);
    if (instant) setMatch(player);   // full "EŞLEŞTİNİZ" celebration
    else setToast(player);           // gentle banner for delayed accepts
  };

  // swipe right / tap ✓ on Keşfet → send a connection request
  const resolve = (player, liked) => {
    if (!liked) return;
    if (matches.includes(player.id) || pending.includes(player.id)) return;
    if (player.mutual) {
      // they already liked you → instant match
      acceptMatch(player, true);
    } else {
      // request sent → other side "accepts" after a short delay
      setPending((p) => [...p, player.id]);
      const tm = setTimeout(() => {
        setPending((p) => p.filter((id) => id !== player.id));
        acceptMatch(player, false);
      }, 2600);
      timersRef.current.push(tm);
    }
  };

  // open a chat thread + clear its unread
  const openChat = (id) => {
    setActiveChat(id);
    setTab('chat');
    setThreads((th) => (th[id] ? { ...th, [id]: { ...th[id], unread: 0 } } : th));
  };

  // send a message — no auto-reply; real replies come via Supabase realtime
  const sendMessage = (id, text) => {
    setThreads((th) => ({ ...th, [id]: { ...th[id], messages: [...th[id].messages, { from: 'me', text }] } }));
    setChatOrder((o) => [id, ...o.filter((x) => x !== id)]);
  };

  const pendingPlayers = pending.map((id) => playerPool.find((p) => p.id === id)).filter(Boolean);
  const matchPlayers   = matches.map((id) => playerPool.find((p) => p.id === id)).filter(Boolean);
  const chatUnread = Object.values(threads).reduce((n, th) => n + (th.unread || 0), 0);
  const activePlayer = activeChat ? playerPool.find((p) => p.id === activeChat) : null;

  return (
    <div id="cm-root" className="cm-root" data-theme={t.theme}>
      {stage === 'signup' && (
        <SignupFlow initial={editing ? me : null} editing={editing}
          onComplete={completeSignup}
          onCancel={editing ? () => { setEditing(false); setStage('app'); setTab('profile'); } : null} />
      )}

      {stage === 'app' && (
        <div className="cm-app">
          <TopBar live={filtered.length} />
          {tab === 'discover' && (
            <div className="cm-discover">
              <LevelFilter value={filter} onChange={setFilter} />
              <SwipeDeck players={filtered} onResolve={resolve} />
            </div>
          )}
          {tab === 'matches' && (
            <MatchesScreen pending={pendingPlayers} matches={matchPlayers}
              onSchedule={(p) => setSchedule(p)} onChat={openChat} />
          )}
          {tab === 'chat' && (
            activeChat && activePlayer && threads[activeChat]
              ? <ChatThread player={activePlayer} thread={threads[activeChat]}
                  onBack={() => setActiveChat(null)} onSend={sendMessage}
                  onSchedule={(p) => setSchedule(p)} />
              : <ChatList order={chatOrder} threads={threads} players={playerPool} onOpen={openChat} />
          )}
          {tab === 'profile' && me && (
            <ProfileScreen me={me} onEdit={() => { setEditing(true); setStage('signup'); }} />
          )}
          <TabBar active={tab} onTab={(x) => { if (x !== 'chat') setActiveChat(null); setTab(x); }}
            badges={{ matches: pending.length, chat: chatUnread }} />
        </div>
      )}

      {toast && <MatchToast player={toast} onOpen={() => { const id = toast.id; setToast(null); openChat(id); }} onClose={() => setToast(null)} />}

      {match && <MatchOverlay player={match} onSchedule={(p) => { setMatch(null); setSchedule(p); }} onKeep={() => setMatch(null)} />}
      {schedule && <ScheduleSheet player={schedule} onClose={() => setSchedule(null)} onSend={(data) => { const p = schedule; setSchedule(null); setSent({ data, player: p }); }} />}
      {sent && <SentToast data={sent.data} player={sent.player} onDone={() => { setSent(null); setTab('discover'); }} />}

      <TweaksPanel>
        <TweakSection label="Tema" />
        <TweakRadio label="Görsel yön" value={t.theme} options={[{ value: 'charged', label: 'Charged' }, { value: 'premium', label: 'Premium' }]}
          onChange={(v) => setTweak('theme', v)} />
        <TweakColor label="Accent" value={t.accent}
          options={['#dcfc32', '#c9b26b', '#5ad6a0', '#ff8a3d', '#7aa2ff']}
          onChange={(v) => setTweak('accent', v)} />
        <TweakSection label="Akış" />
        <TweakToggle label="Mate Score göster" value={t.showMateScore} onChange={(v) => setTweak('showMateScore', v)} />
        <TweakButton label="Akışı sıfırla" onClick={resetAll}>
          Hesabı sil, baştan başla
        </TweakButton>
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary><App /></ErrorBoundary>
);
