# guard — 규칙을 코드로 강제하기

사람이 리뷰로 매번 잡을 수 없는 것을 기계가 잡는다. 규칙을 **배열로 등록**하면 리포를 훑어 위반을 보고하고, 하나라도 있으면 CI를 막는다.

| 파일 | 역할 |
|---|---|
| `check-rules.example.mjs` | 실행 진입점 — 리포를 걷고, 리포트하고, exit code를 낸다 |
| `check-rules.lib.example.mjs` | 순수 로직 — 범위 판정 · 탐지 · 예외 · 낡은 예외. **여기를 단위테스트로 잠근다** |
| `rules.example.json` | 규칙 + 예외 설정 |
| `ci.example.yml` | GitHub Actions 워크플로 |

의존성이 없다. Node 18+ 의 내장 모듈만 쓴다.

---

## 설치 (5분)

```bash
mkdir -p scripts/guard
cp guard/check-rules.example.mjs      scripts/guard/check-rules.mjs
cp guard/check-rules.lib.example.mjs  scripts/guard/check-rules.lib.mjs
cp guard/rules.example.json           scripts/guard/rules.json
cp guard/ci.example.yml               .github/workflows/rules-guard.yml
```

1. `scripts/guard/check-rules.mjs` 의 **import 줄에서 `.example` 을 뗀다** (파일 안에 화살표 주석으로 표시해 뒀다).
2. `package.json` 에 스크립트 추가:
   ```json
   "check:rules": "node scripts/guard/check-rules.mjs"
   ```
3. `.github/workflows/rules-guard.yml` 의 자리표시자(`{{MAIN_BRANCH}}` 등)를 채운다. **따옴표는 지우지 않는다** — YAML에서 `{` 로 시작하는 값은 flow mapping으로 읽힌다.
4. `rules.json` 을 자기 규칙으로 바꾼다.

---

## 규칙 설정

```json
{
  "scan": {
    "extensions": [".ts", ".tsx", ".css"],
    "excludePrefixes": ["docs/", "node_modules/", ".next/", ".claude/"]
  },
  "rules": [
    {
      "id": "no-raw-colour-literal",
      "pattern": "#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\\b",
      "flags": "g",
      "extensions": [".tsx", ".css"],
      "exemptFiles": ["src/styles/tokens.css"],
      "message": "값은 토큰으로. var(--…) 를 쓰세요."
    }
  ],
  "allowlist": [
    { "rule": "no-raw-colour-literal", "file": "src/x.tsx", "match": "#4285F4", "reason": "서드파티 브랜드 색" }
  ]
}
```

> `rules.example.json` 의 `allowlist` 는 **비어 있다**. 남의 프로젝트 예외를 물려받으면 첫 실행부터 "낡은 예외" 실패가 난다 — 항목의 모양은 `$allowlistExample` 키에 남겨 뒀다.

| 키 | 뜻 |
|---|---|
| `scan.extensions` | 전역 대상 확장자 (비우면 전부) |
| `scan.excludePrefixes` | 리포 루트 기준 접두사. 트리째 건너뛴다 |
| `rules[].pattern` | 정규식 문자열. **`flags` 에 `g` 필수** (한 줄에 여러 건) |
| `rules[].extensions` | 이 규칙만의 확장자 (없으면 전역 범위) |
| `rules[].exemptFiles` | 이 규칙이 적용되지 않는 파일 — 예: 값이 사는 단일 소스 |
| `rules[].message` | 위반 리포트에 함께 뜨는 안내 |
| `allowlist[]` | `rule` + `file` + `match` + **`reason`(필수)** |

### 규칙에 넣을 것 / 넣지 말 것

**넣을 것** — 리포 전체의 **불변식**. "값은 한 곳에만 산다", "이 계층은 저 계층을 import하지 않는다", "키는 서버 전용", "이 숫자는 하드코딩 금지". 위반이 조용히 쌓이고, 리뷰어가 매번 알아채기 어려운 것들.

**넣지 말 것** — 취향(포맷·네이밍)은 린터/포매터로. 정규식으로는 못 잡는 의미 규칙을 억지로 넣으면 오탐이 쌓이고, 오탐이 쌓이면 사람이 가드를 끈다.

---

## 쓰는 법

```bash
npm run check:rules              # 위반이 있으면 exit 1
node scripts/guard/check-rules.mjs --summary   # 건수만 — 기준선 스냅샷
node scripts/guard/check-rules.mjs --json      # 기계용 (항상 exit 0)
```

**기준선 방식.** 처음 돌리면 위반이 잔뜩 나온다. 그게 정상이다(RED 기준선). `--summary` 로 숫자를 박아두고 Phase마다 줄여 0으로 만든다. 추정과 실측이 얼마나 다르든(117건 추정 → 211건 실측) 이 구조가 흡수한다.

---

## 설계에 박혀 있는 교훈

**스캔 범위에서 도구 폴더를 뺀다.** 에이전트 워크트리(`.claude/` 등)는 **리포 자신의 옛 사본**이다. 훑으면 이미 고친 파일의 과거 버전이 위반으로 다시 잡혀(로컬 159건 오탐) CI(fresh checkout)와 결과가 갈린다. `excludePrefixes` 에 반드시 넣는다.

**예외는 파일이 아니라 파일+값 쌍으로.** 파일 전체 면제는 무관한 새 위반까지 그 파일에서 조용히 통과시킨다.

**낡은 예외를 감지한다.** 값이 정리됐거나 파일이 옮겨간 뒤에도 남은 예외 항목은 **아무도 다시 확인하지 않은 주장**이고, 그 자리에 새로 들어오는 것까지 덮어준다. 이 가드는 그런 항목을 실패로 처리한다.

**가드 로직을 단위테스트로 잠근다.** 순수 층(`check-rules.lib.*.mjs`)을 분리한 이유다. 패턴 오타 하나로 아무것도 매치하지 않게 되면 가드는 "위반 0건"을 영원히 보고한다 — 가장 위험한 실패 방식이다. CI가 스캔 전에 로직 테스트를 먼저 돌리는 것도 같은 이유다.

**설정 오류는 조용히 통과시키지 않는다.** 규칙 0개, 중복 id, 잘못된 정규식, `g` 플래그 누락은 전부 exit 2로 던진다.
