#!/usr/bin/env bash
# IMAGE-1 PR 1 — 에뮬레이터 E2E 판 (지시서 §11.3).
#
# 실제 Firebase 를 하나도 부르지 않는다: auth · firestore · storage · functions 에뮬레이터 위에
# `next start` 를 띄우고 Playwright(e2e/emulator)를 돌린다. 프로젝트 id 는 demo-wc48 — "demo-" 로
# 시작하는 id 는 에뮬레이터가 실제 프로젝트에 절대 닿지 않게 막는다.
#
#   bash scripts/e2e-emulator.sh            # 전부
#   bash scripts/e2e-emulator.sh image1-editor   # 이름에 이 글자가 든 spec 만
set -euo pipefail
cd "$(dirname "$0")/.."

export NEXT_PUBLIC_USE_EMULATORS=1
export NEXT_PUBLIC_FIREBASE_API_KEY=demo-api-key
export NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-wc48
export NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=localhost
export NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=demo-wc48.appspot.com
export NEXT_PUBLIC_FIREBASE_APP_ID=1:000000000000:web:0000000000000000
export NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=000000000000
export NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
export NEXT_PUBLIC_ADMIN_UID=e2e-admin
export E2E_ADMIN_UID=e2e-admin

# 함수 에뮬레이터의 비밀 값 — 가짜. AI·유튜브 콜러블은 이 판에서 부르지 않는다(시험이 막는다).
cat > functions/.secret.local <<SECRETS
ADMIN_UID=e2e-admin
ANTHROPIC_API_KEY=e2e-dummy
YOUTUBE_API_KEY=e2e-dummy
IP_HASH_SALT=e2e-dummy
BRAVE_SEARCH_API_KEY=e2e-dummy
SECRETS
# 대회가 열리면 도는 기존 트리거(뉴스 초안 AI)가 바깥 AI 주소를 부르지 않게 닫힌 로컬 주소로 돌린다
# (Anthropic SDK 는 ANTHROPIC_BASE_URL 을 읽는다). 지시서 §11.3 — 바깥 사이트를 부르지 않는다.
# IMAGE-1 PR 2 — 이미지 검색은 진짜 Brave 대신 시험이 띄우는 가짜 서버(고정 포트 9311)를 부른다.
# 함수는 에뮬레이터에서만 BRAVE_API_BASE 를 읽는다(실서비스는 늘 api.search.brave.com).
cat > functions/.env.local <<ENVS
ANTHROPIC_BASE_URL=http://127.0.0.1:9
BRAVE_API_BASE=http://127.0.0.1:9311
ENVS
trap 'rm -f functions/.secret.local functions/.env.local' EXIT

if [ "${SKIP_BUILD:-0}" != "1" ]; then
  (cd functions && npm run build)
  npx next build
fi

npx firebase emulators:exec --project demo-wc48 --only auth,firestore,storage,functions \
  "npx playwright test -c playwright.emulator.config.ts ${1:-}"
