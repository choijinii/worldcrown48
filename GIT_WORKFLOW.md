# WorldCrown48 Git 브랜치 관리 전략
# v1.0 — 2026-05-13

## 📋 목차
1. 브랜치 전략 및 목적
2. 일상적인 워크플로우
3. 주요 브랜치 관리
4. 터미널 명령어 모음
5. 자동화 체크리스트

---

## 1️⃣ 브랜치 전략 및 목적

### 현재 권장 Git 모델: **트렁크 기반 개발 + 기능 브랜치**

```
main (메인 브랜치)
├── 항상 배포 가능한 상태
├── 모든 커밋은 테스트 완료
└── 직접 커밋 금지 (PR만 허용)

develop (개발 브랜치)
├── 다음 버전 개발 진행
├── feature 브랜치들이 여기로 병합
└── main과 주기적으로 동기화

feature/* (기능 브랜치)
├── 기능별 개발용 (예: feature/dual-theme)
├── develop에서 분기, develop으로 병합
└── PR을 통해 코드 리뷰 후 병합

docs/* (문서 브랜치)
├── CLAUDE.md, CONTEXT.md 등 문서 변경용
├── develop 또는 main으로 직접 병합 가능
└── 작은 변경사항은 빨리 병합

hotfix/* (긴급 수정 브랜치)
├── main에서 분기 (버그 고치는 경우만)
├── main과 develop 양쪽 모두에 병합
└── 사용 후 즉시 삭제
```

---

## 2️⃣ 일상적인 워크플로우

### 시나리오 1: 새 문서 버전 커밋 (지금 상황)

```bash
# Step 1: 최신 상태 동기화
cd ~/Projects/worldcrown48
git pull origin main

# Step 2: docs 브랜치 생성 (문서 변경용)
git checkout -b docs/claude-context-v1-1

# Step 3: 파일 추가/변경 (위의 update_files.sh 실행)
bash ./update_files.sh

# Step 4: 변경사항 확인
git status

# Step 5: 스테이징 (커밋할 파일 선택)
git add CLAUDE.md CONTEXT.md WorldCrown48_ProjectSkill.md

# Step 6: 커밋
git commit -m "docs: Update CLAUDE v1.1, CONTEXT v0.3, ProjectSkill v1.5

- CLAUDE.md v1.0 → v1.1: Dual theme + 3-level image sourcing policy
- CONTEXT.md v0.2 → v0.3: Reflect CLAUDE.md v1.1 policy changes
- ProjectSkill.md v1.4 → v1.5: Candidate→Contestant, Round auto-advance

Related: Dual theme for UI (dark 4 domains, light 3 domains)
Tournament Deadline only (Round Deadline abolished)
Vote limit: 5 times → 1 time per day per tournament"

# Step 7: 원격에 푸시
git push origin docs/claude-context-v1-1

# Step 8: GitHub에서 PR 생성
# github.com/[your-repo] → "Pull requests" → "New pull request"
# Base: main, Compare: docs/claude-context-v1-1
# 제목: "docs: Update CLAUDE, CONTEXT, ProjectSkill to v1.1/v0.3/v1.5"
# 설명: 위의 커밋 메시지 복사

# Step 9: 리뷰 후 병합 (또는 직접 병합)
# GitHub UI에서 "Merge pull request" 클릭

# Step 10: 로컬에서 정리
git checkout main
git pull origin main
git branch -d docs/claude-context-v1-1  # 로컬 브랜치 삭제
git push origin --delete docs/claude-context-v1-1  # 원격 브랜치 삭제
```

### 시나리오 2: 기능 개발 (예: Dual Theme 구현)

```bash
# Step 1: develop 브랜치에서 시작
git checkout develop
git pull origin develop

# Step 2: feature 브랜치 생성
git checkout -b feature/implement-dual-theme

# Step 3: 파일 수정/생성
# (Next.js 컴포넌트 작성 등)

# Step 4: 작은 단위로 여러 번 커밋 (좋은 습관)
git add .
git commit -m "feat: Add light theme palette to design tokens"

git add .
git commit -m "feat: Create lightTheme variant for Locker Room domain"

git add .
git commit -m "feat: Update domain router with theme assignments"

# Step 5: 푸시
git push origin feature/implement-dual-theme

# Step 6: GitHub에서 PR 생성 (Base: develop)
# PR 설명에 다음 포함:
# - 구현한 기능
# - 테스트 방법
# - 스크린샷 (UI 변경시)
# - 관련 이슈 #123 (있다면)

# Step 7: 리뷰 → 수정 → 병합
# (피드백 반영 후 커밋하면 PR에 자동 추가됨)

# Step 8: 정리
git checkout develop
git pull origin develop
git branch -d feature/implement-dual-theme
```

### 시나리오 3: 버그 수정 (긴급)

```bash
# main에서 심각한 버그 발견 시
git checkout main
git pull origin main
git checkout -b hotfix/fix-duplicate-vote-bug

# 버그 수정
git add .
git commit -m "fix: Prevent duplicate votes within same day per tournament"

# main에 병합
git push origin hotfix/fix-duplicate-vote-bug
# GitHub에서 PR 생성 (Base: main)
# 병합 후:

# develop에도 병합 (동기화 필수)
git checkout develop
git pull origin develop
git merge hotfix/fix-duplicate-vote-bug
git push origin develop

# 정리
git branch -d hotfix/fix-duplicate-vote-bug
```

---

## 3️⃣ 주요 브랜치 관리

### 브랜치 생성 규칙

```
prefix/영문-설명-하이픈-연결

✅ 좋은 예:
  feature/dual-theme
  feature/implement-image-sourcing-level-1
  docs/claude-context-v1-1
  hotfix/fix-vote-count-exposure
  refactor/simplify-round-logic

❌ 나쁜 예:
  feature/새 기능
  fix stuff
  update
  v1_1
```

### 커밋 메시지 포맷 (Conventional Commits)

```
<type>(<scope>): <subject>
<BLANK LINE>
<body>
<BLANK LINE>
<footer>

타입:
  feat:     새로운 기능
  fix:      버그 수정
  docs:     문서 변경 (코드 X)
  style:    코드 스타일 (포매팅, 세미콜론 등)
  refactor: 코드 리팩토링 (기능 변경 X)
  perf:     성능 개선
  test:     테스트 추가/수정
  chore:    빌드/의존성 등 기타

예:
  feat(arena): Implement 1:1 match voting UI
  fix(auth): Handle OAuth token expiration correctly
  docs(claude): Update CLAUDE.md to v1.1 with dual theme
  refactor(tournament): Simplify round advance logic
```

### 정기적 유지보수

```bash
# 로컬 브랜치 정리 (병합된 것 삭제)
git branch -d [브랜치명]

# 원격 브랜치 정리
git push origin --delete [브랜치명]

# 모든 원격 브랜치 조회
git branch -r

# 로컬과 동기화 (삭제된 원격 브랜치 제거)
git remote prune origin

# 현재 상태 간단히 보기
git status

# 로그 보기 (간단)
git log --oneline -10

# 로그 보기 (자세히)
git log --graph --decorate --all --oneline
```

---

## 4️⃣ 터미널 명령어 모음

### 빠른 참조

```bash
# ─── 상태 확인 ───
git status                                  # 현재 변경사항
git log --oneline -10                      # 최근 커밋 10개
git branch -a                               # 모든 브랜치 (로컬 + 원격)

# ─── 브랜치 작업 ───
git checkout -b [브랜치명]                  # 새 브랜치 생성 + 이동
git checkout [브랜치명]                     # 기존 브랜치 이동
git branch -d [브랜치명]                    # 브랜치 삭제 (병합됨)
git branch -D [브랜치명]                    # 브랜치 강제 삭제
git branch -m [구이름] [신이름]             # 브랜치 이름 변경

# ─── 커밋 작업 ───
git add [파일]                              # 스테이징
git add .                                   # 모든 변경사항 스테이징
git commit -m "[메시지]"                    # 커밋
git commit --amend                          # 마지막 커밋 수정

# ─── 푸시/풀 ───
git push origin [브랜치명]                  # 푸시
git pull origin [브랜치명]                  # 풀
git fetch origin                            # 원격 정보 가져오기 (병합 X)

# ─── 동기화 ───
git merge [병합할 브랜치]                   # 현재 브랜치에 병합
git rebase [베이스 브랜치]                  # 리베이스 (선형 히스토리)

# ─── 실행 취소 ───
git restore [파일]                          # 파일 변경사항 취소
git restore --staged [파일]                 # 스테이징 취소
git reset HEAD~1                            # 마지막 커밋 취소 (변경사항 유지)
git revert [커밋해시]                       # 특정 커밋 되돌리기
```

### 실제 사용 예

```bash
# 현재 상황 파악
cd ~/Projects/worldcrown48
git status
git log --oneline -5

# develop에서 새 기능 브랜치 만들기
git checkout develop
git pull origin develop
git checkout -b feature/new-feature

# 작업 후 커밋
git add .
git commit -m "feat: Add new amazing feature"

# 원격에 푸시
git push origin feature/new-feature

# GitHub PR → 리뷰 → 병합 후 로컬 정리
git checkout develop
git pull origin develop
git branch -d feature/new-feature

# main과 develop 동기화 (정기적으로)
git checkout main
git pull origin main
git merge develop  # 또는 develop을 main으로 병합하는 PR
```

---

## 5️⃣ 자동화 체크리스트

### 파일 업데이트 후 체크리스트

```
☐ Step 1: 파일 다운로드 및 로컬 교체 완료
  $ bash ./update_files.sh

☐ Step 2: 로컬 파일 검증
  $ ls -la CLAUDE.md CONTEXT.md WorldCrown48_ProjectSkill.md

☐ Step 3: Git 상태 확인
  $ git status

☐ Step 4: 브랜치 생성 및 커밋
  $ git checkout -b docs/update-claude-context-projectskill
  $ git add CLAUDE.md CONTEXT.md WorldCrown48_ProjectSkill.md
  $ git commit -m "docs: Update CLAUDE v1.1, CONTEXT v0.3, ProjectSkill v1.5"

☐ Step 5: 원격에 푸시
  $ git push origin docs/update-claude-context-projectskill

☐ Step 6: GitHub에서 PR 생성
  https://github.com/[your-username]/worldcrown48/pull/new/docs/update-claude-context-projectskill

☐ Step 7: Claude 프로젝트 지식 재업로드
  Project → Settings → Project Knowledge → Update Files

☐ Step 8: PR 리뷰 & 병합 (main 또는 develop?)
  (아래 "main vs develop" 의사결정 참조)

☐ Step 9: 로컬 정리
  $ git checkout main
  $ git pull origin main
  $ git branch -d docs/update-claude-context-projectskill
```

### main vs develop: 어디에 병합할까?

**현재 상황 분석:**

```
CLAUDE.md v1.1, CONTEXT.md v0.3, ProjectSkill.md v1.5는
- 설계 문서이므로 '즉시 적용' 필요 → main에 병합 권장
- 다음 MVP 준비용이 아니라 '지금 참조'해야 함
- Claude 프로젝트 지식에도 즉시 반영됨

결론: main ← develop ← feature (not develop ← main)
```

**병합 흐름:**

```
1️⃣ docs 브랜치 생성 (develop 기반)
   git checkout develop
   git checkout -b docs/claude-context-v1-1

2️⃣ 작업 후 develop으로 PR
   (또는 main으로 직접, 문서 변경이라 상관없음)

3️⃣ 병합 후 즉시 main과 develop 동기화
   git checkout main && git pull origin main
   git checkout develop && git pull origin develop
```

---

## 📌 추가 팁

### .gitignore 확인

```bash
# 프로젝트 root에 .gitignore가 있는지 확인
cat ~/Projects/worldcrown48/.gitignore

# 일반적으로 다음은 제외되어야 함:
# node_modules/
# .env.local
# .next/
# dist/
# build/
# _backup_*/
```

### Git 설정 확인

```bash
# 로컬 사용자명/이메일 설정
git config --global user.name "Your Name"
git config --global user.email "your-email@example.com"

# 확인
git config --list | grep user
```

### GitHub 계정 연결

```bash
# SSH 키 설정 (권장)
ssh-keygen -t ed25519 -C "your-email@example.com"
# ~/.ssh/id_ed25519.pub 내용을 GitHub 설정에 추가

# 또는 HTTPS + Personal Access Token 사용
```

---

**💡 핵심 정리:**
- **main**: 항상 배포 가능한 상태
- **develop**: 다음 버전 준비
- **feature/***: 기능 개발 (develop ↔ feature)
- **docs/***: 문서 변경 (main/develop ↔ docs)
- **hotfix/***: 긴급 수정 (main ↔ hotfix, 양쪽 병합)

---

*© 2026 WorldCrown48 | Git Workflow Guide v1.0 | 48티오*
