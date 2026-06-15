/* ===== CourtMate — match overlay, schedule sheet, confirmation, detail ===== */

const CM_ME = { initials: 'SN', hue: 150 };

function MatchOverlay({ player, onSchedule, onChat }) {
  const { photoGrad } = window.CM_DATA;
  return (
    <div className="cm-match">
      <div className="cm-match-kicker">▸ Karşılıklı eşleşme</div>
      <div className="cm-match-title">EŞLEŞ<span className="accent">TİNİZ.</span></div>
      <div className="cm-match-sub">{player.name} de seninle oynamak istiyor. Hadi bir maç ayarlayın.</div>

      <div className="cm-match-avatars">
        <div className="cm-mav" style={{ background: photoGrad(CM_ME.hue) }}>{CM_ME.initials}</div>
        <div className="cm-mav" style={{ background: photoGrad(player.hue) }}>{player.initials}</div>
        <div className="cm-mav-badge"><CMIcon.check style={{ width: 18, height: 18 }} /></div>
      </div>

      <div className="cm-match-cta">
        <button className="cm-btn primary" onClick={onSchedule}>Maç ayarla</button>
        <button className="cm-btn ghost" onClick={onChat}>Sohbete devam et</button>
      </div>
    </div>
  );
}

function ScheduleSheet({ player, onClose, onConfirm }) {
  const { COURTS, DAYS, TIMES } = window.CM_DATA;
  const [court, setCourt] = useState(null);
  const [day, setDay] = useState(null);
  const [time, setTime] = useState(null);
  const ready = court && day && time;

  return (
    <div className="cm-overlay" onClick={onClose}>
      <div className="cm-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="cm-sheet-grip" />
        <h3>Maç ayarla</h3>
        <div className="with">Rakip: <b>{player.name}</b> · {player.level} · {player.utr}</div>

        <div className="cm-field-label">Kort seç</div>
        {COURTS.map((c) => (
          <div key={c.id} className="cm-court" data-on={court === c.id} onClick={() => setCourt(c.id)}>
            <div className="cm-court-pin"><CMIcon.pin /></div>
            <div>
              <div className="nm">{c.name}</div>
              <div className="ds">{c.meta}</div>
            </div>
            <div className="tick"><CMIcon.check style={{ width: 20, height: 20 }} /></div>
          </div>
        ))}

        <div className="cm-field-label">Gün</div>
        <div className="cm-chiprow">
          {DAYS.map((d) => (
            <div key={d.id} className="cm-pill" data-on={day === d.id} onClick={() => setDay(d.id)}>
              {d.d}<span className="sub">{d.s}</span>
            </div>
          ))}
        </div>

        <div className="cm-field-label">Saat</div>
        <div className="cm-chiprow">
          {TIMES.map((t) => (
            <div key={t} className="cm-pill" data-on={time === t} onClick={() => setTime(t)}>{t}</div>
          ))}
        </div>

        <div className="cm-sheet-foot">
          <button className="cm-send" disabled={!ready}
            onClick={() => ready && onConfirm({
              court: COURTS.find((c) => c.id === court),
              day: DAYS.find((d) => d.id === day),
              time,
            })}>
            {ready ? 'Maç isteği gönder' : 'Kort, gün ve saat seç'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Confirmation({ player, detail, onDone }) {
  return (
    <div className="cm-confirm">
      <div className="cm-confirm-mark"><CMIcon.check /></div>
      <h3>İstek gönderildi</h3>
      <p>{player.name} onayladığında bildirim alacaksın. Görüşmek üzere — kortta!</p>
      <div className="cm-recap">
        <div className="cm-recap-row"><span className="k">Rakip</span><span className="v">{player.name}</span></div>
        <div className="cm-recap-row"><span className="k">Kort</span><span className="v">{detail.court.name}</span></div>
        <div className="cm-recap-row"><span className="k">Ne zaman</span><span className="v">{detail.day.d}, {detail.day.s} · {detail.time}</span></div>
      </div>
      <button className="cm-btn primary" style={{ width: '100%', maxWidth: 300 }} onClick={onDone}>Keşfetmeye devam et</button>
    </div>
  );
}

function DetailSheet({ player, onClose }) {
  const { photoGrad } = window.CM_DATA;
  return (
    <div className="cm-overlay" onClick={onClose}>
      <div className="cm-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="cm-sheet-grip" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 4 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: photoGrad(player.hue), display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--display)', fontSize: 20, color: '#fff' }}>{player.initials}</div>
          <div>
            <h3 style={{ fontSize: 22 }}>{player.name}</h3>
            <div className="with" style={{ margin: '3px 0 0' }}>{player.level} · {player.utr} · {player.dist}</div>
          </div>
        </div>

        <div className="cm-field-label">Müsaitlik</div>
        <div style={{ fontSize: 14, color: 'var(--text)' }}>{player.avail}</div>

        <div className="cm-field-label">Oyun profili</div>
        <div className="cm-tags">
          <span className="cm-tag">{player.style}</span>
          <span className="cm-tag">{player.hand}</span>
          <span className="cm-tag">Son 5: {player.form}</span>
          <span className="cm-tag">Zamanında {player.punc}</span>
        </div>

        <div className="cm-field-label">Mate Score</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="bar" style={{ flex: 1, height: 8, borderRadius: 5, background: 'var(--line)', overflow: 'hidden' }}>
            <i style={{ display: 'block', height: '100%', width: (player.score / 5 * 100) + '%', background: 'var(--accent)', borderRadius: 5 }} />
          </div>
          <div className="num" style={{ fontFamily: 'var(--display)', fontSize: 18 }}>{player.score.toFixed(1)}<span style={{ color: 'var(--faint)', fontSize: 12 }}>/5</span></div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8, lineHeight: 1.5 }}>
          Zamanında gelme, fair-play ve maç sonrası geri bildirimden hesaplanır.
        </div>

        <div className="cm-sheet-foot">
          <button className="cm-send" onClick={onClose}>Kapat</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { CM_ME, MatchOverlay, ScheduleSheet, Confirmation, DetailSheet });
