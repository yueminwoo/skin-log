import { useEffect, useState } from 'preact/hooks';
import { useApp, Section, usePhotoURL } from '../ui.jsx';
import {
  PARTS, BLEMISH_FACE_ZONES, TYPES, TREATMENTS, zoneLabel, treatmentLabel, typeLabel, isActive, healedCheck, daysOf,
  addDays, todayStr, photoName, fmtShort, parseDate, toDateStr, partLabel,
} from '../lib/model.js';

const avg = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
const fmt1 = (n) => (Math.round(n * 10) / 10).toString();

export function Stats() {
  const { hub } = useApp();
  const [range, setRange] = useState('90');
  const since = range === 'all' ? '0000-00-00' : addDays(todayStr(), -Number(range));
  const all = hub.blemishes.items;
  const items = all.filter((b) => b.start >= since);
  const healed = items.filter((b) => healedCheck(b));

  // 처치별 평균 완치 일수
  const byTx = new Map();
  for (const b of healed) {
    const tx = new Set(b.checks.flatMap((c) => c.tx).filter((t) => t !== 'handsoff'));
    const keys = tx.size ? [...tx] : ['none'];
    for (const k of keys) {
      if (!byTx.has(k)) byTx.set(k, []);
      byTx.get(k).push(daysOf(b));
    }
  }
  const txRows = [...byTx.entries()]
    .map(([k, d]) => ({ label: k === 'none' ? '처치 없음' : treatmentLabel(k, hub.settings), value: avg(d), n: d.length }))
    .sort((a, b) => a.value - b.value);

  const typeRows = TYPES.map((t) => {
    const d = healed.filter((b) => b.type === t.id).map(daysOf);
    return { label: t.label, value: avg(d), n: d.length };
  }).filter((r) => r.n);

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
        <div class="tile"><span class="tile-v">{all.filter(isActive).length}</span><span class="tile-l">지금 진행 중</span></div>
        <div class="tile"><span class="tile-v">{items.length}</span><span class="tile-l">기간 내 새로 생김</span></div>
        <div class="tile"><span class="tile-v">{healed.length ? fmt1(avg(healed.map(daysOf))) : '–'}<small>일</small></span><span class="tile-l">평균 완치 기간</span></div>
      </div>

      <div class="stats-grid">
        <Section title="처치별 평균 완치 일수">
          <p class="note">완치된 뾰루지 기준 · 한 번이라도 쓴 처치로 묶음 · 짧을수록 좋음</p>
          <Bars rows={txRows} unit="일" digits />
        </Section>
        <Section title="종류별 평균 완치 일수">
          <Bars rows={typeRows} unit="일" digits />
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

function Bars({ rows, unit, digits }) {
  if (!rows.length) return <p class="empty sm">아직 데이터가 없어요.</p>;
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div class="bars" role="table">
      {rows.map((r) => (
        <div class="bar-row" role="row" title={`${r.label}: ${digits ? fmt1(r.value) : r.value}${unit}${r.n != null ? ` (${r.n}개)` : ''}`}>
          <span class="bar-label" role="cell">{r.label}</span>
          <span class="bar-track" role="cell">
            <span class="bar-fill" style={{ width: `${(r.value / max) * 100}%` }} />
          </span>
          <span class="bar-value" role="cell">
            {digits ? fmt1(r.value) : r.value}
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
          <span><i class="ldot healed" /> 완치</span>
        </span>
      </div>
      <p class="note">처음 발견한 위치 · 가장 최근 {partLabel(part)} 사진 위에 표시 · {pts.length}개</p>
      <div class="map">
        {photo === null && <div class="photo-ph">{partLabel(part)} 사진이 아직 없어요</div>}
        {url && <img src={url} alt="" />}
        {(url || photo === null) &&
          pts.map((b) => (
            <span class={`mdot ${healedCheck(b) ? 'healed' : 'active'}`} style={{ left: `${b.checks[0].x * 100}%`, top: `${b.checks[0].y * 100}%` }} title={`#${b.num} ${typeLabel(b.type)} · ${fmtShort(b.start)}`} />
          ))}
      </div>
    </div>
  );
}
