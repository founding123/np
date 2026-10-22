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
  "iv": "5CdH+Fy8+K2rzAfn",
  "data": "8AO+C9d/rtLfExj+OGGxh7FKkk3Z0fb5S/IyPC1c+OmJ1XrwhGpfababTLAu0D3z/oJ6fYpBGTCRqOzsyKcAvkZzR7JgQkXxTs2sS7rFuS4OIYJI1nu2FpE+C0r23RBZagFwQ8sNkwogBMBGqQ2q6wU+huj0a1lci3glgfz1k+m9NPXs0xpduwDrCRHSvINKehKPv+S12zbJSGca2Ca75OQCRzbWK4KUyMLbZN0LKGoJay5WhjDj1ZxVZz5LgP9JnfHi4s5tXWZfzebULV0CnUTQGNIhOP77uJucbtMtF5yn2ZIXhJ0CfxP8rrbgwuuaHS2xUc9pzg=="
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
  "iv": "bt8Xos5SsgeFVn2g",
  "data": "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"
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
  "iv": "ItqEcZSpQGzZn3Jw",
  "data": "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"
}
;

// 파일명 접두어 — index.html과 assets/question_set.js가 이 값을 읽는다.
// 파일명 규칙이 바뀌면 여기 한 곳만 고친다.

window.FILE_PREFIX = 'np';
