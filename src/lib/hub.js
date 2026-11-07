// 앱 데이터 허브: 설정, 뾰루지, 날짜별 기록을 메모리에 들고 있다가 바뀌면 자동 저장
import { defaultSettings, emptyBlemishes, newDay } from './model.js';

const dayPath = (d) => `days/${d}.json`;

export class Hub {
  constructor(store) {
    this.store = store;
    this.settings = null;
    this.blemishes = null;
    this.days = new Map(); // date -> day | null(없음)
    this.dayList = new Set();
    this.timers = new Map();
    this.listeners = new Set();
    this.version = 0;
  }

  on(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  emit() {
    this.version++;
    for (const fn of this.listeners) fn(this.version);
  }

  async load() {
    const [settings, blemishes, days] = await Promise.all([
      this.store.loadJSON('settings.json'),
      this.store.loadJSON('blemishes.json'),
      this.store.listDays(),
    ]);
    this.settings = settings || defaultSettings();
    if (!settings) this.store.saveJSON('settings.json', this.settings);
    this.blemishes = blemishes || emptyBlemishes();
    this.dayList = new Set(days);
  }

  /** 다른 기기에서 바뀐 내용 다시 불러오기 (저장 대기 중인 건 건드리지 않음) */
  async refresh(dates = []) {
    if (this.timers.size) return;
    const paths = ['settings.json', 'blemishes.json', ...dates.map(dayPath)];
    const pend = await Promise.all(paths.map((p) => this.store.hasPending(p)));
    if (pend.some(Boolean) || this.timers.size) return;
    const [s, b, list, ...ds] = await Promise.all([
      this.store.loadJSON('settings.json'),
      this.store.loadJSON('blemishes.json'),
      this.store.listDays(),
      ...dates.map((d) => this.store.loadJSON(dayPath(d))),
    ]);
    if (this.timers.size) return;
    if (s) this.settings = s;
    if (b) this.blemishes = b;
    this.dayList = new Set(list);
    dates.forEach((d, i) => this.days.set(d, ds[i] || null));
    this.emit();
  }

  async loadDay(date) {
    if (this.days.has(date)) return this.days.get(date);
    if (!this.dayList.has(date)) {
      this.days.set(date, null);
      return null;
    }
    const d = await this.store.loadJSON(dayPath(date));
    if (!this.days.has(date)) this.days.set(date, d || null);
    return this.days.get(date);
  }

  /** 편집용: 없으면 새로 만든다 (저장은 touchDay 시점) */
  day(date) {
    let d = this.days.get(date);
    if (!d) {
      d = newDay(date);
      this.days.set(date, d);
    }
    return d;
  }

  schedule(path, get, delay = 700) {
    clearTimeout(this.timers.get(path));
    this.timers.set(
      path,
      setTimeout(() => {
        this.timers.delete(path);
        this.store.saveJSON(path, get());
      }, delay)
    );
  }

  touchDay(date) {
    this.dayList.add(date);
    this.schedule(dayPath(date), () => this.days.get(date));
    this.emit();
  }
  touchBlemishes() {
    this.schedule('blemishes.json', () => this.blemishes);
    this.emit();
  }
  touchSettings() {
    this.schedule('settings.json', () => this.settings);
    this.emit();
  }

  /** 예약된 저장을 즉시 실행 (앱이 백그라운드로 갈 때) */
  flushNow() {
    const jobs = [];
    for (const [path, t] of this.timers) {
      clearTimeout(t);
      this.timers.delete(path);
      if (path === 'settings.json') jobs.push(this.store.saveJSON(path, this.settings));
      else if (path === 'blemishes.json') jobs.push(this.store.saveJSON(path, this.blemishes));
      else jobs.push(this.store.saveJSON(path, this.days.get(path.slice(5, 15))));
    }
    return Promise.all(jobs);
  }

  /** date 이전에 해당 시간대 루틴이 기록된 가장 최근 날 */
  async previousRoutine(date, session) {
    const before = [...this.dayList].filter((d) => d < date).sort().reverse().slice(0, 21);
    for (const d of before) {
      const day = await this.loadDay(d);
      const s = day?.[session];
      if (s && (s.cleansing.length || Object.keys(s.skincare).length)) return { date: d, session: s };
    }
    return null;
  }

  products(cat) {
    return this.settings.products.filter((p) => !p.archived && (!cat || p.cat === cat));
  }
  spotProducts() {
    return this.settings.products.filter((p) => !p.archived && (p.cat === 'spot' || p.spot));
  }
}
