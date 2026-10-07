function toggleAnswer(btn){const panel=btn.nextElementSibling;panel.classList.toggle('open');btn.textContent=panel.classList.contains('open')?'정답·해설 접기':'정답·해설';}function toggleEvidence(btn){const panel=btn.nextElementSibling;panel.classList.toggle('open');btn.textContent=panel.classList.contains('open')?btn.dataset.close:btn.dataset.open;}function collapseEvidence(btn){const panel=btn.closest('.evidence-panel');if(!panel)return;panel.classList.remove('open');const tg=panel.previousElementSibling;if(tg&&tg.classList.contains('evidence-toggle')){tg.textContent=tg.dataset.open;tg.scrollIntoView({block:'center',behavior:'smooth'});}}function showAll(){document.querySelectorAll('.answer-panel,.evidence-panel').forEach(e=>e.classList.add('open'));document.querySelectorAll('.toggle-answer').forEach(b=>b.textContent='정답·해설 접기');document.querySelectorAll('.evidence-toggle').forEach(b=>b.textContent=b.dataset.close);}function hideAll(){document.querySelectorAll('.answer-panel,.evidence-panel').forEach(e=>e.classList.remove('open'));document.querySelectorAll('.toggle-answer').forEach(b=>b.textContent='정답·해설');document.querySelectorAll('.evidence-toggle').forEach(b=>b.textContent=b.dataset.open);window.scrollTo({top:0,behavior:'smooth'});}function toggleAll(btn){var p=document.querySelectorAll('.answer-panel');var o=document.querySelectorAll('.answer-panel.open').length;if(o<p.length){showAll();btn.textContent='정답·해설 모두 접기';}else{hideAll();btn.textContent='정답·해설 모두 펼치기';}}

/* 테마 적용은 assets/theme.js 한 파일에서 관리한다. */

(function(){
  // 이 페이지의 이름(h1·탭 제목)은 자기 자신의 <meta name="page-title">에서만 읽는다 (단일 출처)
  var m = document.querySelector('meta[name="page-title"]');
  var pageName = m ? (m.getAttribute('content')||'').trim() : '';
  if (pageName){
    document.title = pageName;
    var h = document.querySelector('.hero h1') || document.querySelector('h1');
    if (h) h.textContent = pageName;
  }
  // 상단/하단 '돌아가기' 띠의 사이트 제목은 더 이상 여기서 채우지 않는다.
  // 그 문구는 pages.js의 암호화된 SITE_ENC 안에 있고,
  // 잠금 해제 후 unlock.js가 복호화해서 채운다.
})();

/* ============================================================
   문항 분류 필터

   - 문항 카드마다 분류를 하나 적는다:
       <section class="q-card" data-cat="…" id="q1"> ...
     (data-cat 값 = 분류 이름. 이름 목록은 아래 QCAT_ENC 안에 있다)
   - 우상단 버튼(.oracle-fab)을 누르면 체크박스 패널이 열리고,
     체크된 분류의 문항만 보인다. 순서는 문서에 적힌 순서 그대로.
   - 문항이 없는 분류는 체크박스가 흐려지고 비활성화되며,
     패널 아래에 '추후 추가 예정' 안내가 뜬다. (QCAT.zeroTip/zeroNote)
   - 문항이 하나도 없는 강의는 안내 카드가 자동으로 표시된다.
     (QCAT.emptyPage — 예전 npNONE.html 템플릿의 역할을 대신한다)
   - 체크 상태는 강의(파일 번호)별로 localStorage에 따로 저장된다.
     이때 분류 '이름'이 아니라 order에서의 '순번'으로 저장한다 —
     이름이 기기(localStorage)에 평문으로 남지 않게 하기 위해서다.
   - 옛 파일 호환 (이미 암호화해 올린 페이지는 손대지 않아도 된다):
       · data-cat 없음 + 선지(ol.choices) 있음  → 첫 분류로 취급
       · class="q-card oracle" (옛 예측, 기본 숨김) → 마지막 분류로 취급
       · 선지도 data-cat도 없는 안내 카드        → 필터하지 않음(항상 표시)

   ▣ 분류 이름을 저장소에 남기지 않기
     분류 이름(= data-cat 값)과 기본 체크 목록은 아래 QCAT_ENC 한 조각에만
     있다. pages.js의 *_ENC와 똑같은 형식이므로, 마커 사이의 JSON을
     같은 비밀번호로 암호화해 그 자리에 붙여 넣으면 이 파일에는 이름이
     평문으로 남지 않는다.
        python tools/encrypt_fragment.py qcat.json --password <비밀번호>
     아직 암호화하지 않은 평문 JSON(개발용)도 그대로 읽힌다.
     카드 오른쪽 위 표식의 분류별 색은 question_set.css가 이름 대신
     순번(.cat-1 ~ .cat-4)으로 정하므로 CSS에도 이름이 없다.
   ============================================================ */

window.QCAT_ENC =
/* [ENCRYPT_START] */

{
"order":     ["족보", "변형족", "강조", "변칙"],
"defaultOn": ["족보", "변형족", "강조"]
}

/* [ENCRYPT_END] */
;

var QCAT = {
  order:        null,             // QCAT_ENC에서 채워진다 (잠금 해제 후 복호화)
  defaultOn:    null,             // QCAT_ENC에서 채워진다
  fabLabel:     '골라 보기',                        // 우상단 버튼 라벨
  storeKey:     'sok-qcat-v2',    // v2: 체크 상태를 이름 대신 순번으로 저장 (v1 기록은 무시된다)

  // 이 페이지에 문항이 하나도 없는 분류는 체크박스가 흐려지고 비활성화된다.
  zeroTip:      '이 강의에는 아직 등록되지 않은 분류입니다',       // 흐린 항목에 마우스를 올리면 뜨는 설명
  zeroNote:     '흐린 분류는 아직 등록된 문항이 없습니다. 추후 추가될 예정입니다.', // 패널 아래 안내 한 줄

  // 문항이 하나도 없는 강의에서 자동으로 표시되는 안내 카드 문구
  // (npNONE.html이 하던 일을 이제 모든 페이지가 스스로 한다)
  emptyPage: {
    num:  '문항 없음',
    stem: '이 강의에는 아직 등록된 문항이 없습니다.',
    note: '문항은 추후 추가될 예정입니다.',
    back: '목차로 돌아가기'
  }
};

/* 옛 페이로드 호환: 예전 버튼의 onclick="toggleOracle(this)"가 남아 있어도
   분류 패널이 열리게 한다. (보통은 아래 sync가 onclick을 새로 달아 이 함수는 안 불린다) */
function toggleOracle(){ if (window.__sokCatToggle) window.__sokCatToggle(); }

(function () {
  var dc = document.getElementById('decryptedContent');
  if (!dc) return;

  var panel = null;

  /* ── 분류 비밀 조각(QCAT_ENC) 읽기 ────────────────────────
     - 세션당 1회만 복호화한다. 평문 JSON(개발용)은 그대로 쓴다.
     - 복호화는 됐는데 JSON이 깨진 경우(쉼표 누락 등)를 조용히 삼키지 않는다. */
  var _qcatPromise = null;
  function loadQcatSecret(){
    if (!_qcatPromise) {
      _qcatPromise = (async function () {
        var raw = window.QCAT_ENC;
        if (!raw || typeof raw !== 'object') return null;
        if (typeof raw.data !== 'string') return raw;   // 아직 암호화하지 않은 평문 JSON
        if (!window.SOK_LOCK || !window.SOK_LOCK.decryptStoredPayload) return null;
        var txt = await window.SOK_LOCK.decryptStoredPayload(raw);
        try { return JSON.parse(txt); }
        catch (e) {
          console.warn('[SOK] QCAT_ENC 복호화는 성공했지만 JSON 파싱에 실패했습니다. 복호화된 평문:\n', txt);
          throw e;
        }
      })();
      // 실패(비밀번호 불일치 등)는 캐시에 남기지 않아 다음 sync에서 다시 시도한다.
      _qcatPromise.catch(function () { _qcatPromise = null; });
    }
    return _qcatPromise;
  }

  // QCAT.order / QCAT.defaultOn을 채운다. 성공하면 true.
  async function resolveQcat(){
    if (QCAT.order) return true;
    var s = null;
    try { s = await loadQcatSecret(); } catch (e) { s = null; }
    if (!s || !Array.isArray(s.order) || !s.order.length) return false;
    QCAT.order = s.order.map(function (c) { return String(c).trim(); });
    QCAT.defaultOn = Array.isArray(s.defaultOn)
      ? s.defaultOn.map(function (c) { return String(c).trim(); })
          .filter(function (c) { return QCAT.order.indexOf(c) !== -1; })
      : QCAT.order.slice();
    return true;
  }

  // 저장 키 = 파일명 npNNNN.html의 번호 (번호를 못 읽으면 파일명)
  function pageKey(){
    var prefix = window.FILE_PREFIX || 'np';
    var f = (location.pathname.split('/').pop() || '');
    var m = f.match(new RegExp('^' + prefix + '0*(\\d+)', 'i'));
    return m ? m[1] : (f || 'page');
  }

  function readAllStates(){
    try { return JSON.parse(localStorage.getItem(QCAT.storeKey) || '{}') || {}; }
    catch (e) { return {}; }
  }
  /* 체크 상태는 분류 '순번'(order에서의 위치, 0부터)으로 저장한다.
     이름을 localStorage에 남기지 않기 위해서다. 읽을 때 이름으로 되돌린다.
     순번이 order 범위를 벗어나면(분류를 줄인 경우 등) 그냥 걸러진다. */
  function readState(){
    var all = readAllStates();
    var raw = all[pageKey()];
    if (!Array.isArray(raw)) return QCAT.defaultOn.slice();
    return raw.map(function (i) { return QCAT.order[i]; })
              .filter(function (c) { return !!c; });
  }
  function writeState(on){
    try {
      var all = readAllStates();
      all[pageKey()] = on.map(function (c) { return QCAT.order.indexOf(c); })
                         .filter(function (i) { return i !== -1; });
      localStorage.setItem(QCAT.storeKey, JSON.stringify(all));
    } catch (e) {}
  }

  // 필터 대상 카드를 모으면서, 옛 표기에는 data-cat을 채워 넣는다
  function collectCards(){
    var out = [];
    var cards = dc.querySelectorAll('.q-card');
    for (var i = 0; i < cards.length; i++){
      var el = cards[i];
      if (el.classList.contains('cat-empty')) continue;     // 필터 결과가 비었을 때의 안내 카드
      if (el.classList.contains('no-questions')) continue;  // 문항이 없는 강의의 자동 안내 카드
      var cat = el.getAttribute('data-cat');
      if (!cat) {
        if (el.classList.contains('oracle')) cat = QCAT.order[QCAT.order.length - 1]; // 옛 예측(기본 숨김) → 마지막 분류
        else if (el.querySelector('ol.choices')) cat = QCAT.order[0];                 // 선지만 있는 옛 카드 → 첫 분류
        else continue;                                    // 선지 없는 안내 카드 → 항상 표시
        el.setAttribute('data-cat', cat);
      }
      el.classList.remove('oracle');                      // 옛 display:none 규칙에서 해방
      var idx = QCAT.order.indexOf(cat);
      if (idx === -1) {
        console.warn('[분류 필터] QCAT_ENC의 order에 없는 분류입니다. 이 카드는 필터하지 않고 항상 표시합니다:', cat, el);
        continue;
      }
      // 표식 색은 question_set.css가 이름 대신 이 순번 클래스(.cat-N)로 정한다
      el.classList.add('cat-' + (idx + 1));
      out.push(el);
    }
    return out;
  }

  /* 문항이 하나도 없는 강의에서 보여줄 안내 카드.
     예전에는 npNONE.html이라는 별도 템플릿이 이 카드를 손으로 담고
     있었지만, 이제 문항 카드가 0개면 여기서 자동으로 만들어 준다.
     (옛 npNONE 기반 페이지처럼 페이로드에 직접 적어 둔 안내 카드가
      이미 있으면 — 선지도 data-cat도 없는 q-card — 중복 생성하지 않는다) */
  function ensureNoQuestionsCard(hasCards){
    var mine = dc.querySelector('.q-card.no-questions');
    if (hasCards) { if (mine) mine.remove(); return; }
    if (mine) return;
    // 작성자가 손으로 넣어 둔 안내 카드(항상 표시되는 카드)가 있으면 그걸 존중한다.
    if (dc.querySelector('.q-card:not(.cat-empty)')) return;
    var t = QCAT.emptyPage || {};
    var card = document.createElement('section');
    card.className = 'q-card no-questions';
    card.innerHTML =
      '<div class="q-num"></div>' +
      '<p class="stem"></p>' +
      '<p class="note"></p>' +
      '<a class="backpill" href="index.html" style="margin-top:12px;display:inline-flex;box-shadow:none;"></a>';
    card.querySelector('.q-num').textContent = t.num  || '문항 없음';
    card.querySelector('.stem').textContent  = t.stem || '이 강의에는 아직 등록된 문항이 없습니다.';
    card.querySelector('.note').textContent  = t.note || '문항은 추후 추가될 예정입니다.';
    card.querySelector('.backpill').textContent = t.back || '목차로 돌아가기';
    dc.appendChild(card);
  }

  // 전부 숨겨졌을 때 보여줄 안내 카드 (한 번만 만들어 두고 hidden으로 껐다 켠다)
  function ensureEmptyCard(){
    var empty = dc.querySelector('.cat-empty');
    if (!empty) {
      empty = document.createElement('section');
      empty.className = 'q-card cat-empty';
      empty.hidden = true;
      empty.innerHTML =
        '<div class="q-num">묵묵부답</div>' +
        '<p class="stem">선택한 분류에 해당하는 문항이 없습니다.</p>' +
        '<p class="note">우상단 「' + QCAT.fabLabel + '」에서 분류를 골라 주세요.</p>';
      dc.appendChild(empty);
    }
    return empty;
  }

  function applyFilter(cards, on){
    var visible = 0;
    for (var i = 0; i < cards.length; i++){
      var show = on.indexOf(cards[i].getAttribute('data-cat')) !== -1;
      cards[i].classList.toggle('cat-hidden', !show);
      if (show) visible++;
    }
    ensureEmptyCard().hidden = !(cards.length && !visible);
  }

  function setOpen(open){
    if (!panel) return;
    panel.hidden = !open;
    var fab = document.querySelector('.oracle-fab');
    if (fab) fab.setAttribute('aria-expanded', String(!!open));
  }
  window.__sokCatToggle = function(){ if (panel) setOpen(panel.hidden); };

  function buildPanel(cards){
    if (panel) panel.remove();
    panel = document.createElement('div');
    panel.className = 'cat-panel';
    panel.hidden = true;
    panel.setAttribute('role', 'group');
    panel.setAttribute('aria-label', '표시할 문항 분류');

    var counts = {};
    for (var i = 0; i < cards.length; i++){
      var c = cards[i].getAttribute('data-cat');
      counts[c] = (counts[c] || 0) + 1;
    }

    var head = document.createElement('div');
    head.className = 'cat-head';
    head.textContent = '표시할 분류';
    panel.appendChild(head);

    var on = readState();

    function onChange(){
      var picked = [];
      var boxes = panel.querySelectorAll('input');
      for (var i = 0; i < boxes.length; i++) if (boxes[i].checked) picked.push(boxes[i].value);
      writeState(picked);
      applyFilter(cards, picked);
    }

    var hasZero = false;
    QCAT.order.forEach(function (cat) {
      var n = counts[cat] || 0;
      var lab = document.createElement('label');
      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = cat;
      if (!n) {
        // 이 페이지에 문항이 없는 분류: 흐리게 + 비활성화.
        // 체크해 봐야 보여줄 게 없으므로 체크 자체를 막는다.
        hasZero = true;
        lab.className = 'is-zero';
        lab.title = QCAT.zeroTip || '';
        cb.checked = false;
        cb.disabled = true;
      } else {
        cb.checked = on.indexOf(cat) !== -1;
        cb.addEventListener('change', onChange);
      }
      var cnt = document.createElement('span');
      cnt.className = 'cat-cnt';
      cnt.textContent = n;
      lab.appendChild(cb);
      lab.appendChild(document.createTextNode(cat));
      lab.appendChild(cnt);
      panel.appendChild(lab);
    });

    // 흐려진 분류가 하나라도 있으면 그 이유를 패널 아래에 한 줄로 알려 준다.
    if (hasZero && QCAT.zeroNote) {
      var foot = document.createElement('p');
      foot.className = 'cat-note';
      foot.textContent = QCAT.zeroNote;
      panel.appendChild(foot);
    }

    document.body.appendChild(panel);
  }

  // sync는 이제 비동기(분류 이름 복호화 대기)라, 겹쳐 불리면 한 번으로 합친다.
  var _syncBusy = false, _syncAgain = false;
  async function sync(){
    if (_syncBusy) { _syncAgain = true; return; }
    _syncBusy = true;
    try { await syncNow(); }
    finally {
      _syncBusy = false;
      if (_syncAgain) { _syncAgain = false; sync(); }
    }
  }

  async function syncNow(){
    var fab = document.querySelector('.oracle-fab');
    var toolbar = dc.querySelector('.toolbar');

    document.body.classList.remove('oracle-on');          // 옛 토글 상태 정리

    // 분류 이름은 암호화돼 있으므로 먼저 읽는다. (세션당 1회 복호화)
    if (!(await resolveQcat())) {
      // QCAT_ENC를 못 읽으면(조각 누락·다른 비밀번호로 암호화 등) 필터 없이 전부 표시한다.
      console.warn('[SOK] QCAT_ENC를 읽지 못했습니다. 분류 필터 없이 모든 문항을 표시합니다.');
      var olds = dc.querySelectorAll('.q-card.oracle');
      for (var i = 0; i < olds.length; i++) olds[i].classList.remove('oracle');
      var hasAny = !!dc.querySelector('.q-card:not(.cat-empty):not(.no-questions)');
      ensureNoQuestionsCard(hasAny);
      if (fab) fab.style.display = 'none';
      if (toolbar) toolbar.style.display = hasAny ? '' : 'none';
      if (panel) { panel.remove(); panel = null; }
      return;
    }

    var cards = collectCards();
    ensureNoQuestionsCard(cards.length > 0);              // 문항 0개면 안내 카드 자동 표시

    if (!cards.length) {                                  // 문항이 없으면 버튼들도 의미가 없다
      if (fab) fab.style.display = 'none';
      if (toolbar) toolbar.style.display = 'none';
      if (panel) { panel.remove(); panel = null; }
      return;
    }

    if (toolbar) toolbar.style.display = '';
    if (!fab) {                                           // 버튼이 없는 페이로드면 필터 없이 전부 표시
      applyFilter(cards, QCAT.order.slice());
      return;
    }
    fab.style.display = '';
    fab.textContent = QCAT.fabLabel;
    fab.removeAttribute('data-on');
    fab.removeAttribute('data-off');
    fab.removeAttribute('aria-pressed');
    fab.setAttribute('aria-haspopup', 'true');
    fab.setAttribute('aria-expanded', 'false');
    fab.onclick = function(){ if (panel) setOpen(panel.hidden); };  // 옛 onclick(toggleOracle) 덮어쓰기

    ensureEmptyCard();
    buildPanel(cards);
    applyFilter(cards, readState());
  }

  // 패널 바깥을 누르거나 Esc를 누르면 닫는다
  document.addEventListener('click', function (e) {
    if (!panel || panel.hidden) return;
    var fab = document.querySelector('.oracle-fab');
    if (panel.contains(e.target) || (fab && fab.contains(e.target))) return;
    setOpen(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') setOpen(false);
  });

  // 잠금 해제로 문항이 주입되는 시점을 감지 (기존 방식 그대로 MutationObserver)
  // 버튼 유무와 무관하게, 내용이 보이면 sync한다 — 문항이 0개인 강의도 안내 카드를 받아야 하므로.
  if (!dc.hidden && dc.childNodes.length) sync();
  new MutationObserver(function(){
    if (!dc.hidden && dc.childNodes.length) sync();
  }).observe(dc, {childList:true, attributes:true, attributeFilter:['hidden']});
})();

/* ============================================================
   하단 이전/다음 내비게이션 (#pagerNav)
   - 강의 목록·제목·순서를 전부 pages.js의 TOC_ENC 한 곳에서 읽는다.
     (예전처럼 이웃 파일을 내려받아 제목을 뽑는 일이 없다 → 별도 캐시도 불필요)
   - 잠금 상태이거나 TOC_ENC에 없는 번호의 페이지에서는 표시하지 않는다.
   - 맨 앞/맨 뒤면 화살표와 함께 '처음/마지막'을 정중히 안내한다.
   ============================================================ */
(function () {
  var nav = document.getElementById('pagerNav');
  if (!nav) return;
  nav.style.display = 'none';   // 그릴 수 있을 때만 다시 켠다

  // 파일명 접두어 — pages.js의 window.FILE_PREFIX 한 곳에서 관리한다.
  var FILE_PREFIX = window.FILE_PREFIX || 'n';

  function pad4(n){ n = String(n); while (n.length < 4) n = '0' + n; return n; }
  function fileOf(num){ return FILE_PREFIX + pad4(num) + '.html'; }
  function esc(s){ return String(s).replace(/[&<>]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c]; }); }

  // 현재 페이지 번호 = 파일명 npNNNN.html 에서 추출
  var fname = (location.pathname.split('/').pop() || '');
  var mnum = fname.match(new RegExp('^' + FILE_PREFIX + '0*(\\d+)(?:\\.html?)?$', 'i'));
  var current = mnum ? parseInt(mnum[1], 10) : NaN;
  if (isNaN(current)) return;

  function titleSpan(name){ return name ? '<span class="pager-title">' + esc(name) + '</span>' : ''; }

  function linkHTML(side, num, name){
    var href = fileOf(num);
    if (side === 'prev'){
      return '<a class="pager prev" href="' + href + '">' +
               '<span class="pager-arrow">←</span>' +
               '<span class="pager-text"><span class="pager-kicker">이전</span>' + titleSpan(name) + '</span>' +
             '</a>';
    }
    return '<a class="pager next" href="' + href + '">' +
             '<span class="pager-text"><span class="pager-kicker">다음</span>' + titleSpan(name) + '</span>' +
             '<span class="pager-arrow">→</span>' +
           '</a>';
  }

  function edgeHTML(side, label){
    if (side === 'prev'){
      return '<span class="pager is-edge prev" aria-disabled="true">' +
               '<span class="pager-arrow">←</span>' +
               '<span class="pager-text"><span class="pager-kicker">이전</span>' +
               '<span class="pager-title">' + esc(label) + '</span></span>' +
             '</span>';
    }
    return '<span class="pager is-edge next" aria-disabled="true">' +
             '<span class="pager-text"><span class="pager-kicker">다음</span>' +
             '<span class="pager-title">' + esc(label) + '</span></span>' +
             '<span class="pager-arrow">→</span>' +
           '</span>';
  }

  async function build(){
    // unlock.js(SOK_LOCK)가 이 스크립트 뒤에 로드되므로,
    // 문서 파싱(=모든 스크립트 실행)이 끝난 뒤에 시작한다.
    if (document.readyState === 'loading') {
      await new Promise(function (res) { document.addEventListener('DOMContentLoaded', res, { once: true }); });
    }
    if (!window.SOK_LOCK || !window.SOK_LOCK.loadToc) return;
    // 잠금 화면에서는 이웃 강의 제목을 노출하지 않는다
    if (!window.SOK_LOCK.isUnlocked || !window.SOK_LOCK.isUnlocked()) return;

    var toc = null;
    try { toc = await window.SOK_LOCK.loadToc(); } catch (e) {}
    if (!toc) return;                       // TOC_ENC가 없으면 페이저 없이 둔다

    var nums = Object.keys(toc)
      .map(Number)
      .filter(function (n) { return isFinite(n); })
      .sort(function (a, b) { return a - b; });

    var idx = nums.indexOf(current);
    if (idx === -1) return;                 // TOC_ENC에 없는 페이지면 숨김 유지

    var prevNum = idx > 0 ? nums[idx - 1] : null;
    var nextNum = idx < nums.length - 1 ? nums[idx + 1] : null;
    function nameOf(n){ var e = toc[String(n)]; return e && e.t ? e.t : ''; }

    var left  = (prevNum != null) ? linkHTML('prev', prevNum, nameOf(prevNum)) : edgeHTML('prev', '여기가 처음입니다');
    var right = (nextNum != null) ? linkHTML('next', nextNum, nameOf(nextNum)) : edgeHTML('next', '여기가 마지막입니다');
    nav.innerHTML = left + right;
    nav.style.display = '';
  }

  build();
})();
