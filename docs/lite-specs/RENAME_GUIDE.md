# lite-specs 파일 개명 가이드
# v4.8 에이전트 ID 기준 재편 — 2026-05-14

---

## 터미널 명령어 (Mac)

프로젝트 폴더 안에서 아래 명령어를 한 줄씩 입력하세요.
(docs/lite-specs 폴더 안에서 실행)

```bash
cd ~/프로젝트경로/docs/lite-specs

# ── 단순 개명 (내용 변경 없음) ──
mv 07-the-pitch.md        A1-the-pitch.md
mv 08-admin-page.md       B1-the-lab.md
mv 09-arena-vote-engine.md C1-vote-engine.md
mv 11-crown-card.md       C2-crown-card.md
mv 12-anti-fraud.md       C3-ranking-anomaly.md

# ── 통합 개명 (두 파일을 하나로 합치기) ──
# D1: 06 + 10 통합
cat 06-auth-vote-gate.md 10-gdpr-deletion.md > D1-locker-room.md
# 통합 후 기존 파일 삭제
rm 06-auth-vote-gate.md 10-gdpr-deletion.md

# E1: 03 + 04 통합
cat 03-cookie-consent.md 04-policy-hub.md > E1-policy-hub.md
rm 03-cookie-consent.md 04-policy-hub.md

# ── 공통 인프라 통합 (선택사항) ──
# 지금 당장 안 해도 됨 — 나중에 여유 있을 때
cat 01-project-setup.md 02-firebase-schema.md 05-deployment.md > 00-foundation.md
rm 01-project-setup.md 02-firebase-schema.md 05-deployment.md
```

---

## 최종 파일 목록 (완료 후)

```
docs/lite-specs/
├── 00-foundation.md          # 공통 인프라 (세팅+스키마+배포 통합)
│
├── A0-launch-pad.md          # 🆕 신규
├── A1-the-pitch.md           # 07 개명
├── B1-the-lab.md             # 08 개명
│
├── C1-vote-engine.md         # 09 개명
├── C2-crown-card.md          # 11 개명
├── C3-ranking-anomaly.md     # 12 개명+보강
├── C4-newsroom.md            # 🆕 신규
│
├── D1-locker-room.md         # 06+10 통합 개명
├── E1-policy-hub.md          # 03+04 통합 개명
├── G1-admin-dashboard.md     # 🆕 신규
│
# MVP 2 — 나중에 생성
# B2-the-lab-mvp2.md
# D2-locker-room-mvp2.md
# F1-ai-news-factory.md
# G2-admin-dashboard-mvp2.md
```

---

## 에이전트에게 임무 부여할 때

```
터미널에서 Claude Code 실행 후:

"C1-vote-engine.md 파일 읽어줘.
그 다음 00-foundation.md도 읽어줘.
이제 Domain 3 VS Battle 투표 컴포넌트 만들어줘."
```

파일명이 에이전트 ID와 1:1 매칭이 되므로
어떤 파일을 읽혀야 할지 헷갈리지 않습니다.
