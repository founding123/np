/* ============================================================
   사이트 설정 — 강의 정보의 단일 출처

   ▣ 구조 요약 (정보는 한 곳에만 적는다)
       TOC_ENC        번호 → [강의 제목, 교수 이름]   ← 강의 목록의 전부
       PROF_NOTE_ENC  교수 이름 → 한 줄 평
       SITE_ENC       사이트 문구 (제목·강조어·라벨·태그라인·과목명)

     예전의 PAGE_NUMBERS 배열은 없어졌다. 페이지 번호 목록은
     TOC_ENC의 키에서 자동으로 나온다. PROF_ENC도 필요 없다 —
     교수 이름이 TOC_ENC 안에 함께 있기 때문이다.

   ▣ 새 페이지 추가하는 법 (이제 두 단계뿐)
     1) 파일을 npNNNN.html 이름으로 올린다.
        예) np0100.html, np3050.html
     2) 아래 TOC_ENC에 한 줄을 추가한다.
        예) "3050": ["새 강의 제목", "홍길동"],
     끝. 목차·이전/다음 페이저·문항 페이지 h1·교수별 묶기가
     전부 이 한 줄을 읽는다.

   ▣ TOC_ENC 항목 형식
       "번호": ["강의 제목", "교수 이름"]

     · 교수 칸("")을 비워 두면: 예전 방식대로 그 페이지의
       pageMetaPayload subtitle("22: 이름;")을 내려받아 읽는다.
       (기존에 배포한 파일들은 그대로 동작한다는 뜻)
     · 교수 칸을 채우면: 파일을 하나도 내려받지 않고 즉시
       교수별 묶기가 된다. 채우는 쪽을 권장.
     · 옛 형식 "번호": "강의 제목" (문자열만)도 계속 읽힌다.
     · 교수 이름 뒤에 부가 정보를 붙이려면 구분자를 하나 둔다.
       구분자부터 뒤는 이름에서 잘려 나간다.
         쓸 수 있는 구분자 :  (   [   ·   ,   /   |   그리고 전각 형태
         "홍길동 (신규 강의)"  → 홍길동
       ('-'와 '.'은 구분자가 아니다. 'Kim Sung-ho', 'Prof. Kim'이 잘리므로.)

   ▣ 암호화하는 법 (모든 *_ENC 공통)
     평문 JSON을 파일로 저장한 뒤 동일한 비밀번호로 암호화해
     아래 해당 자리에 붙여 넣는다.
          python tools/encrypt_fragment.py toc.json --password <비밀번호>
     아직 암호화하지 않은 평문 JSON도 그대로 읽히므로(개발용),
     로컬에서 먼저 확인하고 배포 전에 암호화하면 된다.
   ============================================================ */

/* ▣ 사이트 문구
     title/highlight/eyebrow/tagline : 목차(index) 화면의 문구
     subject : 문항 페이지 상단의 작은 라벨(eyebrow) 기본값.
               예전엔 모든 np 파일마다 "근골격학"을 반복해 적었지만,
               이제 여기 한 곳만 적으면 된다.
               (특정 페이지만 다르게 하려면 그 페이지 pageMetaPayload에
                "eyebrow"를 적으면 그 값이 우선한다) */

window.SITE_ENC =
{
  "kdf": "PBKDF2",
  "hash": "SHA-256",
  "iterations": 600000,
  "cipher": "AES-GCM",
  "salt": "ccZglmqzec+/MxkceRznew==",
  "iv": "wg2PVtPG12ouT/MI",
  "data": "BZH/xVpGhnJ7qr12aXGzWd6DOH3Q6zp+GrAmit+YRgUn/pVVYrCtSlw9be20XVHAtolvnI/NuGC/jB8glCPvC5wEcacJyzP2Yv7wjxWXNurZRJ/YrOgDEmLxTnH3XxhkupqKP61/QtqgKra54JkX4LDWUWTyDR99jngYbP1MGWBxdE5yW25FaEK6K4EJ1yl3ENhuYHZNnmxiOkSk7fqHCr6uIdcfAIFeJa7/CYyJBZdumWY6xCCyksZoOk2Z5qv8UkSLvr28vgv3tjBtanvuv3j57sLXwS9QojrQp3l5YCd0uaSBEls7PTq0E7NWYS7gA7oh8WGwqg=="
}
;

/* ▣ 강의 목록 — 번호 → [제목, 교수]  (단일 출처)
     교수 칸은 지금 비워 두었다. 채워 넣는 즉시 '교수별' 묶기가
     파일 스캔 없이 바로 동작한다. */

window.TOC_ENC =
{
  "kdf": "PBKDF2",
  "hash": "SHA-256",
  "iterations": 600000,
  "cipher": "AES-GCM",
  "salt": "ccZglmqzec+/MxkceRznew==",
  "iv": "Azi58GGWs2VdvhT6",
  "data": "ESnC4Atj7ixkMZwqta934BZ/Ikh6S0Z+H9PXtbBFK7i6xskmlk/diMWWyrSlTu0xbdzwUyleU876GGRKDHBwE5XfBq/feP0gQYnHCfz1NuF2UBIHNjhVrS/bizqwHzyqIcuaUh+qsU20dlL3D7Vqlkycy9TWJCzJe8BiPCu+AmCwYMdpCfryYAEF4pmfdWgYDRyJ0Etg6iypU9uu9rmwmQQqjj2ojlKn0sB/dxviDceM6sdeJ6W9fLoYgVddGczwqg=="
}
;

/* ▣ 교수 한 줄 평 — 교수 이름 → 한 줄
     목차를 교수별로 묶으면 머리글에 이름과 함께 이 한 줄이 뜬다.

     · 한 줄 평은 '강의'가 아니라 '교수'에 붙는다. 강의가 5개여도 한 번만.
     · 키 = TOC_ENC에 적은 교수 이름(또는 subtitle에서 뽑힌 이름).
       '홍길동.'처럼 마침표가 붙어도 같은 규칙으로 맞춰 준다.
     · 안 적은 교수는 이름만 뜬다. 통째로 지워도 동작한다. */

window.PROF_NOTE_ENC =
{
  "kdf": "PBKDF2",
  "hash": "SHA-256",
  "iterations": 600000,
  "cipher": "AES-GCM",
  "salt": "ccZglmqzec+/MxkceRznew==",
  "iv": "qH2lz4tWaA2EcC3k",
  "data": "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"
}
;

// 파일명 접두어 — index.html과 assets/question_set.js가 이 값을 읽는다.
// 파일명 규칙이 바뀌면 여기 한 곳만 고친다.

window.FILE_PREFIX = 'np';
