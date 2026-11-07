import { createContext } from 'preact';
import { createPortal } from 'preact/compat';
import { useContext, useEffect, useState, useReducer } from 'preact/hooks';

export const AppCtx = createContext(null);

/** hub가 바뀔 때마다 다시 그림 */
export function useApp() {
  const ctx = useContext(AppCtx);
  const [, force] = useReducer((x) => x + 1, 0);
  useEffect(() => ctx.hub.on(force), [ctx.hub]);
  return ctx;
}

export function Chip({ on, onClick, children, color, small, disabled, title }) {
  const style = on && color ? { background: color, borderColor: color, color: '#fff' } : undefined;
  return (
    <button type="button" class={`chip${on ? ' on' : ''}${small ? ' sm' : ''}`} style={style} onClick={onClick} disabled={disabled} title={title} aria-pressed={on ? 'true' : 'false'}>
      {children}
    </button>
  );
}

export function Row({ label, children }) {
  return (
    <div class="row">
      {label && <span class="row-label">{label}</span>}
      <div class="chips">{children}</div>
    </div>
  );
}

export function Section({ title, right, children, class: cls = '' }) {
  return (
    <section class={`card ${cls}`}>
      {(title || right) && (
        <header class="card-head">
          <h2>{title}</h2>
          {right}
        </header>
      )}
      {children}
    </section>
  );
}

export function Sheet({ title, onClose, children, wide, footer }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, []);
  useScrollLock();
  return createPortal(
    <div class="sheet-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div class={`sheet${wide ? ' wide' : ''}`} role="dialog" aria-label={title}>
        <header class="sheet-head">
          <h2>{title}</h2>
          <button type="button" class="icon-btn" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </header>
        <div class="sheet-body">{children}</div>
        {footer && <footer class="sheet-foot">{footer}</footer>}
      </div>
    </div>,
    document.body
  );
}

// 겹쳐 열린 창들이 모두 닫혀야 스크롤 잠금 해제
let locks = 0;
export function useScrollLock() {
  useEffect(() => {
    if (locks++ === 0) document.body.classList.add('noscroll');
    return () => {
      if (--locks === 0) document.body.classList.remove('noscroll');
    };
  }, []);
}

export function usePhotoURL(store, name, v) {
  const [url, setUrl] = useState(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    let alive = true;
    setUrl(null);
    setErr(false);
    if (!name || !v) return;
    store
      .getPhotoURL(name, v)
      .then((u) => alive && (u ? setUrl(u) : setErr(true)))
      .catch(() => alive && setErr(true));
    return () => (alive = false);
  }, [name, v]);
  return { url, err };
}

export function toggle(arr, v) {
  const i = arr.indexOf(v);
  if (i >= 0) arr.splice(i, 1);
  else arr.push(v);
  return arr;
}
