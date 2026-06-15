/* ===== CourtMate — app root ===== */

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "charged",
  "accent": "#dcfc32",
  "defaultLevel": "Hepsi",
  "showScore": true,
  "texture": true
}/*EDITMODE-END*/;

function hexLum(hex) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function App({ t, setTweak }) {
  const { PLAYERS, MUTUAL, LEVELS } = window.CM_DATA;

  const [level, setLevel] = useState(t.defaultLevel);
  const [index, setIndex] = useState(0);
  const [history, setHistory] = useState([]);
  const [match, setMatch] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [detail, setDetail] = useState(null);
  const [nav, setNav] = useState('Keşfet');

  // sync default level from tweaks
  useEffect(() => { setLevel(t.defaultLevel); }, [t.defaultLevel]);

  // reset deck when filter changes
  useEffect(() => { setIndex(0); setHistory([]); }, [level]);

  const filtered = level === 'Hepsi' ? PLAYERS : PLAYERS.filter((p) => p.level === level);
  const player = filtered[index];
  const next = filtered[index + 1];

  const accentInk = hexLum(t.accent) > 0.42 ? '#0d1117' : '#ffffff';
  const gridOn = t.theme === 'charged' && t.texture ? 1 : 0;

  const advance = () => { setHistory((h) => [...h, index]); setIndex((i) => i + 1); };

  const onDecision = (dir, p) => {
    if (dir === 'like' && p && MUTUAL.has(p.id)) {
      setMatch(p);
    }
    advance();
  };
  const onRewind = () => {
    setHistory((h) => {
      if (!h.length) return h;
      setIndex(h[h.length - 1]);
      return h.slice(0, -1);
    });
  };

  const counts = {};
  LEVELS.forEach((l) => { counts[l.id] = PLAYERS.filter((p) => p.level === l.id).length; });

  return (
    <div
      className="cm-app"
      data-theme={t.theme}
      style={{ '--accent': t.accent, '--accent-ink': accentInk, '--grid': gridOn }}
    >
      <div className="cm-screen">
        {/* top bar */}
        <div className="cm-top">
          <div className="cm-wordmark"><span className="dot" />COURTMATE</div>
          <div className="cm-top-actions">
            <div className="cm-iconbtn" title="Harita"><CMIcon.map /></div>
            <div className="cm-iconbtn" title="Filtre"><CMIcon.filter /></div>
          </div>
        </div>

        {/* level filter */}
        <div className="cm-levels">
          <button className="cm-level" data-on={level === 'Hepsi'} onClick={() => setLevel('Hepsi')}>
            Hepsi<span className="ct">{PLAYERS.length} oyuncu</span>
          </button>
          {LEVELS.map((l) => (
            <button key={l.id} className="cm-level" data-on={level === l.id} onClick={() => setLevel(l.id)}>
              {l.label}<span className="ct">{counts[l.id]} · {l.note}</span>
            </button>
          ))}
        </div>

        {/* deck or empty */}
        {player ? (
          <SwipeDeck
            key={level + '-' + index}
            player={player}
            next={next}
            onDecision={onDecision}
            onRewind={onRewind}
            onInfo={() => setDetail(player)}
            canRewind={history.length > 0}
            showScore={t.showScore}
          />
        ) : (
          <div className="cm-empty">
            <CMIcon.compass style={{ width: 46, height: 46, color: 'var(--accent)' }} />
            <div className="big">Bu seviyede son</div>
            <p>{level === 'Hepsi' ? 'Yakındaki tüm oyuncuları gördün.' : `${level} seviyesinde şimdilik bu kadar.`} Yarıçapı genişlet ya da seviye değiştir.</p>
            <button onClick={() => { setIndex(0); setHistory([]); }}>Baştan göster</button>
          </div>
        )}

        {/* bottom nav */}
        <div className="cm-nav">
          {[['Keşfet', CMIcon.compass], ['Eşleşmeler', CMIcon.flame], ['Sohbet', CMIcon.chat], ['Profil', CMIcon.user]].map(([label, Ico]) => (
            <div key={label} className="cm-nav-item" data-on={nav === label} onClick={() => setNav(label)}>
              <Ico /><span>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* overlays */}
      {match && (
        <MatchOverlay
          player={match}
          onSchedule={() => { setSchedule(match); setMatch(null); }}
          onChat={() => { setNav('Sohbet'); setMatch(null); }}
        />
      )}
      {schedule && (
        <ScheduleSheet
          player={schedule}
          onClose={() => setSchedule(null)}
          onConfirm={(d) => { setConfirm({ player: schedule, detail: d }); setSchedule(null); }}
        />
      )}
      {confirm && (
        <Confirmation
          player={confirm.player}
          detail={confirm.detail}
          onDone={() => { setConfirm(null); setNav('Keşfet'); }}
        />
      )}
      {detail && <DetailSheet player={detail} onClose={() => setDetail(null)} />}

      <TweaksPanel>
        <TweakSection label="Tema" />
        <TweakRadio label="Stil" value={t.theme} options={['charged', 'premium']}
          onChange={(v) => setTweak('theme', v)} />
        <TweakColor label="Accent" value={t.accent}
          options={['#dcfc32', '#2f9e63', '#3b82f6', '#f0640f']}
          onChange={(v) => setTweak('accent', v)} />
        <TweakToggle label="Kort dokusu" value={t.texture}
          onChange={(v) => setTweak('texture', v)} />
        <TweakSection label="İçerik" />
        <TweakSelect label="Varsayılan seviye" value={t.defaultLevel}
          options={['Hepsi', 'Başlangıç', 'Orta', 'İleri']}
          onChange={(v) => setTweak('defaultLevel', v)} />
        <TweakToggle label="Mate Score göster" value={t.showScore}
          onChange={(v) => setTweak('showScore', v)} />
      </TweaksPanel>
    </div>
  );
}

function Root() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  return (
    <IOSDevice dark={t.theme === 'charged'}>
      <App t={t} setTweak={setTweak} />
    </IOSDevice>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<Root />);
