# Lite Spec — Contestant `imageUrl` Sourcing (MVP1)

> **ADR:** ADR-0009 (dev-visual-aid handoff §4) · **Domain:** 2 (The Lab) · **연계:** B-1 후속 PR
> **상태:** 문서화 단계 (이 PR) — 실제 업로드 UI 구현은 B-1 후속 PR

## ⛔ 용어 규칙 (LANGUAGE.md 준수)

```
✅ Contestant   (❌ Candidate / 후보자)
✅ Tournament   (❌ 대회 / 이벤트)
✅ Tournament Host  (❌ 관리자 — System Admin과 혼동)
```

---

## 1. 개요 — 왜 필요한가

각 **Contestant**은 **Match** 화면(VS Battle)과 랭킹·Crown Card에서 이미지로
표시된다. 그 이미지의 출처(`contestants/{id}.imageUrl`)를 **Tournament Host**가
어떻게 입력하는지에 대한 단일 진실 명세가 없어 다음 문제가 있었다.

- B-1 The Lab의 `ContestantEditor`는 현재 **외부 URL 텍스트 입력**만 지원
  (`components/admin/lab/ContestantEditor.tsx` — `imageUrl` text field).
- 자체 호스팅(Cloud Storage 업로드) 경로가 코드·문서 어디에도 정의되지 않음.
- MVP1.5 Fan Intelligence가 SNS에서 이미지를 자동 추출할 때 어디에 저장할지 미정.

이 문서는 MVP1 입력 분기와 저장 정책을 확정해 위 공백을 닫는다.

---

## 2. ADR-0009 결정 사항

**MVP1 — B-1 The Lab UI에 두 입력 분기 제공 (E3):**

| # | 입력 방식 | 흐름 | 현재 상태 |
|---|---|---|---|
| (i) | **외부 URL** | `https://...` 텍스트 필드에 직접 붙여넣기 → `imageUrl`에 그대로 저장 | ✅ 구현됨 (`ContestantEditor`) |
| (ii) | **파일 업로드** | 드래그앤드롭 → Cloud Storage 자동 업로드 → 반환 URL을 `imageUrl`에 자동 채움 | ⏳ B-1 후속 PR |

- **MVP1.5:** Fan Intelligence가 SNS에서 추출한 이미지는 (ii)와 동일한 저장 흐름으로 통합.
- **저장 위치:** Cloud Storage 버킷 `wc48-contestant-images/`,
  경로 `{tournamentId}/{contestantId}.{ext}`.

**Why:** MVP1 빠른 시연(외부 URL 즉시 입력)과 안정적 운영(자체 호스팅)을 모두 지원.
Cloud Storage 무료 한도(5GB) 활용.

**Consequences:**
- 외부 URL은 CORS·원본 삭제(링크 깨짐) 위험을 **Tournament Host가 인지하고** 사용.
- 업로드 흐름은 Cloud Functions `generateUploadUrl`(signed URL) 패턴 사용 (C-2 Crown Card 업로드와 동일 메커니즘).
- 본 PR은 **명세만** — (ii) 구현은 별도 PR.

---

## 3. B-1 The Lab UI Mock (ContestantEditor)

현재(외부 URL) → 목표(분기 추가). ASCII mock:

```
┌─ Contestant #07 ─────────────────────────────┐
│  ┌────────┐   Name      [ Son Heung-min     ] │
│  │ image  │   Nation    [ KR ▾ ]              │
│  │ 80×80  │   Position  [ FW ▾ ]              │
│  └────────┘                                   │
│                                               │
│  Image source                                 │
│   ◉ URL    [ https://…                      ] │  ← (i) 구현됨
│   ○ Upload [ ⤓ drag & drop / click to browse] │  ← (ii) B-1 후속
│            uploads to                          │
│            wc48-contestant-images/{tid}/{cid} │
└───────────────────────────────────────────────┘
```

- 두 입력은 상호 배타(radio). 최종 산출물은 동일한 단일 `imageUrl` 문자열.
- 업로드 성공 시 라디오가 자동으로 `Upload`로 전환되고 URL 필드는 read-only 미리보기.

---

## 4. Cloud Storage 버킷 정책

| 항목 | 값 |
|---|---|
| 버킷 | `wc48-contestant-images` |
| 객체 경로 | `{tournamentId}/{contestantId}.{ext}` |
| 허용 확장자 | `jpg` · `jpeg` · `png` · `webp` |
| 최대 크기 | 5 MB / 파일 (signed URL 발급 시 강제) |
| 공개 범위 | public read (이미지 CDN 노출), write는 Cloud Functions signed URL로만 |
| 업로드 주체 | Tournament Host (B-1) / Fan Intelligence 파이프라인 (MVP1.5) |

- write 규칙: 클라이언트 직접 write 금지. `generateUploadUrl` Cloud Function이
  Host 권한(`isHost(tournamentId)`)을 검증한 뒤 단기 signed URL을 발급.
- 외부 URL (i)은 버킷을 거치지 않으므로 이 정책의 적용을 받지 않는다.

---

## 5. MVP1.5 Fan Intelligence 연계 (예상 ~2026-08)

- Fan Intelligence가 승인된 SNS 출처에서 Contestant 이미지를 추출
  (이미지 소싱 Level 2 — 수동 승인. CLAUDE.md 불변 원칙 #6).
- 추출 이미지는 (ii)와 동일하게 `wc48-contestant-images/{tid}/{cid}.{ext}`에 저장 →
  `imageUrl` 자동 채움.
- ❌ 딥페이크·미성년자(Level 3)는 절대 금지 — 파이프라인에서 사전 차단.

---

## 6. Out of Scope (이 PR)

- ❌ (ii) 업로드 컴포넌트 실제 구현 — B-1 후속 PR
- ❌ `generateUploadUrl` Cloud Function — B-1 후속 PR
- ❌ Fan Intelligence 자동 추출 — MVP1.5

---

*© 2026 WorldCrown48 | imageUrl-source lite-spec | ADR-0009 | CONFIDENTIAL*
