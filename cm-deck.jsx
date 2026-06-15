/* ===== CourtMate — swipe deck (drag + buttons) ===== */

function SwipeDeck({ player, next, onDecision, onRewind, onInfo, canRewind, showScore }) {
  const [drag, setDrag] = useState({ x: 0, y: 0, active: false });
  const [fly, setFly] = useState(null); // null | 'like' | 'nope'
  const start = useRef(null);
  const THRESH = 105;

  const finish = useCallback((dir) => {
    if (fly) return;
    setFly(dir);
    window.setTimeout(() => {
      onDecision(dir, player);
      setFly(null);
      setDrag({ x: 0, y: 0, active: false });
    }, 300);
  }, [fly, onDecision, player]);

  const onDown = (e) => {
    if (fly) return;
    const pt = e.touches ? e.touches[0] : e;
    start.current = { x: pt.clientX, y: pt.clientY };
    setDrag((d) => ({ ...d, active: true }));
  };
  const onMove = (e) => {
    if (!start.current || fly) return;
    const pt = e.touches ? e.touches[0] : e;
    setDrag({ x: pt.clientX - start.current.x, y: (pt.clientY - start.current.y) * 0.4, active: true });
  };
  const onUp = () => {
    if (!start.current || fly) return;
    const dx = drag.x;
    start.current = null;
    if (dx > THRESH) { finish('like'); return; }
    if (dx < -THRESH) { finish('nope'); return; }
    setDrag({ x: 0, y: 0, active: false });
  };

  const stamp = Math.max(-1, Math.min(1, drag.x / 90));

  let tx = drag.x, ty = drag.y, rot = drag.x * 0.05;
  let trans = drag.active ? 'none' : 'transform .35s cubic-bezier(.2,.7,.3,1)';
  if (fly) {
    tx = fly === 'like' ? 620 : -620;
    ty = drag.y - 40;
    rot = fly === 'like' ? 22 : -22;
    trans = 'transform .3s ease, opacity .3s ease';
  }

  return (
    <React.Fragment>
      <div className="cm-deck">
        {next && (
          <div className="cm-cardwrap" style={{ transform: 'scale(0.955) translateY(12px)', filter: 'brightness(0.82)', zIndex: 1 }}>
            <PlayerCard p={next} stamp={0} showScore={showScore} />
          </div>
        )}
        {player && (
          <div
            className="cm-cardwrap"
            style={{
              transform: `translate(${tx}px, ${ty}px) rotate(${rot}deg)`,
              transition: trans,
              opacity: fly ? 0 : 1,
              zIndex: 2,
              cursor: drag.active ? 'grabbing' : 'grab',
              touchAction: 'none',
            }}
            onMouseDown={onDown}
            onMouseMove={drag.active ? onMove : undefined}
            onMouseUp={onUp}
            onMouseLeave={() => { if (drag.active) onUp(); }}
            onTouchStart={onDown}
            onTouchMove={onMove}
            onTouchEnd={onUp}
          >
            <PlayerCard p={player} stamp={stamp} showScore={showScore} />
          </div>
        )}
      </div>

      <div className="cm-actions" style={{ pointerEvents: fly ? 'none' : 'auto' }}>
        <div className={'cm-act sm rewind' + (canRewind ? '' : ' off')}
             style={{ opacity: canRewind ? 1 : 0.4 }}
             onClick={() => canRewind && onRewind && onRewind()} title="Geri al"><CMIcon.rewind /></div>
        <div className="cm-act lg nope" onClick={() => finish('nope')} title="Pas"><CMIcon.x /></div>
        <div className="cm-act lg like" onClick={() => finish('like')} title="Eşleş"><CMIcon.check /></div>
        <div className="cm-act sm info" onClick={() => onInfo && onInfo()} title="Detay"><CMIcon.info /></div>
      </div>
    </React.Fragment>
  );
}

Object.assign(window, { SwipeDeck });
