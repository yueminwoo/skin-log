import { useEffect, useState } from 'preact/hooks';
import { useApp, Section, usePhotoURL } from '../ui.jsx';
import {
  PARTS, BLEMISH_FACE_ZONES, MORPHS, TRACES, zoneLabel, treatmentLabel, isActive, endCheck, peakState, daysOf,
  addDays, todayStr, photoName, fmtShort, parseDate, toDateStr, partLabel, whereLabel,
} from '../lib/model.js';
import { HelpButton } from './Guide.jsx';

const avg = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
const fmt1 = (n) => (Math.round(n * 10) / 10).toString();

export function Stats() {
  const { hub } = useApp();
  const [range, setRange] = useState('90');
  const since = range === 'all' ? '0000-00-00' : addDays(todayStr(), -Number(range));
  const all = hub.blemishes.items;
  const items = all.filter((b) => b.start >= since);
  const ended = items.filter((b) => endCheck(b));
  const hasTrace = (b) => endCheck(b).stage === 'trace';

  // 처치별: 평균 추적 기간 / 흔적 남은 비율 (종료된 뾰루지 기준)
  const byTx = new Map();
  for (const b of ended) {
    const tx = new Set(b.checks.flatMap((c) => c.tx).filter((t) => t !== 'handsoff'));
    const keys = tx.size ? [...tx] : ['none'];
    for (const k of keys) {
      if (!byTx.has(k)) byTx.set(k, []);
      byTx.get(k).push(b);
    }
  }
  const txLabel = (k) => (k === 'none' ? '처치 없음' : treatmentLabel(k, hub.settings));
  const txRows = [...byTx.entries()]
    .map(([k, bs]) => ({ label: txLabel(k), value: avg(bs.map(daysOf)), n: bs.length }))
    .sort((a, b) => a.value - b.value);
  const txTraceRows = [...byTx.entries()]
    .map(([k, bs]) => ({ label: txLabel(k), value: (bs.filter(hasTrace).length / bs.length) * 100, n: bs.length }))
    .sort((a, b) => a.value - b.value);

  const peakRows = MORPHS.map((m) => {
    const d = ended.filter((b) => peakState(b).id === m.id).map(daysOf);
    return { label: m.label, value: avg(d), n: d.length };
  }).filter((r) => r.n);

  const traceRows = [
    ...TRACES.map((t) => ({ label: t.label, value: ended.filter((b) => endCheck(b).trace === t.id).length })),
    { label: '깨끗이 사라짐', value: ended.filter((b) => endCheck(b).stage === 'clear').length },
  ].filter((r) => r.value);

  const zoneIds = [...BLEMISH_FACE_ZONES.map((z) => z.id), 'back', 'chest'];
  const zoneRows = zoneIds
    .map((z) => ({ label: zoneLabel(z), value: items.filter((b) => (b.part === 'face' ? b.zone : b.part) === z).length }))
    .filter((r) => r.value);

  // 주별 새 뾰루지 (최근 12주)
  const weeks = [];
  const today = parseDate(todayStr());
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  for (let i = 11; i >= 0; i--) {
    const s = new Date(monday);
    s.setDate(monday.getDate() - i * 7);
    const from = toDateStr(s);
    const to = addDays(from, 7);
    weeks.push({ label: fmtShort(from), value: all.filter((b) => b.start >= from && b.start < to).length });
  }

  return (
    <div class="page stats">
      <div class="filters">
        <div class="seg sm">
          {[['30', '최근 30일'], ['90', '최근 90일'], ['all', '전체']].map(([id, l]) => (
            <button type="button" class={range === id ? 'on' : ''} onClick={() => setRange(id)}>{l}</button>
          ))}
        </div>
      </div>

      <div class="tiles">
        <div class="tile"><span class="tile-v">{all.filter(isActive).length}</span><span class="tile-l">지금 추적 중</span></div>
        <div class="tile"><span class="tile-v">{items.length}</span><span class="tile-l">기간 내 새로 생김</span></div>
        <div class="tile"><span class="tile-v">{ended.length ? fmt1(avg(ended.map(daysOf))) : '–'}<small>일</small></span><span class="tile-l">평균 추적 기간</span></div>
      </div>

      <div class="stats-grid">
        <Section title="처치별 평균 추적 기간" right={<HelpButton />}>
          <p class="note">추적 종료(흔적만 남음·사라짐)까지 걸린 일수 · 한 번이라도 쓴 처치로 묶음 · 짧을수록 좋음</p>
          <Bars rows={txRows} unit="일" digits />
        </Section>
        <Section title="처치별 흔적 남은 비율">
          <p class="note">종료된 뾰루지 중 자국·흉터가 남은 비율 · 낮을수록 좋음</p>
          <Bars rows={txTraceRows} unit="%" pct />
        </Section>
        <Section title="가장 심했던 모양별 평균 추적 기간">
          <Bars rows={peakRows} unit="일" digits />
        </Section>
        <Section title="끝난 모습">
          <Bars rows={traceRows} unit="개" />
        </Section>
        <Section title="부위별 발생 수">
          <Bars rows={zoneRows} unit="개" />
        </Section>
        <Section title="주별 새 뾰루지 (최근 12주)">
          <Columns rows={weeks} />
        </Section>
        <Section title="발생 위치 지도" class="span2">
          <PinMap items={items} />
        </Section>
      </div>
    </div>
  );
}

function Bars({ rows, unit, digits, pct }) {
  if (!rows.length) return <p class="empty sm">아직 데이터가 없어요.</p>;
  const max = pct ? 100 : Math.max(...rows.map((r) => r.value), 1);
  const show = (v) => (pct ? Math.round(v) : digits ? fmt1(v) : v);
  return (
    <div class="bars" role="table">
      {rows.map((r) => (
        <div class="bar-row" role="row" title={`${r.label}: ${show(r.value)}${unit}${r.n != null ? ` (${r.n}개)` : ''}`}>
          <span class="bar-label" role="cell">{r.label}</span>
          <span class="bar-track" role="cell">
            <span class="bar-fill" style={{ width: `${(r.value / max) * 100}%` }} />
          </span>
          <span class="bar-value" role="cell">
            {show(r.value)}
            {unit}
            {r.n != null && <small class={r.n < 3 ? 'warn-text' : 'muted'}> n={r.n}</small>}
          </span>
        </div>
      ))}
    </div>
  );
}

function Columns({ rows }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div class="cols">
      {rows.map((r) => (
        <div class="col" title={`${r.label} 주: ${r.value}개`}>
          <span class="col-v">{r.value || ''}</span>
          <span class="col-bar" style={{ height: `${(r.value / max) * 100}%` }} />
          <span class="col-l">{r.label}</span>
        </div>
      ))}
    </div>
  );
}

function PinMap({ items }) {
  const { hub, store } = useApp();
  const [part, setPart] = useState('face');
  const [photo, setPhoto] = useState(undefined);

  useEffect(() => {
    let alive = true;
    setPhoto(undefined);
    (async () => {
      const days = [...hub.dayList].sort().reverse().slice(0, 30);
      for (const d of days) {
        const day = await hub.loadDay(d);
        for (const s of ['PM', 'AM']) {
          const meta = day?.[s]?.photos?.[part];
          if (meta) return { name: photoName(d, s, part), v: meta.v };
        }
      }
      return null;
    })().then((p) => alive && setPhoto(p));
    return () => (alive = false);
  }, [part]);

  const { url } = usePhotoURL(store, photo?.name, photo?.v);
  const pts = items.filter((b) => b.part === part);

  return (
    <div>
      <div class="map-head">
        <div class="seg sm">
          {PARTS.map((p) => (
            <button type="button" class={part === p.id ? 'on' : ''} onClick={() => setPart(p.id)}>{p.label}</button>
          ))}
        </div>
        <span class="legend">
          <span><i class="ldot active" /> 진행 중</span>
          <span><i class="ldot healed" /> 종료</span>
        </span>
      </div>
      <p class="note">처음 발견한 위치 · 가장 최근 {partLabel(part)} 사진 위에 표시 · {pts.length}개</p>
      <div class="map">
        {photo === null && <div class="photo-ph">{partLabel(part)} 사진이 아직 없어요</div>}
        {url && <img src={url} alt="" />}
        {(url || photo === null) &&
          pts.map((b) => (
            <span class={`mdot ${endCheck(b) ? 'healed' : 'active'}`} style={{ left: `${b.checks[0].x * 100}%`, top: `${b.checks[0].y * 100}%` }} title={`#${b.num} ${whereLabel(b)} · ${peakState(b).label} · ${fmtShort(b.start)}`} />
          ))}
      </div>
    </div>
  );
}
