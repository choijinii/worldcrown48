GNB · NAV-2 (2026-10-13) · v1.9 값
WorldCrown48 Design System 프로젝트 루트에 같은 경로로 넣으세요:
  components/GNB/GNB.jsx
  components/GNB/GNB.d.ts
  preview/44-gnb.html
그 다음 _ds_manifest.json의 components에 {"name":"GNB","sourcePath":"components/GNB/GNB.jsx"} 를 추가하면 번들에 등록됩니다.

값 요약 — 메뉴바 좌우 여백 0(위 20 · 높이 64 / 휴대폰 좌우 12 · 위 10 · 높이 48) · ▾ Record Room만 · 서랍 300(휴대폰 230) · 대분류 아이콘 Lucide 20px/1.75(글자색 · 흐림 .45 동일) · 줄 시작 36(글자 66) · 하위 84 · 언어·로그아웃 36 · ✕ = ☰ (x 10–54 / 휴대폰 17–57) · 서랍 로고 = 메뉴바 로고(x 55 / 휴대폰 65 · 같은 Brand 부품) · 열림 220ms · 닫힘 180ms · cubic-bezier(.2,.8,.2,1) · 바깥·✕·Esc로만 닫힘.
