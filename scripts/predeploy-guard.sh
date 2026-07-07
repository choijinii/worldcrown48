#!/usr/bin/env bash
#
# predeploy-guard.sh — 배포 전 로컬이 GitHub main과 일치하는지 기계로 검증한다.
#
# 배경(2026-07-06): "pull 없이 firebase deploy → 옛 코드 재배포" 실수가 하루 3회 재발.
# 사람 주의력에 기대지 말고, 배포 파이프라인이 기계적으로 막는다.
#
# firebase.json 의 functions / firestore predeploy 훅 맨 앞에서 실행된다.
# 실패(exit 1) 시 firebase 가 그 배포 단계를 중단하므로, 옛 코드가 올라가지 않는다.
#
# 주의: predeploy 훅은 `firebase deploy` 에서만 실행된다.
#       `firebase emulators:start` 는 predeploy 를 타지 않으므로 이 가드의 영향을 받지 않는다.
#
set -euo pipefail

# 1) main 브랜치가 아니면 중단 (워크트리·피처 브랜치에서의 실수 배포 방지)
current_branch="$(git rev-parse --abbrev-ref HEAD)"
if [ "$current_branch" != "main" ]; then
  echo "🛑 배포 중단: 현재 브랜치가 'main'이 아닙니다 (현재: ${current_branch})."
  echo "   main 브랜치에서만 배포하세요."
  exit 1
fi

# 2) 원격 main 최신 상태를 가져온다 (실패 시 set -e 로 배포도 함께 중단 — 안전한 기본값)
git fetch origin main --quiet

# 3) 로컬 HEAD vs origin/main 비교
local_sha="$(git rev-parse HEAD)"
remote_sha="$(git rev-parse origin/main)"

if [ "$local_sha" != "$remote_sha" ]; then
  echo "🛑 배포 중단: 로컬이 GitHub main과 다릅니다. git pull origin main 후 다시 배포하세요."
  echo "   로컬 : ${local_sha:0:7}"
  echo "   원격 : ${remote_sha:0:7}"
  exit 1
fi

echo "✅ 로컬 = GitHub main (${local_sha:0:7})"
