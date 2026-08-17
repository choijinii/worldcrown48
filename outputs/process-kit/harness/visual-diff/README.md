# visual-diff — "결과가 안 바뀌었다"를 수치로 증명하기

**값의 이름만 바꾸는 킥**(토큰 치환·CSS 정리·테마 전환 준비·구조 리팩터링)에서 쓴다. 기준 빌드와 대상 빌드를 나란히 띄우고, 같은 화면의 **모든 요소의 계산된 색상값**을 문서 순서대로 대조한다.

"화면이 안 바뀌었습니다"는 말이다. 이 하네스는 **"9개 화면 1,836개 요소 · 색상 차이 0건"** 을 낸다.

| 파일 | 역할 |
|---|---|
| `compare-colors.example.mjs` | 실행 진입점 — 브라우저를 띄우고 대조하고 판정한다 |
| `compare-colors.lib.example.mjs` | 순수 로직 — 스냅샷 대조 · 판정 집계. 단위테스트 대상 |
| `visual-diff.config.example.json` | 경로 · 포트 · 뷰포트 설정 |

---

## 이게 왜 필요한가

정적 검토(값 대조·grep)가 전부 통과했는데 실제 렌더에서만 드러난 회귀가 있었다.

> 라이트 테마 토큰 정의를 상위 스코프로 끌어올렸더니 **다크 화면 네비바에 없던 그림자가 생겼다.** `box-shadow: var(--shadow-gnb)` 가 다크 스코프에서는 토큰 부재로 **선언째 무효화**되던 것이, 토큰이 생기자 살아난 것이다.

값은 하나도 안 바뀌었다. grep으로도 안 잡힌다. **없던 선언이 살아나는 것**은 실행해야만 보인다. 이 하네스가 그걸 잡았고, 잡았기 때문에 되돌리고 그 케이스를 단위테스트로 박제할 수 있었다.

그래서 대조 속성에 `boxShadow` 와 `backgroundImage` 가 들어 있다 — **그림자가 없는 것도 실제 시각 상태**다.

---

## 설치

```bash
mkdir -p scripts/visual-diff
cp harness/visual-diff/compare-colors.example.mjs      scripts/visual-diff/compare-colors.mjs
cp harness/visual-diff/compare-colors.lib.example.mjs  scripts/visual-diff/compare-colors.lib.mjs
cp harness/visual-diff/visual-diff.config.example.json scripts/visual-diff/visual-diff.config.json

npm i -D playwright && npx playwright install chromium
```

`compare-colors.mjs` 의 **import 줄에서 `.example` 을 뗀다**(파일 안에 화살표 주석으로 표시). 설정의 `routes` 를 자기 화면으로 채운다.

**정적 사이트·SPA 어디든 쓸 수 있다.** 프레임워크를 가리지 않는다 — 필요한 건 "같은 URL을 두 포트에서 띄울 수 있다"는 것뿐이다.

---

## 쓰는 법

```bash
# 1. 기준 커밋을 별도 워크트리에 준비
git worktree add --detach /tmp/base <기준SHA>
cp .env.local /tmp/base/.env.local          # 환경변수 파일이 있으면
(cd /tmp/base && npm ci && npm run build)

# 2. 양쪽 다 프로덕션 빌드로 띄운다
(cd /tmp/base && PORT=3001 npm run start &)
npm run build && PORT=3000 npm run start &

# 3. 대조
node scripts/visual-diff/compare-colors.mjs
node scripts/visual-diff/compare-colors.mjs --routes=/,/settings --json

# 4. 정리
git worktree remove --force /tmp/base
```

출력:

```
/                      요소  197  차이 0
/settings              요소   42  차이 0

총 비교 요소 239 · 색상 차이 0건 → 시각 결과 변화 0 ✓
```

차이가 있거나 비교 불가 경로가 있으면 **exit 1**. 이 숫자를 PR 본문 B블록에 그대로 붙인다.

---

## 함정 (전부 실제로 밟은 것)

**dev 서버로 돌리지 않는다.** 개발 서버는 빌드 산출물을 덮어쓴다. 양쪽 다 프로덕션 빌드로 띄워야 대조가 성립한다.

**기본적으로 JS를 차단한다.** 로컬 환경변수가 비어 있으면 클라이언트 초기화가 던지고, 프레임워크가 서버 HTML을 통째로 지워버려 **비교할 DOM이 남지 않는다**. 색은 CSS가 칠하므로 JS 없이도 검증 대상은 온전하다. 클라이언트 렌더 화면까지 보려면 `--with-js` + 자격증명.

**비교 불가는 통과가 아니다.** 요소 수나 구조가 어긋난 경로는 차이 0으로 세지 않고 **실패**로 센다. 아무것도 증명하지 못했고, 조용히 넘기면 하필 그 화면의 회귀를 숨긴다.

**경로 목록이 커버리지다.** 목록에 없는 화면의 회귀는 안 잡힌다. 다크/라이트가 갈리는 화면, 모달·폼이 있는 화면, 차트가 있는 화면을 고루 넣는다.

**차이가 나면 STOP이다.** 원인을 찾기 전에는 "사소해 보인다"고 넘기지 않는다 — 위의 그림자 사건이 정확히 "사소해 보이는 1건"이었다.

---

## 색 말고 다른 것도 대조하려면

`visual-diff.config.json` 의 `properties` 에 계산 속성 이름을 배열로 주면 그것들을 대조한다. 레이아웃 불변을 증명하려면 `["width","height","padding","margin","fontSize","fontWeight"]` 같은 조합을 쓴다. 구조는 그대로다 — **무엇을 비교할지만 바꾼다.**
