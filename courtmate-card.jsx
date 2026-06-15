// courtmate-card.jsx — swipe card + draggable deck
// Exposes: PlayerCard, SwipeDeck

function PlayerCard({ p, dragX = 0, expanded = false, onToggle }) {
  // LIKE / NOPE stamp intensity follows horizontal drag
  const likeOp = Math.max(0, Math.min(1, dragX / 90));
  const nopeOp = Math.max(0, Math.min(1, -dragX / 90));
  return (
    <div className={cx('cm-card', expanded && 'is-expanded')}>
      {/* stamps */}
      <div className="cm-stamp is-like" style={{ opacity: likeOp }}>EŞLEŞ</div>
      <div className="cm-stamp is-nope" style={{ opacity: nopeOp }}>GEÇ</div>

      <div className="cm-card-top">
        <Avatar p={p} size={88} />
        <div className="cm-card-id">
          <div className="cm-name-row">
            <h2 className="cm-name">{p.name}</h2>
            {p.verified && (
              <span className="cm-verified" title="Doğrulanmış">
                <svg viewBox="0 0 24 24" width="13" height="13"><path d="M5 13l4 4L19 7" stroke="var(--accent-ink)" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </span>
            )}
          </div>
          <div className="cm-meta">UTR {p.utr != null ? p.utr.toFixed(1) : '—'} · {p.dist ? p.dist + 'KM' : '—'} · {p.hand || '—'}</div>
          <div className="cm-avail">
            <span className={cx('cm-dot', p.availHot && 'is-hot')} />
            {p.avail}
          </div>
        </div>
      </div>

      <div className="cm-style-row">
        <span className="cm-style-tag">{p.style}</span>
        <span className="cm-level-tag">{p.level === 'baslangic' ? 'Başlangıç' : p.level === 'orta' ? 'Orta' : 'İleri'}</span>
      </div>

      <div className="cm-stat-grid">
        <StatTile label="SON 5 MAÇ" value={p.wl} accent />
        <StatTile label="ZAMANINDA" value={`%${p.onTime}`} accent />
        <StatTile label="FOREHAND"><Stars n={p.forehand} /></StatTile>
        <StatTile label="SERVİS"><Stars n={p.serve} /></StatTile>
      </div>

      {expanded && (
        <div className="cm-bio">
          <div className="cm-bio-label">OYUNCU NOTU</div>
          <p>{p.bio}</p>
          <div className="cm-bio-court">
            <svg viewBox="0 0 24 24" width="14" height="14"><path d="M12 21s7-6.3 7-11a7 7 0 10-14 0c0 4.7 7 11 7 11z" stroke="var(--accent)" strokeWidth="1.8" fill="none"/><circle cx="12" cy="10" r="2.4" stroke="var(--accent)" strokeWidth="1.8" fill="none"/></svg>
            Sık oynadığı kort · {p.court}
          </div>
        </div>
      )}

      <div className="cm-card-foot">
        <MateScore value={p.mate} />
        <button className="cm-expand" onClick={(e) => { e.stopPropagation(); onToggle && onToggle(); }}>
          {expanded ? 'Kapat' : 'Detay'}
          <svg viewBox="0 0 24 24" width="14" height="14" style={{ transform: expanded ? 'rotate(180deg)' : 'none' }}>
            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

function SwipeDeck({ players, onResolve }) {
  const [idx, setIdx] = React.useState(0);
  const [drag, setDrag] = React.useState({ x: 0, y: 0, active: false });
  const [flying, setFlying] = React.useState(null); // {dir} animating card out
  const [expanded, setExpanded] = React.useState(false);
  const start = React.useRef(null);

  // reset when the filtered player set changes
  React.useEffect(() => { setIdx(0); setExpanded(false); }, [players]);

  const current = players[idx];
  const next = players[idx + 1];

  const finish = (dir) => {
    if (!current || flying) return;
    setFlying(dir);
    const liked = dir === 'right';
    setTimeout(() => {
      onResolve && onResolve(current, liked);
      setIdx((i) => i + 1);
      setDrag({ x: 0, y: 0, active: false });
      setExpanded(false);
      setFlying(null);
    }, 280);
  };

  const onDown = (e) => {
    if (flying || expanded) return;
    start.current = { x: e.clientX, y: e.clientY };
    setDrag({ x: 0, y: 0, active: true });
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onMove = (e) => {
    if (!start.current) return;
    setDrag({ x: e.clientX - start.current.x, y: e.clientY - start.current.y, active: true });
  };
  const onUp = () => {
    if (!start.current) return;
    start.current = null;
    if (drag.x > 105) finish('right');
    else if (drag.x < -105) finish('left');
    else setDrag({ x: 0, y: 0, active: false });
  };

  // transform for top card
  const rot = drag.x * 0.045;
  let tx = drag.x, ty = drag.y, tr = rot, transition = 'none';
  if (flying) {
    tx = flying === 'right' ? 700 : -700;
    ty = drag.y + 40;
    tr = flying === 'right' ? 22 : -22;
    transition = 'transform .28s cubic-bezier(.4,0,.2,1)';
  } else if (!drag.active) {
    transition = 'transform .35s cubic-bezier(.34,1.4,.5,1)';
  }

  const actions = (
    <div className="cm-actions">
      <button className="cm-act is-rewind" disabled={idx === 0 || !!flying}
        onClick={() => { setIdx((i) => Math.max(0, i - 1)); setExpanded(false); }} aria-label="Geri al">
        <svg viewBox="0 0 24 24" width="22" height="22"><path d="M9 14L4 9l5-5M4 9h9a7 7 0 010 14h-3" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>
      <button className="cm-act is-nope" disabled={!current || !!flying} onClick={() => finish('left')} aria-label="Geç">
        <svg viewBox="0 0 24 24" width="30" height="30"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg>
      </button>
      <button className="cm-act is-like" disabled={!current || !!flying} onClick={() => finish('right')} aria-label="Eşleş">
        <svg viewBox="0 0 24 24" width="30" height="30"><path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>
    </div>
  );

  if (!current) {
    return (
      <div className="cm-deck-wrap">
        <div className="cm-deck">
          <div className="cm-empty">
            <div className="cm-empty-mark">GAME · SET</div>
            <h3>Bugünlük bu kadar</h3>
            <p>Bu filtrede yeni oyuncu kalmadı. Yarıçapı genişlet ya da seviyeyi değiştir.</p>
            <button className="cm-reset" onClick={() => { setIdx(0); }}>Yeniden bak</button>
          </div>
        </div>
        {actions}
      </div>
    );
  }

  return (
    <div className="cm-deck-wrap">
      <div className="cm-deck">
        {next && !expanded && (
          <div className="cm-card-slot is-behind">
            <PlayerCard p={next} />
          </div>
        )}
        <div
          className="cm-card-slot is-front"
          style={{ transform: `translate(${tx}px, ${ty}px) rotate(${tr}deg)`, transition, cursor: expanded ? 'default' : 'grab' }}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        >
          <PlayerCard p={current} dragX={flying === 'right' ? 120 : flying === 'left' ? -120 : drag.x}
            expanded={expanded} onToggle={() => setExpanded((v) => !v)} />
        </div>
      </div>
      {actions}
    </div>
  );
}

Object.assign(window, { PlayerCard, SwipeDeck });
