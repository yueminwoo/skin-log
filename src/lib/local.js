// 데모 모드: 이 기기 브라우저(IndexedDB)에만 저장
import { idb } from './idb.js';

export class LocalBackend {
  constructor() {
    this.kind = 'local';
  }
  async init() {}
  folderUrl() {
    return null;
  }
  readJSON(path) {
    return idb.get('kv', 'file:' + path).then((v) => v ?? null);
  }
  writeJSON(path, obj) {
    return idb.set('kv', 'file:' + path, obj);
  }
  readPhoto(name) {
    return idb.get('kv', 'photo:' + name).then((v) => v ?? null);
  }
  writePhoto(name, blob) {
    return idb.set('kv', 'photo:' + name, blob);
  }
  async listDays() {
    const keys = await idb.keys('kv');
    return keys.filter((k) => typeof k === 'string' && k.startsWith('file:days/')).map((k) => k.slice(10, 20));
  }
}
