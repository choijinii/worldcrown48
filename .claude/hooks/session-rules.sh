#!/usr/bin/env bash
# SESSION-RULES-1 — SessionStart 훅: .claude/session-rules.md 를 대화에 다시 넣는다.
# hookSpecificOutput.additionalContext 하나만 쓴다(최상위 additional_context 를 함께 쓰면 같은 글이 두 번 들어감).
RULES="${SESSION_RULES_FILE:-$(cd "$(dirname "$0")/.." && pwd)/session-rules.md}"
[ -f "$RULES" ] || exit 0
jq -Rs '{hookSpecificOutput: {hookEventName: "SessionStart", additionalContext: .}}' < "$RULES"
