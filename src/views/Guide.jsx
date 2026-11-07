import { useState } from 'preact/hooks';
import { Sheet } from '../ui.jsx';
import { state } from '../lib/model.js';

const MORPH_GUIDE = [
  ['open', '비염증', '모공이 열려 있고 끝이 검은 점. 안 아픔.'],
  ['closed', '비염증', '피부색·흰색의 작은 좁쌀. 구멍이 안 보이고 안 아픔.'],
  ['papule', '염증', '빨갛게 솟은 5mm 미만. 고름 머리 없음. 누르면 아픔.'],
  ['pustule', '염증', '구진 위에 흰색·노란색 고름 머리가 보임.'],
  ['nodule', '염증', '5mm 이상, 피부 깊숙이 단단하게 만져지고 아픔. 고름 머리 없음.'],
  ['cyst', '염증', '결절처럼 크고 깊은데 말랑하게 차 있는 느낌. 흉터 위험이 가장 큼.'],
];

const Dot = ({ id }) => <span class="stage-dot" style={{ background: state(id).color }} />;

export function GuideContent() {
  return (
    <div class="guide">
      <h3>모양 (진행 중)</h3>
      <p class="note">헷갈리면 <b>크기(5mm) → 고름 머리 → 깊이·단단함</b> 순서로 판단. 5mm ≈ 연필 뒤 지우개 크기.</p>
      <div class="table-wrap">
        <table class="log guide-table">
          <thead>
            <tr><th>이름</th><th>구분</th><th>이렇게 생기면</th></tr>
          </thead>
          <tbody>
            {MORPH_GUIDE.map(([id, g, desc]) => (
              <tr>
                <td><Dot id={id} />{state(id).label}</td>
                <td>{g}</td>
                <td class="wrap">{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p class="note">모양은 매 체크마다 바뀔 수 있어요 (예: 구진 → 농포). 결절·낭포는 압출하지 말고 피부과 권장.</p>

      <h3>회복 · 추적 종료</h3>
      <ul class="guide-list">
        <li><Dot id="healing" /><b>아무는 중</b> — 딱지가 앉았거나 가라앉는 중. 아직 볼록하거나 상처가 있음.</li>
        <li><Dot id="trace" /><b>흔적만 남음</b> — 평평해지고 자국만 남음 → <b>추적 종료</b>
          <ul>
            <li><b>붉은 자국</b> (염증후 홍반): 분홍·빨간 평평한 자국. 누르면 잠깐 하얘짐.</li>
            <li><b>갈색 자국</b> (염증후 색소침착): 갈색·거뭇한 평평한 자국. 눌러도 그대로.</li>
            <li><b>패인 흉터</b>: 피부가 움푹 들어감.</li>
            <li><b>볼록 흉터</b>: 단단하게 튀어나온 흉터.</li>
          </ul>
        </li>
        <li><Dot id="clear" /><b>깨끗이 사라짐</b> — 흔적 없이 사라짐 → <b>추적 종료</b></li>
      </ul>
      <p class="note">종료하면 매일 체크 목록에서 빠져요. 실수였다면 뾰루지 탭에서 상태를 바꾸면 다시 추적돼요.</p>

      <h3>크기</h3>
      <ul class="guide-list">
        <li><b>소</b> — 2mm 미만 (좁쌀)</li>
        <li><b>중</b> — 2~5mm</li>
        <li><b>대</b> — 5mm 이상</li>
      </ul>
      <p class="hint">스스로 기록하기 위한 기준이에요. 정확한 진단은 피부과에서 받으세요.</p>
    </div>
  );
}

export function HelpButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" class="help-btn" aria-label="구분 기준 보기" onClick={(e) => (e.stopPropagation(), setOpen(true))}>?</button>
      {open && (
        <Sheet title="뾰루지 구분 기준" onClose={() => setOpen(false)}>
          <GuideContent />
        </Sheet>
      )}
    </>
  );
}
