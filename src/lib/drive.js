// 구글 드라이브 백엔드. 내 드라이브의 "피부일지" 폴더 아래:
//   settings.json, blemishes.json, days/YYYY-MM-DD.json, photos/YYYY-MM-DD_AM_face.jpg
import { getToken, clearToken, AuthError } from './auth.js';
import { DRIVE_FOLDER } from '../config.js';

const API = 'https://www.googleapis.com/drive/v3';
const UP = 'https://www.googleapis.com/upload/drive/v3';
const FOLDER_MIME = 'application/vnd.google-apps.folder';
const FOLDERS_KEY = 'skinlog.driveFolders';
const IDS_KEY = 'skinlog.driveIds';

class NotFound extends Error {}

async function req(url, opts = {}) {
  const token = getToken();
  if (!token) throw new AuthError();
  const r = await fetch(url, { ...opts, headers: { ...(opts.headers || {}), Authorization: 'Bearer ' + token } });
  if (r.status === 401) {
    clearToken();
    throw new AuthError();
  }
  if (r.status === 404) throw new NotFound(url);
  if (!r.ok) throw new Error(`Drive ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r;
}

const esc = (s) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

function multipart(meta, data, mime) {
  const b = 'skinlog' + Math.random().toString(36).slice(2);
  const body = new Blob([
    `--${b}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${b}\r\nContent-Type: ${mime}\r\n\r\n`,
    data,
    `\r\n--${b}--`,
  ]);
  return { body, type: `multipart/related; boundary=${b}` };
}

export class DriveBackend {
  constructor() {
    this.kind = 'drive';
    this.folders = null;
    try {
      this.ids = JSON.parse(localStorage.getItem(IDS_KEY)) || {};
    } catch {
      this.ids = {};
    }
  }

  saveIds() {
    localStorage.setItem(IDS_KEY, JSON.stringify(this.ids));
  }

  async query(q, fields = 'files(id,name)') {
    const out = [];
    let pageToken = '';
    do {
      const p = new URLSearchParams({ q, fields: 'nextPageToken,' + fields, pageSize: '1000', orderBy: 'createdTime', spaces: 'drive' });
      if (pageToken) p.set('pageToken', pageToken);
      const j = await (await req(`${API}/files?${p}`)).json();
      out.push(...j.files);
      pageToken = j.nextPageToken || '';
    } while (pageToken);
    return out;
  }

  async createFolder(name, parent) {
    const meta = { name, mimeType: FOLDER_MIME, ...(parent ? { parents: [parent] } : {}) };
    const r = await req(`${API}/files?fields=id`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(meta),
    });
    return (await r.json()).id;
  }

  async init() {
    try {
      const cached = JSON.parse(localStorage.getItem(FOLDERS_KEY));
      if (cached?.root) {
        const f = await (await req(`${API}/files/${cached.root}?fields=id,trashed`)).json();
        if (!f.trashed) {
          this.folders = cached;
          return;
        }
      }
    } catch (e) {
      if (e instanceof AuthError) throw e;
    }
    this.ids = {};
    this.saveIds();
    const roots = await this.query(`name='${esc(DRIVE_FOLDER)}' and mimeType='${FOLDER_MIME}' and trashed=false`);
    const root = roots[0]?.id || (await this.createFolder(DRIVE_FOLDER));
    const sub = async (name) => {
      const found = await this.query(`name='${name}' and '${root}' in parents and mimeType='${FOLDER_MIME}' and trashed=false`);
      return found[0]?.id || (await this.createFolder(name, root));
    };
    this.folders = { root, days: await sub('days'), photos: await sub('photos') };
    localStorage.setItem(FOLDERS_KEY, JSON.stringify(this.folders));
  }

  folderUrl() {
    return this.folders ? `https://drive.google.com/drive/folders/${this.folders.root}` : null;
  }

  locate(path) {
    if (path.startsWith('days/')) return { parent: this.folders.days, name: path.slice(5) };
    if (path.startsWith('photos/')) return { parent: this.folders.photos, name: path.slice(7) };
    return { parent: this.folders.root, name: path };
  }

  async fileId(path) {
    if (this.ids[path]) return this.ids[path];
    const { parent, name } = this.locate(path);
    const found = await this.query(`name='${esc(name)}' and '${parent}' in parents and trashed=false`);
    if (!found.length) return null;
    this.ids[path] = found[found.length - 1].id;
    this.saveIds();
    return this.ids[path];
  }

  async download(path) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const id = await this.fileId(path);
      if (!id) return null;
      try {
        return await req(`${API}/files/${id}?alt=media`);
      } catch (e) {
        if (!(e instanceof NotFound)) throw e;
        delete this.ids[path];
        this.saveIds();
      }
    }
    return null;
  }

  async upload(path, data, mime) {
    let id = await this.fileId(path);
    if (id) {
      try {
        await req(`${UP}/files/${id}?uploadType=media`, { method: 'PATCH', headers: { 'Content-Type': mime }, body: data });
        return;
      } catch (e) {
        if (!(e instanceof NotFound)) throw e;
        delete this.ids[path];
      }
    }
    const { parent, name } = this.locate(path);
    const m = multipart({ name, parents: [parent], mimeType: mime }, data, mime);
    const r = await req(`${UP}/files?uploadType=multipart&fields=id`, { method: 'POST', headers: { 'Content-Type': m.type }, body: m.body });
    this.ids[path] = (await r.json()).id;
    this.saveIds();
  }

  async readJSON(path) {
    const r = await this.download(path);
    return r ? r.json() : null;
  }
  writeJSON(path, obj) {
    return this.upload(path, JSON.stringify(obj), 'application/json');
  }
  async readPhoto(name) {
    const r = await this.download('photos/' + name);
    return r ? r.blob() : null;
  }
  writePhoto(name, blob) {
    return this.upload('photos/' + name, blob, 'image/jpeg');
  }

  async listDays() {
    const files = await this.query(`'${this.folders.days}' in parents and trashed=false`);
    const days = [];
    for (const f of files) {
      if (!/^\d{4}-\d{2}-\d{2}\.json$/.test(f.name)) continue;
      this.ids['days/' + f.name] = f.id;
      days.push(f.name.slice(0, 10));
    }
    this.saveIds();
    return days;
  }
}
