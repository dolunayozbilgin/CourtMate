/* ===== CourtMate — icons + player card ===== */

const CMIcon = {
  check: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><path d="M4 12.5l5 5 11-11" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/></svg>),
  x: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"/></svg>),
  rewind: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><path d="M3 9a9 9 0 1 1-2 5.7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/><path d="M3 4v5h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>),
  info: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/><path d="M12 11v5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/><circle cx="12" cy="7.6" r="1.3" fill="currentColor"/></svg>),
  map: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M9 4v14M15 6v14" stroke="currentColor" strokeWidth="1.8"/></svg>),
  filter: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><path d="M3 5h18M6 12h12M10 19h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>),
  pin: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><path d="M12 22s7-6.3 7-12a7 7 0 1 0-14 0c0 5.7 7 12 7 12z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><circle cx="12" cy="10" r="2.4" stroke="currentColor" strokeWidth="1.8"/></svg>),
  badge: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><path d="M12 2l2.4 1.7 2.9-.2 1.1 2.7 2.5 1.5-.7 2.8.7 2.8-2.5 1.5-1.1 2.7-2.9-.2L12 19l-2.4-1.7-2.9.2-1.1-2.7L3.1 13l.7-2.8L3.1 7.4l2.5-1.5 1.1-2.7 2.9.2L12 2z" fill="currentColor"/><path d="M8.5 12l2.3 2.3 4.7-4.6" stroke="var(--bg)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>),
  flame: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><path d="M12 3c1 3 4 4 4 8a4 4 0 0 1-8 0c0-1 .5-2 1-2.5C9 11 9 13 9 13s-2-1-2-4c0-3 3-4 5-6z" fill="currentColor"/></svg>),
  compass: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8"/><path d="M15.5 8.5l-2 5-5 2 2-5 5-2z" fill="currentColor"/></svg>),
  chat: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><path d="M4 5h16v11H9l-4 4V5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>),
  user: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8"/><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>),
};

function CMStars({ n }) {
  return <span className="val stars">{'★'.repeat(n)}{'☆'.repeat(5 - n)}</span>;
}

function PlayerCard({ p, style, stamp, showScore = true }) {
  const { photoGrad } = window.CM_DATA;
  // map style -> a simple 1-5 skill for the stars stat
  const skill = { 'Servis-vole': 5, 'Agresif': 5, 'All-court': 4, 'Baseline': 4, 'Defansif': 3 }[p.style] || 4;
  return (
    <div className="cm-card" style={style}>
      {/* swipe stamps */}
      <div className="cm-stamp like" style={{ opacity: stamp > 0 ? stamp : 0 }}>EVET</div>
      <div className="cm-stamp nope" style={{ opacity: stamp < 0 ? -stamp : 0 }}>PAS</div>

      {/* photo zone */}
      <div className="cm-photo" style={{ background: photoGrad(p.hue) }}>
        <div className="cm-photo-stripes" />
        <div className="cm-photo-mono">{p.initials}</div>
        <div className="cm-photo-scrim" />
        <div className="cm-photo-label">FOTOĞRAF</div>

        <div className="cm-photo-top">
          <div className="cm-chip level">{p.level}</div>
          {p.verified && (
            <div className="cm-chip verify">
              <CMIcon.badge style={{ color: 'var(--accent)' }} />VERİFİED
            </div>
          )}
        </div>

        <div className="cm-photo-foot">
          <div className="cm-name">{p.name}<span className="age">{p.age}</span></div>
          <div className="cm-meta">
            <span>{p.utr}</span>
            <span className="sep">·</span>
            <span>{p.dist}</span>
            <span className="sep">·</span>
            <span className="avail">{p.avail}</span>
          </div>
        </div>
      </div>

      {/* stats zone */}
      <div className="cm-body">
        <div className="cm-stat-row">
          <div className="cm-stat">
            <div className="lbl">Son 5 Maç</div>
            <div className="val">{p.form}</div>
          </div>
          <div className="cm-stat">
            <div className="lbl">Zamanında</div>
            <div className="val">{p.punc}</div>
          </div>
        </div>

        <div className="cm-tags">
          <span className="cm-tag">{p.style}</span>
          <span className="cm-tag">{p.hand}</span>
          <span className="cm-tag">Oyun gücü {'★'.repeat(skill)}</span>
        </div>

        {showScore && (
          <div className="cm-score">
            <div className="lbl">
              <CMIcon.badge style={{ width: 12, height: 12, color: 'var(--accent)' }} />
              Mate Score
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="bar"><i style={{ width: (p.score / 5 * 100) + '%' }} /></div>
              <div className="num">{p.score.toFixed(1)}<span>/5</span></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { CMIcon, CMStars, PlayerCard });
