/* ============================================================
   테마 적용 — index.html과 문항 페이지 공용 (한 파일에서만 관리).
   - 페이지가 뜰 때 localStorage 'sok-index-theme'의 테마를 적용
   - .theme-picker(#themePicker) 버튼으로 바꾸면 다시 저장되어
     index를 포함한 모든 페이지에 반영됨
   - 다른 탭에서 테마를 바꾸면 storage 이벤트로 이 페이지도 즉시 따라감
   ※ 첫 페인트 전 FOUC 방지용 인라인 스크립트는 각 페이지 <head>에 그대로 둔다.
   ============================================================ */
(function () {
  var THEME_KEY = 'sok-index-theme';
  var THEMES = ['나이테', '황혼', '윤슬', '쪽빛', '미리내'];
  function validTheme(t){ return THEMES.indexOf(t) !== -1 ? t : '나이테'; }
  function applyTheme(t){
    t = validTheme(t);
    document.documentElement.setAttribute('data-theme', t);
    document.documentElement.style.colorScheme = /^(쪽빛|미리내)$/.test(t) ? 'dark' : 'light';
    var buttons = document.querySelectorAll('[data-theme-choice]');
    for (var i = 0; i < buttons.length; i++){
      buttons[i].setAttribute('aria-pressed', String(buttons[i].getAttribute('data-theme-choice') === t));
    }
    try { localStorage.setItem(THEME_KEY, t); } catch (e) {}
  }
  var picker = document.getElementById('themePicker');
  if (picker){
    picker.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-theme-choice]');
      if (!btn) return;
      applyTheme(btn.getAttribute('data-theme-choice'));
    });
  }
  window.addEventListener('storage', function (e) {
    if (e.key === THEME_KEY && e.newValue) applyTheme(e.newValue);
  });
  try { applyTheme(validTheme(localStorage.getItem(THEME_KEY) || document.documentElement.getAttribute('data-theme'))); }
  catch (e) { applyTheme('나이테'); }
})();
