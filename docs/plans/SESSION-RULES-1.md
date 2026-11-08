# SESSION-RULES-1 — 세션 규칙 자동 주입 훅 계획

지시서: `outputs/PROMPT_ClaudeCode_SESSION-RULES-HOOK_v1.0_2026-11-08.md` · 화면·코드 동작 변화 없음 · 원장 새 결정 없음.

## 만들 것
| 파일 | 하는 일 |
|------|---------|
| `.claude/session-rules.md` | 지시서 §2 글자 그대로 |
| `.claude/hooks/session-rules.sh` | 규칙 글을 `{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":…}}` 로 내보냄(`jq -Rs`) · 규칙 파일이 없으면 조용히 exit 0 · 최상위 `additional_context` 없음 · chmod +x |
| `.claude/settings.json` | SessionStart 훅(matcher `startup\|resume\|clear\|compact`) |
| `.gitignore` | `.claude/worktrees/` · `.claude/settings.local.json` |

## 시험 (먼저 써서 빨강 확인 → 구현 → 초록)
`lib/__tests__/sessionRulesHook.test.ts` (vitest — 지시서의 "또는 vitest". 지금 vitest 가 `lib/__tests__/**` 만 돌리므로 CI 에서 함께 돈다)
1. 출력이 JSON 으로 파싱됨
2. `hookSpecificOutput.hookEventName === "SessionStart"`
3. `additionalContext` 에 "Superpowers 필수" 포함
4. 최상위 `additional_context` 없음
5. 규칙 파일이 없으면 exit 0 · 출력 없음 (`SESSION_RULES_FILE` 환경변수로 없는 경로를 줘서 확인)

## 확인 순서 (§10)
1. `bash .claude/hooks/session-rules.sh | jq .`
2. 새 세션(`claude -p`)에서 규칙 제목이 보이는지
3. 압축(compact) 뒤 같은 확인 — 대표님 창에서 `/compact` 1회
4. `git status` 에 `.claude/worktrees/` 안 보임
