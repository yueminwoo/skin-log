// 백엔드(드라이브/로컬) 위에 얹는 계층:
//  - 모든 쓰기는 먼저 기기 안 outbox(IndexedDB)에 넣고 나중에 업로드 → 연결이 끊겨도 기록이 사라지지 않음
//  - 읽은 JSON/사진은 기기에 캐시 → 다음부터 빠르게
import { idb } from './idb.js';
import { AuthError } from './auth.js';

export class Store {
  constructor(backend) {
    this.backend = backend;
    this.urls = new Map();
    this.listeners = new Set();
    this.status = 'idle'; // idle | saving | saved | error | auth | offline
    this.flushing = false;
    this.again = false;
    this.pendingCount = 0;
  }

  on(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  setStatus(s, err) {
    this.status = s;
    this.lastError = err;
    for (const fn of this.listeners) fn(s);
  }

  init() {
    return this.backend.init();
  }

  async loadJSON(path) {
    const pending = await idb.get('outbox', 'j:' + path);
    if (pending) return structuredClone(pending.data);
    try {
      const obj = await this.backend.readJSON(path);
      if (obj) idb.set('kv', 'cache:' + path, obj).catch(() => {});
      return obj;
    } catch (e) {
      if (e instanceof AuthError) throw e;
      const cached = await idb.get('kv', 'cache:' + path);
      if (cached) return cached;
      throw e;
    }
  }

  async hasPending(path) {
    return !!(await idb.get('outbox', 'j:' + path));
  }

  async saveJSON(path, obj) {
    const data = structuredClone(obj);
    await idb.set('outbox', 'j:' + path, { kind: 'json', path, data, t: Date.now() + Math.random() });
    idb.set('kv', 'cache:' + path, data).catch(() => {});
    this.flush();
  }

  async listDays() {
    const keys = await idb.keys('outbox');
    const pending = keys.filter((k) => k.startsWith('j:days/')).map((k) => k.slice(7, 17));
    let remote = [];
    try {
      remote = await this.backend.listDays();
      idb.set('kv', 'cache:dayList', remote).catch(() => {});
    } catch (e) {
      if (e instanceof AuthError) throw e;
      remote = (await idb.get('kv', 'cache:dayList')) || [];
    }
    return [...new Set([...remote, ...pending])];
  }

  /** 사진 저장: name 예) 2026-11-07_AM_face.jpg, v = 버전(타임스탬프) */
  async savePhoto(name, v, blob) {
    await idb.set('photos', `${name}@${v}`, blob);
    await idb.set('outbox', 'p:' + name, { kind: 'photo', name, v, t: Date.now() + Math.random() });
    this.flush();
  }

  async getPhotoBlob(name, v) {
    const key = `${name}@${v}`;
    let blob = await idb.get('photos', key);
    if (blob) return blob;
    blob = await this.backend.readPhoto(name);
    if (blob) idb.set('photos', key, blob).catch(() => {});
    return blob;
  }

  async getPhotoURL(name, v) {
    const key = `${name}@${v}`;
    if (this.urls.has(key)) return this.urls.get(key);
    const p = this.getPhotoBlob(name, v).then((b) => (b ? URL.createObjectURL(b) : null));
    this.urls.set(key, p);
    p.then((u) => !u && this.urls.delete(key), () => this.urls.delete(key));
    return p;
  }

  async flush() {
    if (this.flushing) {
      this.again = true;
      return;
    }
    this.flushing = true;
    try {
      do {
        this.again = false;
        const keys = await idb.keys('outbox');
        this.pendingCount = keys.length;
        if (!keys.length) break;
        this.setStatus('saving');
        // 사진 먼저, JSON 나중
        keys.sort((a, b) => (a[0] === b[0] ? 0 : a[0] === 'p' ? -1 : 1));
        for (const key of keys) {
          const entry = await idb.get('outbox', key);
          if (!entry) continue;
          if (entry.kind === 'json') await this.backend.writeJSON(entry.path, entry.data);
          else {
            const blob = await idb.get('photos', `${entry.name}@${entry.v}`);
            if (blob) await this.backend.writePhoto(entry.name, blob);
          }
          const now = await idb.get('outbox', key);
          if (now && now.t === entry.t) await idb.del('outbox', key);
        }
      } while (this.again);
      this.pendingCount = 0;
      this.setStatus('saved');
    } catch (e) {
      console.error(e);
      if (e instanceof AuthError) this.setStatus('auth');
      else this.setStatus(navigator.onLine === false ? 'offline' : 'error', e);
    } finally {
      this.flushing = false;
    }
  }
}
