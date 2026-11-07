import { useEffect, useRef, useState, useLayoutEffect } from 'preact/hooks';
import { createPortal } from 'preact/compat';
import { useApp, Chip, Row, Section, usePhotoURL, toggle } from '../ui.jsx';
import {
  SESSIONS, PARTS, FACE_ZONES, BODY_ZONES, BLEMISH_FACE_ZONES, STAGES, TYPES, SIZES, LEVELS, CAUSES, TREATMENTS,
  EXTRACT_RESULTS, stage, zoneLabel, typeLabel, treatmentLabel, fmtDate, fmtShort, addDays, todayStr, diffDays,
  sessionLabel, skey, photoName, uid, checkAt, prefillCheck, upsertCheck, visibleAt, lastCheck,
} from '../lib/model.js';
import { resizeImage } from '../lib/image.js';

const FACE_IDS = FACE_ZONES.map((z) => z.id);

export function Record({ date, session, setDate, setSession, openBlemish }) {
  const { hub } = useApp();
  const [ready, setReady] = useState(hub.days.has(date));
  const [part, setPart] = useState('face');

  useEffect(() => {
    let alive = true;
    setReady(hub.days.has(date));
    hub.loadDay(date).then(() => alive && setReady(true));
    return () => (alive = false);
  }, [date]);

  return (
    <div class="record">
      <div class="datebar">
        <div class="datenav">
          <button type="button" class="icon-btn" onClick={() => setDate(addDays(date, -1))} aria-label="전날">‹</button>
          <label class="date-label">
            {fmtDate(date)}
            <input type="date" value={date} max={todayStr()} onChange={(e) => e.target.value && setDate(e.target.value)} />
          </label>
          <button type="button" class="icon-btn" onClick={() => setDate(addDays(date, 1))} disabled={date >= todayStr()} aria-label="다음날">›</button>
          {date !== todayStr() && (
            <button type="button" class="link-btn" onClick={() => setDate(todayStr())}>오늘</button>
          )}
        </div>
        <div class="seg" role="tablist">
          {SESSIONS.map((s) => (
            <button type="button" role="tab" aria-selected={session === s.id} class={session === s.id ? 'on' : ''} onClick={() => setSession(s.id)}>
              {s.icon} {s.label}
            </button>
          ))}
        </div>
      </div>
      {!ready ? (
        <div class="loading">불러오는 중…</div>
      ) : (
        <div class="record-grid">
          <div class="col-left">
            <PhotoPanel date={date} session={session} part={part} setPart={setPart} openBlemish={openBlemish} />
          </div>
          <div class="col-right">
            <Routine date={date} session={session} />
            <Exercise date={date} />
            <Memo date={date} session={session} />
          </div>
        </div>
      )}
    </div>
  );
}

// ───────────────────────── 사진 + 뾰루지 ─────────────────────────

function useVisibleBlemishes(date, session, part) {
  const { hub } = useApp();
  const key = skey(date, session);
  return hub.blemishes.items.filter((b) => b.part === part && visibleAt(b, key)).sort((a, b) => a.num - b.num);
}

function PhotoPanel({ date, session, part, setPart, openBlemish }) {
  const { hub } = useApp();
  const day = hub.days.get(date);
  const key = skey(date, session);
  const [editor, setEditor] = useState(false);
  const [focus, setFocus] = useState(null);

  const counts = Object.fromEntries(
    PARTS.map((p) => {
      const list = hub.blemishes.items.filter((b) => b.part === p.id && visibleAt(b, key));
      return [p.id, { total: list.length, unchecked: list.filter((b) => !checkAt(b, date, session)).length }];
    })
  );

  return (
    <Section class="photo-card">
      <div class="part-tabs" role="tablist">
        {PARTS.map((p) => {
          const has = !!day?.[session]?.photos?.[p.id];
          const c = counts[p.id];
          return (
            <button type="button" role="tab" aria-selected={part === p.id} class={part === p.id ? 'on' : ''} onClick={() => setPart(p.id)}>
              <span>{p.label}</span>
              <span class={`dot${has ? ' ok' : ''}`} title={has ? '사진 있음' : '사진 없음'}>{has ? '📷' : '○'}</span>
              {c.unchecked > 0 && <span class="badge warn">{c.unchecked}</span>}
            </button>
          );
        })}
      </div>
      <PartPhoto date={date} session={session} part={part} onEdit={() => setEditor(true)} focus={focus} />
      <BlemishList date={date} session={session} part={part} focus={focus} setFocus={setFocus} openBlemish={openBlemish} onAdd={() => setEditor(true)} />
      {editor && <PinEditor date={date} session={session} part={part} onClose={() => setEditor(false)} />}
    </Section>
  );
}

function PartPhoto({ date, session, part, onEdit, focus }) {
  const { hub, store } = useApp();
  const meta = hub.days.get(date)?.[session]?.photos?.[part];
  const name = photoName(date, session, part);
  const { url, err } = usePhotoURL(store, name, meta?.v);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef();
  const list = useVisibleBlemishes(date, session, part);

  async function onFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      const blob = await resizeImage(file);
      const v = Date.now();
      await store.savePhoto(name, v, blob);
      const day = hub.day(date);
      day[session].photos[part] = { v };
      hub.touchDay(date);
    } catch (er) {
      alert('사진을 불러오지 못했어요: ' + er.message);
    } finally {
      setBusy(false);
    }
  }

  const input = <input ref={inputRef} type="file" accept="image/*" hidden onChange={onFile} />;

  if (!meta) {
    return (
      <div class="photo-empty">
        {input}
        <button type="button" class="photo-add" onClick={() => inputRef.current.click()} disabled={busy}>
          <span class="big">📷</span>
          <span>{busy ? '올리는 중…' : `${PARTS.find((p) => p.id === part).label} 사진 추가`}</span>
          <small>{sessionLabel(session)} · 같은 구도, 같은 조명</small>
        </button>
        {list.length > 0 && <p class="hint">사진이 없어도 아래에서 뾰루지 상태는 체크할 수 있어요.</p>}
      </div>
    );
  }

  return (
    <div class="photo-wrap">
      {input}
      <button type="button" class="photo-view" onClick={onEdit} aria-label="크게 보기 및 핀 편집">
        {url ? <img src={url} alt="" /> : <div class="photo-ph">{err ? '사진을 불러오지 못했어요' : '불러오는 중…'}</div>}
        {url && <Pins list={list} date={date} session={session} focus={focus} />}
      </button>
      <div class="photo-actions">
        <button type="button" class="btn" onClick={onEdit}>🔍 크게 보기 · 뾰루지 표시</button>
        <button type="button" class="btn ghost" onClick={() => inputRef.current.click()} disabled={busy}>
          {busy ? '올리는 중…' : '다시 찍기'}
        </button>
      </div>
    </div>
  );
}

function pinPos(b, date, session, drag) {
  if (drag && drag.id === b.id) return drag;
  const c = checkAt(b, date, session) || lastCheck(b, skey(date, session)) || b.checks[0];
  return { x: c.x, y: c.y };
}

function Pins({ list, date, session, focus, drag, onPinDown, onPinClick }) {
  return list.map((b) => {
    const c = checkAt(b, date, session);
    const p = pinPos(b, date, session, drag);
    const st = stage((c || lastCheck(b, skey(date, session)) || b.checks[0]).stage);
    return (
      <span
        class={`pin${c ? '' : ' unchecked'}${focus === b.id ? ' focus' : ''}`}
        style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%`, '--c': st.color }}
        onPointerDown={onPinDown ? (e) => onPinDown(e, b) : undefined}
        onClick={onPinClick ? (e) => (e.stopPropagation(), onPinClick(b)) : undefined}
      >
        {b.num}
      </span>
    );
  });
}

// ── 크게 보기 + 핀 추가/이동 ──
function PinEditor({ date, session, part, onClose }) {
  const { hub, store } = useApp();
  const meta = hub.days.get(date)?.[session]?.photos?.[part];
  const { url } = usePhotoURL(store, photoName(date, session, part), meta?.v);
  const list = useVisibleBlemishes(date, session, part);
  const [zoom, setZoom] = useState(1);
  const [base, setBase] = useState(0);
  const [aspect, setAspect] = useState(0.75);
  const [pending, setPending] = useState(null);
  const [drag, setDrag] = useState(null);
  const [sel, setSel] = useState(null);
  const scrollRef = useRef();
  const wrapRef = useRef();

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const fit = () => setBase(Math.min(el.clientWidth, el.clientHeight * aspect));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [aspect, url]);

  const rel = (e) => {
    const r = wrapRef.current.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
      y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)),
    };
  };

  function onPinDown(e, b) {
    e.stopPropagation();
    e.preventDefault();
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    const start = { x: e.clientX, y: e.clientY };
    let moved = false;
    const move = (ev) => {
      if (Math.hypot(ev.clientX - start.x, ev.clientY - start.y) > 4) moved = true;
      if (moved) setDrag({ id: b.id, ...rel(ev) });
    };
    const up = (ev) => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      if (moved) {
        upsertCheck(b, date, session, rel(ev));
        hub.touchBlemishes();
      } else setSel(b.id === sel ? null : b.id);
      setDrag(null);
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  }

  const selB = list.find((b) => b.id === sel);

  useEffect(() => {
    document.body.classList.add('noscroll');
    return () => document.body.classList.remove('noscroll');
  }, []);

  return createPortal(
    <div class="editor" role="dialog" aria-label="뾰루지 표시">
      <header class="editor-head">
        <button type="button" class="btn ghost" onClick={onClose}>✕ 닫기</button>
        <div class="seg sm">
          {[1, 2, 3].map((z) => (
            <button type="button" class={zoom === z ? 'on' : ''} onClick={() => setZoom(z)}>{z}×</button>
          ))}
        </div>
      </header>
      <p class="editor-hint">
        {pending ? '아래에서 정보를 고르고 추가하세요' : '빈 곳을 탭 → 새 뾰루지 · 번호를 끌어서 위치 조정'}
      </p>
      <div class="editor-scroll" ref={scrollRef}>
        <div class="editor-img" ref={wrapRef} style={{ width: base ? `${base * zoom}px` : '100%' }} onClick={(e) => (setSel(null), setPending({ ...rel(e) }))}>
          {url && <img src={url} alt="" draggable={false} onLoad={(e) => setAspect(e.target.naturalWidth / e.target.naturalHeight)} />}
          <Pins list={list} date={date} session={session} drag={drag} focus={sel} onPinDown={onPinDown} onPinClick={() => {}} />
          {pending && <span class="pin pending" style={{ left: `${pending.x * 100}%`, top: `${pending.y * 100}%` }}>+</span>}
        </div>
      </div>
      {pending && (
        <NewBlemishForm
          part={part}
          onCancel={() => setPending(null)}
          onAdd={(info) => {
            const bl = hub.blemishes;
            const b = {
              id: uid(),
              num: bl.nextNum++,
              part,
              zone: part === 'face' ? info.zone : part,
              type: info.type,
              causes: info.causes,
              start: date,
              startS: session,
              checks: [{ d: date, s: session, x: pending.x, y: pending.y, stage: info.stage, size: info.size, pain: info.pain, red: info.red, tx: [], ext: null, note: '' }],
            };
            bl.items.push(b);
            hub.touchBlemishes();
            setPending(null);
          }}
        />
      )}
      {!pending && selB && (
        <div class="editor-panel">
          <BlemishCard b={selB} date={date} session={session} defaultOpen />
        </div>
      )}
    </div>,
    document.body
  );
}

function NewBlemishForm({ part, onAdd, onCancel }) {
  const [f, setF] = useState({ zone: null, type: 'papule', causes: [], stage: 'rise', size: 's', pain: 0, red: 1 });
  const set = (p) => setF({ ...f, ...p });
  const ok = part !== 'face' || f.zone;
  return (
    <div class="editor-panel form">
      {part === 'face' && (
        <Row label="부위">
          {BLEMISH_FACE_ZONES.map((z) => <Chip on={f.zone === z.id} onClick={() => set({ zone: z.id })}>{z.label}</Chip>)}
        </Row>
      )}
      <Row label="종류">
        {TYPES.map((t) => <Chip on={f.type === t.id} onClick={() => set({ type: t.id })}>{t.label}</Chip>)}
      </Row>
      <Row label="단계">
        {STAGES.slice(0, 4).map((s) => <Chip on={f.stage === s.id} color={s.color} onClick={() => set({ stage: s.id })}>{s.label}</Chip>)}
      </Row>
      <Row label="크기">
        {SIZES.map((s) => <Chip on={f.size === s.id} onClick={() => set({ size: s.id })}>{s.label}</Chip>)}
      </Row>
      <Row label="통증">
        {LEVELS.map((n) => <Chip on={f.pain === n} onClick={() => set({ pain: n })}>{n}</Chip>)}
      </Row>
      <Row label="붉은기">
        {LEVELS.map((n) => <Chip on={f.red === n} onClick={() => set({ red: n })}>{n}</Chip>)}
      </Row>
      <Row label="의심 원인">
        {CAUSES.map((c) => <Chip small on={f.causes.includes(c)} onClick={() => set({ causes: toggle([...f.causes], c) })}>{c}</Chip>)}
      </Row>
      <div class="form-actions">
        <button type="button" class="btn ghost" onClick={onCancel}>취소</button>
        <button type="button" class="btn primary" disabled={!ok} onClick={() => onAdd(f)}>{ok ? '추가' : '부위를 골라주세요'}</button>
      </div>
    </div>
  );
}

function BlemishList({ date, session, part, focus, setFocus, openBlemish, onAdd }) {
  const { hub } = useApp();
  const list = useVisibleBlemishes(date, session, part);
  const unchecked = list.filter((b) => !checkAt(b, date, session));
  return (
    <div class="blemish-list">
      <div class="list-head">
        <h3>뾰루지 {list.length ? `${list.length}개` : ''}</h3>
        <div class="list-actions">
          {unchecked.length > 1 && (
            <button type="button" class="btn sm" onClick={() => {
              unchecked.forEach((b) => upsertCheck(b, date, session, {}));
              hub.touchBlemishes();
            }}>모두 그대로 ✓</button>
          )}
          <button type="button" class="btn sm ghost" onClick={onAdd}>＋ 새 뾰루지</button>
        </div>
      </div>
      {!list.length && <p class="hint">진행 중인 뾰루지가 없어요. 생기면 사진에서 위치를 탭해서 추가하세요.</p>}
      {list.map((b) => (
        <div onMouseEnter={() => setFocus(b.id)} onMouseLeave={() => setFocus(null)} key={b.id}>
          <BlemishCard b={b} date={date} session={session} openBlemish={openBlemish} />
        </div>
      ))}
    </div>
  );
}

export function BlemishCard({ b, date, session, defaultOpen, openBlemish }) {
  const { hub } = useApp();
  const [open, setOpen] = useState(!!defaultOpen);
  const c = checkAt(b, date, session);
  const v = c || prefillCheck(b, date, session);
  const st = stage(v.stage);
  const set = (patch) => {
    upsertCheck(b, date, session, patch);
    hub.touchBlemishes();
  };
  const spots = hub.spotProducts();
  const dn = diffDays(b.start, date);

  return (
    <div class={`bcard${c ? '' : ' unchecked'}`}>
      <div class="bcard-head">
        <span class="num" style={{ '--c': st.color }}>{b.num}</span>
        <div class="bcard-title">
          <strong>{b.part === 'face' ? zoneLabel(b.zone) : zoneLabel(b.part)} · {typeLabel(b.type)}</strong>
          <small>
            {dn === 0 ? '오늘 생김' : `D+${dn}`} · <span style={{ color: st.color }}>{st.label}</span> · 크기 {SIZES.find((s) => s.id === v.size)?.label} · 통증 {v.pain} · 붉은기 {v.red}
            {v.tx.length > 0 && ` · ${v.tx.map((t) => treatmentLabel(t, hub.settings)).join(', ')}`}
          </small>
        </div>
        <div class="bcard-actions">
          {!c && <button type="button" class="btn sm primary" onClick={() => set({})}>그대로 ✓</button>}
          {c && <span class="checked">✓</span>}
          <button type="button" class="icon-btn" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="수정">{open ? '▴' : '▾'}</button>
        </div>
      </div>
      {open && (
        <div class="bcard-body">
          <Row label="단계">
            {STAGES.map((s) => <Chip small on={v.stage === s.id} color={s.color} onClick={() => set({ stage: s.id })}>{s.label}</Chip>)}
          </Row>
          <Row label="크기">
            {SIZES.map((s) => <Chip small on={v.size === s.id} onClick={() => set({ size: s.id })}>{s.label}</Chip>)}
          </Row>
          <Row label="통증">
            {LEVELS.map((n) => <Chip small on={v.pain === n} onClick={() => set({ pain: n })}>{n}</Chip>)}
          </Row>
          <Row label="붉은기">
            {LEVELS.map((n) => <Chip small on={v.red === n} onClick={() => set({ red: n })}>{n}</Chip>)}
          </Row>
          <Row label="처치">
            {TREATMENTS.map((t) => <Chip small on={v.tx.includes(t.id)} onClick={() => set({ tx: toggle([...v.tx], t.id) })}>{t.label}</Chip>)}
            {spots.map((p) => <Chip small on={v.tx.includes('p:' + p.id)} onClick={() => set({ tx: toggle([...v.tx], 'p:' + p.id) })}>💊 {p.name}</Chip>)}
          </Row>
          {v.tx.includes('extract') && (
            <Row label="압출 결과">
              {EXTRACT_RESULTS.map((r) => <Chip small on={v.ext === r.id} onClick={() => set({ ext: r.id })}>{r.label}</Chip>)}
            </Row>
          )}
          <div class="row">
            <span class="row-label">메모</span>
            <input class="input" value={v.note} placeholder="한 줄 메모" onChange={(e) => set({ note: e.target.value })} />
          </div>
          {openBlemish && (
            <button type="button" class="link-btn" onClick={() => openBlemish(b.id)}>상세 · 타임랩스 보기 →</button>
          )}
        </div>
      )}
    </div>
  );
}

// ───────────────────────── 클렌징 · 스킨케어 ─────────────────────────

function Routine({ date, session }) {
  const { hub } = useApp();
  const sess = hub.days.get(date)?.[session];
  const [prev, setPrev] = useState(null);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const addLock = useRef(false);

  useEffect(() => {
    let alive = true;
    setPrev(null);
    hub.previousRoutine(date, session).then((p) => alive && setPrev(p));
    return () => (alive = false);
  }, [date, session]);

  const edit = (fn) => {
    const d = hub.day(date);
    fn(d[session]);
    hub.touchDay(date);
  };

  const cleansers = hub.products('cleanser');
  const care = hub.settings.products.filter((p) => !p.archived && p.cat !== 'cleanser');
  const used = sess?.skincare || {};
  const cleansing = sess?.cleansing || [];
  const empty = !cleansing.length && !Object.keys(used).length;

  function toggleProduct(p) {
    edit((s) => {
      if (s.skincare[p.id]) delete s.skincare[p.id];
      else {
        const last = prev?.session.skincare[p.id];
        s.skincare[p.id] = last ? [...last] : p.zones === 'all' ? [...FACE_IDS] : [];
      }
    });
  }

  function addCleanser() {
    if (addLock.current) return;
    addLock.current = true;
    const n = name.trim();
    setAdding(false);
    setName('');
    if (!n) return;
    if (hub.products('cleanser').some((p) => p.name === n)) return;
    const p = { id: uid(), name: n, cat: 'cleanser', zones: 'all', spot: false, archived: false };
    hub.settings.products.push(p);
    hub.touchSettings();
    edit((s) => s.cleansing.push(p.id));
  }

  return (
    <>
      <Section
        title={`${session === 'AM' ? '☀️' : '🌙'} ${sessionLabel(session)} 루틴`}
        right={
          prev && (
            <button type="button" class={`btn sm${empty ? ' primary' : ' ghost'}`} onClick={() => {
              if (!empty && !confirm('지금 선택한 내용을 지우고 복사할까요?')) return;
              edit((s) => {
                s.cleansing = [...prev.session.cleansing];
                s.skincare = structuredClone(prev.session.skincare);
              });
            }}>↺ {fmtShort(prev.date)} {sessionLabel(session)}과 동일</button>
          )
        }
      >
        <h3 class="sub">🫧 클렌징</h3>
        <div class="chips">
          {cleansers.map((p) => (
            <Chip on={cleansing.includes(p.id)} onClick={() => edit((s) => toggle(s.cleansing, p.id))}>{p.name}</Chip>
          ))}
          {adding ? (
            <form class="inline-add" onSubmit={(e) => (e.preventDefault(), addCleanser())}>
              <input class="input" autoFocus value={name} placeholder="클렌저 이름" onInput={(e) => setName(e.target.value)} onBlur={addCleanser} />
            </form>
          ) : (
            <Chip onClick={() => ((addLock.current = false), setAdding(true))}>＋ 클렌저 추가</Chip>
          )}
        </div>

        <h3 class="sub">🧴 스킨케어</h3>
        <div class="chips">
          {care.map((p) => (
            <Chip on={!!used[p.id]} onClick={() => toggleProduct(p)}>{p.name}</Chip>
          ))}
        </div>
        {care.filter((p) => used[p.id]).length > 0 && (
          <div class="zone-table">
            {care.filter((p) => used[p.id]).map((p) => {
              const zones = used[p.id];
              const allFace = FACE_IDS.every((z) => zones.includes(z));
              const setZones = (fn) => edit((s) => fn(s.skincare[p.id]));
              return (
                <div class="zone-row">
                  <span class="zone-name">{p.name}</span>
                  <div class="chips">
                    <Chip small on={allFace} onClick={() => setZones((z) => {
                      const rest = z.filter((x) => !FACE_IDS.includes(x));
                      z.splice(0, z.length, ...(allFace ? rest : [...FACE_IDS, ...rest]));
                    })}>얼굴 전체</Chip>
                    {FACE_ZONES.map((z) => <Chip small on={zones.includes(z.id)} onClick={() => setZones((arr) => toggle(arr, z.id))}>{z.label}</Chip>)}
                    <span class="sep" />
                    {BODY_ZONES.map((z) => <Chip small on={zones.includes(z.id)} onClick={() => setZones((arr) => toggle(arr, z.id))}>{z.label}</Chip>)}
                  </div>
                  {!zones.length && <small class="warn-text">바른 부위를 골라주세요</small>}
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </>
  );
}

// ───────────────────────── 운동 ─────────────────────────

function Exercise({ date }) {
  const { hub } = useApp();
  const list = hub.days.get(date)?.exercise || [];
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const addLock = useRef(false);
  const edit = (fn) => {
    fn(hub.day(date).exercise);
    hub.touchDay(date);
  };
  const add = (type) => edit((ex) => ex.push({ id: uid(), type, minutes: 60, shower: null }));

  function addType() {
    if (addLock.current) return;
    addLock.current = true;
    setAdding(false);
    setName('');
    const n = name.trim();
    if (n && !hub.settings.exerciseTypes.includes(n)) {
      hub.settings.exerciseTypes.push(n);
      hub.touchSettings();
    }
    if (n) add(n);
  }

  return (
    <Section title="🏃 오늘 운동" right={<small class="muted">하루 단위</small>}>
      {list.map((e) => (
        <div class="ex-row">
          <div class="ex-top">
            <strong>{e.type}</strong>
            <button type="button" class="icon-btn" aria-label="삭제" onClick={() => edit((ex) => ex.splice(ex.indexOf(e), 1))}>✕</button>
          </div>
          <Row label="시간">
            {[30, 60, 90, 120].map((m) => <Chip small on={e.minutes === m} onClick={() => edit(() => (e.minutes = m))}>{m}분</Chip>)}
            <input class="input num" type="number" inputMode="numeric" min="0" value={e.minutes ?? ''} onChange={(ev) => edit(() => (e.minutes = Number(ev.target.value) || 0))} aria-label="분" />
          </Row>
          <Row label="샤워">
            <Chip small on={e.shower === true} onClick={() => edit(() => (e.shower = e.shower === true ? null : true))}>운동 후 바로</Chip>
            <Chip small on={e.shower === false} onClick={() => edit(() => (e.shower = e.shower === false ? null : false))}>늦게 / 안 함</Chip>
          </Row>
        </div>
      ))}
      <div class="chips">
        {hub.settings.exerciseTypes.map((t) => <Chip onClick={() => add(t)}>＋ {t}</Chip>)}
        {adding ? (
          <form class="inline-add" onSubmit={(e) => (e.preventDefault(), addType())}>
            <input class="input" autoFocus value={name} placeholder="운동 이름" onInput={(e) => setName(e.target.value)} onBlur={addType} />
          </form>
        ) : (
          <Chip onClick={() => ((addLock.current = false), setAdding(true))}>＋ 직접 입력</Chip>
        )}
      </div>
    </Section>
  );
}

function Memo({ date, session }) {
  const { hub } = useApp();
  const memo = hub.days.get(date)?.[session]?.memo || '';
  return (
    <Section title={`📝 ${sessionLabel(session)} 메모`}>
      <textarea class="input memo" rows="3" placeholder="피부 느낌, 특이사항…" value={memo} onInput={(e) => {
        hub.day(date)[session].memo = e.target.value;
        hub.touchDay(date);
      }} />
    </Section>
  );
}
