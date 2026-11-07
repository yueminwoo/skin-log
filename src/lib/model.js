// 데이터 구조와 상수
export const SESSIONS = [
  { id: 'AM', label: '아침', icon: '☀️' },
  { id: 'PM', label: '저녁', icon: '🌙' },
];
export const PARTS = [
  { id: 'face', label: '얼굴' },
  { id: 'back', label: '등' },
  { id: 'chest', label: '가슴' },
];
export const FACE_ZONES = [
  { id: 'forehead', label: '이마' },
  { id: 'upperCheek', label: '윗볼' },
  { id: 'lowerCheek', label: '아랫볼' },
  { id: 'philtrum', label: '인중' },
  { id: 'chin', label: '턱' },
];
export const BODY_ZONES = [
  { id: 'back', label: '등' },
  { id: 'chest', label: '가슴' },
];
// 뾰루지 위치용 (눈썹·코 추가)
export const BLEMISH_FACE_ZONES = [
  { id: 'forehead', label: '이마' },
  { id: 'brow', label: '눈썹' },
  { id: 'upperCheek', label: '윗볼' },
  { id: 'nose', label: '코' },
  { id: 'philtrum', label: '인중' },
  { id: 'lowerCheek', label: '아랫볼' },
  { id: 'chin', label: '턱' },
];
const ZONE_LABEL = Object.fromEntries([...BLEMISH_FACE_ZONES, ...BODY_ZONES].map((z) => [z.id, z.label]));
export const zoneLabel = (id) => ZONE_LABEL[id] || id || '-';
export const partLabel = (id) => PARTS.find((p) => p.id === id)?.label || id;
export const whereLabel = (b) => (b.part === 'face' ? zoneLabel(b.zone) : partLabel(b.part));

// 뾰루지 상태 (체크마다 기록). group: active=진행 중 모양, healing=회복, end=추적 종료
export const STATES = [
  { id: 'open', label: '개방면포', group: 'active', sev: 1, color: '#5f6b73' },
  { id: 'closed', label: '폐쇄면포', group: 'active', sev: 2, color: '#a08a4a' },
  { id: 'papule', label: '구진', group: 'active', sev: 3, color: '#d64545' },
  { id: 'pustule', label: '농포', group: 'active', sev: 4, color: '#b97d0c' },
  { id: 'nodule', label: '결절', group: 'active', sev: 5, color: '#9b2c3c' },
  { id: 'cyst', label: '낭포', group: 'active', sev: 6, color: '#76308a' },
  { id: 'healing', label: '아무는 중', group: 'healing', color: '#6f8f4e' },
  { id: 'trace', label: '흔적만 남음', group: 'end', color: '#8a6fb0' },
  { id: 'clear', label: '깨끗이 사라짐', group: 'end', color: '#2f8f7d' },
];
export const MORPHS = STATES.filter((x) => x.group === 'active');
export const state = (id) => STATES.find((x) => x.id === id) || STATES[2];
export const isEnd = (id) => state(id).group === 'end';

export const TRACES = [
  { id: 'pie', label: '붉은 자국' },
  { id: 'pih', label: '갈색 자국' },
  { id: 'atrophic', label: '패인 흉터' },
  { id: 'hypertrophic', label: '볼록 흉터' },
];
export const traceLabel = (id) => TRACES.find((t) => t.id === id)?.label || '흔적';

export const SIZES = [
  { id: 's', label: '소', hint: '2mm 미만' },
  { id: 'm', label: '중', hint: '2~5mm' },
  { id: 'l', label: '대', hint: '5mm 이상' },
];
export const sizeLabel = (id) => SIZES.find((x) => x.id === id)?.label || '-';

export const TREATMENTS = [
  { id: 'patch', label: '패치' },
  { id: 'extract', label: '압출' },
  { id: 'cold', label: '냉찜질' },
  { id: 'derm', label: '피부과' },
  { id: 'handsoff', label: '안 건드림' },
];
export const EXTRACT_RESULTS = [
  { id: 'clean', label: '깔끔하게 됨' },
  { id: 'partial', label: '덜 나옴' },
  { id: 'wound', label: '상처 남음' },
];

export function treatmentLabel(id, settings) {
  if (id.startsWith('p:')) return settings.products.find((p) => p.id === id.slice(2))?.name || '삭제된 제품';
  return TREATMENTS.find((t) => t.id === id)?.label || id;
}

export const PRODUCT_CATS = [
  { id: 'cleanser', label: '클렌징' },
  { id: 'skincare', label: '스킨케어' },
  { id: 'spot', label: '스팟' },
];

export function defaultSettings() {
  const p = (id, name, cat, zones = 'all', spot = false) => ({ id, name, cat, zones, spot, archived: false });
  return {
    v: 1,
    products: [
      p('diff', '디페린겔', 'skincare'),
      p('santelotion', '상떼 로션', 'skincare', 'pick'),
      p('niacin', '나이아신아마이드 토너', 'skincare'),
      p('soolantra', '수란트라', 'skincare', 'pick'),
      p('azelia', '아젤리아', 'skincare'),
      p('santesun', '상떼 선크림', 'skincare'),
      p('bpo', '벤조일퍼옥사이드', 'spot', 'pick', true),
    ],
    exerciseTypes: ['웨이트', '러닝', '체력단련', '축구', '풋살', '걷기', '수영'],
  };
}

export const emptySession = () => ({ photos: {}, cleansing: [], skincare: {}, memo: '' });
export const newDay = (date) => ({ v: 1, date, exercise: [], AM: emptySession(), PM: emptySession() });
export const emptyBlemishes = () => ({ v: 2, nextNum: 1, items: [] });

// ---- 날짜 ----
const pad = (n) => String(n).padStart(2, '0');
export const toDateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayStr = () => toDateStr(new Date());
export const parseDate = (s) => new Date(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
export const addDays = (s, n) => {
  const d = parseDate(s);
  d.setDate(d.getDate() + n);
  return toDateStr(d);
};
export const diffDays = (a, b) => Math.round((parseDate(b) - parseDate(a)) / 86400000);
const WD = ['일', '월', '화', '수', '목', '금', '토'];
export const fmtDate = (s) => {
  const d = parseDate(s);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WD[d.getDay()]})`;
};
export const fmtShort = (s) => `${+s.slice(5, 7)}/${+s.slice(8, 10)}`;
export const defaultSession = () => (new Date().getHours() < 15 ? 'AM' : 'PM');
export const sessionLabel = (s) => (s === 'AM' ? '아침' : '저녁');
export const skey = (d, s) => d + (s === 'AM' ? 'a' : 'b');

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
export const photoName = (date, session, part) => `${date}_${session}_${part}.jpg`;

// ---- 뾰루지 ----
// blemishes.json v2: { v:2, nextNum, items: [blemish] }
// blemish: { id, num, part, zone, type(처음 모양), start, startS, checks: [{d,s,x,y,stage(상태),trace,size,tx[],ext,note}] }
export const checkKey = (c) => skey(c.d, c.s);
export const startKey = (b) => skey(b.start, b.startS);

export function lastCheck(b, key) {
  let last = null;
  for (const c of b.checks) if (checkKey(c) <= key) last = c;
  return last;
}
export const checkAt = (b, d, s) => b.checks.find((c) => c.d === d && c.s === s) || null;
/** 추적 종료된 체크 (흔적만 남음 / 깨끗이 사라짐) */
export function endCheck(b) {
  return b.checks.find((c) => isEnd(c.stage)) || null;
}
export function visibleAt(b, key) {
  if (startKey(b) > key) return false;
  const e = endCheck(b);
  return !e || checkKey(e) >= key;
}
export const isActive = (b) => !endCheck(b);
export const latestCheck = (b) => b.checks[b.checks.length - 1] || null;
/** 가장 심했던 모양 */
export function peakState(b) {
  let best = null;
  for (const c of b.checks) {
    const st = state(c.stage);
    if (st.group === 'active' && (!best || st.sev > best.sev)) best = st;
  }
  return best || state(b.type);
}

/** 체크 기본값: 직전 체크 상태 + 같은 시간대(아침/저녁) 마지막 처치 */
export function prefillCheck(b, d, s) {
  const key = skey(d, s);
  const prev = lastCheck(b, key) || b.checks[0];
  let sameSession = null;
  for (const c of b.checks) if (c.s === s && checkKey(c) < key) sameSession = c;
  return {
    d,
    s,
    x: prev?.x ?? 0.5,
    y: prev?.y ?? 0.5,
    stage: prev?.stage || b.type || 'papule',
    trace: prev?.trace || null,
    size: prev?.size || 's',
    tx: sameSession ? [...sameSession.tx] : [],
    ext: null,
    note: '',
  };
}

export function upsertCheck(b, d, s, patch) {
  let c = checkAt(b, d, s);
  if (!c) {
    c = prefillCheck(b, d, s);
    b.checks.push(c);
    b.checks.sort((p, q) => (checkKey(p) < checkKey(q) ? -1 : 1));
  }
  Object.assign(c, patch);
  if (!c.tx.includes('extract')) c.ext = null;
  if (c.stage !== 'trace') c.trace = null;
  return c;
}

/** 생긴 날부터 추적 종료(없으면 마지막 체크)까지 일수 */
export function daysOf(b) {
  const e = endCheck(b);
  const end = e ? e.d : latestCheck(b)?.d || b.start;
  return diffDays(b.start, end);
}

/** 예전(v1) 기록을 새 분류로 옮김 */
export function migrateBlemishes(bl) {
  if (!bl || bl.v >= 2) return false;
  const typeMap = { whitehead: 'closed', blackhead: 'open', papule: 'papule', pustule: 'pustule', nodule: 'nodule' };
  for (const b of bl.items) {
    const t = typeMap[b.type] || 'papule';
    b.type = t;
    for (const c of b.checks) {
      const old = c.stage;
      c.stage = { pus: 'pustule', calming: 'healing', mark: 'trace', healed: 'clear' }[old] || t;
      c.trace = old === 'mark' ? 'pie' : null;
      delete c.pain;
      delete c.red;
    }
    delete b.causes;
  }
  bl.v = 2;
  return true;
}
