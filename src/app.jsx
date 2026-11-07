import { useEffect, useState, useRef, useContext } from 'preact/hooks';
import { AppCtx } from './ui.jsx';
import { Record } from './views/Record.jsx';
import { Blemishes } from './views/Blemishes.jsx';
import { Stats } from './views/Stats.jsx';
import { Settings, statusText } from './views/Settings.jsx';
import { Store } from './lib/store.js';
import { Hub } from './lib/hub.js';
import { DriveBackend } from './lib/drive.js';
import { LocalBackend } from './lib/local.js';
import { AuthError, handleRedirect, getToken, getClientId, setClientId, signIn, silentRecentlyTried, tokenExpiresIn, redirectUri } from './lib/auth.js';
import { GOOGLE_CLIENT_ID } from './config.js';
import { todayStr, defaultSession } from './lib/model.js';

const MODE_KEY = 'skinlog.mode';

export function App() {
  const [phase, setPhase] = useState('boot'); // boot | welcome | connect | loading | ready | error
  const [ctx, setCtx] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    boot();
  }, []);

  async function boot() {
    const r = handleRedirect();
    const mode = localStorage.getItem(MODE_KEY);
    if (!mode) return setPhase('welcome');
    if (mode === 'drive') {
      if (!getClientId()) return setPhase('welcome');
      if (!getToken()) {
        if (r?.error || silentRecentlyTried()) {
          setError(r?.error && !/interaction|login|consent|account/.test(r.error) ? r.error : null);
          return setPhase('connect');
        }
        return signIn(true);
      }
    }
    start(mode);
  }

  async function start(mode) {
    setPhase('loading');
    const store = new Store(mode === 'drive' ? new DriveBackend() : new LocalBackend());
    try {
      await store.init();
      const hub = new Hub(store);
      await hub.load();
      setCtx({ hub, store });
      setPhase('ready');
      store.flush();
    } catch (e) {
      console.error(e);
      if (e instanceof AuthError) return setPhase('connect');
      setError(e.message);
      setPhase('error');
    }
  }

  function chooseMode(mode) {
    if (!mode) {
      localStorage.removeItem(MODE_KEY);
      setCtx(null);
      return setPhase('welcome');
    }
    localStorage.setItem(MODE_KEY, mode);
    if (mode === 'drive') {
      if (!getClientId()) return setPhase('welcome');
      signIn(false);
    } else start('local');
  }

  if (phase === 'boot' || phase === 'loading') return <div class="splash">피부일지 여는 중…</div>;
  if (phase === 'welcome') return <Welcome onChoose={chooseMode} />;
  if (phase === 'connect')
    return (
      <div class="splash col">
        <h1>피부일지</h1>
        <p>구글 드라이브 연결이 필요해요.</p>
        {error && <p class="warn-text">오류: {error}</p>}
        <button type="button" class="btn primary big" onClick={() => signIn(false)}>구글 계정으로 연결</button>
        <button type="button" class="link-btn" onClick={() => chooseMode(null)}>처음 화면으로</button>
      </div>
    );
  if (phase === 'error')
    return (
      <div class="splash col">
        <h1>불러오기 실패</h1>
        <p class="warn-text">{error}</p>
        <button type="button" class="btn primary" onClick={() => location.reload()}>다시 시도</button>
        <button type="button" class="link-btn" onClick={() => chooseMode(null)}>처음 화면으로</button>
      </div>
    );
  return (
    <AppCtx.Provider value={ctx}>
      <Main onSwitchMode={chooseMode} />
    </AppCtx.Provider>
  );
}

function Welcome({ onChoose }) {
  const [cid, setCid] = useState(getClientId());
  return (
    <div class="welcome">
      <div class="welcome-card">
        <h1>피부일지</h1>
        <p>아침·저녁 사진과 클렌징·스킨케어·운동, 뾰루지 하나하나의 경과를 기록해요.</p>
        <h2>구글 드라이브에 저장 (추천)</h2>
        <p class="note">내 드라이브의 "피부일지" 폴더에 사진과 기록이 파일로 저장돼요. 폰과 컴퓨터에서 같이 쓸 수 있어요. 이 앱은 자기가 만든 파일 말고는 드라이브의 다른 파일을 볼 수 없어요.</p>
        {!GOOGLE_CLIENT_ID && (
          <label class="field">
            <span>OAuth 클라이언트 ID</span>
            <input class="input" value={cid} placeholder="xxxx.apps.googleusercontent.com" onInput={(e) => setCid(e.target.value)} />
            <small class="muted">승인된 리디렉션 URI: <code>{redirectUri()}</code></small>
          </label>
        )}
        <button type="button" class="btn primary big" disabled={!cid.trim()} onClick={() => {
          if (!GOOGLE_CLIENT_ID) setClientId(cid);
          onChoose('drive');
        }}>구글 드라이브 연결</button>
        <hr />
        <button type="button" class="btn ghost" onClick={() => onChoose('demo')}>데모로 먼저 써보기 (이 기기에만 저장)</button>
        <a class="link-btn center" href="./privacy.html">개인정보처리방침</a>
      </div>
    </div>
  );
}

const TABS = [
  { id: 'record', label: '기록', icon: '✍️' },
  { id: 'blemishes', label: '뾰루지', icon: '🔴' },
  { id: 'stats', label: '통계', icon: '📊' },
  { id: 'settings', label: '설정', icon: '⚙️' },
];

function Main({ onSwitchMode }) {
  const { hub, store } = useAppCtx();
  const [tab, setTab] = useState('record');
  const [date, setDate] = useState(todayStr());
  const [session, setSession] = useState(defaultSession());
  const [openId, setOpenId] = useState(null);
  const [status, setStatus] = useState(store.status);
  const lastToday = useRef(todayStr());
  const dateRef = useRef(date);
  dateRef.current = date;

  useEffect(() => store.on(setStatus), []);

  useEffect(() => {
    const onVis = async () => {
      if (document.visibilityState === 'hidden') {
        hub.flushNow();
        return;
      }
      // 자정이 지나 다시 열면 오늘/시간대로 이동
      if (todayStr() !== lastToday.current) {
        if (dateRef.current === lastToday.current) setDate(todayStr());
        lastToday.current = todayStr();
        setSession(defaultSession());
      }
      if (store.backend.kind === 'drive' && tokenExpiresIn() < 5 * 60_000) {
        await hub.flushNow();
        return signIn(true);
      }
      store.flush();
      hub.refresh([dateRef.current]).catch(() => {});
    };
    const retry = setInterval(() => ['error', 'offline'].includes(store.status) && store.flush(), 30_000);
    const online = () => store.flush();
    document.addEventListener('visibilitychange', onVis);
    addEventListener('pagehide', () => hub.flushNow());
    addEventListener('online', online);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      removeEventListener('online', online);
      clearInterval(retry);
    };
  }, []);

  return (
    <div class="app">
      <header class="topbar">
        <h1 class="brand">피부일지</h1>
        <nav class="tabs" aria-label="메뉴">
          {TABS.map((t) => (
            <button type="button" class={tab === t.id ? 'on' : ''} aria-current={tab === t.id ? 'page' : undefined} onClick={() => setTab(t.id)}>
              <span class="tab-icon">{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </nav>
        <span class={`sync ${status}`} title={statusText(status)}>
          {store.backend.kind === 'local' ? '데모 · ' : ''}
          {statusText(status)}
        </span>
      </header>
      {status === 'auth' && (
        <div class="banner">
          구글 연결이 만료됐어요. 작성한 내용은 기기에 보관 중이에요.
          <button type="button" class="btn sm primary" onClick={async () => (await hub.flushNow(), signIn(true))}>다시 연결</button>
        </div>
      )}
      <main class="content">
        {tab === 'record' && (
          <Record date={date} session={session} setDate={setDate} setSession={setSession} openBlemish={(id) => (setOpenId(id), setTab('blemishes'))} />
        )}
        {tab === 'blemishes' && <Blemishes openId={openId} setOpenId={setOpenId} />}
        {tab === 'stats' && <Stats />}
        {tab === 'settings' && <Settings onSwitchMode={onSwitchMode} />}
      </main>
    </div>
  );
}

function useAppCtx() {
  return useContext(AppCtx);
}
