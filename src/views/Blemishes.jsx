import { useEffect, useState } from 'preact/hooks';
import { useApp, Chip, Row, Sheet, toggle } from '../ui.jsx';
import {
  PARTS, BLEMISH_FACE_ZONES, TYPES, CAUSES, SIZES, EXTRACT_RESULTS, stage, zoneLabel, typeLabel, treatmentLabel,
  fmtShort, sessionLabel, diffDays, todayStr, isActive, latestCheck, healedCheck, daysOf, photoName, partLabel,
} from '../lib/model.js';
import { cropAround } from '../lib/image.js';

export function Blemishes({ openId, setOpenId }) {
  const { hub } = useApp();
  const [filter, setFilter] = useState('active');
  const [part, setPart] = useState('all');
  const items = hub.blemishes.items
    .filter((b) => (filter === 'all' ? true : filter === 'active' ? isActive(b) : !isActive(b)))
    .filter((b) => part === 'all' || b.part === part)
    .sort((a, b) => b.num - a.num);
  const open = hub.blemishes.items.find((b) => b.id === openId);

  return (
    <div class="page">
      <div class="filters">
        <div class="seg sm">
          {[['active', '진행 중'], ['healed', '완치'], ['all', '전체']].map(([id, l]) => (
            <button type="button" class={filter === id ? 'on' : ''} onClick={() => setFilter(id)}>{l}</button>
          ))}
        </div>
        <div class="seg sm">
          {[['all', '전체'], ...PARTS.map((p) => [p.id, p.label])].map(([id, l]) => (
            <button type="button" class={part === id ? 'on' : ''} onClick={() => setPart(id)}>{l}</button>
          ))}
        </div>
      </div>
      {!items.length && <p class="empty">해당하는 뾰루지가 없어요.</p>}
      <div class="bgrid">
        {items.map((b) => <BlemishTile b={b} onClick={() => setOpenId(b.id)} />)}
      </div>
      {open && <BlemishDetail b={open} onClose={() => setOpenId(null)} />}
    </div>
  );
}

/** 체크 시점의 사진 blob 찾기 */
async function photoForCheck(hub, store, b, c) {
  const day = await hub.loadDay(c.d);
  const meta = day?.[c.s]?.photos?.[b.part];
  if (!meta) return null;
  const name = photoName(c.d, c.s, b.part);
  const blob = await store.getPhotoBlob(name, meta.v);
  return blob ? { key: `${name}@${meta.v}`, blob } : null;
}

function useCrop(b, c, frac) {
  const { hub, store } = useApp();
  const [src, setSrc] = useState(undefined);
  useEffect(() => {
    let alive = true;
    setSrc(undefined);
    photoForCheck(hub, store, b, c)
      .then((p) => (p ? cropAround(p.key, p.blob, c.x, c.y, frac) : null))
      .then((s) => alive && setSrc(s))
      .catch(() => alive && setSrc(null));
    return () => (alive = false);
  }, [b.id, c.d, c.s, c.x, c.y, frac]);
  return src;
}

const fracFor = (b, wide) => (b.part === 'face' ? 0.16 : 0.12) * (wide ? 1.8 : 1);

function BlemishTile({ b, onClick }) {
  const { hub } = useApp();
  const last = latestCheck(b);
  const src = useCrop(b, last, fracFor(b));
  const st = stage(last.stage);
  const healed = healedCheck(b);
  return (
    <button type="button" class="btile" onClick={onClick}>
      <div class="btile-img">
        {src ? <img src={src} alt="" /> : <span class="muted">{src === null ? '사진 없음' : '…'}</span>}
        <span class="num" style={{ '--c': st.color }}>{b.num}</span>
      </div>
      <div class="btile-info">
        <strong>{b.part === 'face' ? zoneLabel(b.zone) : partLabel(b.part)} · {typeLabel(b.type)}</strong>
        <small>
          {healed ? `${daysOf(b)}일 만에 완치` : `D+${diffDays(b.start, todayStr())} · `}
          {!healed && <span style={{ color: st.color }}>{st.label}</span>}
        </small>
        <small class="muted">{fmtShort(b.start)} 시작 · 체크 {b.checks.length}회</small>
      </div>
    </button>
  );
}

function BlemishDetail({ b, onClose }) {
  const { hub } = useApp();
  const [wide, setWide] = useState(false);
  const [edit, setEdit] = useState(false);
  const set = (fn) => {
    fn(b);
    hub.touchBlemishes();
  };
  const healed = healedCheck(b);

  return (
    <Sheet title={`#${b.num} ${b.part === 'face' ? zoneLabel(b.zone) : partLabel(b.part)} · ${typeLabel(b.type)}`} onClose={onClose} wide>
      <div class="detail-meta">
        <span>{fmtShort(b.start)} {sessionLabel(b.startS)} 시작</span>
        <span>{healed ? `${daysOf(b)}일 만에 완치 (${fmtShort(healed.d)})` : `진행 중 · D+${diffDays(b.start, todayStr())}`}</span>
        {b.causes.length > 0 && <span>의심 원인: {b.causes.join(', ')}</span>}
        <button type="button" class="link-btn" onClick={() => setEdit(!edit)}>{edit ? '편집 닫기' : '정보 편집'}</button>
      </div>
      {edit && (
        <div class="detail-edit">
          {b.part === 'face' && (
            <Row label="부위">
              {BLEMISH_FACE_ZONES.map((z) => <Chip small on={b.zone === z.id} onClick={() => set((x) => (x.zone = z.id))}>{z.label}</Chip>)}
            </Row>
          )}
          <Row label="종류">
            {TYPES.map((t) => <Chip small on={b.type === t.id} onClick={() => set((x) => (x.type = t.id))}>{t.label}</Chip>)}
          </Row>
          <Row label="의심 원인">
            {CAUSES.map((c) => <Chip small on={b.causes.includes(c)} onClick={() => set((x) => toggle(x.causes, c))}>{c}</Chip>)}
          </Row>
          <button type="button" class="btn sm danger" onClick={() => {
            if (!confirm(`#${b.num} 뾰루지 기록을 통째로 삭제할까요?`)) return;
            hub.blemishes.items = hub.blemishes.items.filter((x) => x.id !== b.id);
            hub.touchBlemishes();
            onClose();
          }}>이 뾰루지 삭제</button>
        </div>
      )}

      <div class="tl-head">
        <h3>타임랩스</h3>
        <div class="seg sm">
          <button type="button" class={!wide ? 'on' : ''} onClick={() => setWide(false)}>가까이</button>
          <button type="button" class={wide ? 'on' : ''} onClick={() => setWide(true)}>넓게</button>
        </div>
      </div>
      <div class="timelapse">
        {b.checks.map((c) => <Frame b={b} c={c} frac={fracFor(b, wide)} />)}
      </div>

      <h3>기록</h3>
      <div class="table-wrap">
        <table class="log">
          <thead>
            <tr><th>날짜</th><th>단계</th><th>크기</th><th>통증</th><th>붉은기</th><th>처치</th><th>메모</th></tr>
          </thead>
          <tbody>
            {b.checks.map((c) => (
              <tr>
                <td>{fmtShort(c.d)} {c.s === 'AM' ? '☀️' : '🌙'}</td>
                <td><span class="stage-dot" style={{ background: stage(c.stage).color }} />{stage(c.stage).label}</td>
                <td>{SIZES.find((s) => s.id === c.size)?.label}</td>
                <td>{c.pain}</td>
                <td>{c.red}</td>
                <td>
                  {c.tx.map((t) => treatmentLabel(t, hub.settings)).join(', ')}
                  {c.ext && ` (${EXTRACT_RESULTS.find((r) => r.id === c.ext)?.label})`}
                </td>
                <td>{c.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Sheet>
  );
}

function Frame({ b, c, frac }) {
  const src = useCrop(b, c, frac);
  if (src === null) return null;
  const st = stage(c.stage);
  return (
    <figure class="frame">
      {src ? <img src={src} alt="" /> : <div class="frame-ph" />}
      <figcaption>
        <b>D+{diffDays(b.start, c.d)}</b> {c.s === 'AM' ? '☀️' : '🌙'}
        <span style={{ color: st.color }}>{st.label}</span>
      </figcaption>
    </figure>
  );
}
