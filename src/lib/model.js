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
// 뾰루지 위치용 (코 추가)
export const BLEMISH_FACE_ZONES = [...FACE_ZONES.slice(0, 4), { id: 'nose', label: '코' }, FACE_ZONES[4]];
const ZONE_LABEL = Object.fromEntries([...BLEMISH_FACE_ZONES, ...BODY_ZONES].map((z) => [z.id, z.label]));
export const zoneLabel = (id) => ZONE_LABEL[id] || id || '-';
export const partLabel = (id) => PARTS.find((p) => p.id === id)?.label || id;

export const STAGES = [
  { id: 'rise', label: '올라옴', color: '#e0a03a' },
  { id: 'inflamed', label: '염증', color: '#d64545' },
  { id: 'pus', label: '화농', color: '#b8892a' },
  { id: 'calming', label: '가라앉는 중', color: '#6f8f4e' },
  { id: 'mark', label: '자국', color: '#8a6fb0' },
  { id: 'healed', label: '완치', color: '#2f8f7d' },
];
export const stage = (id) => STAGES.find((s) => s.id === id) || STAGES[0];

export const TYPES = [
  { id: 'whitehead', label: '좁쌀' },
  { id: 'blackhead', label: '블랙헤드' },
  { id: 'papule', label: '빨간 뾰루지' },
  { id: 'pustule', label: '고름' },
  { id: 'nodule', label: '결절·낭포' },
];
export const typeLabel = (id) => TYPES.find((t) => t.id === id)?.label || '-';

export const SIZES = [
  { id: 's', label: '소' },
  { id: 'm', label: '중' },
  { id: 'l', label: '대' },
];
export const LEVELS = [0, 1, 2, 3];
export const CAUSES = ['새 제품', '수면 부족', '음식', '마찰', '땀', '스트레스', '모름'];

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
export const emptyBlemishes = () => ({ v: 1, nextNum: 1, items: [] });

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
// blemish: { id, num, part, zone, type, causes[], start, startS, checks: [{d,s,x,y,stage,size,pain,red,tx[],ext,note}] }
export const checkKey = (c) => skey(c.d, c.s);
export const startKey = (b) => skey(b.start, b.startS);

export function lastCheck(b, key) {
  let last = null;
  for (const c of b.checks) if (checkKey(c) <= key) last = c;
  return last;
}
export const checkAt = (b, d, s) => b.checks.find((c) => c.d === d && c.s === s) || null;
export function healedCheck(b) {
  return b.checks.find((c) => c.stage === 'healed') || null;
}
export function visibleAt(b, key) {
  if (startKey(b) > key) return false;
  const h = healedCheck(b);
  return !h || checkKey(h) >= key;
}
export const isActive = (b) => !healedCheck(b);
export const latestCheck = (b) => b.checks[b.checks.length - 1] || null;

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
    stage: prev?.stage === 'healed' ? 'mark' : prev?.stage || 'rise',
    size: prev?.size || 's',
    pain: prev?.pain ?? 0,
    red: prev?.red ?? 1,
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
  return c;
}

export function daysOf(b) {
  const h = healedCheck(b);
  const end = h ? h.d : latestCheck(b)?.d || b.start;
  return diffDays(b.start, end);
}
