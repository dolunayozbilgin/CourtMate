// courtmate-chat.jsx — requests/matches roster, chat list + thread, accept toast
// Exposes: MatchesScreen, ChatList, ChatThread, MatchToast, openerFor, replyFor

function openerFor(p) {
  const m = {
    'Agresif baseline': 'Selam! Sert tempo severim, bu hafta bir maç yapalım mı?',
    'Baseline grinder': 'Merhaba! Uzun ralliye varım, hangi kort sana uyar?',
    'All-court': 'Selam! Her zemine açığım, bir antrenman maçı ayarlayalım mı?',
    'Serve & volley': 'Hey! Servis-vole çalışıyorum, rakip olur musun?',
    'Tam saha baskı': 'Selam! Yüksek tempo isteyen biri lazımdı, hazırsan yazışalım.',
    'Gelişen oyuncu': 'Merhaba! Bol ralli yapmak isterim, müsait olunca haber ver.',
    'Yeni başlıyor': 'Selam! Yeni başlıyorum, sabırlı bir maç olur mu?',
  };
  return m[p.style] || 'Selam! Eşleştiğimize sevindim, bir maç ayarlayalım mı?';
}
function replyFor() {
  const r = [
    'Olur, kortu ben ayarlayayım mı?',
    'Süper! Hangi gün sana uyar?',
    'Harika, ben akşamları daha müsaitim.',
    'Tamamdır, görüşmek üzere!',
  ];
  return r[Math.floor(Math.random() * r.length)];
}

const CalIcon = (
  <svg viewBox="0 0 24 24" width="16" height="16"><rect x="4" y="5" width="16" height="16" rx="3" stroke="currentColor" strokeWidth="1.8" fill="none"/><path d="M4 9h16M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
);

// ── Eşleşmeler: pending requests + accepted matches ──────
function MatchesScreen({ pending, matches, onSchedule, onChat }) {
  if (!pending.length && !matches.length) {
    return (
      <div className="cm-stub">
        <div className="cm-stub-mark">◎</div>
        <h3>Henüz eşleşme yok</h3>
        <p>Keşfet'te beğendiğin oyunculara istek gönder. Karşı taraf kabul edince burada eşleşmen oluşur.</p>
      </div>
    );
  }
  return (
    <div className="cm-mlist">
      {!!pending.length && (
        <>
          <div className="cm-mlist-head">BEKLEYEN İSTEKLER · {pending.length}</div>
          {pending.map((p) => (
            <div key={p.id} className="cm-mrow is-pending">
              <Avatar p={p} size={48} />
              <div className="cm-mrow-main">
                <div className="cm-mrow-name">{p.name}</div>
                <div className="cm-mrow-sub cm-mrow-wait"><i className="cm-wait-dot" />İstek gönderildi · yanıt bekleniyor</div>
              </div>
            </div>
          ))}
        </>
      )}
      {!!matches.length && (
        <>
          <div className="cm-mlist-head">EŞLEŞMELERİN · {matches.length}</div>
          {matches.map((p) => (
            <div key={p.id} className="cm-mrow">
              <Avatar p={p} size={48} />
              <div className="cm-mrow-main">
                <div className="cm-mrow-name">{p.name}</div>
                <div className="cm-mrow-sub">UTR {p.utr != null ? p.utr.toFixed(1) : '—'} · {p.court || '—'}</div>
              </div>
              <div className="cm-mrow-acts">
                <button className="cm-mrow-icon" onClick={() => onSchedule(p)} title="Maç ayarla" aria-label="Maç ayarla">{CalIcon}</button>
                <button className="cm-mrow-cta" onClick={() => onChat(p.id)}>Sohbet</button>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ── Sohbet: thread list ──────────────────────────────────
function ChatList({ order, threads, players, onOpen }) {
  if (!order.length) {
    return (
      <div className="cm-stub">
        <div className="cm-stub-mark">◌</div>
        <h3>Sohbet yok</h3>
        <p>Bir eşleşmen olduğunda sohbet burada açılır. Eşleştiğin oyuncuyla maçı buradan konuşursun.</p>
      </div>
    );
  }
  return (
    <div className="cm-mlist">
      <div className="cm-mlist-head">SOHBETLER</div>
      {order.map((id) => {
        const p = players.find((x) => x.id === id);
        const th = threads[id];
        const last = th.messages[th.messages.length - 1];
        return (
          <button key={id} className="cm-mrow" onClick={() => onOpen(id)}>
            <Avatar p={p} size={48} />
            <div className="cm-mrow-main">
              <div className="cm-mrow-name">{p.name}</div>
              <div className="cm-chat-prev">{last.from === 'me' ? 'Sen: ' : ''}{last.text}</div>
            </div>
            {th.unread > 0 && <span className="cm-unread">{th.unread}</span>}
          </button>
        );
      })}
    </div>
  );
}

// ── Sohbet: single thread ────────────────────────────────
function ChatThread({ player, thread, onBack, onSend, onSchedule }) {
  const { useState, useRef, useEffect } = React;
  const [text, setText] = useState('');
  const bodyRef = useRef(null);
  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [thread.messages.length]);
  const submit = () => {
    const v = text.trim();
    if (!v) return;
    onSend(player.id, v);
    setText('');
  };
  return (
    <div className="cm-chat">
      <div className="cm-chat-head">
        <button className="cm-chat-back" onClick={onBack} aria-label="Geri">
          <svg viewBox="0 0 24 24" width="20" height="20"><path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <Avatar p={player} size={40} />
        <div className="cm-chat-id">
          <div className="cm-chat-name">{player.name}</div>
          <div className="cm-chat-status"><i className="cm-on-dot" />Çevrimiçi</div>
        </div>
        <button className="cm-chat-sched" onClick={() => onSchedule(player)}>{CalIcon}Maç</button>
      </div>
      <div className="cm-chat-body" ref={bodyRef}>
        <div className="cm-chat-day">EŞLEŞTİNİZ · {player.court}</div>
        {thread.messages.map((m, i) => (
          <div key={i} className={cx('cm-bubble', m.from === 'me' ? 'is-me' : 'is-them')}>{m.text}</div>
        ))}
      </div>
      <div className="cm-chat-input">
        <input value={text} onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
          placeholder="Mesaj yaz…" />
        <button className="cm-chat-send" onClick={submit} disabled={!text.trim()} aria-label="Gönder">
          <svg viewBox="0 0 24 24" width="20" height="20"><path d="M4 12l16-8-6 16-3-6-7-2z" stroke="var(--accent-ink)" strokeWidth="2" fill="none" strokeLinejoin="round"/></svg>
        </button>
      </div>
    </div>
  );
}

// ── Accept toast (delayed acceptance) ────────────────────
function MatchToast({ player, onOpen, onClose }) {
  return (
    <button className="cm-toast" onClick={onOpen}>
      <Avatar p={player} size={40} />
      <div className="cm-toast-main">
        <div className="cm-toast-title">{player.name} eşleşmeyi kabul etti</div>
        <div className="cm-toast-sub">Sohbeti açmak için dokun</div>
      </div>
      <span className="cm-toast-x" onClick={(e) => { e.stopPropagation(); onClose(); }} aria-label="Kapat">×</span>
    </button>
  );
}

Object.assign(window, { MatchesScreen, ChatList, ChatThread, MatchToast, openerFor, replyFor });
