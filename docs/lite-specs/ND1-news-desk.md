# Lite Spec — ND-1 News Desk 뉴스 팩토리

> **후계 공지:** 이 문서는 **`C4-newsroom.md`(스테일)의 후계**다. C4의 GNews·news_cache·
> 키워드 뉴스 파이프라인은 **구현 참조 금지**(정합성 배너만 참조). 미디어 피벗(2026-07-21) 이후
> 뉴스 = **자체 생산 승인제 뉴스 팩토리**로 확정.
>
> 진실 우선순위: `CLAUDE.md v2.2` ≥ `LANGUAGE.md v1.9 §14` > 이 문서.
> 원본 핸드오프: `docs/handoffs/ND1-news-desk-handoff.md` (v1.0)

---

## 1. 정체성

인터넷신문사업자 등록(대구시청)의 전제 = 자체 기사 축적. News Desk는 **뉴스 팩토리 1호 모듈**이자
등록 심사용 실증 시스템이다.

**한 줄:** 대표(발행인)가 `/admin/newsdesk`에서 AI 초안을 검토·편집·승인하면 `/news`와 우측
뉴스뷰(NewsRail)에 3언어 기사가 발행되는 **승인제 뉴스 팩토리**.

## 2. 절대 규칙 (Hard Constraints)

```
✅ 어떤 경로도 자동 발행하지 않는다. 트리거·크론·callable = draft 생성까지만.
   published 전환은 /admin/newsdesk 대표 조작만 (draft→published).
✅ 기사에 Vote Count(절대 득표수) 절대 금지 — 비율(%)·순위·Voter Count만.
✅ 전투 은유 금지 — 잔인한·앙숙·격돌·혈투·생존·왕좌·전력을 꺼내다·피해 갈 곳 없다.
   Match는 싸움이 아니라 "어느 쪽을 더 사랑하는지 고르는 순간".
✅ AI-Report v2.5 문구·스타일 정확 일치 (본문 블록 최하단·8px·50%·골드 모노). "AI GENERATED" 폐기.
✅ FIFA/Official 표기 금지 · Crown Gold(#FCD006)만 · Round Scope Lock.
```

## 3. 초안 3경로 + 노출 2면

```
① 이벤트: Tournament 오픈(status active 생성) → 오픈 기사 draft   /admin/newsdesk (검토·발행)
② 이벤트: Champion 확정(roundProgress false→true 첫 엣지) → 결과 draft   →   /news 목록
③ 크론: 매주 금 12:00 KST → 주간 랭킹 draft                          /news/[slug] (고유 URL)
④ 수동: 템플릿+주제 → AI 초안(manual_ai) / 백지(manual_blank)         우측 NewsRail (임시 마운트)
```

## 4. 데이터 모델 (ADR-ND1)

- `news/{slug}` — `slug`(고유·불변 `{YYYYMMDD}-{6 base36}`, doc id) · `template`(open/result/weekly/column) ·
  `status`(draft/published/archived) · `title/subhead` = `{ko,en,es}` · `body` = `{ko,en,es}: Block[]` ·
  `evidence`(수치 표 + 기준시각, 문서 內) · `origin` · `tournamentId?` · `createdAt` · `publishedAt`.
- **Body Block**(기준본 v3 지면 1:1): `hero · lead(드롭캡) · paragraph · stats(타일) · matchups(VS) · closer`.
- `news_generation/{uid}_{date}` — rate limit 카운터(callable/admin SDK 전용, 클라 차단).
- **번역**: 생성 파이프라인이 소스 언어 초안을 Option A(언어별 개별 호출 + 실패 언어만 원문 fallback +
  logError)로 3언어화해 저장. 렌더 시 미번역 슬롯은 원문 fallback(`resolveArticleView`).

## 5. 구현 모듈 맵

| 영역 | 파일 |
|---|---|
| 스키마·블록·slug·상태전이 | `lib/news/articleDoc.ts` (buildArticleDraft/buildLocalizedArticleDraft: status='draft' 하드코딩) |
| 렌더 선택·블록 편집 | `lib/news/renderArticle.ts` · `lib/news/blockEdit.ts` |
| 집계(근거) | `functions/src/core/newsDigestCore.ts` (기존 ranking_cache 재활용, TODO(ND-CROWN-SCORE)) |
| 프롬프트 4종 | `functions/src/core/newsPrompts.ts` (§5.5 지침 6항 + 금지어 박제) |
| 번역 | `functions/src/core/translateArticleCore.ts` (Option A) |
| 초안 파이프라인 | `functions/src/core/newsDraftPipeline.ts` · `newsDraftAssembly.ts` · `newsRateLimit.ts` |
| callable | `functions/src/generateNewsDraft.ts` (requireAdmin FIRST · 20/KST일) |
| 트리거·크론 | `onTournamentOpened.ts` · `onChampionForNews.ts`(onChampionConfirmed 무수정) · `scheduleWeeklyNews.ts` |
| 콘솔 | `app/admin/newsdesk/` · `components/admin/newsdesk/` |
| 공개 지면 | `app/news/` · `components/news/`(ArticleView·AiReport·NewsList·NewsRail) |
| 미디어 그릇 | `lib/media/mediaSlot.ts` · `components/media/MediaSlot.tsx` (clip=예약만) |
| rules·인덱스 | `firestore.rules`(news published-public/admin-write) · `firestore.indexes.json` |

## 6. 스코프 밖 (§9)

- 우측 상설 프레임 본체(Pitch 개편) — ND-1은 NewsRail + 임시 마운트까지.
- Crown Score(랭킹 개편) — 주간 기사는 현행 ranking_cache 누적 사용.
- 클립 파이프라인 — clip 스키마 예약(그릇)까지. 렌더 경로 구현 금지.
- 외부 뉴스 API 수집(GNews 등) — **도입 금지**(자체 생산 요건·등록 전략 위배).
- 투표 완료 스니펫 · 신문법 필수 표시사항 · 댓글/구독/RSS.

---

*© 2026 WorldCrown48 | ND-1 News Desk lite-spec v1.0 (2026-07-26) | CONFIDENTIAL*
