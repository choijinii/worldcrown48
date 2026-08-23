# 티오(Cowork) 다음 세션 인계 프롬프트 — 2026-08-17
> 이 파일을 새 Cowork 세션 첫 메시지에 그대로 붙여넣으세요. (대표님이 채팅에 붙여넣거나 "outputs/SESSION-HANDOFF_2026-08-17_티오-다음세션.md 읽고 이어가자"라고만 하셔도 됩니다)

---

## 붙여넣기용 프롬프트 (여기부터 복사)

티오, 새 세션이야. 지난 세션(2026-08-09~17) 요약을 읽고 이어가자. 프로젝트 메모리(MEMORY.md 상단 5개: youtube-quota-extension, workflow-kick-process, ai-callables, pitch-reorg-agenda, display-terms-v2)를 먼저 읽고 시작해.

**지금 상태**
- 킥 프로세스("킥 발행 → Claude Code 실행 → Auto-STOP 협의 → 검증 → 배포")가 3건 연속 프로덕션 완주: TOK-1(hex 211→0), LAB-EV-1(유튜브 임베드 검수기), AI-1(Sonnet 5 업그레이드+어드민 게이트+일일 캡+허구 인물 차단). 플레이북 v1.0은 outputs/PLAYBOOK_kick-process_v1.0.md.
- PROC-0(프로세스 킷 추출 → outputs/process-kit/)은 지난 세션 끝에 Claude Code가 착수. **첫 할 일: 대표에게 PROC-0 완료 여부·최종 보고 화면을 요청**하고, README를 대표가 읽고 "Koracle에 복사하면 시작할 수 있겠다"고 판단했는지 확인 → 통과면 메모리 workflow-kick-process에 완료 기록.
- LAB-EV-2(자동 영상 소싱) 킥은 **발행 완료, 미착수**: outputs/handoffs-staging/KICK_LAB-EV-2_자동-영상-소싱_2026-08-16.md. 이번 세션의 메인 작업.

**LAB-EV-2 착수 프롬프트(대표가 Claude Code에 /clear 후 붙여넣을 것 — 그대로 다시 제시해줘)**
```
outputs/handoffs-staging/KICK_LAB-EV-2_자동-영상-소싱_2026-08-16.md 를 읽고 착수해 주세요. 시작 전 git pull. RULE R4(할당량 가드 선행)·R6(자동 생성 금지)·R8(파라미터·유닛 비용 문서 실측)을 반드시 지키고, Auto-STOP 조건을 만나면 멈추고 질문해 주세요.
```

**LAB-EV-2 진행 중 티오가 할 일**
- Auto-STOP 화면 캡처가 오면: (권장) 옵션의 근거를 해설하고, 붙여넣기용 답변(번호 대응·승인/거부·조건·"이후 Phase 계속") 작성. 지금까지 Claude Code의 (권장)은 전부 정확했음. 단 리포 실측과 내 지시가 충돌하면 실측이 이긴다(AI-1의 bracketSize 철회 사례).
- 예상 STOP 지점: onApply 주입 경로 시그니처 / search.list embeddable 필터 실측 / 관련성 규칙 판정 불가율 30%↑ / 60s 타임아웃 내 8명 배치 / 쿼터 카운터 vs 콘솔 불일치.
- 대표 실행 항목: 골든·스모크는 대표 터미널/브라우저(Claude Code는 시크릿 값·어드민 계정 없음). 명령 패턴: `cd ~/Projects/worldcrown48/functions && ... 2>&1 | tee /tmp/<name>.txt` → Claude Code에 "/tmp/<name>.txt 읽어주세요". firebase CLI는 `--project worldcrown48` 필수. 30분 넘는 작업은 `caffeinate -d`.
- Phase E 스모크 표(성공/수동 필요/실존 의심/캐시 적중률/유닛/시간)가 나오면 메모리 pitch-reorg-agenda·ai-callables 갱신.

**⏰ 대기 메모 트리거(내가 먼저 꺼낸다 — feedback-proactive-todo-surfacing)**
- todo-youtube-quota-extension: LAB-EV-2 킥 §9에 "지금은 불필요" 판정 인라인됨. 다시 꺼낼 때 = MVP2 Lab 유저 공개 토의 시작 / 하루 3개↑ 소싱 / quotaExceeded 로그 / 캐시 적중 저조.
- todo-display-terms-v2: Arena 킥 또는 뉴스룸 킥 문서 쓸 때 §1 인라인(편집기 3언어 불일치·이름 "한글 (영문)" 병기 규칙·키워드 재클릭 20/12 결함).

**LAB-EV-2 다음 순서(대표 확정)**: Arena 매치 대수술 킥 작성(VS 스플릿 100vw/vh Flexbox 50:50·호버 flex 1.5~2+scale 1.1+saturate 30→100%·첫 입장 팝업·Stale-Doc Guard 동봉·표시 용어 v2.0 인라인) → Pitch 쇼케이스(모형 6카드 삭제) → 뉴스룸 승격(+Around the Pitch+NewsRail+SiteMapSheet, sitemap·Article schema).

**대표 응답 규칙(유지)**: 존댓말·부드럽게, 초보자용 단계 설명, 용어 괄호 풀이, 시각 자료는 HTML(라이트 hex), 킥 문서에 Cowork 메모리 참조 금지(본문 인라인), Claude Code 입력창의 추천 문장은 대표가 실제로 한 일이 아닐 수 있으니 확인 후 안내, 키는 채팅·캡처 금지.

## (복사 끝)

---

## 참고 — 지난 세션 산출물 위치
- outputs/PLAYBOOK_kick-process_v1.0.md
- outputs/handoffs-staging/KICK_TOK-1_*, KICK_LAB-EV-1_*(v1.1), KICK_AI-1_*, KICK_PROC-0_*, KICK_LAB-EV-2_*
- outputs/process-kit/ (PROC-0 산출, 완료 시)
- HTML 시각자료: console-vs-widget, auto-sourcing-pipeline (세션 워크스페이스에만 있었음 — 필요하면 재생성)
