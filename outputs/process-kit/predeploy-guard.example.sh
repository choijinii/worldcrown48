#!/usr/bin/env bash
#
# predeploy-guard.example.sh — 배포 전에 "지금 배포하려는 코드가 정말 최신인가"를
# 기계로 검증한다.
#
# 배경: "pull 없이 배포 → 옛 코드 재배포" 실수는 하루에도 몇 번 재발한다.
# 사람 주의력에 기대지 말고, 배포 파이프라인이 기계적으로 막는다.
#
# ── 설치 ──
#   1. scripts/predeploy-guard.sh 로 복사하고 실행 권한: chmod +x scripts/predeploy-guard.sh
#   2. 자리표시자 {{MAIN_BRANCH}} 를 채운다.
#   3. 배포 파이프라인의 **맨 앞**에 연결한다:
#      · package.json:  "predeploy": "bash scripts/predeploy-guard.sh"
#      · firebase.json: functions/firestore 의 predeploy 훅 첫 줄
#      · Makefile/CI:   배포 스텝 직전
#      실패(exit 1) 시 배포 단계가 중단되므로 옛 코드가 올라가지 않는다.
#
# ── 주의 ──
#   훅은 실제 배포 명령에서만 실행된다. 로컬 개발 서버·에뮬레이터는 이 가드를
#   타지 않으므로 브랜치에서 자유롭게 작업할 수 있다.
#
# ── 우회 ──
#   긴급 상황에 한해 ALLOW_DIRTY_DEPLOY=1 로 우회할 수 있다. 우회한 사실이
#   화면에 남는다. 우회를 상시로 쓰기 시작하면 가드는 없는 것과 같다.

set -euo pipefail

MAIN_BRANCH="{{MAIN_BRANCH}}"
REMOTE="${DEPLOY_REMOTE:-origin}"

if [ "${ALLOW_DIRTY_DEPLOY:-0}" = "1" ]; then
  echo "⚠️  predeploy-guard 우회됨 (ALLOW_DIRTY_DEPLOY=1) — 무엇을 배포하는지 직접 확인하세요."
  exit 0
fi

# 1) 기준 브랜치가 아니면 중단 (워크트리·피처 브랜치에서의 실수 배포 방지)
current_branch="$(git rev-parse --abbrev-ref HEAD)"
if [ "$current_branch" != "$MAIN_BRANCH" ]; then
  echo "🛑 배포 중단: 현재 브랜치가 '${MAIN_BRANCH}' 가 아닙니다 (현재: ${current_branch})."
  echo "   ${MAIN_BRANCH} 브랜치에서만 배포하세요."
  exit 1
fi

# 2) 커밋 안 된 변경이 있으면 중단 — 로컬에만 있는 코드가 배포되거나,
#    반대로 배포된 SHA가 실제 동작과 달라진다.
if ! git diff-index --quiet HEAD --; then
  echo "🛑 배포 중단: 커밋되지 않은 변경이 있습니다."
  git status --short
  exit 1
fi

# 3) 원격 기준 브랜치 최신 상태를 가져온다
#    (실패하면 set -e 로 배포도 함께 중단 — 확인 못 한 채 올리지 않는 게 안전한 기본값)
git fetch "$REMOTE" "$MAIN_BRANCH" --quiet

# 4) 로컬 HEAD vs 원격 기준 브랜치
local_sha="$(git rev-parse HEAD)"
remote_sha="$(git rev-parse "${REMOTE}/${MAIN_BRANCH}")"

if [ "$local_sha" != "$remote_sha" ]; then
  echo "🛑 배포 중단: 로컬이 ${REMOTE}/${MAIN_BRANCH} 와 다릅니다."
  echo "   git pull ${REMOTE} ${MAIN_BRANCH} 후 다시 배포하세요."
  echo "   로컬 : ${local_sha:0:7}"
  echo "   원격 : ${remote_sha:0:7}"
  exit 1
fi

echo "✅ 로컬 = ${REMOTE}/${MAIN_BRANCH} (${local_sha:0:7})"
