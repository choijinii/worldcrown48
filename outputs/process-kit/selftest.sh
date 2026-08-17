#!/usr/bin/env bash
#
# selftest.sh — 킷의 스크립트들이 이 환경에서 실제로 도는지 확인한다.
#
# 킷을 임시 빈 폴더에 "새 프로젝트처럼" 설치하고, 픽스처를 만들어
# 가드가 잡아야 할 것을 잡고 통과시켜야 할 것을 통과시키는지 검증한다.
# 의존성 없음 — Node 18+ 와 git 만 있으면 된다.
#
#   bash selftest.sh          # 조용히
#   bash selftest.sh -v       # 각 단계의 실제 출력까지
#
# 실패가 하나라도 있으면 exit 1.

set -uo pipefail

KIT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TMP="$(mktemp -d "${TMPDIR:-/tmp}/kit-selftest.XXXXXX")"
VERBOSE=0
[ "${1:-}" = "-v" ] && VERBOSE=1

PASS=0
FAIL=0
SKIP=0

cleanup() { rm -rf "$TMP"; }
trap cleanup EXIT

say()  { printf '%s\n' "$*"; }
ok()   { PASS=$((PASS+1)); printf '  ✅ %s\n' "$1"; }
bad()  { FAIL=$((FAIL+1)); printf '  ❌ %s\n' "$1"; [ -n "${2:-}" ] && printf '     %s\n' "$2"; }
skip() { SKIP=$((SKIP+1)); printf '  ⏭  %s\n' "$1"; }
dump() { [ "$VERBOSE" = "1" ] && printf '     ┌─\n%s\n     └─\n' "$(sed 's/^/     │ /' <<<"$1")"; return 0; }

say "킷 셀프테스트 — 임시 폴더: $TMP"
say ""

# ─────────────────────────────────────────────────────────────
# 설치 — 새 프로젝트에 까는 절차 그대로 (guard/README.md §설치)
# ─────────────────────────────────────────────────────────────
mkdir -p "$TMP/scripts/guard"
cp "$KIT_DIR/guard/check-rules.example.mjs"     "$TMP/scripts/guard/check-rules.mjs"
cp "$KIT_DIR/guard/check-rules.lib.example.mjs" "$TMP/scripts/guard/check-rules.lib.mjs"
cp "$KIT_DIR/guard/rules.example.json"          "$TMP/scripts/guard/rules.json"
cp "$KIT_DIR/predeploy-guard.example.sh"        "$TMP/scripts/predeploy-guard.sh"
# import 줄의 `.example` 떼기 — README가 시키는 그 한 줄
sed -i.bak 's|check-rules.lib.example.mjs|check-rules.lib.mjs|' "$TMP/scripts/guard/check-rules.mjs"
rm -f "$TMP/scripts/guard/check-rules.mjs.bak"
# 자리표시자 치환
sed -i.bak 's|{{MAIN_BRANCH}}|main|g' "$TMP/scripts/predeploy-guard.sh"
rm -f "$TMP/scripts/predeploy-guard.sh.bak"

GUARD="node $TMP/scripts/guard/check-rules.mjs"

# ─────────────────────────────────────────────────────────────
# 픽스처 — 잡혀야 할 것 / 통과해야 할 것을 일부러 섞어 둔다
# ─────────────────────────────────────────────────────────────
mkdir -p "$TMP/src/components" "$TMP/src/styles" "$TMP/.claude/worktrees/old/src/components" "$TMP/docs"

cat > "$TMP/src/components/Button.tsx" <<'EOF'
// TODO 나중에 정리
export const Button = () => <button style={{ color: "#FF0044" }}>go</button>;
EOF

# 단일 소스 — 값이 사는 곳. exemptFiles 라 위반이 아니다.
cat > "$TMP/src/styles/tokens.css" <<'EOF'
:root { --colour-accent: #FF0044; }
EOF

# 주인 있는 TODO — 통과해야 한다
# (이슈번호를 `#123` 으로 쓰면 3자리 hex 규칙에 걸린다 — rules.example.json 주석 참조)
cat > "$TMP/src/components/Ok.tsx" <<'EOF'
// TODO(kim, 2026-09-01) 폴백 정리
export const Ok = () => <span>ok</span>;
EOF

# 에이전트 워크트리 = 리포 자신의 옛 사본. 훑으면 안 된다.
cat > "$TMP/.claude/worktrees/old/src/components/Button.tsx" <<'EOF'
export const Old = () => <button style={{ color: "#FF0044" }}>old</button>;
EOF

cat > "$TMP/docs/notes.md" <<'EOF'
색은 #FF0044 였다 (문서는 스캔 대상이 아니다)
EOF

# ─────────────────────────────────────────────────────────────
say "1. 가드 — 위반 탐지"
# ─────────────────────────────────────────────────────────────
OUT="$($GUARD 2>&1)"; CODE=$?
dump "$OUT"
if [ "$CODE" = "1" ]; then ok "위반이 있으면 exit 1 (실제: $CODE)"
else bad "exit 1 이어야 하는데 $CODE" "$OUT"; fi

grep -q "no-raw-colour-literal" <<<"$OUT" \
  && ok "색 리터럴 규칙이 잡혔다" || bad "색 리터럴 규칙이 안 잡혔다" "$OUT"
grep -q "no-todo-without-owner" <<<"$OUT" \
  && ok "주인 없는 TODO 규칙이 잡혔다" || bad "TODO 규칙이 안 잡혔다" "$OUT"

# 판정은 사람용 출력이 아니라 --json 으로 한다.
# 사람용 출력에는 규칙 message(파일 경로를 포함한다)가 섞여 있어 grep이 오탐한다.
JSON="$($GUARD --json 2>&1)"
HITS="$(node -e 'try{const d=JSON.parse(process.argv[1]);console.log(d.violations.map(v=>v.file+"|"+v.rule).join("\n"))}catch(e){process.exit(9)}' "$JSON")"
dump "$HITS"
COUNT="$(node -e "try{process.stdout.write(String(JSON.parse(process.argv[1]).violations.length))}catch(e){process.exit(9)}" "$JSON" 2>/dev/null)"
[ "$COUNT" = "2" ] && ok "위반 정확히 2건 (오탐 없음)" || bad "위반 2건이어야 하는데 ${COUNT:-파싱실패}" "$JSON"

# ─────────────────────────────────────────────────────────────
say "2. 가드 — 통과해야 할 것들"
# ─────────────────────────────────────────────────────────────
grep -q "^src/styles/tokens.css|" <<<"$HITS" \
  && bad "exemptFiles(단일 소스)가 위반으로 잡혔다" "$HITS" || ok "단일 소스 파일은 면제된다"
grep -q "^\.claude/" <<<"$HITS" \
  && bad "에이전트 워크트리를 훑었다 — excludePrefixes 실패" "$HITS" || ok "에이전트 워크트리(.claude/)를 건너뛴다"
grep -q "^src/components/Ok.tsx|" <<<"$HITS" \
  && bad "주인 있는 TODO가 잡혔다(오탐)" "$HITS" || ok "주인 있는 TODO는 통과한다"
grep -q "notes.md" <<<"$HITS" \
  && bad "확장자 밖 파일을 스캔했다" "$HITS" || ok "대상 확장자 밖은 스캔하지 않는다"

# ─────────────────────────────────────────────────────────────
say "3. 가드 — 예외(allowlist)"
# ─────────────────────────────────────────────────────────────
cat > "$TMP/scripts/guard/rules-allowed.json" <<'EOF'
{
  "scan": { "extensions": [".tsx", ".css"], "excludePrefixes": [".claude/", "docs/"] },
  "rules": [
    { "id": "no-raw-colour-literal", "pattern": "#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\\b",
      "extensions": [".tsx"], "message": "토큰을 쓰세요" },
    { "id": "no-todo-without-owner", "pattern": "TODO(?!\\()", "extensions": [".tsx"],
      "message": "주인을 다세요" }
  ],
  "allowlist": [
    { "rule": "no-raw-colour-literal", "file": "src/components/Button.tsx", "match": "#FF0044", "reason": "셀프테스트" },
    { "rule": "no-todo-without-owner", "file": "src/components/Button.tsx", "match": "TODO", "reason": "셀프테스트" }
  ]
}
EOF
OUT2="$($GUARD --config="$TMP/scripts/guard/rules-allowed.json" 2>&1)"; CODE2=$?
dump "$OUT2"
[ "$CODE2" = "0" ] && ok "예외로 덮인 위반은 통과 (exit 0)" || bad "exit 0 이어야 하는데 $CODE2" "$OUT2"

# 낡은 예외 — 아무것도 매치하지 않는 항목은 실패여야 한다
sed 's|"file": "src/components/Button.tsx", "match": "#FF0044"|"file": "src/components/Gone.tsx", "match": "#FF0044"|' \
  "$TMP/scripts/guard/rules-allowed.json" > "$TMP/scripts/guard/rules-stale.json"
OUT3="$($GUARD --config="$TMP/scripts/guard/rules-stale.json" 2>&1)"; CODE3=$?
dump "$OUT3"
if [ "$CODE3" = "1" ] && grep -q "낡은 예외" <<<"$OUT3"; then
  ok "낡은 예외를 실패로 잡는다"
else bad "낡은 예외를 못 잡았다 (exit $CODE3)" "$OUT3"; fi

# ─────────────────────────────────────────────────────────────
say "4. 가드 — 설정 오류는 조용히 통과시키지 않는다"
# ─────────────────────────────────────────────────────────────
echo '{ "rules": [] }' > "$TMP/scripts/guard/rules-empty.json"
OUT4="$($GUARD --config="$TMP/scripts/guard/rules-empty.json" 2>&1)"; CODE4=$?
[ "$CODE4" = "2" ] && ok "규칙 0개 → exit 2" || bad "규칙 0개는 exit 2 여야 하는데 $CODE4" "$OUT4"

echo '{ "rules": [{ "id": "x", "pattern": "([" }] }' > "$TMP/scripts/guard/rules-bad.json"
OUT5="$($GUARD --config="$TMP/scripts/guard/rules-bad.json" 2>&1)"; CODE5=$?
[ "$CODE5" = "2" ] && ok "잘못된 정규식 → exit 2" || bad "잘못된 정규식은 exit 2 여야 하는데 $CODE5" "$OUT5"

OUT6="$($GUARD --config="$TMP/does-not-exist.json" 2>&1)"; CODE6=$?
[ "$CODE6" = "2" ] && ok "설정 파일 없음 → exit 2" || bad "설정 없음은 exit 2 여야 하는데 $CODE6" "$OUT6"

# ─────────────────────────────────────────────────────────────
say "5. predeploy-guard"
# ─────────────────────────────────────────────────────────────
REPO="$TMP/repo"
mkdir -p "$REPO"
(
  cd "$REPO" || exit 1
  git init -q -b main .
  git config user.email selftest@example.invalid
  git config user.name selftest
  cp "$TMP/scripts/predeploy-guard.sh" ./guard.sh
  git add -A && git commit -qm init
  # 원격 흉내: 자기 자신을 원격으로 등록
  git remote add origin "$REPO/.git" 2>/dev/null
  git fetch origin -q 2>/dev/null
) >/dev/null 2>&1

run_guard() { (cd "$REPO" && bash ./guard.sh 2>&1); }

(cd "$REPO" && git checkout -q -b feature/x)
OUT7="$(run_guard)"; CODE7=$?
dump "$OUT7"
if [ "$CODE7" = "1" ] && grep -q "배포 중단" <<<"$OUT7"; then
  ok "기준 브랜치가 아니면 배포 차단 (exit 1)"
else bad "브랜치 차단 실패 (exit $CODE7)" "$OUT7"; fi

(cd "$REPO" && git checkout -q main && echo "dirty" >> guard.sh)
OUT8="$(run_guard)"; CODE8=$?
dump "$OUT8"
if [ "$CODE8" = "1" ] && grep -q "커밋되지 않은" <<<"$OUT8"; then
  ok "커밋 안 된 변경이 있으면 배포 차단"
else bad "dirty 트리 차단 실패 (exit $CODE8)" "$OUT8"; fi

(cd "$REPO" && git checkout -q -- guard.sh)
OUT9="$(cd "$REPO" && ALLOW_DIRTY_DEPLOY=1 bash ./guard.sh 2>&1)"; CODE9=$?
[ "$CODE9" = "0" ] && ok "명시적 우회(ALLOW_DIRTY_DEPLOY=1)는 통과하고 경고를 남긴다" \
  || bad "우회가 동작하지 않는다 (exit $CODE9)" "$OUT9"

# ─────────────────────────────────────────────────────────────
say "6. CI 워크플로 문법"
# ─────────────────────────────────────────────────────────────
YML="$TMP/ci.yml"
sed -e 's|{{MAIN_BRANCH}}|main|g' -e 's|{{NODE_VERSION}}|20|g' -e 's|{{PKG_MANAGER}}|npm|g' \
    -e 's|{{INSTALL_CMD}}|npm ci|g' -e 's|{{TEST_CMD}}|npm test|g' -e 's|{{GUARD_CMD}}|npm run check:rules|g' \
    "$KIT_DIR/guard/ci.example.yml" > "$YML"

validate_yaml() { # $1 = 파일, $2 = 라벨
  local file="$1" label="$2" out code
  if command -v actionlint >/dev/null 2>&1; then
    out="$(actionlint "$file" 2>&1)"; code=$?
    [ "$code" = "0" ] && ok "$label — actionlint 통과" || bad "$label — actionlint 실패" "$out"
    return
  fi
  # actionlint가 없으면 YAML 파서로 구조를 검증한다 (동등 대체).
  local node_path=""
  for cand in "$KIT_DIR/../../node_modules" "$KIT_DIR/node_modules" "$PWD/node_modules"; do
    [ -d "$cand/yaml" ] && node_path="$cand" && break
  done
  if [ -z "$node_path" ]; then
    skip "$label — actionlint도 yaml 파서도 없어 건너뜀"
    return
  fi
  out="$(NODE_PATH="$node_path" node -e '
    const fs = require("node:fs");
    const YAML = require("yaml");
    const doc = YAML.parse(fs.readFileSync(process.argv[1], "utf8"));
    const on = doc.on ?? doc[true];            // YAML 1.1에서 on: 은 boolean true로 읽힌다
    if (!doc.name) throw new Error("name 없음");
    if (!on) throw new Error("on 트리거 없음");
    if (!doc.jobs || !Object.keys(doc.jobs).length) throw new Error("jobs 없음");
    for (const [id, job] of Object.entries(doc.jobs)) {
      if (!job["runs-on"]) throw new Error(`job ${id}: runs-on 없음`);
      if (!Array.isArray(job.steps) || !job.steps.length) throw new Error(`job ${id}: steps 없음`);
      for (const [i, s] of job.steps.entries())
        if (!s.uses && !s.run) throw new Error(`job ${id} step ${i}: uses/run 둘 다 없음`);
    }
    console.log("jobs=" + Object.keys(doc.jobs).length + " steps=" +
      Object.values(doc.jobs).reduce((n, j) => n + j.steps.length, 0));
  ' "$file" 2>&1)"; code=$?
  [ "$code" = "0" ] && ok "$label — YAML 파서 + Actions 구조 검증 통과 ($out)" \
    || bad "$label — YAML 검증 실패" "$out"
}

validate_yaml "$KIT_DIR/guard/ci.example.yml" "치환 전 원본"
validate_yaml "$YML" "자리표시자 치환 후"

# ─────────────────────────────────────────────────────────────
say ""
say "결과: ✅ $PASS · ❌ $FAIL · ⏭ $SKIP"
[ "$FAIL" = "0" ] || exit 1
