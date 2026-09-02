# 티오 다음 세션 시작 지시서 (2026-08-27 작성)

새 세션의 티오에게: 먼저 메모리에서 **user-communication-profile.md(대화 프로필)**과 **project-launch-v1_1-2026-08-27.md(런칭 일정 v1.1)**를 읽고 시작할 것. 이 두 파일이 이번 프로젝트의 말투와 지도다.

## 오늘(08-27)까지 확정된 큰 그림
- 🚀 **런칭 2026-10-08(목) 확정** — 한글날 연휴(10/9~11) 3일 총공. 사전등록 목표 500명.
- 개발↔마케팅 일정 v1.1 상호 확정: `marketing/00_strategy/D-42_런칭로드맵_v1.1_2026-08-27.html` + `WC48_Marketing_Schedule_v1.html` + `EVENT_SPEC.md` 세 문서가 한 세트.
- 마케팅 클로드(claude.ai 채팅)와는 대표가 복사-붙여넣기로 서신 교환. 티오 회신은 반드시 코드 실측 근거를 붙일 것.
- MVP2 이관 확정(미결 0건): 랭킹 산식 페이지 · 사이트 내 검색 · 참가자 DB 3층 · STEP 2 초안 저장 · 32/16강 · 얼굴 크롭 · 카카오 분리 계측.

## 지금 진행 중인 일 (이어받을 지점)
**LAB-UX-1 마무리 최종 단계.** #80(복구 도구)·#81(링크 붙여넣기+이름 추출)·#82(표기 규칙: 로마자→한글) 전부 머지·배포 완료(08-27 저녁, extractContestantsFromVideos Successful update 실측 확인).
- 다음 순서: ① Claude Code **골든 재실행** 결과 확인 — 판정 기준: Karina→카리나 전환 + 지어낸 이름 0건 유지 + 기권 3건 유지 + 규칙 추가로 다른 행동이 흔들리지 않았는지 ② 통과 시 **대표 스모크 재시도**(빈칸에 링크 붙여넣기 → 이름·소속 자동 채움 확인) ③ LAB-UX-1 **공식 종료** 선언 ④ Claude Code 컨텍스트 97% 상태이므로 종료 후 **/clear** (킥 중 /clear 금지 규칙 준수).

## LAB-UX-1 종료 후: W1 소킥 열차 (9/3까지)
순서: **OG 연결**(프롬프트 준비됨: public/og.jpg → app/layout.tsx·app/launch/layout.tsx openGraph.images + twitter summary_large_image) → **GA 연결**(운영 작업: Firebase 콘솔 통합에서 GA 활성화 → G- ID → Vercel 환경변수 NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID → 재배포. 티오가 단계별 안내) → **UTM 자동 부착**(lib/crown/shareIntents.ts, 마케팅 UTM 규칙표와 정합 확인) → **계측 소킥 A**(guest_signin_convert·share_locked_view 신설 + 공통 파라미터 is_guest/tournament_id/category★/lang — EVENT_SPEC.md 참조, 완료 시 코드명으로 문서 갱신) → **TOG-1**(뉴스데스크 콘솔 다국어 이관).
- 각 소킥은 킥 프로세스(킥 발행→실행→검증→PR→대표 머지) 그대로. 화면 문구는 대표 승인 게이트.

## 운영 알림 (날짜 순)
- **9/10 전: GCP 결제 활성화** (무료 체험 만료 ≈9/10 — 09-01 전후 티오가 먼저 상기)
- **W2: 발신 메일 구축 착수** (현재 수신 전달만. 발송 서비스 선정+DNS 인증 — W3 사전등록 개시 전 가동)
- **W2~3: sitemap+Search Console 소킥** (Arena와 병행) · **공유 도착지 수정**
- **W3(9월 중순): YouTube 쿼터 증설 신청**
- **W5: Node 20 → 새 런타임 소킥** (10/30 폐기 — 배포 로그에 경고 뜨는 것 정상, 조치 예정)

## 검증 일정 (마케팅과 약속)
- W2 말: 계측 ④⑤⑥⑦⑧+공통 파라미터 수신 검증 → 마케팅에 결과 공유
- W3 말: 전체 8종 검증 (①②③은 Arena 완료 후 존재)
- W4: 베타 스모크 게이트 — 대표 1회 완주 → GA 실시간 ①②×4③ 확인 → 통과 시에만 베타 초대

## 세션 운영 메모
- 터미널 명령은 **한 개씩 별도 코드 상자** + 성공 신호 명시 (08-26 토막 사고 재발 방지)
- Claude Code 입력창의 문장 = 예상답안. 대표가 실제 행동 후 보내도록 환기
- 산출물은 SendUserFile + 프로젝트 폴더 저장(마케팅 문서는 marketing/00_strategy/)
