import { useState } from 'preact/hooks';
import { useApp, Chip, Section } from '../ui.jsx';
import { PRODUCT_CATS, uid } from '../lib/model.js';

export function Settings({ onSwitchMode }) {
  const { hub, store } = useApp();
  const s = hub.settings;
  const [newName, setNewName] = useState('');
  const [newCat, setNewCat] = useState('skincare');
  const [newEx, setNewEx] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const touch = () => hub.touchSettings();
  const folder = store.backend.folderUrl();

  return (
    <div class="page settings">
      <Section title="제품">
        <p class="note">
          <b>부위 기본값</b>: "얼굴 전체"면 켤 때 얼굴 5부위가 자동 선택되고, "직접 선택"이면 매번 고르게 돼요. 그 다음부터는 같은 시간대에 마지막으로 바른 부위가 먼저 선택돼요.
        </p>
        {PRODUCT_CATS.map((cat) => {
          const list = s.products.filter((p) => p.cat === cat.id && (showArchived || !p.archived));
          return (
            <div class="prod-group">
              <h3 class="sub">{cat.label}</h3>
              {!list.length && <p class="hint">없음</p>}
              {list.map((p) => (
                <div class={`prod-row${p.archived ? ' archived' : ''}`}>
                  <input class="input" value={p.name} aria-label="제품 이름" onChange={(e) => ((p.name = e.target.value.trim() || p.name), touch())} />
                  <select class="input" value={p.cat} aria-label="분류" onChange={(e) => ((p.cat = e.target.value), touch())}>
                    {PRODUCT_CATS.map((c) => <option value={c.id}>{c.label}</option>)}
                  </select>
                  {p.cat !== 'cleanser' && (
                    <select class="input" value={p.zones} aria-label="부위 기본값" onChange={(e) => ((p.zones = e.target.value), touch())}>
                      <option value="all">얼굴 전체</option>
                      <option value="pick">직접 선택</option>
                    </select>
                  )}
                  {p.cat === 'skincare' && (
                    <Chip small on={p.spot} onClick={() => ((p.spot = !p.spot), touch())} title="뾰루지 처치 목록에도 표시">스팟으로도 사용</Chip>
                  )}
                  <button type="button" class="btn sm ghost" onClick={() => ((p.archived = !p.archived), touch())}>
                    {p.archived ? '다시 사용' : '숨기기'}
                  </button>
                </div>
              ))}
            </div>
          );
        })}
        <form class="prod-add" onSubmit={(e) => {
          e.preventDefault();
          const n = newName.trim();
          if (!n) return;
          s.products.push({ id: uid(), name: n, cat: newCat, zones: 'all', spot: false, archived: false });
          setNewName('');
          touch();
        }}>
          <input class="input" placeholder="새 제품 이름" value={newName} onInput={(e) => setNewName(e.target.value)} />
          <select class="input" value={newCat} onChange={(e) => setNewCat(e.target.value)}>
            {PRODUCT_CATS.map((c) => <option value={c.id}>{c.label}</option>)}
          </select>
          <button class="btn primary" type="submit">추가</button>
        </form>
        <label class="check">
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} /> 숨긴 제품도 보기
        </label>
        <p class="hint">제품을 지우면 과거 기록이 깨지니까 "숨기기"만 지원해요.</p>
      </Section>

      <Section title="운동 종류">
        <div class="chips">
          {s.exerciseTypes.map((t) => (
            <Chip onClick={() => {
              if (confirm(`"${t}"를 목록에서 뺄까요? (과거 기록은 그대로)`)) {
                s.exerciseTypes = s.exerciseTypes.filter((x) => x !== t);
                touch();
              }
            }}>{t} ✕</Chip>
          ))}
        </div>
        <form class="prod-add" onSubmit={(e) => {
          e.preventDefault();
          const n = newEx.trim();
          if (n && !s.exerciseTypes.includes(n)) s.exerciseTypes.push(n);
          setNewEx('');
          touch();
        }}>
          <input class="input" placeholder="운동 이름" value={newEx} onInput={(e) => setNewEx(e.target.value)} />
          <button class="btn primary" type="submit">추가</button>
        </form>
      </Section>

      <Section title="저장 위치">
        {store.backend.kind === 'drive' ? (
          <>
            <p>구글 드라이브 <b>"피부일지"</b> 폴더에 저장 중이에요.</p>
            <ul class="files">
              <li><code>photos/</code> 사진 (예: 2026-11-07_AM_face.jpg)</li>
              <li><code>days/</code> 날짜별 루틴·운동·메모 (JSON)</li>
              <li><code>blemishes.json</code> 뾰루지 기록 · <code>settings.json</code> 제품 목록</li>
            </ul>
            {folder && <a class="btn" href={folder} target="_blank" rel="noopener">드라이브에서 폴더 열기 ↗</a>}
          </>
        ) : (
          <>
            <p><b>데모 모드</b>: 이 브라우저에만 저장되고 다른 기기와 동기화되지 않아요. 브라우저 데이터를 지우면 사라져요.</p>
            <button type="button" class="btn primary" onClick={() => onSwitchMode('drive')}>구글 드라이브로 전환</button>
          </>
        )}
        <p class="hint">
          업로드 대기 중: {store.pendingCount}건 · 상태: {statusText(store.status)}
        </p>
        <button type="button" class="btn ghost sm" onClick={() => onSwitchMode(null)}>처음 화면으로 (저장 방식 다시 고르기)</button>
      </Section>
    </div>
  );
}

export function statusText(s) {
  return { idle: '대기', saving: '저장 중…', saved: '저장됨', error: '저장 실패 (자동 재시도)', auth: '구글 연결 만료', offline: '오프라인 (나중에 업로드)' }[s] || s;
}
