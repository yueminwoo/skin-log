// 구글 OAuth (리다이렉트 방식, 토큰은 1시간 유효).
// 홈 화면에 추가한 앱(iOS standalone)에서도 팝업 없이 동작하도록 리다이렉트를 씁니다.
import { GOOGLE_CLIENT_ID } from '../config.js';

const SCOPE = 'https://www.googleapis.com/auth/drive.file';
const TOKEN_KEY = 'skinlog.token';
const STATE_KEY = 'skinlog.oauthState';
const CLIENT_KEY = 'skinlog.clientId';
const SILENT_KEY = 'skinlog.silentAt';

export class AuthError extends Error {
  constructor(msg = '구글 연결이 만료됐어요') {
    super(msg);
    this.name = 'AuthError';
  }
}

export function getClientId() {
  return GOOGLE_CLIENT_ID || localStorage.getItem(CLIENT_KEY) || '';
}
export function setClientId(id) {
  localStorage.setItem(CLIENT_KEY, id.trim());
}

export function getToken() {
  try {
    const t = JSON.parse(localStorage.getItem(TOKEN_KEY));
    if (t && t.exp > Date.now() + 60_000) return t.token;
  } catch {}
  return null;
}
export function tokenExpiresIn() {
  try {
    const t = JSON.parse(localStorage.getItem(TOKEN_KEY));
    return t ? t.exp - Date.now() : 0;
  } catch {
    return 0;
  }
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function redirectUri() {
  return location.origin + location.pathname;
}

/** 구글에서 돌아왔을 때 URL #hash 처리. 결과 {ok} | {error} | null */
export function handleRedirect() {
  if (!location.hash || location.hash.length < 2) return null;
  const h = new URLSearchParams(location.hash.slice(1));
  if (!h.has('access_token') && !h.has('error')) return null;
  history.replaceState(null, '', location.pathname + location.search);
  const expected = localStorage.getItem(STATE_KEY);
  localStorage.removeItem(STATE_KEY);
  if (!expected || h.get('state') !== expected) return { error: 'state_mismatch' };
  if (h.get('error')) return { error: h.get('error') };
  const exp = Date.now() + Number(h.get('expires_in') || 3600) * 1000;
  localStorage.setItem(TOKEN_KEY, JSON.stringify({ token: h.get('access_token'), exp }));
  return { ok: true };
}

/** silent=true 이면 화면 없이 바로 돌아오기 시도 (이미 허용한 경우) */
export function signIn(silent = false) {
  const clientId = getClientId();
  if (!clientId) throw new Error('클라이언트 ID가 없어요');
  const state = Math.random().toString(36).slice(2) + Date.now().toString(36);
  localStorage.setItem(STATE_KEY, state);
  if (silent) localStorage.setItem(SILENT_KEY, String(Date.now()));
  const p = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri(),
    response_type: 'token',
    scope: SCOPE,
    include_granted_scopes: 'true',
    state,
  });
  if (silent) p.set('prompt', 'none');
  location.assign('https://accounts.google.com/o/oauth2/v2/auth?' + p.toString());
}

/** 최근 30초 안에 조용한 로그인을 시도했으면 true (무한 리다이렉트 방지) */
export function silentRecentlyTried() {
  return Date.now() - Number(localStorage.getItem(SILENT_KEY) || 0) < 30_000;
}
