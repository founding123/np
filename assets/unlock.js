(function () {
  var PASS_KEY = 'sok-site-passphrase-v1';
  var UNLOCKED_KEY = 'sok-site-unlocked-v1';
  var EXPECTED_VERIFIER = 'SOK_INDEX_UNLOCK_OK_V1';

  function b64ToBytes(b64) {
    var bin = atob(String(b64).replace(/\s+/g, ''));
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }

  function parsePayloadText(text) {
    return JSON.parse(String(text).replace(/\/\*\s*\[ENCRYPT_(?:START|END)\]\s*\*\//g, '').trim());
  }

  // 같은 (passphrase, salt, iterations)로 유도한 AES 키를 두 단계로 캐시한다.
  //   1) 메모리(_keyCache): 같은 페이지 안의 모든 페이로드·이미지가 재사용
  //   2) sessionStorage(KEYBITS_KEY): 페이지를 오갈 때 PBKDF2 60만 회를
  //      다시 돌리지 않도록 유도된 256비트를 세션에 저장해 둔다.
  var _keyCache = Object.create(null);
  var KEYBITS_KEY = 'sok-derived-keybits-v1';

  function bytesToB64(bytes) {
    var bin = '';
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }

  function readKeyBits(id) {
    try {
      var store = JSON.parse(sessionStorage.getItem(KEYBITS_KEY) || '{}');
      return typeof store[id] === 'string' ? b64ToBytes(store[id]) : null;
    } catch (e) { return null; }
  }

  function writeKeyBits(id, bytes) {
    try {
      var store = JSON.parse(sessionStorage.getItem(KEYBITS_KEY) || '{}');
      store[id] = bytesToB64(bytes);
      sessionStorage.setItem(KEYBITS_KEY, JSON.stringify(store));
    } catch (e) {}
  }

  function _keyCacheId(passphrase, saltBytes, iterations) {
    var bin = '';
    for (var i = 0; i < saltBytes.length; i++) bin += String.fromCharCode(saltBytes[i]);
    // iterations와 b64(salt)에는 '|'가 없고 passphrase는 맨 뒤라, 이어붙여도 유일하다.
    return iterations + '|' + btoa(bin) + '|' + passphrase;
  }

  function deriveKey(passphrase, saltBytes, iterations) {
    iterations = iterations || 600000;
    var id = _keyCacheId(passphrase, saltBytes, iterations);
    if (_keyCache[id]) return _keyCache[id];

    var promise = (async function () {
      var bits = readKeyBits(id);
      if (!bits) {
        var enc = new TextEncoder();
        var keyMaterial = await crypto.subtle.importKey(
          'raw',
          enc.encode(passphrase),
          'PBKDF2',
          false,
          ['deriveBits']
        );
        var buf = await crypto.subtle.deriveBits(
          { name: 'PBKDF2', salt: saltBytes, iterations: iterations, hash: 'SHA-256' },
          keyMaterial,
          256
        );
        bits = new Uint8Array(buf);
        writeKeyBits(id, bits);
      }
      // importKey는 PBKDF2와 달리 즉시 끝난다.
      return crypto.subtle.importKey('raw', bits, { name: 'AES-GCM' }, false, ['decrypt']);
    })();

    // 실패한 유도는 캐시에 남기지 않아 다음 호출에서 다시 시도할 수 있게 한다.
    promise.catch(function () { delete _keyCache[id]; });
    _keyCache[id] = promise;
    return promise;
  }

  async function decryptPayload(payload, passphrase) {
    var salt = b64ToBytes(payload.salt);
    var iv = b64ToBytes(payload.iv);
    var data = b64ToBytes(payload.data);
    var key = await deriveKey(passphrase, salt, payload.iterations || 600000);
    var plainBuffer = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, key, data);
    return new TextDecoder().decode(plainBuffer);
  }

  // 텍스트가 아니라 '원본 바이트'가 필요한 경우(이미지 등)에 쓴다.
  // 문항 페이로드와 동일한 {salt, iv, data, iterations} 형식을 받아 ArrayBuffer를 돌려준다.
  async function decryptPayloadBytes(payload, passphrase) {
    var salt = b64ToBytes(payload.salt);
    var iv = b64ToBytes(payload.iv);
    var data = b64ToBytes(payload.data);
    var key = await deriveKey(passphrase, salt, payload.iterations || 600000);
    return crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, key, data); // ArrayBuffer
  }

  /* ============================================================
     암호화된 이미지 채우기
     - 잠금 해제 후 주입된 HTML에서 <img data-enc-src="...jpg.enc"> 를 찾아
       .enc(JSON)를 내려받아 복호화 → Blob URL 로 img.src 를 채운다.
     - 비밀번호가 틀리면 GCM 인증 태그에서 막혀 복호화가 실패한다.
     ============================================================ */
  async function hydrateEncryptedImages(root, passphrase) {
    if (!root || !passphrase) return;
    var imgs = Array.prototype.slice.call(root.querySelectorAll('img[data-enc-src]'));
    await Promise.all(imgs.map(async function (img) {
      var url = img.getAttribute('data-enc-src');
      try {
        var res = await fetch(url);
        if (!res.ok) throw new Error('fetch ' + res.status);
        var payload = await res.json();
        var buf = await decryptPayloadBytes(payload, passphrase);
        var mime = payload.mime || 'image/jpeg';
        var objURL = URL.createObjectURL(new Blob([buf], { type: mime }));
        img.addEventListener('load', function () { URL.revokeObjectURL(objURL); }, { once: true });
        img.src = objURL;
        img.removeAttribute('data-enc-src');
      } catch (e) {
        img.removeAttribute('src');
        img.setAttribute('alt', (img.getAttribute('alt') || '') + ' (이미지 복호화 실패)');
      }
    }));
  }

  function getStoredPassphrase() {
    try {
      if (sessionStorage.getItem(UNLOCKED_KEY) !== '1') return '';
      return sessionStorage.getItem(PASS_KEY) || '';
    } catch (e) {
      return '';
    }
  }

  function storePassphrase(passphrase) {
    try {
      sessionStorage.setItem(PASS_KEY, passphrase);
      sessionStorage.setItem(UNLOCKED_KEY, '1');
    } catch (e) {}
  }

  function clearPassphrase() {
    try {
      sessionStorage.removeItem(PASS_KEY);
      sessionStorage.removeItem(UNLOCKED_KEY);
      sessionStorage.removeItem('sok-index-toc-v1'); // 목차 캐시도 함께 폐기
      sessionStorage.removeItem('sok-index-prof-v1'); // 교수 캐시(번호→교수)도 함께 폐기
      sessionStorage.removeItem('sok-pager-titles-v1'); // (옛 버전이 남긴 페이저 제목 캐시 정리)
      sessionStorage.removeItem('sok-derived-keybits-v1'); // 유도 키 캐시도 폐기
    } catch (e) {}
    _tocPromise = null; // 복호화된 목차(번호→제목) 캐시도 폐기
  }

  /* ============================================================
     강의 정보의 단일 출처 — pages.js의 window.TOC_ENC
     - 번호 → [제목, 교수] JSON을 SITE_ENC와 같은 방식으로 암호화해 둔 것.
       옛 형식(번호 → "제목" 문자열)도 그대로 읽힌다.
     - 세션당 1회만 복호화해 index 목차·페이저·문항 페이지 h1·
       교수별 묶기가 모두 공유한다.
     - loadToc()가 돌려주는 값은 정규화된 맵이다:
         { "100": { t: "강의1", p: "교수1" }, ... }
       (p는 비어 있을 수 있다 — 그때 index가 예전 방식으로 폴백)
     ============================================================ */
  var _tocPromise = null;

  // 항목 형식 흡수: "제목" | ["제목","교수"] | {t/title, p/prof}
  function normalizeToc(raw) {
    var out = Object.create(null);
    if (!raw || typeof raw !== 'object') return out;
    Object.keys(raw).forEach(function (k) {
      var v = raw[k], t = '', p = '';
      if (typeof v === 'string') { t = v; }
      else if (Array.isArray(v)) { t = v[0] || ''; p = v[1] || ''; }
      else if (v && typeof v === 'object') { t = v.t || v.title || ''; p = v.p || v.prof || ''; }
      out[k] = { t: String(t).trim(), p: String(p).trim() };
    });
    return out;
  }

  // 복호화는 됐는데 JSON이 깨진 경우(쉼표 누락 등)를 조용히 삼키지 않는다.
  function parseJsonLoud(txt, label) {
    try { return JSON.parse(txt); }
    catch (e) {
      console.warn('[SOK] ' + label + ' 복호화는 성공했지만 JSON 파싱에 실패했습니다. 복호화된 평문:\n', txt);
      throw e;
    }
  }

  function loadToc() {
    if (!window.TOC_ENC) return Promise.resolve(null);
    // 아직 암호화하지 않은 평문 JSON(개발용)은 비밀번호 없이도 읽는다.
    if (typeof window.TOC_ENC.data !== 'string') {
      return Promise.resolve(normalizeToc(window.TOC_ENC));
    }
    var passphrase = getStoredPassphrase();
    if (!passphrase) return Promise.resolve(null);
    if (!_tocPromise) {
      _tocPromise = decryptPayload(window.TOC_ENC, passphrase).then(function (txt) {
        return normalizeToc(parseJsonLoud(txt, 'TOC_ENC'));
      });
      // 실패(비밀번호 불일치 등)는 캐시에 남기지 않는다.
      _tocPromise.catch(function () { _tocPromise = null; });
    }
    return _tocPromise;
  }

  async function tocEntryOf(num) {
    try {
      var toc = await loadToc();
      return (toc && toc[String(num)]) || null;
    } catch (e) { return null; }
  }

  async function titleOf(num) {
    var e = await tocEntryOf(num);
    return e ? e.t : '';
  }

  // 현재 문항 페이지 번호 = 파일명 npNNNN.html 에서 추출
  function currentPageNumber() {
    var prefix = window.FILE_PREFIX || 'np';
    var fname = (location.pathname.split('/').pop() || '');
    var m = fname.match(new RegExp('^' + prefix + '0*(\\d+)(?:\\.html?)?$', 'i'));
    return m ? parseInt(m[1], 10) : NaN;
  }

  function setUnlockedView(isUnlocked) {
    document.body.setAttribute('data-unlocked', isUnlocked ? 'true' : 'false');
    if (isUnlocked) {
      try { window.dispatchEvent(new CustomEvent('sok:index-unlocked')); } catch (e) {}
    }
  }

  async function verifyIndexPassphrase(passphrase) {
    var payloadEl = document.getElementById('indexUnlockPayload');
    if (!payloadEl) throw new Error('index verifier payload not found');
    var payload = parsePayloadText(payloadEl.textContent);
    var plain = await decryptPayload(payload, passphrase);
    if (plain !== (payload.expect || EXPECTED_VERIFIER)) throw new Error('index verifier mismatch');
    return true;
  }

  /* ============================================================
     브랜딩(제목·강조어·라벨·태그라인)
     - 평문 대신 pages.js의 window.SITE_ENC(암호문)에 들어 있습니다.
     - 잠금 해제 후 세션에 passphrase가 있을 때만 복호화해서 채웁니다.
     - passphrase가 없으면(잠긴 npNNNN 등) 비밀이 아닌 일반 문구로 대체합니다.
     ============================================================ */
  function escHtml(s) {
    return String(s).replace(/[&<>]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c];
    });
  }

  function fillBackLink(title) {
    var b = document.querySelector('[data-home="brand"]');
    if (b) b.textContent = title || '';
    var bf = document.querySelector('[data-home="brandfull"]');
    if (bf) bf.textContent = title ? (title + '으로 돌아가기') : '돌아가기';
  }

  function applyBranding(site) {
    site = site || {};
    window.SITE = site; // 혹시 다른 코드가 참조할 수 있으므로 노출
    var title = site.title || '';

    // 문서 제목은 index에서만 사이트 제목으로 둡니다.
    // (npNNNN 탭 제목은 그 페이지 자신의 <meta name="page-title">을 유지)
    var page = document.body.getAttribute('data-lock-page');
    if (title && page === 'index') document.title = title;

    // index 헤더/푸터
    var foot = document.getElementById('foot-title');
    if (foot) foot.textContent = title;

    var st = document.getElementById('site-title');
    if (st) {
      var hl = site.highlight;
      if (hl && title.indexOf(hl) !== -1) {
        var i = title.indexOf(hl);
        st.innerHTML = escHtml(title.slice(0, i)) +
          '<span class="pick">' + escHtml(hl) + '</span>' +
          escHtml(title.slice(i + hl.length));
      } else {
        st.textContent = title;
      }
    }

    var eb = document.getElementById('site-eyebrow');
    if (eb && site.eyebrow) eb.textContent = site.eyebrow;

    var tg = document.getElementById('site-tagline');
    if (tg && site.tagline) tg.textContent = site.tagline;

    // npNNNN 상단/하단 돌아가기 띠
    fillBackLink(title);
  }

  function applyFallbackBranding() {
    // 잠금 상태에서 보이는 npNNNN 돌아가기 띠가 비지 않도록 하는 일반 문구
    fillBackLink('');
  }

  function applyContentPageMeta(meta) {
    meta = meta || {};
    if (meta.title) document.title = meta.title;
    var eyebrow = document.getElementById('page-eyebrow');
    if (eyebrow && meta.eyebrow) eyebrow.textContent = meta.eyebrow;
    var title = document.getElementById('page-title') || document.querySelector('.hero h1') || document.querySelector('h1');
    if (title && meta.title) title.textContent = meta.title;
    var subtitle = document.getElementById('page-subtitle');
    if (subtitle && meta.subtitle) subtitle.textContent = meta.subtitle;
  }

  // pageMetaPayload(eyebrow·subtitle, 구버전은 title 포함)를 읽기만 한다. 적용은 호출한 쪽에서.
  async function readContentPageMeta(passphrase) {
    var payloadEl = document.getElementById('pageMetaPayload');
    if (!payloadEl) return {};
    try {
      var payload = parsePayloadText(payloadEl.textContent);
      // 아직 암호화하지 않은 평문 JSON(개발용)은 그대로 쓴다.
      if (payload && typeof payload.data !== 'string') return payload;
      if (!passphrase) return {};
      return parseJsonLoud(await decryptPayload(payload, passphrase), 'pageMetaPayload');
    } catch (e) { return {}; }
  }

  /* subtitle 안의 {교수} 자리표시자를 TOC_ENC의 교수 이름으로 채운다.
       "20, 21: X; 22: {교수}"  →  "20, 21: X; 22: 홍길동"
     교수 이름은 pages.js 한 곳에만 적고, 페이지에는 자리만 표시하는 방식.
     TOC에 교수가 없으면 자리표시자(와 바로 앞의 '22:' 같은 꼬리표)를 지운다. */
  function fillProfPlaceholder(subtitle, prof) {
    var s = String(subtitle == null ? '' : subtitle);
    if (s.indexOf('{교수}') === -1) return s;
    if (prof) return s.split('{교수}').join(prof);
    return s.replace(/[\s;,·]*(?:\d+\s*:\s*)?\{교수\}/g, '').replace(/[\s;,·]+$/, '').trim();
  }

  async function loadBranding() {
    if (!window.SITE_ENC) { applyFallbackBranding(); return; }
    // 아직 암호화하지 않은 평문 JSON(개발용)은 그대로 쓴다.
    if (typeof window.SITE_ENC.data !== 'string') {
      applyBranding(window.SITE_ENC);
      return;
    }
    var passphrase = getStoredPassphrase();
    if (!passphrase) { applyFallbackBranding(); return; }
    try {
      var txt = await decryptPayload(window.SITE_ENC, passphrase);
      applyBranding(parseJsonLoud(txt, 'SITE_ENC'));
    } catch (e) {
      applyFallbackBranding();
    }
  }

  // (10) PBKDF2(60만 회)가 도는 동안 재진입(더블 클릭·Enter 연타)을 막는다.
  var _unlocking = false;

  async function unlockIndexFromInput() {
    if (_unlocking) return;
    var input = document.getElementById('indexPassphrase');
    var btn = document.getElementById('indexUnlockBtn');
    var msg = document.getElementById('indexUnlockMsg');
    if (!input || !msg) return;

    var passphrase = input.value;
    if (!passphrase) {
      msg.textContent = '상단 박스에 입력하세요.';
      return;
    }

    _unlocking = true;
    if (btn) btn.disabled = true;
    msg.textContent = '확인 중...';
    try {
      await verifyIndexPassphrase(passphrase);
      storePassphrase(passphrase);
      setUnlockedView(true);
      msg.textContent = '잠금이 해제되었습니다.';
      loadBranding();
    } catch (e) {
      clearPassphrase();
      setUnlockedView(false);
      msg.textContent = '틀렸습니다.';
      input.select();
    } finally {
      _unlocking = false;
      if (btn) btn.disabled = false;
    }
  }

  async function bootIndexLock() {
    var input = document.getElementById('indexPassphrase');
    var btn = document.getElementById('indexUnlockBtn');
    var msg = document.getElementById('indexUnlockMsg');

    setUnlockedView(false);

    if (btn) btn.addEventListener('click', unlockIndexFromInput);
    if (input) {
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') unlockIndexFromInput();
      });
    }

    var stored = getStoredPassphrase();
    if (stored) {
      try {
        await verifyIndexPassphrase(stored);
        setUnlockedView(true);
        if (msg) msg.textContent = '이미 해제된 세션입니다.';
        loadBranding();
        return;
      } catch (e) {
        clearPassphrase();
      }
    }

    if (input) setTimeout(function () { input.focus(); }, 0);
  }

  async function bootContentLock() {
    var msg = document.getElementById('unlockMsg');
    var box = document.getElementById('unlockBox');
    var target = document.getElementById('decryptedContent');
    var payloadEl = document.getElementById('encryptedPayload');
    if (!payloadEl || !target) return;

    var passphrase = getStoredPassphrase();
    if (!passphrase) {
      if (msg) msg.textContent = '';
      if (box) box.hidden = false;
      target.hidden = true;
      applyFallbackBranding();
      return;
    }

    // 세션이 있으면 돌아가기 띠의 사이트 제목과 페이지 제목부터 채웁니다.
    await loadBranding();                    // window.SITE(subject 포함)를 먼저 확보
    var meta = await readContentPageMeta(passphrase);
    var entry = await tocEntryOf(currentPageNumber());   // { t: 제목, p: 교수 } | null
    applyContentPageMeta({
      // 제목의 단일 출처는 TOC_ENC. 없으면 구버전 페이지의 meta.title로 폴백.
      title:    (entry && entry.t) || meta.title || '',
      // eyebrow는 페이지별 값이 있으면 그 값, 없으면 SITE_ENC.subject 한 곳의 기본값.
      eyebrow:  meta.eyebrow || (window.SITE && window.SITE.subject) || '',
      // subtitle의 {교수}는 TOC_ENC의 교수 이름으로 채워진다.
      subtitle: fillProfPlaceholder(meta.subtitle, entry ? entry.p : '')
    });

    if (msg) msg.textContent = '세션 해제 확인 후 처리 중...';

    try {
      var payload = parsePayloadText(payloadEl.textContent);
      var html = await decryptPayload(payload, passphrase);
      target.innerHTML = html;
      target.hidden = false;
      if (box) box.hidden = true;
      // 주입된 문항 안의 암호화된 이미지(<img data-enc-src>)를 복호화해 채운다.
      hydrateEncryptedImages(target, passphrase);
    } catch (e) {
      clearPassphrase();
      target.hidden = true;
      if (box) box.hidden = false;
      if (msg) msg.textContent = '저장된 세션으로 복호화하지 못했습니다. 홈에서 다시 시도하세요.';
      applyFallbackBranding();
    }
  }

  window.SOK_LOCK = {
    unlockIndexFromInput: unlockIndexFromInput,
    parsePayloadText: parsePayloadText,
    decryptPayload: decryptPayload,
    decryptPayloadBytes: decryptPayloadBytes,
    hydrateEncryptedImages: hydrateEncryptedImages,
    decryptStoredPayload: async function (payload) {
      var passphrase = getStoredPassphrase();
      if (!passphrase) throw new Error('stored passphrase not found');
      return decryptPayload(payload, passphrase);
    },
    loadBranding: loadBranding,
    loadToc: loadToc,         // → { "번호": { t: 제목, p: 교수 }, ... } (정규화된 맵)
    tocEntryOf: tocEntryOf,   // → { t, p } | null
    titleOf: titleOf,
    clear: clearPassphrase,
    isUnlocked: function () { return !!getStoredPassphrase(); }
  };

  var pageType = document.body.getAttribute('data-lock-page');
  if (pageType === 'index') bootIndexLock();
  if (pageType === 'content') bootContentLock();
})();
